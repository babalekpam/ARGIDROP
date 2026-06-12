// Scan Routes — QR verification endpoints for the triple-scan system

const express = require('express');
const { eq } = require('drizzle-orm');
const QRCode = require('qrcode');
const { getDB } = require('../config/database');
const { jobs, businesses, drivers, users } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const { scanPickupCode, scanDeliveryCode, ScanError } = require('../services/qr');
const { getIO } = require('../socket');
const { sendSMS, sendPushNotification } = require('../services/notification');

const router = express.Router();

/**
 * GET /scans/jobs/:id/pickup-qr
 * Business retrieves the Pickup QR to display to the driver at pickup
 */
router.get('/jobs/:id/pickup-qr', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Only the business who created it can access the pickup QR
    if (req.user.role === 'BUSINESS') {
      const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
      if (!biz || biz.id !== job.businessId) return res.status(403).json({ success: false, message: 'Not authorized' });
    } else if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!job.pickupCode) {
      return res.status(400).json({ success: false, message: 'No pickup code yet. Driver must accept the job first.' });
    }

    // Generate QR code data URL
    const qrPayload = JSON.stringify({ type: 'PICKUP', jobId: job.id, code: job.pickupCode, v: 1 });
    const qrImage = await QRCode.toDataURL(qrPayload, { width: 400, margin: 2, color: { dark: '#1B4332', light: '#FDFBF6' } });

    res.json({
      success: true,
      jobId: job.id,
      trackingToken: job.trackingToken,
      pickupCode: job.pickupCode,
      qrPayload,
      qrImage,
      generatedAt: job.pickupCodeGeneratedAt,
      status: job.status
    });
  } catch (err) { next(err); }
});

/**
 * POST /scans/pickup
 * Driver scans Pickup QR at pickup location
 * Body: { jobId, code, lat, lng, accuracy }
 */
router.post('/pickup', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const { jobId, code, lat, lng, accuracy } = req.body;
    if (!jobId || !code) return res.status(400).json({ success: false, message: 'jobId and code required' });

    const result = await scanPickupCode({
      jobId, scannedCode: code,
      scannedByUserId: req.user.id,
      gps: { lat, lng, accuracy },
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip
    });

    // Notify business via socket
    const io = getIO();
    const db = getDB();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    io.to(`job:${jobId}`).emit('job:status_change', { jobId, status: 'IN_TRANSIT', pickupConfirmed: true });
    io.to(`business:${job.businessId}`).emit('job:picked_up', { jobId });

    // Push merchant — driver picked up
    const [bizRow] = await db.select({ user: users }).from(businesses)
      .leftJoin(users, eq(businesses.userId, users.id))
      .where(eq(businesses.id, job.businessId)).limit(1);
    if (bizRow?.user?.fcmToken) {
      sendPushNotification(bizRow.user.fcmToken, 'Driver picked up your package',
        `Your delivery #${job.trackingToken} is on its way.`,
        { type: 'JOB_PICKED_UP', jobId }
      ).catch(() => {});
    }

    // SMS recipient with tracking link — PIN hint is NOT co-disclosed with the link
    if (job.dropoffContactPhone) {
      const trackUrl = `${process.env.WEB_URL}/r/${job.deliveryCode}`;
      const msg = job.dropoffContactName
        ? `Bonjour ${job.dropoffContactName}, votre colis ArgiDrop est en route. Suivez ici: ${trackUrl} — Pour afficher votre QR de livraison, entrez les 4 derniers chiffres de votre numéro de téléphone.`
        : `Votre colis ArgiDrop est en route. Suivez ici: ${trackUrl} — Pour afficher votre QR de livraison, entrez les 4 derniers chiffres de votre numéro de téléphone.`;
      await sendSMS(job.dropoffContactPhone, msg).catch(err => console.error('SMS failed:', err.message));
    }

    res.json(result);
  } catch (err) {
    if (err instanceof ScanError) {
      return res.status(err.statusCode || 400).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
});

// Per-delivery PIN attempt tracking: { attempts, lockedUntil }
const pinAttemptStore = new Map();
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getPinState(deliveryCode) {
  const state = pinAttemptStore.get(deliveryCode) || { attempts: 0, lockedUntil: null };
  if (state.lockedUntil && Date.now() > state.lockedUntil) {
    state.attempts = 0;
    state.lockedUntil = null;
  }
  return state;
}

/**
 * GET /scans/r/:deliveryCode
 * Public recipient-facing endpoint — returns delivery status and coarse location only.
 * Exact addresses, driver GPS, vehicle plate, and QR are never returned.
 * QR is only available after PIN verification via POST /scans/r/:deliveryCode/verify.
 */
router.get('/r/:deliveryCode', async (req, res, next) => {
  try {
    const db = getDB();
    const [result] = await db.select({
      job: jobs,
      driver: drivers,
      driverUser: users
    })
      .from(jobs)
      .leftJoin(drivers, eq(jobs.driverId, drivers.id))
      .leftJoin(users, eq(drivers.userId, users.id))
      .where(eq(jobs.deliveryCode, req.params.deliveryCode))
      .limit(1);

    if (!result) return res.status(404).json({ success: false, message: 'Tracking info not found' });
    const { job, driver, driverUser } = result;

    const isDelivered = job.status === 'DELIVERED' || job.status === 'COMPLETED';

    res.json({
      success: true,
      tracking: {
        status: job.status,
        dropoffCity: job.dropoffCity,
        pickedUpAt: job.pickedUpAt,
        deliveredAt: job.deliveredAt,
        requiresPin: !!(job.dropoffContactPhone),
        driver: driver && !isDelivered ? {
          firstName: driverUser?.firstName,
          vehicleType: driver.vehicleType,
          vehicleColor: driver.vehicleColor,
          rating: driver.rating,
        } : null
      }
    });
  } catch (err) { next(err); }
});

/**
 * POST /scans/r/:deliveryCode/verify
 * Recipient enters PIN (last 4 digits of their phone) to unlock the delivery QR.
 * Protected by per-delivery attempt limiting (5 attempts, 15-min lockout).
 * QR uses recipientSecret (private, never in any URL) — not the public deliveryCode token.
 * QR is refused when no recipient phone is registered on the job.
 */
router.post('/r/:deliveryCode/verify', async (req, res, next) => {
  try {
    const { deliveryCode } = req.params;
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ success: false, message: 'PIN is required' });

    const pinState = getPinState(deliveryCode);
    if (pinState.lockedUntil) {
      const waitMins = Math.ceil((pinState.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({ success: false, message: `Too many incorrect attempts. Please try again in ${waitMins} minute(s).` });
    }

    const db = getDB();
    const [result] = await db.select({ job: jobs })
      .from(jobs)
      .where(eq(jobs.deliveryCode, deliveryCode))
      .limit(1);

    if (!result) return res.status(404).json({ success: false, message: 'Tracking info not found' });
    const { job } = result;

    if (job.status === 'DELIVERED' || job.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'This delivery has already been completed' });
    }

    if (!job.dropoffContactPhone) {
      return res.status(403).json({ success: false, message: 'Delivery QR is not available for this order. Please contact support.' });
    }

    const normalised = job.dropoffContactPhone.replace(/\D/g, '');
    const expectedPin = normalised.slice(-4);
    if (String(pin).replace(/\D/g, '') !== expectedPin) {
      pinState.attempts += 1;
      if (pinState.attempts >= PIN_MAX_ATTEMPTS) {
        pinState.lockedUntil = Date.now() + PIN_LOCKOUT_MS;
      }
      pinAttemptStore.set(deliveryCode, pinState);
      const remaining = PIN_MAX_ATTEMPTS - pinState.attempts;
      const msg = remaining > 0
        ? `Incorrect PIN. ${remaining} attempt(s) remaining.`
        : 'Too many incorrect attempts. Please try again in 15 minutes.';
      return res.status(403).json({ success: false, message: msg });
    }

    pinAttemptStore.delete(deliveryCode);

    if (!job.recipientSecret) {
      return res.status(503).json({ success: false, message: 'Delivery QR is not yet available. Please wait for the driver to pick up the package.' });
    }

    // QR payload uses recipientSecret (private, never in any URL) — not deliveryCode (public URL token)
    const qrPayload = JSON.stringify({ type: 'DELIVERY', jobId: job.id, code: job.recipientSecret, v: 1 });
    const qrImage = await QRCode.toDataURL(qrPayload, { width: 400, margin: 2, color: { dark: '#1B4332', light: '#FDFBF6' } });

    res.json({ success: true, qrImage });
  } catch (err) { next(err); }
});

/**
 * POST /scans/delivery
 * Driver scans Delivery QR at dropoff — triggers payment release
 * Body: { jobId, code, lat, lng, accuracy }
 */
router.post('/delivery', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const { jobId, code, lat, lng, accuracy } = req.body;
    if (!jobId || !code) return res.status(400).json({ success: false, message: 'jobId and code required' });

    const result = await scanDeliveryCode({
      jobId, scannedCode: code,
      scannedByUserId: req.user.id,
      gps: { lat, lng, accuracy },
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip
    });

    const io = getIO();
    const db = getDB();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    io.to(`job:${jobId}`).emit('job:status_change', { jobId, status: 'DELIVERED', deliveredAt: new Date() });
    io.to(`business:${job.businessId}`).emit('job:delivered', { jobId });

    // Sync driver level (gamification) — fire-and-forget, never blocks the response
    if (job.driverId) {
      const { recordCompletedTrip } = require('../services/driverLevel');
      recordCompletedTrip(job.driverId).then((lvl) => {
        if (lvl?.promoted) {
          io.to(`driver:${job.driverId}`).emit('driver:level_up', { level: lvl.level });
        }
      }).catch(() => {});
    }

    // SMS + push business
    const [business] = await db.select({ biz: businesses, user: users }).from(businesses)
      .leftJoin(users, eq(businesses.userId, users.id))
      .where(eq(businesses.id, job.businessId)).limit(1);
    if (business?.user?.phone) {
      await sendSMS(business.user.phone, `✓ Livraison confirmée: ${job.trackingToken}. Le paiement est libéré.`).catch(() => {});
    }
    if (business?.user?.fcmToken) {
      sendPushNotification(business.user.fcmToken, 'Delivery complete',
        'Your package has been delivered. Tap to rate the driver.',
        { type: 'JOB_DELIVERED', jobId }
      ).catch(() => {});
    }

    res.json(result);
  } catch (err) {
    if (err instanceof ScanError) {
      return res.status(err.statusCode || 400).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /scans/events/:jobId
 * Admin: view all scan attempts for a job (audit log)
 */
router.get('/events/:jobId', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { qrScanEvents } = require('../schema');
    const events = await db.select().from(qrScanEvents).where(eq(qrScanEvents.jobId, req.params.jobId));
    res.json({ success: true, events });
  } catch (err) { next(err); }
});

module.exports = router;
