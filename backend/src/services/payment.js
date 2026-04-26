// Payment service — now routes through payment-adapter for Africa-first providers.
//
// M2 model: drivers are paid at end-of-shift (manual via PIN) or by the nightly
// auto-payout cron — NEVER per-delivery. So on delivery confirmation we only:
//  1. release the merchant's wallet hold (if applicable) so platform owns the cash
//  2. mark the payment ledger row RELEASED
//  3. credit the driver's pendingEarnings (the disbursement queue)
//  4. mark the job COMPLETED
const { eq, and } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { payments, jobs, drivers } = require('../schema');
const { getAdapter } = require('./payment-adapter');
const { releaseHold } = require('./wallet');

/**
 * Release payment to driver-credit pool after delivery confirmed (via QR scan).
 * Called from qr.js after successful delivery scan.
 *
 * IDEMPOTENT: uses an atomic conditional UPDATE to claim the HELD→RELEASED transition.
 * Only the caller that wins that race performs the wallet release, driver credit, and
 * job completion. Concurrent or repeat calls become no-ops.
 */
async function releasePayment(jobId) {
  const db = getDB();
  const [payment] = await db.select().from(payments).where(eq(payments.jobId, jobId)).limit(1);
  if (!payment) return;
  if (payment.status !== 'HELD') {
    console.log(`Payment for job ${jobId} is not in HELD state, skipping release`);
    return;
  }

  // Atomic claim: only one concurrent caller can flip HELD→RELEASED.
  const claimed = await db.update(payments)
    .set({ status: 'RELEASED', releasedAt: new Date() })
    .where(and(eq(payments.id, payment.id), eq(payments.status, 'HELD')))
    .returning();
  if (claimed.length === 0) {
    console.log(`Payment ${payment.id} already released by a concurrent caller; skipping.`);
    return;
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, payment.driverId || job.driverId)).limit(1);

  // Release merchant wallet hold (if WALLET-funded) — platform now owns the cash.
  if (payment.paymentProvider === 'WALLET') {
    await releaseHold(payment.businessId, jobId, payment.grossAmount);
  }

  // Credit pending earnings — the disbursement queue. Driver cashes out at end-of-shift
  // (manual via PIN) or via nightly cron — see services/payout.js.
  if (driver) {
    const { creditDriverEarnings } = require('./payout');
    await creditDriverEarnings(driver.id, payment.driverPayout);
  }

  // Mark job complete.
  await db.update(jobs).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(jobs.id, jobId));
}

async function refundPayment(jobId) {
  const db = getDB();
  const [payment] = await db.select().from(payments).where(eq(payments.jobId, jobId)).limit(1);
  if (!payment) return;
  if (payment.paymentProvider === 'WALLET') {
    const { returnHold } = require('./wallet');
    await returnHold(payment.businessId, jobId, payment.grossAmount);
  } else if (payment.providerTxRef) {
    const adapter = getAdapter(payment.paymentProvider);
    await adapter.refund(payment.providerTxRef, payment.grossAmount).catch(() => {});
  }
  await db.update(payments).set({ status: 'REFUNDED', refundedAt: new Date() }).where(eq(payments.id, payment.id));
}

module.exports = { releasePayment, refundPayment };
