/**
 * ArgiDrop Surge Pricing Engine
 * Computes demand/supply ratio per zone and applies dynamic multipliers.
 * Broadcasts updates to drivers via Socket.IO every 3 minutes.
 */

const { eq, and, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { zones, drivers, jobs } = require('../schema');

const SURGE_TIERS = [
  { maxRatio: 0.5, multiplier: 2.0, label: 'Forte demande' },
  { maxRatio: 1.0, multiplier: 1.5, label: 'Demande élevée' },
  { maxRatio: 2.0, multiplier: 1.2, label: 'Demande modérée' },
];

async function computeSurgeMultiplier(zoneId) {
  const db = getDB();
  try {
    const [zone] = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
    if (!zone) return { multiplier: 1.0, reason: 'Zone not found', supplyCount: 0, demandCount: 0 };

    const allOnlineDrivers = await db
      .select({ lat: drivers.currentLat, lng: drivers.currentLng })
      .from(drivers)
      .where(and(eq(drivers.isOnline, true), eq(drivers.isActive, true)));

    const centerLat = parseFloat(zone.centerLat || 6.14);
    const centerLng = parseFloat(zone.centerLng || 1.22);
    const radiusKm = zone.radiusKm || 30;

    const supplyDrivers = allOnlineDrivers.filter((d) => {
      if (!d.lat || !d.lng) return false;
      const dist = Math.sqrt(
        (parseFloat(d.lat) - centerLat) ** 2 + (parseFloat(d.lng) - centerLng) ** 2
      ) * 111;
      return dist <= radiusKm;
    });

    const [demandRow] = await db
      .select({ count: sql`count(*)::int` })
      .from(jobs)
      .where(and(eq(jobs.status, 'POSTED'), eq(jobs.zoneId, zoneId)));

    const supplyCount = supplyDrivers.length;
    const demandCount = parseInt(demandRow?.count || 0);

    if (demandCount === 0) return { multiplier: 1.0, reason: 'No active demand', supplyCount, demandCount };

    const ratio = supplyCount > 0 ? supplyCount / demandCount : 0;
    for (const tier of SURGE_TIERS) {
      if (ratio <= tier.maxRatio) return { multiplier: tier.multiplier, reason: tier.label, supplyCount, demandCount, ratio };
    }
    return { multiplier: 1.0, reason: 'Sufficient supply', supplyCount, demandCount, ratio };
  } catch (err) {
    console.error('surge error:', err.message);
    return { multiplier: 1.0, reason: 'Error', supplyCount: 0, demandCount: 0 };
  }
}

async function applySurge(basePrice, zoneId) {
  const { multiplier, reason } = await computeSurgeMultiplier(zoneId);
  return { finalPrice: Math.round(basePrice * multiplier), basePrice, multiplier, surgeActive: multiplier > 1.0, reason };
}

async function broadcastSurge(io, zoneId, multiplier) {
  io.to(`zone:${zoneId}`).emit('zone:surge_update', { zoneId, multiplier, timestamp: new Date().toISOString() });
}

async function scheduleSurgeUpdates(io) {
  const runCycle = async () => {
    try {
      const db = getDB();
      const activeZones = await db.select({ id: zones.id }).from(zones).where(eq(zones.isActive, true));
      for (const zone of activeZones) {
        const { multiplier } = await computeSurgeMultiplier(zone.id);
        await broadcastSurge(io, zone.id, multiplier);
        await db.update(zones).set({ surgeMultiplier: multiplier.toFixed(2) }).where(eq(zones.id, zone.id));
      }
    } catch (err) { console.error('Surge cycle error:', err.message); }
  };
  runCycle();
  setInterval(runCycle, 3 * 60 * 1000);
  console.log('✅ Surge pricing engine running (every 3 min)');
}

module.exports = { computeSurgeMultiplier, applySurge, broadcastSurge, scheduleSurgeUpdates };
