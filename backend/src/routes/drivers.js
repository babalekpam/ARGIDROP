const express = require('express');
const { eq, and, desc } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { drivers, users, driverDocuments, driverLocations, jobs } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const { getIO } = require('../socket');

const router = express.Router();

// GET /profile
router.get('/profile', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found' });
    const docs = await db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driver.id));
    res.json({ success: true, driver, documents: docs });
  } catch (err) { next(err); }
});

// PATCH /profile
router.patch('/profile', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { vehicleMake, vehicleModel, vehicleYear, vehiclePlate, vehicleColor, capacityKg, coverageRadius, serviceZones } = req.body;
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const [updated] = await db.update(drivers).set({ vehicleMake, vehicleModel, vehicleYear, vehiclePlate, vehicleColor, capacityKg, coverageRadius, serviceZones: serviceZones || driver.serviceZones, updatedAt: new Date() }).where(eq(drivers.userId, req.user.id)).returning();
    res.json({ success: true, driver: updated });
  } catch (err) { next(err); }
});

// PATCH /location — Live GPS update
router.patch('/location', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { lat, lng, heading, speedKph, jobId } = req.body;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    // Update driver current location
    await db.update(drivers).set({ currentLat: lat, currentLng: lng, lastLocationAt: new Date() }).where(eq(drivers.id, driver.id));

    // Log location history
    await db.insert(driverLocations).values({ driverId: driver.id, jobId: jobId || null, lat, lng, heading, speedKph });

    // Broadcast to job room if active delivery
    if (jobId) {
      const io = getIO();
      io.to(`job:${jobId}`).emit('driver:location_update', { driverId: driver.id, lat, lng, heading, speedKph, timestamp: new Date() });
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /online-status
router.patch('/online-status', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { isOnline } = req.body;
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (!driver.isActive) return res.status(403).json({ success: false, message: 'Account not verified yet' });

    await db.update(drivers).set({ isOnline, updatedAt: new Date() }).where(eq(drivers.id, driver.id));
    res.json({ success: true, isOnline });
  } catch (err) { next(err); }
});

// POST /documents — Upload verification document
router.post('/documents', authenticate, requireRole('DRIVER'), upload.single('file'), async (req, res, next) => {
  try {
    const db = getDB();
    const { docType } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });

    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const fileUrl = await uploadFile(req.file, `drivers/${driver.id}/docs`);
    const [doc] = await db.insert(driverDocuments).values({ driverId: driver.id, docType, fileUrl, fileName: req.file.originalname, status: 'PENDING' }).returning();

    res.status(201).json({ success: true, document: doc });
  } catch (err) { next(err); }
});

// GET /jobs — Driver's jobs
router.get('/jobs', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { status } = req.query;
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    let query = db.select().from(jobs).where(eq(jobs.driverId, driver.id));
    if (status) query = query.where(eq(jobs.status, status));
    const result = await query.orderBy(desc(jobs.createdAt)).limit(50);
    res.json({ success: true, jobs: result });
  } catch (err) { next(err); }
});

// GET /earnings
router.get('/earnings', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { payments } = require('../schema');
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const payouts = await db.select().from(payments).where(and(eq(payments.driverId, driver.id), eq(payments.status, 'RELEASED'))).orderBy(desc(payments.releasedAt)).limit(100);

    const total = payouts.reduce((s, p) => s + parseFloat(p.driverPayout), 0);
    const thisMonth = payouts.filter(p => {
      const d = new Date(p.releasedAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, p) => s + parseFloat(p.driverPayout), 0);

    res.json({ success: true, totalEarnings: total.toFixed(2), thisMonth: thisMonth.toFixed(2), payouts, totalDeliveries: driver.totalDeliveries, rating: driver.rating });
  } catch (err) { next(err); }
});

// PATCH /online — Driver toggles online status
router.patch('/online', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { online } = req.body;
    await db.update(drivers).set({ isOnline: !!online, updatedAt: new Date() }).where(eq(drivers.userId, req.user.id));
    res.json({ success: true, isOnline: !!online });
  } catch (err) { next(err); }
});

// POST /onboarding — driver submits vehicle + payout info (Step 1+2 of onboarding)
router.post('/onboarding', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { vehicleType, vehicleMake, vehicleModel, vehicleYear, vehiclePlate, vehicleColor, payoutProvider, payoutAccount } = req.body;
    if (!vehicleType || !payoutProvider || !payoutAccount) {
      return res.status(400).json({ success: false, message: 'vehicleType, payoutProvider, and payoutAccount are required' });
    }
    // Create driver profile if not exists; otherwise update
    let [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) {
      [driver] = await db.insert(drivers).values({
        userId: req.user.id, vehicleType, vehicleMake, vehicleModel,
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
        vehiclePlate, vehicleColor, payoutProvider, payoutAccount
      }).returning();
    } else {
      [driver] = await db.update(drivers).set({
        vehicleType, vehicleMake, vehicleModel,
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
        vehiclePlate, vehicleColor, payoutProvider, payoutAccount, updatedAt: new Date()
      }).where(eq(drivers.id, driver.id)).returning();
    }
    res.json({ success: true, driver });
  } catch (err) { next(err); }
});

// GET /me — current driver's profile (lighter than /profile)
router.get('/me', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found' });
    res.json(driver);
  } catch (err) { next(err); }
});

// GET /me/documents — list driver's uploaded documents with statuses
router.get('/me/documents', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.json({ success: true, documents: [] });
    const docs = await db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driver.id));
    res.json({ success: true, documents: docs });
  } catch (err) { next(err); }
});

// POST /submit-for-review — driver marks their profile as ready for admin review
router.post('/submit-for-review', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    // Check all required documents uploaded
    const requiredDocs = ['GOVT_ID', 'DRIVERS_LICENSE', 'VEHICLE_REGISTRATION', 'INSURANCE', 'VEHICLE_PHOTO'];
    const existingDocs = await db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driver.id));
    const uploadedTypes = new Set(existingDocs.map(d => d.docType));
    const missing = requiredDocs.filter(t => !uploadedTypes.has(t));
    if (missing.length) return res.status(400).json({ success: false, message: `Missing documents: ${missing.join(', ')}` });
    await db.update(drivers).set({ verificationStatus: 'PENDING', updatedAt: new Date() }).where(eq(drivers.id, driver.id));
    res.json({ success: true, message: 'Submitted for review' });
  } catch (err) { next(err); }
});

module.exports = router;

// POST /selfie — dedicated selfie upload (profile photo + selfie-with-ID)
router.post('/selfie', authenticate, requireRole('DRIVER'), upload.single('file'), async (req, res, next) => {
  try {
    const db = getDB();
    const { docType } = req.body; // 'SELFIE' | 'SELFIE_WITH_ID'
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
    if (!['SELFIE','SELFIE_WITH_ID'].includes(docType)) return res.status(400).json({ success: false, message: 'Invalid selfie type' });

    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found' });

    const fileUrl = await uploadFile(req.file, `drivers/${driver.id}/selfies`);

    // Update the specific selfie field on the drivers table
    if (docType === 'SELFIE') {
      await db.update(drivers).set({ selfieUrl: fileUrl, updatedAt: new Date() }).where(eq(drivers.id, driver.id));
    } else {
      await db.update(drivers).set({ selfieWithIdUrl: fileUrl, updatedAt: new Date() }).where(eq(drivers.id, driver.id));
    }

    // Also log as a document for admin review
    await db.insert(driverDocuments).values({
      driverId: driver.id, docType, fileUrl, fileName: req.file.originalname, status: 'PENDING'
    });

    res.status(201).json({ success: true, fileUrl, docType });
  } catch (err) { next(err); }
});
