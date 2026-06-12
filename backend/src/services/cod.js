/**
 * Cash-on-Delivery (COD) service
 * Lifecycle: COD_PENDING → COD_COLLECTED → COD_RECONCILED
 */

const { eq, and } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { jobs, payments, drivers, businessWallets, walletTransactions } = require('../schema');

const PLATFORM_COMMISSION_RATE = 0.15;

// ── initiateCOD ────────────────────────────────────────────────────────────

const initiateCOD = async (jobId, amount, currency) => {
  const db = getDB();
  try {
    await db.update(jobs).set({ paymentStatus: 'cod_pending', updatedAt: new Date() }).where(eq(jobs.id, jobId));

    const [payment] = await db.insert(payments).values({
      jobId, amount, currency, method: 'COD', status: 'COD_PENDING',
      createdAt: new Date(), updatedAt: new Date(),
    }).returning({ id: payments.id });

    return { success: true, paymentId: payment.id };
  } catch (err) {
    console.error('[COD] initiateCOD error:', err.message);
    return { success: false, error: err.message };
  }
};

// ── confirmCODCollection ───────────────────────────────────────────────────

const confirmCODCollection = async (jobId, driverId, collectedAmount) => {
  const db = getDB();
  try {
    const commission = Math.round(collectedAmount * PLATFORM_COMMISSION_RATE);
    const driverEarnings = collectedAmount - commission;

    await db.update(payments)
      .set({ status: 'COD_COLLECTED', collectedAmount, updatedAt: new Date() })
      .where(and(eq(payments.jobId, jobId), eq(payments.method, 'COD')));

    await db.update(jobs).set({ paymentStatus: 'cod_collected', updatedAt: new Date() }).where(eq(jobs.id, jobId));

    const [driver] = await db
      .select({ pendingEarnings: drivers.pendingEarnings, businessId: drivers.businessId })
      .from(drivers).where(eq(drivers.id, driverId)).limit(1);

    if (!driver) throw new Error(`Driver ${driverId} not found`);

    await db.update(drivers).set({
      pendingEarnings: Number(driver.pendingEarnings ?? 0) + driverEarnings, updatedAt: new Date(),
    }).where(eq(drivers.id, driverId));

    if (driver.businessId) {
      const [wallet] = await db
        .select({ id: businessWallets.id, balance: businessWallets.balance })
        .from(businessWallets).where(eq(businessWallets.businessId, driver.businessId)).limit(1);

      if (wallet) {
        await db.update(businessWallets).set({
          balance: Number(wallet.balance ?? 0) + commission, updatedAt: new Date(),
        }).where(eq(businessWallets.id, wallet.id));

        await db.insert(walletTransactions).values({
          walletId: wallet.id, type: 'CREDIT', amount: commission,
          description: `Commission plateforme (COD) — Commande #${jobId}`,
          referenceId: String(jobId), referenceType: 'JOB', createdAt: new Date(),
        });
      }
    }

    return { success: true, driverEarnings, commission };
  } catch (err) {
    console.error('[COD] confirmCODCollection error:', err.message);
    return { success: false, error: err.message };
  }
};

// ── reconcileCOD ───────────────────────────────────────────────────────────

const reconcileCOD = async (jobId, adminUserId) => {
  const db = getDB();
  try {
    const [payment] = await db
      .select({ id: payments.id, collectedAmount: payments.collectedAmount, status: payments.status })
      .from(payments).where(and(eq(payments.jobId, jobId), eq(payments.method, 'COD'))).limit(1);

    if (!payment) throw new Error(`No COD payment found for job ${jobId}`);
    if (payment.status === 'COD_RECONCILED') return { success: true };

    const [job] = await db.select({ driverId: jobs.driverId }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job?.driverId) throw new Error(`Job ${jobId} has no assigned driver`);

    const [driver] = await db
      .select({ pendingEarnings: drivers.pendingEarnings, totalEarnings: drivers.totalEarnings })
      .from(drivers).where(eq(drivers.id, job.driverId)).limit(1);

    if (driver) {
      const commission = Math.round(Number(payment.collectedAmount ?? 0) * PLATFORM_COMMISSION_RATE);
      const releaseAmount = Number(payment.collectedAmount ?? 0) - commission;
      await db.update(drivers).set({
        pendingEarnings: Math.max(0, Number(driver.pendingEarnings ?? 0) - releaseAmount),
        totalEarnings: Number(driver.totalEarnings ?? 0) + releaseAmount,
        updatedAt: new Date(),
      }).where(eq(drivers.id, job.driverId));
    }

    await db.update(payments).set({
      status: 'COD_RECONCILED', reconciledBy: adminUserId, reconciledAt: new Date(), updatedAt: new Date(),
    }).where(eq(payments.id, payment.id));

    await db.update(jobs).set({ paymentStatus: 'reconciled', updatedAt: new Date() }).where(eq(jobs.id, jobId));

    return { success: true };
  } catch (err) {
    console.error('[COD] reconcileCOD error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { initiateCOD, confirmCODCollection, reconcileCOD };
