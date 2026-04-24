// Payment service — now routes through payment-adapter for Africa-first providers
const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { payments, jobs, drivers } = require('../schema');
const { getAdapter } = require('./payment-adapter');
const { releaseHold } = require('./wallet');

/**
 * Release payment to driver after delivery confirmed (via QR scan)
 * Called from qr.js after successful delivery scan
 */
async function releasePayment(jobId) {
  const db = getDB();
  const [payment] = await db.select().from(payments).where(eq(payments.jobId, jobId)).limit(1);
  if (!payment || payment.status !== 'HELD') {
    console.log(`Payment for job ${jobId} is not in HELD state, skipping release`);
    return;
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, payment.driverId || job.driverId)).limit(1);

  // ─── WALLET PAYMENT — release hold ───
  if (payment.paymentProvider === 'WALLET') {
    await releaseHold(payment.businessId, jobId, payment.grossAmount);
  }

  // ─── PAYOUT DRIVER ───
  if (driver?.payoutAccount && driver?.payoutProvider) {
    const adapter = getAdapter(driver.payoutProvider === 'MTN_MOMO' ? 'FLUTTERWAVE' : driver.payoutProvider);
    const payoutRef = `DLV-PAYOUT-${jobId.substring(0, 8)}-${Date.now()}`;
    const result = await adapter.initiatePayout({
      amount: payment.driverPayout,
      currency: payment.currency,
      recipientPhone: driver.payoutAccount,
      recipientName: driver.firstName || 'Driver',
      reference: payoutRef,
      provider: mapPayoutProvider(driver.payoutProvider)
    }).catch(err => {
      console.error('Payout error:', err);
      return { success: false };
    });

    if (result?.success) {
      await db.update(payments).set({
        status: 'RELEASED', releasedAt: new Date(),
        providerPayoutRef: result.providerPayoutRef
      }).where(eq(payments.id, payment.id));
    } else {
      // Mark for retry
      console.error(`Payout failed for job ${jobId}, will retry`);
    }
  } else {
    // No payout account — still mark released in our ledger, driver can withdraw later
    await db.update(payments).set({ status: 'RELEASED', releasedAt: new Date() }).where(eq(payments.id, payment.id));
  }

  // Update driver earnings
  const { sql } = require('drizzle-orm');
  await db.update(drivers).set({
    totalEarnings: sql`${drivers.totalEarnings} + ${payment.driverPayout}`,
    totalDeliveries: sql`${drivers.totalDeliveries} + 1`,
    updatedAt: new Date()
  }).where(eq(drivers.id, driver.id));

  // Mark job complete
  await db.update(jobs).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(jobs.id, jobId));
}

function mapPayoutProvider(enumVal) {
  const map = { MTN_MOMO: 'MTN', ORANGE_MONEY: 'ORANGE', MOOV: 'MOOV', WAVE: 'WAVE', TMONEY: 'TMONEY' };
  return map[enumVal] || 'MTN';
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
