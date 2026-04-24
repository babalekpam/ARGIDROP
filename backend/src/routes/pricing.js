// Pricing Routes
// GET /pricing/quote — returns price for a delivery
// GET /pricing/estimate — quick estimate by distance
// Admin: manage zone pricing configs

const express = require('express');
const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { deliveryPricing, zones } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const { calculatePrice, estimatePrice, haversineKm } = require('../services/pricing');

const router = express.Router();

// POST /pricing/quote — full price calculation from GPS coords + job params
router.post('/quote', authenticate, async (req, res, next) => {
  try {
    const {
      pickupLat, pickupLng, dropoffLat, dropoffLng,
      weightKg = 0, isFragile = false, urgency = 'STANDARD',
      zoneId
    } = req.body;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({ success: false, message: 'Pickup and dropoff coordinates required' });
    }

    // Auto-detect zone if not provided
    let resolvedZoneId = zoneId;
    if (!resolvedZoneId) {
      const db = getDB();
      const allZones = await db.select().from(zones).where(eq(zones.isActive, true));
      const inZone = allZones.find(z => z.centerLat && z.centerLng &&
        haversineKm(parseFloat(pickupLat), parseFloat(pickupLng), parseFloat(z.centerLat), parseFloat(z.centerLng)) <= (z.radiusKm || 30));
      if (inZone) resolvedZoneId = inZone.id;
    }

    // Get zone surge multiplier
    let surgeMultiplier = 1.0;
    if (resolvedZoneId) {
      const db = getDB();
      const [zone] = await db.select().from(zones).where(eq(zones.id, resolvedZoneId)).limit(1);
      surgeMultiplier = parseFloat(zone?.surgeMultiplier || 1.0);
    }

    const result = await calculatePrice({
      pickupLat: parseFloat(pickupLat),
      pickupLng: parseFloat(pickupLng),
      dropoffLat: parseFloat(dropoffLat),
      dropoffLng: parseFloat(dropoffLng),
      weightKg: parseFloat(weightKg) || 0,
      isFragile: !!isFragile,
      urgency,
      zoneId: resolvedZoneId,
      surgeMultiplier,
    });

    res.json({ success: true, ...result, zoneId: resolvedZoneId });
  } catch (err) { next(err); }
});

// GET /pricing/estimate — quick estimate (no GPS needed, just distance)
router.get('/estimate', async (req, res, next) => {
  try {
    const { distanceKm = 5, weightKg = 0, isFragile = false, urgency = 'STANDARD', zoneId } = req.query;
    const result = await estimatePrice({
      distanceKm: parseFloat(distanceKm),
      weightKg: parseFloat(weightKg),
      isFragile: isFragile === 'true',
      urgency,
      zoneId,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /pricing/zones — get all zone pricing configs (admin)
router.get('/zones', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const configs = await db.select({ pricing: deliveryPricing, zone: zones })
      .from(deliveryPricing)
      .leftJoin(zones, eq(deliveryPricing.zoneId, zones.id));
    res.json({ success: true, configs });
  } catch (err) { next(err); }
});

// PUT /pricing/zones/:zoneId — upsert pricing config for a zone (admin)
router.put('/zones/:zoneId', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const [existing] = await db.select().from(deliveryPricing).where(eq(deliveryPricing.zoneId, req.params.zoneId)).limit(1);
    const data = { ...req.body, zoneId: req.params.zoneId, updatedAt: new Date() };

    let config;
    if (existing) {
      [config] = await db.update(deliveryPricing).set(data).where(eq(deliveryPricing.zoneId, req.params.zoneId)).returning();
    } else {
      [config] = await db.insert(deliveryPricing).values(data).returning();
    }
    res.json({ success: true, config });
  } catch (err) { next(err); }
});

module.exports = router;
