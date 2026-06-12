/**
 * Driver Level Service — ArgiDrop gamification engine.
 *
 * Levels: BRONZE (0-49 trips) → SILVER (50-199) → GOLD (200-499) → PLATINUM (500+)
 * On promotion the driver's levelBonusPct and hasAccidentInsurance are updated.
 * Badges are awarded at milestone thresholds.
 *
 * Called after every COMPLETED delivery (from jobs route) and on-demand via admin.
 */

const { eq, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { drivers, driverAchievements } = require('../schema');

const LEVELS = [
  { name: 'BRONZE',   minTrips: 0,   bonusPct: '0.00',  insurance: false },
  { name: 'SILVER',   minTrips: 50,  bonusPct: '3.00',  insurance: false },
  { name: 'GOLD',     minTrips: 200, bonusPct: '6.00',  insurance: true  },
  { name: 'PLATINUM', minTrips: 500, bonusPct: '10.00', insurance: true  },
];

// Milestone badges (type → minimum totalRidesAllTime required)
const MILESTONE_BADGES = [
  { type: 'FIRST_DELIVERY',  threshold: 1,   nameFr: 'Première livraison', nameEn: 'First Delivery' },
  { type: 'CENTURY',         threshold: 100, nameFr: 'Centurion',          nameEn: 'Centurion' },
  { type: 'FIVE_HUNDRED',    threshold: 500, nameFr: 'Légendaire',         nameEn: 'Legendary' },
  { type: 'THOUSAND',        threshold: 1000,nameFr: 'Maître livreur',     nameEn: 'Master Courier' },
];

function resolveLevel(totalTrips) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalTrips >= lvl.minTrips) current = lvl;
  }
  return current;
}

async function syncDriverLevel(driverId) {
  const [driver] = await getDB()
    .select({ totalRidesAllTime: drivers.totalRidesAllTime, level: drivers.level })
    .from(drivers)
    .where(eq(drivers.id, driverId))
    .limit(1);

  if (!driver) return null;

  const target = resolveLevel(driver.totalRidesAllTime || 0);
  const promoted = driver.level !== target.name;

  if (promoted) {
    await getDB()
      .update(drivers)
      .set({
        level: target.name,
        levelBonusPct: target.bonusPct,
        hasAccidentInsurance: target.insurance,
        levelUpdatedAt: new Date(),
      })
      .where(eq(drivers.id, driverId));

    // Award level badge
    await getDB()
      .insert(driverAchievements)
      .values({
        driverId,
        badgeType: `LEVEL_${target.name}`,
        badgeName: `${target.name} Driver`,
        badgeNameFr: `Livreur ${target.name}`,
        description: `Reached ${target.name} level`,
        descriptionFr: `Niveau ${target.name} atteint`,
        awardedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // Check milestone badges
  const total = driver.totalRidesAllTime || 0;
  for (const badge of MILESTONE_BADGES) {
    if (total >= badge.threshold) {
      await getDB()
        .insert(driverAchievements)
        .values({
          driverId,
          badgeType: badge.type,
          badgeName: badge.nameEn,
          badgeNameFr: badge.nameFr,
          awardedAt: new Date(),
        })
        .onConflictDoNothing();
    }
  }

  return { level: target.name, promoted };
}

/**
 * Increment totalRidesAllTime after a completed delivery/ride and sync level.
 */
async function recordCompletedTrip(driverId) {
  await getDB()
    .update(drivers)
    .set({
      totalRidesAllTime: sql`total_rides_all_time + 1`,
      totalDeliveries: sql`total_deliveries + 1`,
      updatedAt: new Date(),
    })
    .where(eq(drivers.id, driverId));

  return syncDriverLevel(driverId);
}

module.exports = { syncDriverLevel, recordCompletedTrip, resolveLevel, LEVELS };
