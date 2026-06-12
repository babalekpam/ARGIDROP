/**
 * Driver Welfare / Minimum Earnings Guarantee Service
 *
 * GOLD/PLATINUM drivers guaranteed 5,000 XOF per 4-hour shift.
 * Shortfall is topped up from platform funds + WhatsApp notification sent.
 *
 * NOTE: Welfare payment records are stored in-memory.
 * Replace with DB table (`welfare_payments`) after migration.
 */

const { eq, and } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { drivers, users } = require('../schema');
const { sendDriverWelfare } = require('./whatsapp');

// ── Constants ──────────────────────────────────────────────────────────────
const MINIMUM_GUARANTEE_XOF = parseInt(process.env.WELFARE_MINIMUM_XOF || '5000', 10);
const SHIFT_DURATION_HOURS = parseInt(process.env.WELFARE_SHIFT_HOURS || '4', 10);
const SHIFT_DURATION_MS = SHIFT_DURATION_HOURS * 60 * 60 * 1000;
const ELIGIBLE_LEVELS = ['GOLD', 'PLATINUM'];
const CURRENCY = 'XOF';

// ── In-memory welfare log (replace with DB table after migration) ──────────
const welfareLog = [];

// ── checkWelfareEligibility ────────────────────────────────────────────────

async function checkWelfareEligibility(driverId) {
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

    if (!ELIGIBLE_LEVELS.includes(driver.level)) {
      return { eligible: false, shortfall: 0, guaranteeAmount: MINIMUM_GUARANTEE_XOF, reason: `Level ${driver.level} not eligible (need GOLD or PLATINUM)` };
    }

    if (!driver.isOnShift || !driver.shiftStartedAt) {
      return { eligible: false, shortfall: 0, guaranteeAmount: MINIMUM_GUARANTEE_XOF, reason: 'Driver not on shift' };
    }

    const shiftMs = Date.now() - new Date(driver.shiftStartedAt).getTime();
    if (shiftMs < SHIFT_DURATION_MS) {
      const hoursOnShift = (shiftMs / 3600000).toFixed(1);
      return { eligible: false, shortfall: 0, guaranteeAmount: MINIMUM_GUARANTEE_XOF, reason: `Only ${hoursOnShift}h on shift — minimum ${SHIFT_DURATION_HOURS}h required` };
    }

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
}

// ── processWelfareTopup ────────────────────────────────────────────────────

async function processWelfareTopup(driverId) {
  const db = getDB();
  try {
    const eligibility = await checkWelfareEligibility(driverId);
    if (!eligibility.eligible) return { success: false, error: eligibility.reason ?? 'Not eligible' };

    const { shortfall } = eligibility;

    const [driver] = await db
      .select({ id: drivers.id, pendingEarnings: drivers.pendingEarnings, userId: drivers.userId, shiftStartedAt: drivers.shiftStartedAt })
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .limit(1);

    if (!driver) throw new Error(`Driver ${driverId} not found`);

    const newPending = Number(driver.pendingEarnings ?? 0) + shortfall;
    await db.update(drivers).set({ pendingEarnings: newPending, updatedAt: new Date() }).where(eq(drivers.id, driverId));

    const periodEnd = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' });
    welfareLog.push({ driverId, amount: shortfall, currency: CURRENCY, ts: new Date(), periodEnd });

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
}

// ── runWelfareCheck ────────────────────────────────────────────────────────

async function runWelfareCheck() {
  const db = getDB();
  let checked = 0;
  let topupsApplied = 0;
  let errors = 0;

  try {
    const allOnShift = await db
      .select({ id: drivers.id, level: drivers.level })
      .from(drivers)
      .where(eq(drivers.isOnShift, true));

    const targets = allOnShift.filter(d => ELIGIBLE_LEVELS.includes(d.level));
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
}

function getWelfareHistory() {
  return [...welfareLog].reverse();
}

module.exports = { checkWelfareEligibility, processWelfareTopup, runWelfareCheck, getWelfareHistory };
