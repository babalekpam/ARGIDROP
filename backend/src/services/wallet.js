// Wallet Service — business wallet for pre-funded deliveries
// Handles: deposits, holds, releases, refunds with atomic operations

const { eq, sql, and } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { businessWallets, walletTransactions, businesses } = require('../schema');
const { getAdapter, defaultCurrencyForCountry } = require('./payment-adapter');

async function getOrCreateWallet(businessId) {
  const db = getDB();
  let [wallet] = await db.select().from(businessWallets).where(eq(businessWallets.businessId, businessId)).limit(1);
  if (!wallet) {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    const currency = defaultCurrencyForCountry(business?.country || 'TG');
    [wallet] = await db.insert(businessWallets).values({ businessId, currency }).returning();
  }
  return wallet;
}

/**
 * Check if wallet has sufficient available balance (balance - heldBalance)
 */
async function hasAvailableBalance(businessId, amount) {
  const wallet = await getOrCreateWallet(businessId);
  const available = parseFloat(wallet.balance) - parseFloat(wallet.heldBalance);
  return available >= parseFloat(amount);
}

/**
 * Hold funds for a job (moves from available → heldBalance).
 * Uses a single atomic conditional UPDATE to prevent concurrent over-commitment.
 * The WHERE clause enforces that (balance - held_balance) >= amount at the DB level,
 * so two concurrent requests cannot both succeed when the wallet only covers one.
 */
async function holdFunds(businessId, jobId, amount) {
  const db = getDB();
  const wallet = await getOrCreateWallet(businessId);
  const amountFixed = parseFloat(amount).toFixed(2);

  const [updated] = await db.update(businessWallets)
    .set({
      heldBalance: sql`held_balance + ${amountFixed}::numeric`,
      updatedAt: new Date()
    })
    .where(and(
      eq(businessWallets.id, wallet.id),
      sql`(balance::numeric - held_balance::numeric) >= ${amountFixed}::numeric`
    ))
    .returning();

  if (!updated) {
    const [fresh] = await db.select().from(businessWallets).where(eq(businessWallets.id, wallet.id)).limit(1);
    const available = fresh ? (parseFloat(fresh.balance) - parseFloat(fresh.heldBalance)).toFixed(2) : '0.00';
    throw new Error(`Insufficient wallet balance. Available: ${available}, Required: ${amountFixed}`);
  }

  const newHeld = parseFloat(updated.heldBalance);
  const available = parseFloat(updated.balance) - newHeld;

  await db.insert(walletTransactions).values({
    walletId: wallet.id, type: 'HOLD', status: 'CONFIRMED', amount: amountFixed,
    balanceBefore: wallet.balance, balanceAfter: wallet.balance,
    currency: wallet.currency, jobId, description: `Hold for job ${jobId}`
  });
  return { held: amount, newHeldBalance: newHeld, availableAfter: available };
}

/**
 * Release held funds (job completed successfully)
 * This reduces both balance and heldBalance by the amount
 */
async function releaseHold(businessId, jobId, amount) {
  const db = getDB();
  const wallet = await getOrCreateWallet(businessId);
  const newBalance = parseFloat(wallet.balance) - parseFloat(amount);
  const newHeld = parseFloat(wallet.heldBalance) - parseFloat(amount);
  await db.update(businessWallets).set({ balance: newBalance.toFixed(2), heldBalance: Math.max(0, newHeld).toFixed(2), updatedAt: new Date() }).where(eq(businessWallets.id, wallet.id));
  await db.insert(walletTransactions).values({
    walletId: wallet.id, type: 'RELEASE', status: 'CONFIRMED', amount: amount.toString(),
    balanceBefore: wallet.balance, balanceAfter: newBalance.toFixed(2),
    currency: wallet.currency, jobId, description: `Release for completed job ${jobId}`
  });
  return { released: amount, newBalance };
}

/**
 * Return held funds (job cancelled) — heldBalance goes down, balance unchanged
 */
async function returnHold(businessId, jobId, amount) {
  const db = getDB();
  const wallet = await getOrCreateWallet(businessId);
  const newHeld = Math.max(0, parseFloat(wallet.heldBalance) - parseFloat(amount));
  await db.update(businessWallets).set({ heldBalance: newHeld.toFixed(2), updatedAt: new Date() }).where(eq(businessWallets.id, wallet.id));
  await db.insert(walletTransactions).values({
    walletId: wallet.id, type: 'REFUND', status: 'CONFIRMED', amount: amount.toString(),
    balanceBefore: wallet.balance, balanceAfter: wallet.balance,
    currency: wallet.currency, jobId, description: `Return hold for cancelled job ${jobId}`
  });
  return { returned: amount };
}

/**
 * Initiate deposit via payment provider
 */
async function initiateDeposit(businessId, amount, provider, customerPhone, customerEmail) {
  const wallet = await getOrCreateWallet(businessId);
  const adapter = getAdapter(provider);
  const reference = `DLV-WDEP-${businessId.substring(0,8)}-${Date.now()}`;
  const result = await adapter.initiatePayment({
    amount, currency: wallet.currency,
    customerPhone, customerEmail,
    reference,
    description: `ArgiDrop wallet deposit — ${amount} ${wallet.currency}`,
    callbackUrl: `${process.env.BACKEND_URL}/api/v1/webhooks/${provider.toLowerCase()}`,
    redirectUrl: `${process.env.WEB_URL}/dashboard/wallet?deposit=${reference}`
  });
  // Record pending deposit with status=PENDING for idempotency tracking
  const db = getDB();
  await db.insert(walletTransactions).values({
    walletId: wallet.id, type: 'DEPOSIT', status: 'PENDING', amount: amount.toString(),
    balanceBefore: wallet.balance, balanceAfter: wallet.balance,
    currency: wallet.currency, paymentProvider: provider,
    externalRef: reference,
    // Store the provider's own ref so confirmDeposit() can verify against the
    // right ID — many adapters (MTN, M-Pesa, Wave, Orange) cannot look up
    // a payment by our externalRef.
    providerRef: result.providerRef || reference,
    description: 'Pending deposit — awaiting confirmation'
  });
  return { ...result, reference };
}

/**
 * Confirm deposit after webhook confirms payment.
 *
 * State machine: PENDING → PROCESSING → CONFIRMED (success)
 *                                    → FAILED     (provider says payment unsuccessful)
 *                                    → PENDING    (transient error — allow provider retry)
 *
 * The PROCESSING state is the idempotency gate:
 *  - Only the first delivery transitions PENDING → PROCESSING (atomic conditional UPDATE).
 *  - A replayed webhook finds status != 'PENDING', skips the gate, and returns immediately.
 *  - The wallet credit and final status update happen together inside a DB transaction,
 *    so a crash between verification and credit cannot leave the balance inconsistent.
 *  - Transient verification errors (network timeouts, etc.) reset to PENDING so the
 *    next provider retry can attempt again — no permanent data loss.
 *  - The unique index on external_ref provides an additional DB-level safeguard against
 *    duplicate deposit rows for the same reference.
 */
async function confirmDeposit(reference) {
  const db = getDB();
  const [tx] = await db.select().from(walletTransactions).where(eq(walletTransactions.externalRef, reference)).limit(1);
  if (!tx || tx.type !== 'DEPOSIT') throw new Error('Deposit transaction not found');

  // Fast-path: already terminal — return idempotent success without touching anything.
  if (tx.status === 'CONFIRMED') {
    const [wallet] = await db.select().from(businessWallets).where(eq(businessWallets.id, tx.walletId)).limit(1);
    return { success: true, alreadyProcessed: true, newBalance: wallet?.balance, depositedAmount: tx.amount };
  }

  // Atomically claim the deposit by moving PENDING → PROCESSING.
  // If another process already claimed it (PROCESSING) or it permanently failed (FAILED),
  // 0 rows are returned and we bail out before touching the wallet.
  const [claimed] = await db.update(walletTransactions)
    .set({ status: 'PROCESSING' })
    .where(and(
      eq(walletTransactions.id, tx.id),
      eq(walletTransactions.status, 'PENDING')
    ))
    .returning();

  if (!claimed) {
    if (tx.status === 'PROCESSING') {
      // Another handler is in flight — signal the webhook layer to return non-200 so
      // the provider retries. The next delivery will find CONFIRMED or PENDING.
      const err = new Error('Deposit is already being processed by another handler');
      err.retryable = true;
      throw err;
    }
    // FAILED or unknown status — permanent, no retry needed.
    throw new Error(`Deposit cannot be processed (current status: ${tx.status})`);
  }

  // Verify with provider — do this AFTER claiming PROCESSING so verification outcome
  // determines the final state, not the other way around.
  let verification;
  try {
    const adapter = getAdapter(tx.paymentProvider);
    // Verify with provider using the providerRef stored at initiation. Falls
    // back to the externalRef for adapters whose verify endpoint accepts our
    // ref (Flutterwave, Paystack), which is what older rows have stored.
    verification = await adapter.verifyPayment(tx.providerRef || reference);
  } catch (verifyErr) {
    // Transient error (network timeout, provider outage, etc.) — reset to PENDING so the
    // next webhook delivery (provider retry) can attempt the full flow again.
    await db.update(walletTransactions)
      .set({ status: 'PENDING', description: `Verification error (retryable): ${verifyErr.message}` })
      .where(eq(walletTransactions.id, tx.id));
    verifyErr.retryable = true;
    throw verifyErr;
  }

  if (!verification.success) {
    // Provider confirmed the payment was NOT successful — permanently fail.
    await db.update(walletTransactions)
      .set({ status: 'FAILED', description: 'Provider reported payment unsuccessful' })
      .where(eq(walletTransactions.id, tx.id));
    throw new Error('Payment verification failed');
  }

  // Credit the wallet and mark CONFIRMED atomically so a crash between the two
  // cannot leave balance incremented but status still PROCESSING (or vice-versa).
  const [wallet] = await db.select().from(businessWallets).where(eq(businessWallets.id, tx.walletId)).limit(1);
  const newBalance = parseFloat(wallet.balance) + parseFloat(tx.amount);

  await db.transaction(async (trx) => {
    await trx.update(businessWallets).set({
      balance: newBalance.toFixed(2), lastDepositAt: new Date(), updatedAt: new Date()
    }).where(eq(businessWallets.id, wallet.id));
    await trx.update(walletTransactions).set({
      status: 'CONFIRMED',
      balanceAfter: newBalance.toFixed(2),
      description: `Deposit confirmed — ${verification.amount} ${verification.currency}`
    }).where(eq(walletTransactions.id, tx.id));
  });

  return { success: true, newBalance, depositedAmount: tx.amount };
}

module.exports = {
  getOrCreateWallet, hasAvailableBalance,
  holdFunds, releaseHold, returnHold,
  initiateDeposit, confirmDeposit
};
