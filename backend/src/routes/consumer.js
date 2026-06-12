/**
 * ArgiDrop B2C Consumer Delivery
 * Individual senders — any authenticated user can place a delivery order.
 * A 5 % "consumer fee" is applied on top of the base delivery rate.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { eq, and, desc } from 'drizzle-orm';
import { getDB } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { jobs, businesses, platformSettings, payments } from '../schema.js';

const router = Router();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CONSUMER_FEE_PCT = 5; // 5 % consumer surcharge
const BASE_DELIVERY = 500;  // XOF
const PER_KM_RATE = 150;    // XOF/km

// Package weight tiers (XOF extra)
const WEIGHT_SURCHARGE = (weightKg) => {
  if (weightKg <= 1) return 0;
  if (weightKg <= 5) return 200;
  if (weightKg <= 15) return 500;
  return 1000;
};

// Urgency multiplier
const URGENCY_MULTIPLIER = {
  STANDARD: 1.0,
  EXPRESS: 1.4,
  SAME_DAY: 1.2,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function distanceKm(lat1, lng1, lat2, lng2) {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2)) * 111;
}

function calcPrice(fromLat, fromLng, toLat, toLng, weightKg = 0, urgency = 'STANDARD') {
  const distKm = distanceKm(
    parseFloat(fromLat),
    parseFloat(fromLng),
    parseFloat(toLat),
    parseFloat(toLng)
  );
  const multiplier = URGENCY_MULTIPLIER[urgency] ?? 1.0;
  const basePrice = (BASE_DELIVERY + PER_KM_RATE * distKm + WEIGHT_SURCHARGE(parseFloat(weightKg))) * multiplier;
  const consumerFee = basePrice * (CONSUMER_FEE_PCT / 100);
  const totalPrice = basePrice + consumerFee;
  return {
    distKm: +distKm.toFixed(2),
    basePrice: Math.round(basePrice),
    consumerFee: Math.round(consumerFee),
    totalPrice: Math.round(totalPrice),
  };
}

// ---------------------------------------------------------------------------
// POST /quote — no auth required
// ---------------------------------------------------------------------------
router.post('/quote', async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng, packageType, weightKg = 0, urgency = 'STANDARD' } = req.body;

    if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
      return res.status(400).json({ error: 'fromLat, fromLng, toLat, toLng are required' });
    }

    const { distKm, basePrice, consumerFee, totalPrice } = calcPrice(fromLat, fromLng, toLat, toLng, weightKg, urgency);

    return res.json({
      currency: 'XOF',
      distanceKm: distKm,
      basePrice,
      consumerFeePct: CONSUMER_FEE_PCT,
      consumerFee,
      totalPrice,
      packageType: packageType || null,
      weightKg: parseFloat(weightKg),
      urgency,
    });
  } catch (err) {
    console.error('[consumer] /quote error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /order — auth required (any role)
// ---------------------------------------------------------------------------
router.post('/order', authenticate, async (req, res) => {
  try {
    const {
      pickupAddress,
      pickupLat,
      pickupLng,
      pickupPhone,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      dropoffPhone,
      packageType = 'PARCEL',
      packageDescription,
      weightKg = 0,
      urgency = 'STANDARD',
      paymentMethod = 'CASH',
      cashOnDelivery = false,
      notes,
    } = req.body;

    const required = { pickupAddress, pickupLat, pickupLng, pickupPhone, dropoffAddress, dropoffLat, dropoffLng, dropoffPhone };
    const missing = Object.entries(required).filter(([, v]) => v == null || v === '').map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const db = getDB();

    // Resolve CONSUMER_POOL_BUSINESS_ID from platform settings
    const [poolSetting] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'CONSUMER_POOL_BUSINESS_ID'));

    if (!poolSetting) {
      return res.status(500).json({ error: 'Platform not configured: CONSUMER_POOL_BUSINESS_ID missing' });
    }

    const consumerPoolBusinessId = poolSetting.value;

    const { distKm, basePrice, consumerFee, totalPrice } = calcPrice(
      pickupLat, pickupLng, dropoffLat, dropoffLng, weightKg, urgency
    );

    const trackingToken = crypto.randomUUID();
    const jobId = crypto.randomUUID();

    // Insert job into the jobs table (same structure as business job)
    const [newJob] = await db
      .insert(jobs)
      .values({
        id: jobId,
        businessId: consumerPoolBusinessId,
        createdByUserId: req.user.id,
        pickupAddress,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        pickupPhone,
        dropoffAddress,
        dropoffLat: parseFloat(dropoffLat),
        dropoffLng: parseFloat(dropoffLng),
        dropoffPhone,
        packageType,
        packageDescription: packageDescription || null,
        weightKg: parseFloat(weightKg),
        urgency,
        paymentMethod,
        cashOnDelivery: Boolean(cashOnDelivery),
        notes: notes || null,
        status: 'PENDING',
        trackingToken,
        basePrice,
        consumerFee,
        totalPrice,
        currency: 'XOF',
        distanceKm: distKm,
        isConsumerOrder: true,
        createdAt: new Date(),
      })
      .returning();

    return res.status(201).json({
      job: newJob,
      trackingToken,
      estimatedPrice: totalPrice,
      currency: 'XOF',
      priceBreakdown: { basePrice, consumerFeePct: CONSUMER_FEE_PCT, consumerFee, totalPrice },
    });
  } catch (err) {
    console.error('[consumer] /order error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /orders — auth required — list my consumer orders (last 20)
// ---------------------------------------------------------------------------
router.get('/orders', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const myOrders = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.createdByUserId, req.user.id),
          eq(jobs.isConsumerOrder, true)
        )
      )
      .orderBy(desc(jobs.createdAt))
      .limit(20);

    return res.json({ orders: myOrders, count: myOrders.length });
  } catch (err) {
    console.error('[consumer] /orders error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /orders/:trackingToken — no auth — public tracking
// ---------------------------------------------------------------------------
router.get('/orders/:trackingToken', async (req, res) => {
  try {
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
        estimatedPrice: jobs.totalPrice,
        currency: jobs.currency,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.trackingToken, req.params.trackingToken),
          eq(jobs.isConsumerOrder, true)
        )
      );

    if (!job) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json({ order: job });
  } catch (err) {
    console.error('[consumer] /orders/:trackingToken error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
