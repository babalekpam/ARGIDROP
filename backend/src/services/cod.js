/**
 * Cash-on-Delivery (COD) service
 * Handles the full COD payment lifecycle:
 *   1. initiateCOD      — mark job + create payment row as COD_PENDING
 *   2. confirmCODCollection — driver confirms cash collected; splits earnings
 *   3. reconcileCOD     — admin marks COD fully settled; releases driver earnings
 */

import { eq, and } from 'drizzle-orm';
import { getDB } from '../config/database.js';
import {
  jobs,
  payments,
  drivers,
  businesses,
  businessWallets,
  walletTransactions,
  users,
} from '../schema.js';

const PLATFORM_COMMISSION_RATE = 0.15; // 15%

// ---------------------------------------------------------------------------
// initiateCOD
// ---------------------------------------------------------------------------

/**
 * Initiate a COD payment for a job.
 * Marks the job as cod_pending and inserts a payment record with status COD_PENDING.
 *
 * @param {string|number} jobId
 * @param {number} amount
 * @param {string} currency - e.g. 'XOF'
 * @returns {Promise<{ success: boolean, paymentId?: number, error?: string }>}
 */
export const initiateCOD = async (jobId, amount, currency) => {
  const db = getDB();
  try {
    await db
      .update(jobs)
      .set({ paymentStatus: 'cod_pending', updatedAt: new Date() })
      .where(eq(jobs.id, jobId));

    const [payment] = await db
      .insert(payments)
      .values({
        jobId,
        amount,
        currency,
        method: 'COD',
        status: 'COD_PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: payments.id });

    return { success: true, paymentId: payment.id };
  } catch (err) {
    console.error('[COD] initiateCOD error:', err.message);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// confirmCODCollection
// ---------------------------------------------------------------------------

/**
 * Driver confirms they have collected the cash from the customer.
 *
 * Steps:
 *  - Update payment status → COD_COLLECTED
 *  - Update job paymentStatus → cod_collected
 *  - Add driver earnings (collectedAmount minus 15% commission) to pendingEarnings
 *  - Credit 15% commission to the platform (business wallet) via walletTransactions
 *
 * @param {string|number} jobId
 * @param {string|number} driverId
 * @param {number} collectedAmount
 * @returns {Promise<{ success: boolean, driverEarnings?: number, commission?: number, error?: string }>}
 */
export const confirmCODCollection = async (jobId, driverId, collectedAmount) => {
  const db = getDB();
  try {
    const commission = Math.round(collectedAmount * PLATFORM_COMMISSION_RATE);
    const driverEarnings = collectedAmount - commission;

    // Update payment status
    await db
      .update(payments)
      .set({ status: 'COD_COLLECTED', collectedAmount, updatedAt: new Date() })
      .where(and(eq(payments.jobId, jobId), eq(payments.method, 'COD')));

    // Update job status
    await db
      .update(jobs)
      .set({ paymentStatus: 'cod_collected', updatedAt: new Date() })
      .where(eq(jobs.id, jobId));

    // Fetch driver
    const [driver] = await db
      .select({ pendingEarnings: drivers.pendingEarnings, businessId: drivers.businessId })
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .limit(1);

    if (!driver) throw new Error(`Driver ${driverId} not found`);

    const currentPending = Number(driver.pendingEarnings ?? 0);

    // Credit driver net earnings to pendingEarnings
    await db
      .update(drivers)
      .set({
        pendingEarnings: currentPending + driverEarnings,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driverId));

    // Credit platform commission to business wallet (if driver is linked to a business)
    if (driver.businessId) {
      const [wallet] = await db
        .select({ id: businessWallets.id, balance: businessWallets.balance })
        .from(businessWallets)
        .where(eq(businessWallets.businessId, driver.businessId))
        .limit(1);

      if (wallet) {
        const newBalance = Number(wallet.balance ?? 0) + commission;

        await db
          .update(businessWallets)
          .set({ balance: newBalance, updatedAt: new Date() })
          .where(eq(businessWallets.id, wallet.id));

        await db.insert(walletTransactions).values({
          walletId: wallet.id,
          type: 'CREDIT',
          amount: commission,
          description: `Commission plateforme (COD) — Commande #${jobId}`,
          referenceId: String(jobId),
          referenceType: 'JOB',
          createdAt: new Date(),
        });
      }
    }

    return { success: true, driverEarnings, commission };
  } catch (err) {
    console.error('[COD] confirmCODCollection error:', err.message);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// reconcileCOD
// ---------------------------------------------------------------------------

/**
 * Admin reconciles a COD job — marks it fully settled and releases the
 * driver's pending earnings into their available (total) earnings.
 *
 * Idempotent: calling this a second time on an already-reconciled job is a no-op.
 *
 * @param {string|number} jobId
 * @param {string|number} adminUserId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const reconcileCOD = async (jobId, adminUserId) => {
  const db = getDB();
  try {
    // Fetch the COD payment record
    const [payment] = await db
      .select({
        id: payments.id,
        collectedAmount: payments.collectedAmount,
        status: payments.status,
      })
      .from(payments)
      .where(and(eq(payments.jobId, jobId), eq(payments.method, 'COD')))
      .limit(1);

    if (!payment) throw new Error(`No COD payment found for job ${jobId}`);

    // Idempotent guard
    if (payment.status === 'COD_RECONCILED') return { success: true };

    // Fetch the job to get the assigned driver
    const [job] = await db
      .select({ driverId: jobs.driverId })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job?.driverId) throw new Error(`Job ${jobId} has no assigned driver`);

    // Release driver pending earnings → totalEarnings
    const [driver] = await db
      .select({ pendingEarnings: drivers.pendingEarnings, totalEarnings: drivers.totalEarnings })
      .from(drivers)
      .where(eq(drivers.id, job.driverId))
      .limit(1);

    if (driver) {
      const commission = Math.round(Number(payment.collectedAmount ?? 0) * PLATFORM_COMMISSION_RATE);
      const releaseAmount = Number(payment.collectedAmount ?? 0) - commission;
      const newPending = Math.max(0, Number(driver.pendingEarnings ?? 0) - releaseAmount);
      const newTotal = Number(driver.totalEarnings ?? 0) + releaseAmount;

      await db
        .update(drivers)
        .set({ pendingEarnings: newPending, totalEarnings: newTotal, updatedAt: new Date() })
        .where(eq(drivers.id, job.driverId));
    }

    // Mark payment as reconciled
    await db
      .update(payments)
      .set({
        status: 'COD_RECONCILED',
        reconciledBy: adminUserId,
        reconciledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Mark job payment status as reconciled
    await db
      .update(jobs)
      .set({ paymentStatus: 'reconciled', updatedAt: new Date() })
      .where(eq(jobs.id, jobId));

    return { success: true };
  } catch (err) {
    console.error('[COD] reconcileCOD error:', err.message);
    return { success: false, error: err.message };
  }
};
