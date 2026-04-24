// Scan Routes — QR verification endpoints for the triple-scan system

const express = require('express');
const { eq } = require('drizzle-orm');
const QRCode = require('qrcode');
const { getDB } = require('../config/database');
const { jobs, businesses, drivers, users } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const { scanPickupCode, scanDeliveryCode, ScanError } = require('../services/qr');
const { getIO } = require('../socket');
const { sendSMS } = require('../services/notification');

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

    // SMS recipient with tracking link
    if (job.dropoffContactPhone) {
      const trackUrl = `${process.env.WEB_URL}/r/${job.deliveryCode}`;
      const msg = job.dropoffContactName
        ? `Bonjour ${job.dropoffContactName}, votre colis ArgiDrop est en route. Suivez-le et montrez votre QR au livreur: ${trackUrl}`
        : `Votre colis ArgiDrop est en route. Suivez-le et montrez votre QR au livreur: ${trackUrl}`;
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

/**
 * GET /scans/r/:deliveryCode
 * Public recipient-facing endpoint — returns tracking info + QR for recipient to display
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

    // Generate QR for recipient to show driver
    const qrPayload = JSON.stringify({ type: 'DELIVERY', jobId: job.id, code: job.deliveryCode, v: 1 });
    const qrImage = await QRCode.toDataURL(qrPayload, { width: 400, margin: 2, color: { dark: '#1B4332', light: '#FDFBF6' } });

    res.json({
      success: true,
      tracking: {
        jobId: job.id,
        status: job.status,
        pickupAddress: job.pickupAddress,
        dropoffAddress: job.dropoffAddress,
        pickedUpAt: job.pickedUpAt,
        deliveredAt: job.deliveredAt,
        qrPayload,
        qrImage,
        driver: driver ? {
          firstName: driverUser?.firstName,
          vehicleType: driver.vehicleType,
          vehicleMake: driver.vehicleMake,
          vehicleModel: driver.vehicleModel,
          vehicleColor: driver.vehicleColor,
          vehiclePlate: driver.vehiclePlate,
          rating: driver.rating,
          currentLat: driver.currentLat,
          currentLng: driver.currentLng,
        } : null
      }
    });
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

    // SMS business
    const [business] = await db.select({ biz: businesses, user: users }).from(businesses)
      .leftJoin(users, eq(businesses.userId, users.id))
      .where(eq(businesses.id, job.businessId)).limit(1);
    if (business?.user?.phone) {
      await sendSMS(business.user.phone, `✓ Livraison confirmée: ${job.trackingToken}. Le paiement est libéré.`).catch(() => {});
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
