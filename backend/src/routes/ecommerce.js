/**
 * ArgiDrop E-commerce API Gateway
 * WooCommerce / Shopify / ERP integrations via API key authentication.
 * Third-party platforms POST orders → ArgiDrop creates delivery jobs automatically.
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { eq, and, desc } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { corporateAccounts, businesses, jobs, platformSettings } = require('../schema');

const router = express.Router();

// In-memory order map: externalRef → { jobId, trackingToken, callbackUrl, corporateAccountId }
// TODO: migrate to ecommerce_orders DB table after next migration
const orderMap = new Map();

// ─── API KEY AUTH MIDDLEWARE ────────────────────────────────────────────────
async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-argidrop-key'];
  if (!apiKey) return res.status(401).json({ error: 'X-ArgiDrop-Key header required' });

  const db = getDB();
  const [account] = await db
    .select()
    .from(corporateAccounts)
    .where(and(
      eq(corporateAccounts.apiKey, apiKey),
      eq(corporateAccounts.apiAccessEnabled, true),
      eq(corporateAccounts.status, 'ACTIVE')
    ))
    .limit(1);

  if (!account) return res.status(403).json({ error: 'Invalid or inactive API key' });

  req.corporateAccount = account;
  next();
}

// ─── POST /ecommerce/orders — create a delivery from an e-commerce order ───
router.post('/orders', apiKeyAuth, async (req, res) => {
  try {
    const db = getDB();
    const {
      externalOrderRef, pickupAddress, pickupLat, pickupLng, pickupPhone,
      dropoffAddress, dropoffLat, dropoffLng, dropoffPhone,
      packageType, weightKg, declaredValue, cashOnDelivery, codAmount, callbackUrl,
      notes, urgency,
    } = req.body;

    if (!externalOrderRef || !pickupAddress || !dropoffAddress || !dropoffPhone) {
      return res.status(400).json({ error: 'externalOrderRef, pickupAddress, dropoffAddress, dropoffPhone required' });
    }

    if (orderMap.has(externalOrderRef)) {
      const existing = orderMap.get(externalOrderRef);
      return res.status(409).json({ error: 'Order already exists', order: existing });
    }

    // Look up the business for this corporate account
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, req.corporateAccount.businessId))
      .limit(1);

    if (!biz) return res.status(500).json({ error: 'Corporate account business not found' });

    const trackingToken = crypto.randomBytes(8).toString('hex').toUpperCase();

    // Estimate price: base 500 + 150/km (rough)
    let estimatedDistanceKm = 5;
    if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
      estimatedDistanceKm = Math.round(
        Math.sqrt((parseFloat(pickupLat) - parseFloat(dropoffLat)) ** 2 +
                  (parseFloat(pickupLng) - parseFloat(dropoffLng)) ** 2) * 111 * 10
      ) / 10;
    }
    const estimatedPrice = Math.max(800, Math.round(500 + 150 * estimatedDistanceKm));

    const [job] = await db.insert(jobs).values({
      businessId: biz.id,
      trackingToken,
      pickupAddress,
      pickupLat: pickupLat || null,
      pickupLng: pickupLng || null,
      pickupContactPhone: pickupPhone || biz.preferredMomoNumber,
      dropoffAddress,
      dropoffLat: dropoffLat || null,
      dropoffLng: dropoffLng || null,
      dropoffContactPhone: dropoffPhone,
      dropoffNotes: notes,
      packageType: packageType || 'package',
      weightKg: parseFloat(weightKg || 1).toFixed(2),
      declaredValue: declaredValue ? parseFloat(declaredValue).toFixed(2) : null,
      urgency: urgency || 'STANDARD',
      priceOffered: estimatedPrice.toFixed(2),
      currency: 'XOF',
      status: 'POSTED',
      estimatedDistanceKm: estimatedDistanceKm.toFixed(2),
    }).returning();

    const trackingUrl = `${process.env.APP_URL || 'https://argidrop.com'}/track/${trackingToken}`;

    orderMap.set(externalOrderRef, {
      jobId: job.id,
      trackingToken,
      trackingUrl,
      callbackUrl: callbackUrl || null,
      corporateAccountId: req.corporateAccount.id,
      externalOrderRef,
      cashOnDelivery: !!cashOnDelivery,
      codAmount: codAmount || null,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      jobId: job.id,
      trackingToken,
      trackingUrl,
      estimatedPrice,
      currency: 'XOF',
      status: 'POSTED',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create delivery order' });
  }
});

// ─── GET /ecommerce/orders/:externalRef — status by external reference ─────
router.get('/orders/:externalRef', apiKeyAuth, async (req, res) => {
  try {
    const db = getDB();
    const record = orderMap.get(req.params.externalRef);
    if (!record || record.corporateAccountId !== req.corporateAccount.id) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const [job] = await db
      .select({ id: jobs.id, status: jobs.status, trackingToken: jobs.trackingToken,
                matchedAt: jobs.matchedAt, pickedUpAt: jobs.pickedUpAt, deliveredAt: jobs.deliveredAt })
      .from(jobs)
      .where(eq(jobs.id, record.jobId))
      .limit(1);

    res.json({ externalOrderRef: req.params.externalRef, ...record, job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ─── GET /ecommerce/orders — list all orders for this API key ──────────────
router.get('/orders', apiKeyAuth, async (req, res) => {
  const { status } = req.query;
  const myOrders = Array.from(orderMap.values())
    .filter((o) => o.corporateAccountId === req.corporateAccount.id);
  res.json({ orders: myOrders.slice(-50), total: myOrders.length });
});

// ─── POST /ecommerce/webhook-test — test callback URL ─────────────────────
router.post('/webhook-test', apiKeyAuth, async (req, res) => {
  const { callbackUrl } = req.body;
  if (!callbackUrl) return res.status(400).json({ error: 'callbackUrl required' });

  try {
    await axios.post(callbackUrl, {
      event: 'test',
      message: 'ArgiDrop webhook test successful',
      timestamp: new Date().toISOString(),
      source: 'argidrop-ecommerce-api',
    }, { timeout: 8000 });
    res.json({ success: true, message: 'Webhook test sent' });
  } catch (err) {
    res.status(502).json({ success: false, error: 'Callback URL unreachable', detail: err.message });
  }
});

module.exports = router;
