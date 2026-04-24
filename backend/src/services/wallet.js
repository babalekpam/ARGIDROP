// Wallet Service — business wallet for pre-funded deliveries
// Handles: deposits, holds, releases, refunds with atomic operations

const { eq, sql } = require('drizzle-orm');
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
 * Hold funds for a job (moves from available → heldBalance)
 */
async function holdFunds(businessId, jobId, amount) {
  const db = getDB();
  const wallet = await getOrCreateWallet(businessId);
  const available = parseFloat(wallet.balance) - parseFloat(wallet.heldBalance);
  if (available < parseFloat(amount)) {
    throw new Error(`Insufficient wallet balance. Available: ${available}, Required: ${amount}`);
  }
  const newHeld = parseFloat(wallet.heldBalance) + parseFloat(amount);
  await db.update(businessWallets).set({ heldBalance: newHeld.toFixed(2), updatedAt: new Date() }).where(eq(businessWallets.id, wallet.id));
  await db.insert(walletTransactions).values({
    walletId: wallet.id, type: 'HOLD', amount: amount.toString(),
    balanceBefore: wallet.balance, balanceAfter: wallet.balance,
    currency: wallet.currency, jobId, description: `Hold for job ${jobId}`
  });
  return { held: amount, newHeldBalance: newHeld, availableAfter: available - parseFloat(amount) };
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
    walletId: wallet.id, type: 'RELEASE', amount: amount.toString(),
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
    walletId: wallet.id, type: 'REFUND', amount: amount.toString(),
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
  // Record pending deposit
  const db = getDB();
  await db.insert(walletTransactions).values({
    walletId: wallet.id, type: 'DEPOSIT', amount: amount.toString(),
    balanceBefore: wallet.balance, balanceAfter: wallet.balance,
    currency: wallet.currency, paymentProvider: provider,
    externalRef: reference, description: 'Pending deposit — awaiting confirmation'
  });
  return { ...result, reference };
}

/**
 * Confirm deposit after webhook confirms payment
 */
async function confirmDeposit(reference) {
  const db = getDB();
  const [tx] = await db.select().from(walletTransactions).where(eq(walletTransactions.externalRef, reference)).limit(1);
  if (!tx || tx.type !== 'DEPOSIT') throw new Error('Deposit transaction not found');
  // Verify with provider
  const adapter = getAdapter(tx.paymentProvider);
  const verification = await adapter.verifyPayment(reference);
  if (!verification.success) throw new Error('Payment verification failed');
  // Update wallet balance
  const [wallet] = await db.select().from(businessWallets).where(eq(businessWallets.id, tx.walletId)).limit(1);
  const newBalance = parseFloat(wallet.balance) + parseFloat(tx.amount);
  await db.update(businessWallets).set({
    balance: newBalance.toFixed(2), lastDepositAt: new Date(), updatedAt: new Date()
  }).where(eq(businessWallets.id, wallet.id));
  await db.update(walletTransactions).set({
    balanceAfter: newBalance.toFixed(2),
    description: `Deposit confirmed — ${verification.amount} ${verification.currency}`
  }).where(eq(walletTransactions.id, tx.id));
  return { success: true, newBalance, depositedAmount: tx.amount };
}

module.exports = {
  getOrCreateWallet, hasAvailableBalance,
  holdFunds, releaseHold, returnHold,
  initiateDeposit, confirmDeposit
};
