// Driver payout service.
//
// Design notes:
//  - We never accumulate driver money long-term. `drivers.pendingEarnings`
//    is intra-shift only and is zeroed when a SUCCESS payout row is written.
//  - `disburse()` is a thin abstraction around the per-provider mobile-money
//    disbursement APIs (MTN MoMo Disbursement, Wave Business, Orange B2C, etc).
//    Until those merchant accounts are wired pre-launch, we fall back to a
//    "MANUAL" provider that records the payout as PENDING for an admin to
//    process from the dashboard. This keeps the end-of-shift UX unchanged
//    once real disbursement APIs land.

const { v4: uuidv4 } = require('uuid');
const { eq, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { drivers, driverPayouts } = require('../schema');

// Provider routing: country code → preferred disbursement provider.
// Only providers we actually have B2C/Disbursement contracts with should
// be returned here. Until those exist, everything routes to MANUAL.
function pickDisbursementProvider(countryCode) {
  // TODO: enable once we have provider B2C/disbursement merchant accounts
  // const map = {
  //   TG: 'TMONEY', BJ: 'MTN_MOMO', CI: 'WAVE', SN: 'WAVE',
  //   GH: 'MTN_MOMO', NG: 'FLUTTERWAVE', KE: 'MPESA',
  // };
  // return map[countryCode] || 'FLUTTERWAVE';
  return 'BANK_TRANSFER'; // BANK_TRANSFER is what MANUAL maps to in our enum until disbursement providers ship
}

// Send the actual money. Real provider integrations live in
// backend/src/services/payment-providers/<name>/disburse.js when they're built.
// For now we return a "queued for manual processing" result.
async function disburse({ provider, amount, currency, destinationPhone, reference }) {
  if (provider === 'BANK_TRANSFER') {
    // Manual fallback — admin will process via the admin dashboard.
    return { ok: true, status: 'PENDING', providerRef: `MANUAL-${reference}` };
  }
  // When real adapters are added, dispatch here:
  // const adapter = require(`./payment-providers/${provider.toLowerCase()}/disburse`);
  // return adapter({ amount, currency, destinationPhone, reference });
  return { ok: false, status: 'FAILED', reason: `Disbursement not configured for ${provider}` };
}

/**
 * End shift + cash out.
 * Caller has already verified the driver's payout PIN.
 *
 * Race-safe: re-reads pendingEarnings inside a transaction with `FOR UPDATE` so a
 * concurrent end-shift + nightly cron can't double-pay or use a stale balance.
 */
async function processEndShiftPayout(driverArg, { trigger = 'END_SHIFT', countryCode = 'TG' } = {}) {
  const db = getDB();

  // Lock the driver row, capture the current balance + payout config under that lock.
  const locked = await db.transaction(async (tx) => {
    const [d] = await tx.select().from(drivers).where(eq(drivers.id, driverArg.id)).for('update');
    if (!d) return { abort: true, error: { ok: false, code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } };
    if (!d.payoutPhone) return { abort: true, error: { ok: false, code: 'NO_PAYOUT_PHONE', message: 'No payout phone on file. Set it in your profile.' } };

    const amount = Number(d.pendingEarnings || 0);

    if (amount <= 0) {
      await tx.update(drivers).set({
        isOnShift: false, isOnline: false, shiftEndedAt: new Date(), updatedAt: new Date(),
      }).where(eq(drivers.id, d.id));
      return { abort: true, error: null, ok: { ok: true, payout: null, message: 'Shift ended. No earnings this shift.' } };
    }

    // Atomically debit pending → 0 and create a PROCESSING payout row. If the disbursement
    // fails downstream we re-credit the driver. This guarantees that another concurrent
    // call cannot read the same balance.
    await tx.update(drivers).set({
      pendingEarnings: '0.00',
      isOnShift: false,
      isOnline: false,
      shiftEndedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(drivers.id, d.id));

    const provider = pickDisbursementProvider(countryCode);
    const [payout] = await tx.insert(driverPayouts).values({
      driverId: d.id,
      amount: String(amount),
      currency: 'XOF',
      provider,
      status: 'PROCESSING',
      trigger,
      destinationPhone: d.payoutPhone,
      shiftStartedAt: d.shiftStartedAt,
      shiftEndedAt: new Date(),
    }).returning();

    return { driver: d, amount, provider, payout };
  });

  if (locked.abort) return locked.ok || locked.error;

  const { driver: d, amount, provider, payout } = locked;
  const reference = uuidv4().slice(0, 8).toUpperCase();

  let result;
  try {
    result = await disburse({ provider, amount, currency: 'XOF', destinationPhone: d.payoutPhone, reference });
  } catch (err) {
    result = { ok: false, status: 'FAILED', reason: err.message };
  }

  const finalStatus = result.status || (result.ok ? 'SUCCESS' : 'FAILED');

  await db.update(driverPayouts).set({
    status: finalStatus,
    providerRef: result.providerRef || null,
    failureReason: result.reason || null,
    completedAt: finalStatus === 'PENDING' ? null : new Date(),
  }).where(eq(driverPayouts.id, payout.id));

  // FAILED → re-credit pending so driver can retry. Shift stays ended (they can start a new one).
  if (finalStatus === 'FAILED') {
    await db.update(drivers).set({
      pendingEarnings: sql`COALESCE(${drivers.pendingEarnings}, 0) + ${String(amount)}`,
      updatedAt: new Date(),
    }).where(eq(drivers.id, d.id));
  }

  return {
    ok: finalStatus !== 'FAILED',
    payout: { ...payout, status: finalStatus, providerRef: result.providerRef || null },
    code: finalStatus,
    message: finalStatus === 'FAILED' ? (result.reason || 'Payout failed; balance restored.') : undefined,
  };
}

/**
 * Credit a delivery's driver payout share to the driver's pendingEarnings.
 * Called from the DELIVERED scan handler.
 */
async function creditDriverEarnings(driverId, amount) {
  const db = getDB();
  await db.update(drivers).set({
    pendingEarnings: sql`COALESCE(${drivers.pendingEarnings}, 0) + ${String(amount)}`,
    totalEarnings: sql`COALESCE(${drivers.totalEarnings}, 0) + ${String(amount)}`,
    totalDeliveries: sql`COALESCE(${drivers.totalDeliveries}, 0) + 1`,
    updatedAt: new Date(),
  }).where(eq(drivers.id, driverId));
}

module.exports = { processEndShiftPayout, creditDriverEarnings, pickDisbursementProvider };
