// Jobs Route — Option A flow: pay first, then broadcast
const express = require('express');
const { eq, and, desc, or, sql } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { getDB } = require('../config/database');
const { jobs, businesses, drivers, users, jobBids, ratings, disputes, jobStops, payments, zones } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const { findNearbyDrivers, broadcastJobToDrivers, haversineKm } = require('../services/geo');
const { getAdapter, defaultProviderForCountry, defaultCurrencyForCountry } = require('../services/payment-adapter');
const { hasAvailableBalance, holdFunds, returnHold } = require('../services/wallet');
const { generatePickupCode } = require('../services/qr');
const { sendPushNotification, sendSMS } = require('../services/notification');
const { getIO } = require('../socket');

const router = express.Router();

/**
 * POST /jobs
 * Creates job in AWAITING_PAYMENT state.
 * Two paths:
 *   1. paymentMethod = 'wallet'  → funds held immediately from wallet, job goes straight to POSTED
 *   2. paymentMethod = 'momo'    → returns paymentUrl + QR, job stays AWAITING_PAYMENT until webhook confirms
 */
router.post('/', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!business) return res.status(404).json({ success: false, message: 'Business profile not found' });

    const {
      pickupAddress, pickupLat, pickupLng, pickupContactName, pickupContactPhone, pickupNotes,
      dropoffAddress, dropoffLat, dropoffLng, dropoffContactName, dropoffContactPhone, dropoffNotes,
      packageType, packageDescription, weightKg, isFragile, declaredValue,
      urgency, vehicleTypeRequired, priceOffered,
      paymentMethod = 'momo', // 'wallet' | 'momo'
      paymentProvider,        // 'FLUTTERWAVE' | 'PAYSTACK' | ...
      paymentPhone,
      currency: requestCurrency,
      stops
    } = req.body;

    if (!pickupAddress || !dropoffAddress || !packageType || !priceOffered) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const currency = requestCurrency || defaultCurrencyForCountry(business.country);
    const trackingToken = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();

    // Find zone for commission calculation
    let zoneId = null;
    if (pickupLat && pickupLng) {
      const allZones = await db.select().from(zones).where(eq(zones.isActive, true));
      const inZone = allZones.find(z => z.centerLat && z.centerLng && haversineKm(parseFloat(pickupLat), parseFloat(pickupLng), parseFloat(z.centerLat), parseFloat(z.centerLng)) <= (z.radiusKm || 30));
      if (inZone) zoneId = inZone.id;
    }

    // Create job in DRAFT
    const [job] = await db.insert(jobs).values({
      businessId: business.id,
      trackingToken,
      pickupAddress, pickupLat, pickupLng, pickupContactName, pickupContactPhone, pickupNotes,
      dropoffAddress, dropoffLat, dropoffLng, dropoffContactName, dropoffContactPhone, dropoffNotes,
      packageType, packageDescription, weightKg, isFragile: !!isFragile,
      declaredValue, urgency: urgency || 'STANDARD',
      vehicleTypeRequired, priceOffered, currency,
      status: 'DRAFT',
      paymentCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min to pay
      zoneId
    }).returning();

    if (stops?.length) {
      await db.insert(jobStops).values(stops.map((s, i) => ({ jobId: job.id, ...s, sequenceOrder: i + 1 })));
    }

    // ─── WALLET PATH ───
    if (paymentMethod === 'wallet') {
      if (!(await hasAvailableBalance(business.id, priceOffered))) {
        await db.update(jobs).set({ status: 'EXPIRED' }).where(eq(jobs.id, job.id));
        return res.status(402).json({ success: false, code: 'INSUFFICIENT_FUNDS', message: `Insufficient wallet balance. Top up your wallet or pay via mobile money.` });
      }
      await holdFunds(business.id, job.id, priceOffered);

      // Payment record
      const commissionRate = 18;
      const gross = parseFloat(priceOffered);
      const commission = gross * commissionRate / 100;
      await db.insert(payments).values({
        jobId: job.id, businessId: business.id,
        grossAmount: gross, commissionRate,
        commissionAmount: commission, driverPayout: gross - commission,
        currency, status: 'HELD', heldAt: new Date(),
        paymentProvider: 'WALLET'
      });

      // Straight to POSTED
      const now = new Date();
      await db.update(jobs).set({ status: 'POSTED', paymentConfirmedAt: now, updatedAt: now }).where(eq(jobs.id, job.id));

      // Broadcast to drivers
      const nearby = await findNearbyDrivers(pickupLat, pickupLng, vehicleTypeRequired);
      if (nearby.length) await broadcastJobToDrivers({ ...job, status: 'POSTED' }, nearby);

      return res.status(201).json({
        success: true,
        paymentMethod: 'wallet',
        job: { ...job, status: 'POSTED' },
        driversNotified: nearby.length
      });
    }

    // ─── MOBILE MONEY / CARD PATH ───
    // Generate Payment QR + payment URL, job stays AWAITING_PAYMENT
    const provider = paymentProvider || business.defaultPaymentProvider || defaultProviderForCountry(business.country);
    const adapter = getAdapter(provider);
    const reference = `DLV-JOB-${job.id}`;

    let paymentResult;
    try {
      paymentResult = await adapter.initiatePayment({
        amount: priceOffered,
        currency,
        customerPhone: paymentPhone || req.user.phone,
        customerEmail: req.user.email,
        reference,
        description: `ArgiDrop delivery ${trackingToken}`,
        callbackUrl: `${process.env.BACKEND_URL}/api/v1/webhooks/${provider.toLowerCase()}`,
        redirectUrl: `${process.env.WEB_URL}/dashboard/jobs/${job.id}`
      });
    } catch (paymentErr) {
      await db.update(jobs).set({ status: 'EXPIRED' }).where(eq(jobs.id, job.id));
      return res.status(502).json({ success: false, message: paymentErr.message });
    }

    await db.update(jobs).set({
      status: 'AWAITING_PAYMENT',
      paymentProvider: provider,
      paymentProviderRef: reference,
      updatedAt: new Date()
    }).where(eq(jobs.id, job.id));

    // Generate Payment QR — encodes the payment URL
    const qrImage = await QRCode.toDataURL(paymentResult.paymentUrl, {
      width: 400, margin: 2, color: { dark: '#1B4332', light: '#FDFBF6' }
    });

    res.status(201).json({
      success: true,
      paymentMethod: 'momo',
      job: { ...job, status: 'AWAITING_PAYMENT' },
      payment: {
        provider,
        reference,
        paymentUrl: paymentResult.paymentUrl,
        qrImage,
        amount: priceOffered,
        currency,
        expiresAt: job.paymentCodeExpiresAt
      },
      message: 'Scan QR or follow payment link to complete payment. Job will be broadcast to drivers once payment is confirmed.'
    });
  } catch (err) { next(err); }
});

// GET /jobs — same as before with new statuses
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { status, limit = 20, offset = 0 } = req.query;
    let query = db.select({
      job: jobs,
      business: { companyName: businesses.companyName, rating: businesses.rating },
      driver: { id: drivers.id, rating: drivers.rating, vehicleType: drivers.vehicleType }
    })
      .from(jobs)
      .leftJoin(businesses, eq(jobs.businessId, businesses.id))
      .leftJoin(drivers, eq(jobs.driverId, drivers.id));

    if (req.user.role === 'BUSINESS') {
      const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
      query = query.where(eq(jobs.businessId, business.id));
    } else if (req.user.role === 'DRIVER') {
      const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
      query = query.where(eq(jobs.driverId, driver.id));
    }
    if (status) query = query.where(eq(jobs.status, status));
    const result = await query.orderBy(desc(jobs.createdAt)).limit(parseInt(limit)).offset(parseInt(offset));
    res.json({ success: true, jobs: result });
  } catch (err) { next(err); }
});

// GET /jobs/available — drivers only see POSTED (paid-for) jobs
router.get('/available', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { lat, lng, radius = 20 } = req.query;
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver?.isActive) return res.status(403).json({ success: false, message: 'Driver not verified yet' });

    const userLat = parseFloat(lat || driver.currentLat);
    const userLng = parseFloat(lng || driver.currentLng);

    const allJobs = await db.select({ job: jobs, business: { companyName: businesses.companyName, rating: businesses.rating } })
      .from(jobs)
      .leftJoin(businesses, eq(jobs.businessId, businesses.id))
      .where(eq(jobs.status, 'POSTED')) // only paid, active jobs
      .orderBy(desc(jobs.createdAt))
      .limit(50);

    const nearby = userLat && userLng ? allJobs.filter(({ job }) => {
      if (!job.pickupLat || !job.pickupLng) return true;
      return haversineKm(userLat, userLng, parseFloat(job.pickupLat), parseFloat(job.pickupLng)) <= parseInt(radius);
    }) : allJobs;

    res.json({ success: true, jobs: nearby });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const [result] = await db.select({ job: jobs, business: businesses, driver: drivers })
      .from(jobs)
      .leftJoin(businesses, eq(jobs.businessId, businesses.id))
      .leftJoin(drivers, eq(jobs.driverId, drivers.id))
      .where(eq(jobs.id, req.params.id))
      .limit(1);
    if (!result) return res.status(404).json({ success: false, message: 'Job not found' });
    const stops = await db.select().from(jobStops).where(eq(jobStops.jobId, req.params.id));
    res.json({ success: true, ...result, stops });
  } catch (err) { next(err); }
});

/**
 * POST /jobs/:id/accept — Driver accepts job
 * Generates Pickup QR, status → MATCHED
 */
router.post('/:id/accept', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver?.isActive) return res.status(403).json({ success: false, message: 'Driver not active' });

    const [job] = await db.select().from(jobs)
      .where(and(eq(jobs.id, req.params.id), eq(jobs.status, 'POSTED')))
      .limit(1);
    if (!job) return res.status(404).json({ success: false, message: 'Job not available' });

    const now = new Date();
    const [updated] = await db.update(jobs).set({
      driverId: driver.id, status: 'MATCHED', matchedAt: now,
      finalPrice: job.priceOffered, updatedAt: now
    }).where(and(eq(jobs.id, job.id), eq(jobs.status, 'POSTED'))).returning();

    if (!updated) return res.status(409).json({ success: false, message: 'Job already taken' });

    // Generate Pickup QR for the business to display
    const pickupCode = await generatePickupCode(job.id);

    // Notify business
    const [business] = await db.select({ biz: businesses, user: users }).from(businesses)
      .leftJoin(users, eq(businesses.userId, users.id))
      .where(eq(businesses.id, job.businessId)).limit(1);
    if (business?.user?.fcmToken) {
      sendPushNotification(business.user.fcmToken, 'Driver matched!',
        `${req.user.firstName} accepted your delivery. Show them your Pickup QR when they arrive.`,
        { jobId: job.id, type: 'JOB_MATCHED' }).catch(() => {});
    }

    const io = getIO();
    io.to(`job:${job.id}`).emit('job:status_change', {
      jobId: job.id, status: 'MATCHED',
      driver: { id: driver.id, firstName: req.user.firstName, rating: driver.rating, vehicleType: driver.vehicleType }
    });
    io.to(`business:${job.businessId}`).emit('job:matched', { jobId: job.id, pickupCodeAvailable: true });

    res.json({ success: true, message: 'Job accepted', job: updated, pickupCode });
  } catch (err) { next(err); }
});

router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { reason } = req.body;
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (['DELIVERED', 'COMPLETED'].includes(job.status)) return res.status(400).json({ success: false, message: 'Cannot cancel completed job' });

    await db.update(jobs).set({
      status: 'CANCELLED', cancelReason: reason, cancelledBy: req.user.id, updatedAt: new Date()
    }).where(eq(jobs.id, job.id));

    // Refund based on payment method
    const [payment] = await db.select().from(payments).where(eq(payments.jobId, job.id)).limit(1);
    if (payment?.status === 'HELD') {
      if (payment.paymentProvider === 'WALLET') {
        await returnHold(job.businessId, job.id, payment.grossAmount);
      } else {
        // External provider — trigger refund
        const adapter = getAdapter(payment.paymentProvider);
        if (payment.providerTxRef) {
          await adapter.refund(payment.providerTxRef, payment.grossAmount).catch(() => {});
        }
      }
      await db.update(payments).set({ status: 'REFUNDED', refundedAt: new Date() }).where(eq(payments.id, payment.id));
    }

    res.json({ success: true, message: 'Job cancelled, funds returned' });
  } catch (err) { next(err); }
});

router.post('/:id/rate', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { score, comment, ratedUserId } = req.body;
    if (score < 1 || score > 5) return res.status(400).json({ success: false, message: 'Score must be 1-5' });
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job || !['DELIVERED', 'COMPLETED'].includes(job.status)) {
      return res.status(400).json({ success: false, message: 'Job not delivered yet' });
    }
    await db.insert(ratings).values({ jobId: job.id, ratedByUserId: req.user.id, ratedUserId, score, comment });
    // Recalculate average
    const allRatings = await db.select().from(ratings).where(eq(ratings.ratedUserId, ratedUserId));
    const avg = allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length;
    const [ratedUser] = await db.select().from(users).where(eq(users.id, ratedUserId)).limit(1);
    if (ratedUser?.role === 'DRIVER') {
      await db.update(drivers).set({ rating: avg.toFixed(2), ratingCount: allRatings.length }).where(eq(drivers.userId, ratedUserId));
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/dispute', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { reason, description, evidenceUrls } = req.body;
    const [dispute] = await db.insert(disputes).values({
      jobId: req.params.id, raisedByUserId: req.user.id, reason, description, evidenceUrls: evidenceUrls || []
    }).returning();
    await db.update(jobs).set({ status: 'DISPUTED' }).where(eq(jobs.id, req.params.id));
    res.status(201).json({ success: true, dispute });
  } catch (err) { next(err); }
});

module.exports = router;
