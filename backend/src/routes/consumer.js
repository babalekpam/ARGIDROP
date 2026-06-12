/**
 * ArgiDrop Consumer Delivery — B2C individual senders
 *
 * Any authenticated user can post a consumer delivery.
 * Price includes a 5% "consumer fee" on top of the normal rate.
 * Jobs are created under a platform-configured CONSUMER_POOL business.
 */

const express = require('express');
const crypto = require('crypto');
const { eq, desc } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { jobs, platformSettings } = require('../schema');

const router = express.Router();

// ── Constants ──────────────────────────────────────────────────────────────
const BASE_FARE_XOF = 500;
const RATE_PER_KM_XOF = 150;
const CONSUMER_FEE_PCT = 0.05;

const PACKAGE_TYPES = ['DOCUMENT', 'SMALL_PARCEL', 'MEDIUM_PARCEL', 'LARGE_PARCEL', 'FOOD', 'FRAGILE'];
const URGENCY_LEVELS = ['STANDARD', 'EXPRESS', 'URGENT'];
const URGENCY_MULTIPLIER = { STANDARD: 1.0, EXPRESS: 1.3, URGENT: 1.6 };

// ── Helpers ────────────────────────────────────────────────────────────────

function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111;
}

function calcPrice(distanceKm, weightKg, urgency) {
  const weightSurcharge = Math.max(0, (weightKg - 1)) * 50;
  const urgencyMult = URGENCY_MULTIPLIER[urgency] || 1.0;
  const base = (BASE_FARE_XOF + distanceKm * RATE_PER_KM_XOF + weightSurcharge) * urgencyMult;
  const consumerFee = Math.round(base * CONSUMER_FEE_PCT);
  const total = Math.round(base) + consumerFee;
  return { base: Math.round(base), consumerFee, total };
}

async function getConsumerPoolBusinessId(db) {
  const [setting] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, 'CONSUMER_POOL_BUSINESS_ID'))
    .limit(1);

  if (!setting || !setting.value) {
    throw new Error('CONSUMER_POOL_BUSINESS_ID not configured in platform_settings');
  }
  return setting.value;
}

// ── Routes ─────────────────────────────────────────────────────────────────

// POST /quote — price estimate with consumer fee breakdown (no auth)
router.post('/quote', async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng, packageType, weightKg, urgency } = req.body;

    if (fromLat == null || fromLng == null || toLat == null || toLng == null ||
        !packageType || weightKg == null || !urgency) {
      return res.status(400).json({ error: 'fromLat, fromLng, toLat, toLng, packageType, weightKg, urgency are required' });
    }

    if (!PACKAGE_TYPES.includes(packageType)) {
      return res.status(400).json({ error: `packageType must be one of: ${PACKAGE_TYPES.join(', ')}` });
    }

    if (!URGENCY_LEVELS.includes(urgency)) {
      return res.status(400).json({ error: `urgency must be one of: ${URGENCY_LEVELS.join(', ')}` });
    }

    const distanceKm = calcDistanceKm(parseFloat(fromLat), parseFloat(fromLng), parseFloat(toLat), parseFloat(toLng));
    const { base, consumerFee, total } = calcPrice(distanceKm, parseFloat(weightKg), urgency);

    return res.json({
      quote: {
        distanceKm: Math.round(distanceKm * 100) / 100,
        estimatedPrice: total,
        currency: 'XOF',
        breakdown: {
          baseFare: BASE_FARE_XOF,
          distanceFare: Math.round(distanceKm * RATE_PER_KM_XOF),
          weightSurcharge: Math.round(Math.max(0, (parseFloat(weightKg) - 1)) * 50),
          urgencyMultiplier: URGENCY_MULTIPLIER[urgency],
          subtotal: base,
          consumerFeePct: '5%',
          consumerFee,
          total,
        },
        packageType,
        weightKg,
        urgency,
      },
    });
  } catch (err) {
    console.error('[consumer] /quote error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /order — create consumer delivery job (auth required)
router.post('/order', authenticate, async (req, res) => {
  try {
    const {
      pickupAddress, pickupLat, pickupLng, pickupPhone,
      dropoffAddress, dropoffLat, dropoffLng, dropoffPhone,
      packageType, packageDescription, weightKg, urgency,
      paymentMethod, cashOnDelivery, notes,
    } = req.body;

    if (!pickupAddress || pickupLat == null || pickupLng == null || !pickupPhone ||
        !dropoffAddress || dropoffLat == null || dropoffLng == null || !dropoffPhone ||
        !packageType || weightKg == null || !urgency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!PACKAGE_TYPES.includes(packageType)) {
      return res.status(400).json({ error: `packageType must be one of: ${PACKAGE_TYPES.join(', ')}` });
    }

    if (!URGENCY_LEVELS.includes(urgency)) {
      return res.status(400).json({ error: `urgency must be one of: ${URGENCY_LEVELS.join(', ')}` });
    }

    const db = getDB();
    const consumerPoolBusinessId = await getConsumerPoolBusinessId(db);

    const distanceKm = calcDistanceKm(parseFloat(pickupLat), parseFloat(pickupLng), parseFloat(dropoffLat), parseFloat(dropoffLng));
    const { base, consumerFee, total } = calcPrice(distanceKm, parseFloat(weightKg), urgency);

    const trackingToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();

    const [newJob] = await db
      .insert(jobs)
      .values({
        businessId: consumerPoolBusinessId,
        createdByUserId: req.user.id,
        pickupAddress,
        pickupLat: String(pickupLat),
        pickupLng: String(pickupLng),
        pickupPhone,
        dropoffAddress,
        dropoffLat: String(dropoffLat),
        dropoffLng: String(dropoffLng),
        dropoffPhone,
        packageType,
        packageDescription: packageDescription || null,
        weightKg: String(weightKg),
        urgency,
        cashOnDelivery: cashOnDelivery || false,
        notes: notes || null,
        priceOffered: String(total),
        currency: 'XOF',
        status: 'PENDING',
        trackingToken,
        consumerSurcharge: String(consumerFee),
        isConsumerOrder: true,
      })
      .returning();

    return res.status(201).json({
      order: newJob,
      priceBreakdown: { subtotal: base, consumerFeePct: '5%', consumerFee, total, currency: 'XOF' },
      trackingToken,
      trackingUrl: `/track/${trackingToken}`,
    });
  } catch (err) {
    console.error('[consumer] /order error:', err);
    if (err.message && err.message.includes('CONSUMER_POOL_BUSINESS_ID')) {
      return res.status(503).json({ error: 'Consumer delivery service not configured. Please contact support.' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /orders — my last 20 consumer orders (auth required)
router.get('/orders', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const myOrders = await db
      .select()
      .from(jobs)
      .where(eq(jobs.createdByUserId, req.user.id))
      .orderBy(desc(jobs.createdAt))
      .limit(20);

    return res.json({ orders: myOrders, total: myOrders.length });
  } catch (err) {
    console.error('[consumer] /orders error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /orders/:trackingToken — public tracking (no auth)
router.get('/orders/:trackingToken', async (req, res) => {
  try {
    const { trackingToken } = req.params;
    const db = getDB();

    const [job] = await db
      .select({
        id: jobs.id,
        trackingToken: jobs.trackingToken,
        status: jobs.status,
        pickupAddress: jobs.pickupAddress,
        dropoffAddress: jobs.dropoffAddress,
        packageType: jobs.packageType,
        urgency: jobs.urgency,
        estimatedPrice: jobs.estimatedPrice,
        currency: jobs.currency,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(eq(jobs.trackingToken, trackingToken))
      .limit(1);

    if (!job) return res.status(404).json({ error: 'Order not found' });

    return res.json({ order: job });
  } catch (err) {
    console.error('[consumer] /orders/:trackingToken error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
