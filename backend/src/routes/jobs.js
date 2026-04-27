// Jobs Route — Option A flow: pay first, then broadcast
const express = require('express');
const multer = require('multer');
const { eq, and, desc, or, sql, inArray } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { getDB } = require('../config/database');
const { jobs, businesses, drivers, users, jobBids, ratings, disputes, jobStops, payments, zones, messages } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const { validatePromo, recordRedemption } = require('../services/promo');
const { findNearbyDrivers, broadcastJobToDrivers, haversineKm } = require('../services/geo');
const { getAdapter, defaultProviderForCountry, defaultCurrencyForCountry } = require('../services/payment-adapter');
const { holdFunds, returnHold } = require('../services/wallet');
const { generatePickupCode } = require('../services/qr');
const { sendPushNotification, sendSMS } = require('../services/notification');
const { uploadFile, getSignedUrl } = require('../services/storage');
const { getIO } = require('../socket');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

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
      promoCode,              // optional marketing code → discount + optional driver bonus
      stops
    } = req.body;

    if (!pickupAddress || !dropoffAddress || !packageType || !priceOffered) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const currency = requestCurrency || defaultCurrencyForCountry(business.country);
    const trackingToken = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();

    // ─── PROMO VALIDATION ───
    // Resolve discount and driver bonus before any payment hold so that the
    // amount we charge the merchant already reflects the promo. The full
    // priceOffered is preserved on the job for audit + driver payout
    // calculation; the platform absorbs the discount out of its commission.
    const originalPrice = parseFloat(priceOffered);
    let discountAmount = 0;
    let driverBonusAmount = 0;
    let validatedPromo = null;
    if (promoCode) {
      const [me] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      const existingForBiz = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.businessId, business.id)).limit(1);
      const isFirstJob = existingForBiz.length === 0;
      const promoCheck = await validatePromo({
        code: promoCode,
        role: 'BUSINESS',
        marketCode: me?.marketCode,
        jobAmount: originalPrice,
        userId: req.user.id,
        isFirstJob,
      });
      if (!promoCheck.valid) {
        return res.status(400).json({ success: false, code: 'INVALID_PROMO', message: promoCheck.reason });
      }
      validatedPromo = promoCheck.promo;
      discountAmount = promoCheck.discount;
      driverBonusAmount = promoCheck.driverBonus || 0;
    }
    // What the merchant actually pays (held / charged).
    const chargedAmount = Math.max(0, +(originalPrice - discountAmount).toFixed(2));

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
      appliedPromoCode: validatedPromo?.code || null,
      discountAmount: String(discountAmount),
      driverBonusAmount: String(driverBonusAmount),
      status: 'DRAFT',
      paymentCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min to pay
      zoneId
    }).returning();

    if (stops?.length) {
      await db.insert(jobStops).values(stops.map((s, i) => ({ jobId: job.id, ...s, sequenceOrder: i + 1 })));
    }

    // ─── ATOMIC PROMO REDEMPTION ───
    // Reserve the promo slot BEFORE any wallet hold or payment init so a
    // race that loses the cap doesn't leave a discounted job pending. If
    // this throws PROMO_CAP_EXCEEDED / PROMO_PER_USER_EXCEEDED we abort the
    // job creation cleanly.
    if (validatedPromo) {
      try {
        await recordRedemption({
          promoCodeId: validatedPromo.id,
          userId: req.user.id,
          jobId: job.id,
          discountApplied: discountAmount,
          driverBonusApplied: driverBonusAmount,
          currency,
        });
      } catch (redeemErr) {
        await db.update(jobs).set({ status: 'EXPIRED' }).where(eq(jobs.id, job.id));
        const code = redeemErr.code || 'PROMO_REDEMPTION_FAILED';
        const status = (code === 'PROMO_CAP_EXCEEDED' || code === 'PROMO_PER_USER_EXCEEDED') ? 409 : 400;
        return res.status(status).json({ success: false, code, message: redeemErr.message });
      }
    }

    // ─── WALLET PATH ───
    if (paymentMethod === 'wallet') {
      let holdResult;
      try {
        // Hold the discounted amount (what the merchant is actually paying).
        holdResult = await holdFunds(business.id, job.id, chargedAmount);
      } catch (holdErr) {
        await db.update(jobs).set({ status: 'EXPIRED' }).where(eq(jobs.id, job.id));
        return res.status(402).json({ success: false, code: 'INSUFFICIENT_FUNDS', message: 'Insufficient wallet balance. Top up your wallet or pay via mobile money.' });
      }

      // Payment record. driverPayout uses the original price so the driver is
      // never penalized for a promo. driverBonus is added on top. The
      // commission therefore absorbs the discount + bonus (can go negative for
      // a marketing-funded campaign — accepted on the books for MVP).
      const commissionRate = 18;
      const driverPayout = +(originalPrice * (1 - commissionRate / 100) + driverBonusAmount).toFixed(2);
      const commissionAmount = +(chargedAmount - driverPayout).toFixed(2);
      await db.insert(payments).values({
        jobId: job.id, businessId: business.id,
        grossAmount: chargedAmount, commissionRate,
        commissionAmount, driverPayout,
        currency, status: 'HELD', heldAt: new Date(),
        paymentProvider: 'WALLET'
      });

      // (Promo redemption already recorded atomically above.)

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
        amount: chargedAmount,
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

    // (Promo redemption already recorded atomically above. We accept that
    // an abandoned momo payment "burns" the slot — that's the trade-off for
    // closing the cap race; it's recoverable manually via admin if needed.)

    res.status(201).json({
      success: true,
      paymentMethod: 'momo',
      job: { ...job, status: 'AWAITING_PAYMENT' },
      payment: {
        provider,
        reference,
        paymentUrl: paymentResult.paymentUrl,
        qrImage,
        amount: chargedAmount,
        originalAmount: originalPrice,
        discountAmount,
        promoCode: validatedPromo?.code || null,
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

    // Build all WHERE conditions up front, then AND them in a single .where()
    // (chained .where() calls in Drizzle replace, not merge — combine with and()).
    const conditions = [];

    if (req.user.role === 'BUSINESS') {
      const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
      if (!business) return res.json({ success: true, jobs: [], total: 0 });
      conditions.push(eq(jobs.businessId, business.id));
    } else if (req.user.role === 'DRIVER') {
      const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
      if (!driver) return res.json({ success: true, jobs: [], total: 0 });
      conditions.push(eq(jobs.driverId, driver.id));
    }

    if (status) {
      // 'ACTIVE' is a UI shorthand for any in-progress delivery
      if (status === 'ACTIVE') {
        conditions.push(inArray(jobs.status, ['MATCHED', 'IN_TRANSIT']));
      } else {
        conditions.push(eq(jobs.status, status));
      }
    }

    let query = db.select({
      job: jobs,
      business: { companyName: businesses.companyName, rating: businesses.rating },
      driver: { id: drivers.id, rating: drivers.rating, vehicleType: drivers.vehicleType }
    })
      .from(jobs)
      .leftJoin(businesses, eq(jobs.businessId, businesses.id))
      .leftJoin(drivers, eq(jobs.driverId, drivers.id));

    if (conditions.length) query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));

    const result = await query.orderBy(desc(jobs.createdAt)).limit(parseInt(limit)).offset(parseInt(offset));
    res.json({ success: true, jobs: result, total: result.length });
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
    const [result] = await db.select({
      job: jobs,
      business: {
        id: businesses.id,
        companyName: businesses.companyName,
        rating: businesses.rating,
        country: businesses.country,
      },
      driver: {
        id: drivers.id,
        userId: drivers.userId,
        rating: drivers.rating,
        vehicleType: drivers.vehicleType,
        vehicleMake: drivers.vehicleMake,
        vehicleModel: drivers.vehicleModel,
        vehiclePlate: drivers.vehiclePlate,
        vehicleColor: drivers.vehicleColor,
        isOnline: drivers.isOnline,
        currentLat: drivers.currentLat,
        currentLng: drivers.currentLng,
        firstName: users.firstName,
        phone: users.phone,
      }
    })
      .from(jobs)
      .leftJoin(businesses, eq(jobs.businessId, businesses.id))
      .leftJoin(drivers, eq(jobs.driverId, drivers.id))
      .leftJoin(users, eq(drivers.userId, users.id))
      .where(eq(jobs.id, req.params.id))
      .limit(1);
    if (!result) return res.status(404).json({ success: false, message: 'Job not found' });

    // Authorization: caller must be the owning business, the assigned driver, or an admin
    if (req.user.role !== 'ADMIN') {
      if (req.user.role === 'BUSINESS') {
        const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
        if (!business || result.business?.id !== business.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else if (req.user.role === 'DRIVER') {
        const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
        if (!driver || result.driver?.id !== driver.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const stops = await db.select().from(jobStops).where(eq(jobStops.jobId, req.params.id));
    // Redact the raw proof URL — served via the dedicated /proof endpoint as a signed URL
    const { deliveryProofUrl: _redacted, ...safeJob } = result.job;
    res.json({
      success: true,
      job: { ...safeJob, hasDeliveryProof: !!result.job.deliveryProofUrl },
      business: result.business,
      driver: result.driver,
      stops,
    });
  } catch (err) { next(err); }
});

/**
 * GET /jobs/:id/proof
 * Returns a short-lived signed URL for the delivery proof photo.
 * Only accessible to the owning business, the assigned driver, or an admin.
 */
router.get('/:id/proof', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!job.deliveryProofUrl) return res.status(404).json({ success: false, message: 'No proof uploaded for this job' });

    if (req.user.role !== 'ADMIN') {
      if (req.user.role === 'BUSINESS') {
        const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
        if (!business || job.businessId !== business.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else if (req.user.role === 'DRIVER') {
        const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
        if (!driver || job.driverId !== driver.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Extract the S3/R2 object key from the stored URL and generate a signed URL
    if (!process.env.AWS_S3_BUCKET) {
      return res.json({ success: true, url: job.deliveryProofUrl, expiresIn: null });
    }
    const bucket = process.env.AWS_S3_BUCKET;
    let objectKey;
    try {
      const parsed = new URL(job.deliveryProofUrl);
      let keyCandidate = parsed.pathname.replace(/^\//, '');
      // Path-style (R2 or forcePathStyle): /<bucket>/<key>
      if (keyCandidate.startsWith(bucket + '/')) {
        keyCandidate = keyCandidate.slice(bucket.length + 1);
      }
      objectKey = keyCandidate;
    } catch {
      return res.json({ success: true, url: job.deliveryProofUrl, expiresIn: null });
    }
    const signedUrl = await getSignedUrl(objectKey, 900); // 15 minutes
    res.json({ success: true, url: signedUrl, expiresIn: 900 });
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

    // Authorization: only the owning business, the assigned driver, or an admin may cancel
    if (req.user.role !== 'ADMIN') {
      if (req.user.role === 'BUSINESS') {
        const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
        if (!business || job.businessId !== business.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else if (req.user.role === 'DRIVER') {
        const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
        if (!driver || job.driverId !== driver.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

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

/**
 * POST /jobs/:id/proof
 * Driver uploads proof-of-delivery photo. Stored alongside the job.
 * Optional step — most deliveries are confirmed via QR scan, but this lets
 * drivers attach a doorstep photo when the recipient asks for it.
 */
router.post('/:id/proof', authenticate, requireRole('DRIVER'), upload.single('photo'), async (req, res, next) => {
  try {
    const db = getDB();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Make sure the requesting driver actually owns this job
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver || job.driverId !== driver.id) {
      return res.status(403).json({ success: false, message: 'Not your delivery' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'Photo file is required' });

    // Only allow proof upload after delivery scan / completion to avoid
    // attaching a photo to an in-transit or never-delivered job.
    if (!['DELIVERED', 'COMPLETED'].includes(job.status)) {
      return res.status(400).json({ success: false, message: 'Job must be delivered before uploading proof' });
    }
    if (job.deliveryProofUrl) {
      return res.status(409).json({ success: false, message: 'Proof already uploaded for this delivery' });
    }

    const photoUrl = await uploadFile(req.file, `jobs/${job.id}/proof`);
    await db.update(jobs).set({ deliveryProofUrl: photoUrl, updatedAt: new Date() }).where(eq(jobs.id, job.id));

    res.json({ success: true, deliveryProofUrl: photoUrl });
  } catch (err) { next(err); }
});

router.post('/:id/rate', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ success: false, message: 'Score must be 1-5' });

    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job || !['DELIVERED', 'COMPLETED'].includes(job.status)) {
      return res.status(400).json({ success: false, message: 'Job not delivered yet' });
    }

    // Verify caller participated in this job and derive who is being rated
    let ratedUserId;
    if (req.user.role === 'BUSINESS') {
      const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
      if (!business || job.businessId !== business.id) {
        return res.status(403).json({ success: false, message: 'You did not place this job' });
      }
      // Business rates the driver
      if (!job.driverId) return res.status(400).json({ success: false, message: 'No driver assigned to this job' });
      const [driver] = await db.select().from(drivers).where(eq(drivers.id, job.driverId)).limit(1);
      if (!driver) return res.status(400).json({ success: false, message: 'Driver not found' });
      ratedUserId = driver.userId;
    } else if (req.user.role === 'DRIVER') {
      const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
      if (!driver || job.driverId !== driver.id) {
        return res.status(403).json({ success: false, message: 'You were not the driver on this job' });
      }
      // Driver rates the business
      const [business] = await db.select().from(businesses).where(eq(businesses.id, job.businessId)).limit(1);
      if (!business) return res.status(400).json({ success: false, message: 'Business not found' });
      ratedUserId = business.userId;
    } else {
      return res.status(403).json({ success: false, message: 'Only job participants may submit ratings' });
    }

    // Prevent duplicate ratings by the same user for the same job
    const [existing] = await db.select().from(ratings)
      .where(and(eq(ratings.jobId, job.id), eq(ratings.ratedByUserId, req.user.id)))
      .limit(1);
    if (existing) return res.status(409).json({ success: false, message: 'You have already rated this job' });

    await db.insert(ratings).values({ jobId: job.id, ratedByUserId: req.user.id, ratedUserId, score, comment });

    // Recalculate average for the rated user
    const allRatings = await db.select().from(ratings).where(eq(ratings.ratedUserId, ratedUserId));
    const avg = allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length;
    const [ratedUser] = await db.select().from(users).where(eq(users.id, ratedUserId)).limit(1);
    if (ratedUser?.role === 'DRIVER') {
      await db.update(drivers).set({ rating: avg.toFixed(2), ratingCount: allRatings.length }).where(eq(drivers.userId, ratedUserId));
    } else if (ratedUser?.role === 'BUSINESS') {
      await db.update(businesses).set({ rating: avg.toFixed(2), ratingCount: allRatings.length }).where(eq(businesses.userId, ratedUserId));
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/jobs/:id/messages — chat history for a job, participant-gated.
 * Returns messages ordered by createdAt ASC (oldest first).
 */
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (req.user.role !== 'ADMIN') {
      if (req.user.role === 'BUSINESS') {
        const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
        if (!biz || job.businessId !== biz.id) return res.status(403).json({ success: false, message: 'Access denied' });
      } else if (req.user.role === 'DRIVER') {
        const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
        if (!driver || job.driverId !== driver.id) return res.status(403).json({ success: false, message: 'Access denied' });
      } else {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const rows = await db.select().from(messages)
      .where(eq(messages.jobId, req.params.id))
      .orderBy(messages.createdAt);
    res.json({ success: true, messages: rows });
  } catch (err) { next(err); }
});

router.post('/:id/dispute', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const { reason, description, evidenceUrls } = req.body;

    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Authorization: only the owning business or the assigned driver may raise a dispute
    if (req.user.role !== 'ADMIN') {
      if (req.user.role === 'BUSINESS') {
        const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
        if (!business || job.businessId !== business.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else if (req.user.role === 'DRIVER') {
        const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
        if (!driver || job.driverId !== driver.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const [dispute] = await db.insert(disputes).values({
      jobId: req.params.id, raisedByUserId: req.user.id, reason, description, evidenceUrls: evidenceUrls || []
    }).returning();
    await db.update(jobs).set({ status: 'DISPUTED' }).where(eq(jobs.id, req.params.id));
    res.status(201).json({ success: true, dispute });
  } catch (err) { next(err); }
});

module.exports = router;
