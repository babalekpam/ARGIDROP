/**
 * Driver Welfare / Minimum Earnings Guarantee Service
 *
 * Guarantees eligible drivers (GOLD or PLATINUM level) a minimum of 5,000 XOF
 * per 4-hour shift. If a driver earns less, the shortfall is topped up from
 * platform funds and a WhatsApp notification is sent.
 *
 * NOTE: Welfare payment records are stored in an in-memory log.
 * Replace with a real DB table after running the migration that adds
 * a `welfarePayments` table.
 */

import { eq, and, gte } from 'drizzle-orm';
import { getDB } from '../config/database.js';
import { drivers, users } from '../schema.js';
import { sendDriverWelfare } from './whatsapp.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MINIMUM_GUARANTEE_XOF = 5000;       // per 4-hour shift
const SHIFT_DURATION_HOURS = 4;
const SHIFT_DURATION_MS = SHIFT_DURATION_HOURS * 60 * 60 * 1000;
const ELIGIBLE_LEVELS = ['GOLD', 'PLATINUM'];
const CURRENCY = 'XOF';

// ---------------------------------------------------------------------------
// In-memory welfare payment log (replace with DB table after migration)
// ---------------------------------------------------------------------------

/**
 * @type {Array<{ driverId: string|number, amount: number, currency: string, ts: Date, periodEnd: string }>}
 */
const welfareLog = [];

// ---------------------------------------------------------------------------
// checkWelfareEligibility
// ---------------------------------------------------------------------------

/**
 * Check whether a driver qualifies for a welfare top-up.
 *
 * Eligibility criteria:
 *   1. Driver level is GOLD or PLATINUM
 *   2. Driver has been on shift for at least 4 hours (shiftStartedAt set)
 *   3. Driver's current pendingEarnings are below the 5,000 XOF guarantee
 *
 * @param {string|number} driverId
 * @returns {Promise<{ eligible: boolean, shortfall: number, guaranteeAmount: number, reason?: string }>}
 */
export const checkWelfareEligibility = async (driverId) => {
  const db = getDB();
  try {
    const [driver] = await db
      .select({
        id: drivers.id,
        level: drivers.level,
        shiftStartedAt: drivers.shiftStartedAt,
        pendingEarnings: drivers.pendingEarnings,
        isOnShift: drivers.isOnShift,
      })
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .limit(1);

    if (!driver) {
      return { eligible: false, shortfall: 0, guaranteeAmount: MINIMUM_GUARANTEE_XOF, reason: 'Driver not found' };
    }

    // Check tier
    if (!ELIGIBLE_LEVELS.includes(driver.level)) {
      return {
        eligible: false,
        shortfall: 0,
        guaranteeAmount: MINIMUM_GUARANTEE_XOF,
        reason: `Level ${driver.level} not eligible (need GOLD or PLATINUM)`,
      };
    }

    // Check shift duration
    if (!driver.isOnShift || !driver.shiftStartedAt) {
      return { eligible: false, shortfall: 0, guaranteeAmount: MINIMUM_GUARANTEE_XOF, reason: 'Driver not on shift' };
    }

    const shiftMs = Date.now() - new Date(driver.shiftStartedAt).getTime();
    if (shiftMs < SHIFT_DURATION_MS) {
      const hoursOnShift = (shiftMs / 3600000).toFixed(1);
      return {
        eligible: false,
        shortfall: 0,
        guaranteeAmount: MINIMUM_GUARANTEE_XOF,
        reason: `Only ${hoursOnShift}h on shift — minimum ${SHIFT_DURATION_HOURS}h required`,
      };
    }

    // Check earnings
    const earned = Number(driver.pendingEarnings ?? 0);
    if (earned >= MINIMUM_GUARANTEE_XOF) {
      return { eligible: false, shortfall: 0, guaranteeAmount: MINIMUM_GUARANTEE_XOF, reason: 'Earnings meet guarantee' };
    }

    const shortfall = MINIMUM_GUARANTEE_XOF - earned;
    return { eligible: true, shortfall, guaranteeAmount: MINIMUM_GUARANTEE_XOF };
  } catch (err) {
    console.error('[Welfare] checkWelfareEligibility error:', err.message);
    return { eligible: false, shortfall: 0, guaranteeAmount: MINIMUM_GUARANTEE_XOF, reason: err.message };
  }
};

// ---------------------------------------------------------------------------
// processWelfareTopup
// ---------------------------------------------------------------------------

/**
 * If a driver is eligible, credit the earnings shortfall to their pendingEarnings,
 * log the welfare payment (in-memory), and send a WhatsApp notification.
 *
 * @param {string|number} driverId
 * @returns {Promise<{ success: boolean, topupAmount?: number, error?: string }>}
 */
export const processWelfareTopup = async (driverId) => {
  const db = getDB();
  try {
    const eligibility = await checkWelfareEligibility(driverId);

    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason ?? 'Not eligible' };
    }

    const { shortfall } = eligibility;

    // Fetch driver + user details for notification
    const [driver] = await db
      .select({
        id: drivers.id,
        pendingEarnings: drivers.pendingEarnings,
        userId: drivers.userId,
        shiftStartedAt: drivers.shiftStartedAt,
      })
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .limit(1);

    if (!driver) throw new Error(`Driver ${driverId} not found`);

    // Credit shortfall to pendingEarnings
    const newPending = Number(driver.pendingEarnings ?? 0) + shortfall;
    await db
      .update(drivers)
      .set({ pendingEarnings: newPending, updatedAt: new Date() })
      .where(eq(drivers.id, driverId));

    // Compute period end (now)
    const periodEnd = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' });

    // Log welfare payment in memory (replace with DB insert after migration)
    welfareLog.push({
      driverId,
      amount: shortfall,
      currency: CURRENCY,
      ts: new Date(),
      periodEnd,
    });

    // Send WhatsApp notification if we can get the user's phone number
    if (driver.userId) {
      const [user] = await db
        .select({ phone: users.phone, firstName: users.firstName })
        .from(users)
        .where(eq(users.id, driver.userId))
        .limit(1);

      if (user?.phone) {
        await sendDriverWelfare(user.phone, {
          driverName: user.firstName ?? 'Livreur',
          guaranteeAmount: shortfall,
          currency: CURRENCY,
          periodEnd,
        });
      }
    }

    return { success: true, topupAmount: shortfall };
  } catch (err) {
    console.error('[Welfare] processWelfareTopup error:', err.message);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// runWelfareCheck
// ---------------------------------------------------------------------------

/**
 * Nightly cron entry point.
 * Queries all active GOLD and PLATINUM drivers currently on shift,
 * then runs processWelfareTopup for each eligible one.
 *
 * @returns {Promise<{ checked: number, topupsApplied: number, errors: number }>}
 */
export const runWelfareCheck = async () => {
  const db = getDB();
  let checked = 0;
  let topupsApplied = 0;
  let errors = 0;

  try {
    // Fetch all active GOLD/PLATINUM drivers currently on shift
    const eligibleDrivers = await db
      .select({ id: drivers.id })
      .from(drivers)
      .where(
        and(
          eq(drivers.isOnShift, true),
          // We filter by level in JS since drizzle doesn't have a built-in IN shorthand via these imports
        )
      );

    // Filter to GOLD/PLATINUM in memory (avoids needing sql`IN` operator)
    const allActiveDrivers = await db
      .select({ id: drivers.id, level: drivers.level })
      .from(drivers)
      .where(eq(drivers.isOnShift, true));

    const targets = allActiveDrivers.filter((d) => ELIGIBLE_LEVELS.includes(d.level));
    checked = targets.length;

    for (const driver of targets) {
      const result = await processWelfareTopup(driver.id);
      if (result.success) {
        topupsApplied++;
      } else if (result.error && !result.error.includes('Not eligible') && !result.error.includes('Earnings meet')) {
        errors++;
        console.error(`[Welfare] Top-up failed for driver ${driver.id}:`, result.error);
      }
    }
  } catch (err) {
    console.error('[Welfare] runWelfareCheck error:', err.message);
    errors++;
  }

  console.log(`[Welfare] Check complete — checked: ${checked}, topups: ${topupsApplied}, errors: ${errors}`);
  return { checked, topupsApplied, errors };
};
