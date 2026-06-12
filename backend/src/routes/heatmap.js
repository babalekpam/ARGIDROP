/**
 * Demand Heatmap — real-time supply/demand data for drivers and admin.
 * Drivers use this to position for maximum earnings.
 * Admin uses this for operational visibility.
 */

const express = require('express');
const { eq, and, gte, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { drivers, jobs, zones, driverLocations } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /heatmap/demand
 * Returns demand grid: active jobs (unmatched POSTED) per zone + driver count.
 * Public-ish — drivers see it to know where to go; no sensitive data exposed.
 */
router.get('/demand', authenticate, async (req, res) => {
  try {
    const db = getDB();

    // Active unmatched jobs (demand signal)
    const demandJobs = await db
      .select({
        zoneId: jobs.zoneId,
        lat: jobs.pickupLat,
        lng: jobs.pickupLng,
        urgency: jobs.urgency,
      })
      .from(jobs)
      .where(eq(jobs.status, 'POSTED'))
      .limit(500);

    // Online drivers (supply signal)
    const supplyDrivers = await db
      .select({
        lat: drivers.currentLat,
        lng: drivers.currentLng,
        vehicleType: drivers.vehicleType,
        level: drivers.level,
      })
      .from(drivers)
      .where(and(eq(drivers.isOnline, true), eq(drivers.isActive, true)))
      .limit(500);

    // Per-zone aggregate
    const allZones = await db.select().from(zones).where(eq(zones.isActive, true));

    const zoneStats = allZones.map((zone) => {
      const zoneDemand = demandJobs.filter((j) => j.zoneId === zone.id);
      const zoneSupply = supplyDrivers.filter((d) => {
        if (!d.lat || !d.lng) return false;
        const dlat = parseFloat(d.lat) - parseFloat(zone.centerLat || 0);
        const dlng = parseFloat(d.lng) - parseFloat(zone.centerLng || 0);
        const dist = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
        return dist <= (zone.radiusKm || 30);
      });

      const ratio = zoneSupply.length > 0 ? zoneDemand.length / zoneSupply.length : zoneDemand.length;
      const surgeLevel = ratio >= 2 ? 'HIGH' : ratio >= 1 ? 'MEDIUM' : ratio >= 0.5 ? 'LOW' : 'SURPLUS';

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        zoneCode: zone.code,
        city: zone.city,
        centerLat: zone.centerLat,
        centerLng: zone.centerLng,
        radiusKm: zone.radiusKm,
        demandCount: zoneDemand.length,
        supplyCount: zoneSupply.length,
        ratio: ratio.toFixed(2),
        surgeLevel,
        surgeMultiplier: zone.surgeMultiplier,
        hotspots: zoneDemand.slice(0, 20).map((j) => ({
          lat: j.lat,
          lng: j.lng,
          weight: j.urgency === 'INSTANT' ? 3 : j.urgency === 'EXPRESS' ? 2 : 1,
        })),
      };
    });

    // Raw driver positions (for admin live-map enhancement)
    const driverPositions = req.user.role === 'ADMIN'
      ? supplyDrivers.map((d) => ({ lat: d.lat, lng: d.lng, vehicleType: d.vehicleType, level: d.level }))
      : [];

    res.json({
      timestamp: new Date().toISOString(),
      zones: zoneStats,
      totalDemand: demandJobs.length,
      totalSupply: supplyDrivers.length,
      driverPositions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute heatmap' });
  }
});

/**
 * GET /heatmap/hotspots
 * Driver-facing: top 10 hotspot coordinates to position near.
 */
router.get('/hotspots', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const { lat, lng } = req.query;

    const postedJobs = await db
      .select({ lat: jobs.pickupLat, lng: jobs.pickupLng, urgency: jobs.urgency, city: jobs.pickupCity })
      .from(jobs)
      .where(eq(jobs.status, 'POSTED'))
      .limit(200);

    // Cluster into ~1km grid cells
    const grid = {};
    for (const j of postedJobs) {
      if (!j.lat || !j.lng) continue;
      const cellLat = Math.round(parseFloat(j.lat) * 100) / 100;
      const cellLng = Math.round(parseFloat(j.lng) * 100) / 100;
      const key = `${cellLat}:${cellLng}`;
      if (!grid[key]) grid[key] = { lat: cellLat, lng: cellLng, count: 0, maxUrgency: 'STANDARD' };
      grid[key].count++;
      if (j.urgency === 'INSTANT' || (j.urgency === 'EXPRESS' && grid[key].maxUrgency === 'STANDARD')) {
        grid[key].maxUrgency = j.urgency;
      }
    }

    let hotspots = Object.values(grid).sort((a, b) => b.count - a.count).slice(0, 10);

    // If driver location provided, sort by proximity
    if (lat && lng) {
      const driverLat = parseFloat(lat);
      const driverLng = parseFloat(lng);
      hotspots = hotspots
        .map((h) => ({
          ...h,
          distanceKm: Math.round(Math.sqrt((h.lat - driverLat) ** 2 + (h.lng - driverLng) ** 2) * 111 * 10) / 10,
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    res.json({ hotspots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute hotspots' });
  }
});

/**
 * GET /heatmap/surge — current surge multiplier for a zone
 */
router.get('/surge/:zoneId', async (req, res) => {
  try {
    const { computeSurgeMultiplier } = require('../services/surge');
    const { multiplier, reason } = await computeSurgeMultiplier(req.params.zoneId);
    res.json({ zoneId: req.params.zoneId, multiplier, reason });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute surge' });
  }
});

module.exports = router;
