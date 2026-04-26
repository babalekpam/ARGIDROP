const express = require('express');
const bcrypt = require('bcryptjs');
const { eq, and, desc, gt } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { drivers, users, driverDocuments, driverLocations, jobs, driverPayouts, otpCodes } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');
const { processEndShiftPayout } = require('../services/payout');
const { sendSMS } = require('../services/notification');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const { getIO } = require('../socket');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Anti-bruteforce limits for PIN-gated endpoints. Keyed by user id (not IP) so a
// shared NAT can't lock everyone out, and so an attacker can't escape by IP-rotating.
const pinKey = (req) => req.user?.id || req.ip;
const endShiftLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5, keyGenerator: pinKey, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many PIN attempts. Try again in 15 minutes.' },
});
const pinResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 3, keyGenerator: pinKey, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests. Try again in an hour.' },
});

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

    // Broadcast to job room only if this driver is assigned to that job
    if (jobId) {
      const [assignedJob] = await db.select().from(jobs).where(
        and(eq(jobs.id, jobId), eq(jobs.driverId, driver.id))
      ).limit(1);

      if (assignedJob) {
        const io = getIO();
        io.to(`job:${jobId}`).emit('driver:location_update', { driverId: driver.id, lat, lng, heading, speedKph, timestamp: new Date() });
      }
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /online-status — legacy alias of /online. Same gating applies (approved + PIN + on-shift).
router.patch('/online-status', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { isOnline } = req.body;
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (isOnline) {
      if (driver.verificationStatus !== 'APPROVED') return res.status(403).json({ success: false, message: 'Account not yet approved', code: 'NOT_APPROVED' });
      if (!driver.payoutPinHash || !driver.payoutPhone) return res.status(400).json({ success: false, message: 'Set your payout PIN and phone before going online', code: 'PAYOUT_NOT_CONFIGURED' });
      if (!driver.isOnShift) return res.status(400).json({ success: false, message: 'Start a shift before going online', code: 'NOT_ON_SHIFT' });
    }
    await db.update(drivers).set({ isOnline: !!isOnline, updatedAt: new Date() }).where(eq(drivers.id, driver.id));
    res.json({ success: true, isOnline: !!isOnline });
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

    const conditions = [eq(jobs.driverId, driver.id)];
    if (status) conditions.push(eq(jobs.status, status));
    const result = await db.select().from(jobs)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(jobs.createdAt)).limit(50);
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

// PATCH /online — driver toggles availability for new jobs.
// Going online requires (a) approved status, (b) PIN+payout phone configured, (c) on shift.
// Going offline is unrestricted (driver can always stop receiving jobs).
router.patch('/online', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const { online } = req.body;
    const [d] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!d) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (online) {
      if (d.verificationStatus !== 'APPROVED') return res.status(403).json({ success: false, message: 'Account not yet approved', code: 'NOT_APPROVED' });
      if (!d.payoutPinHash || !d.payoutPhone) return res.status(400).json({ success: false, message: 'Set your payout PIN and phone before going online', code: 'PAYOUT_NOT_CONFIGURED' });
      if (!d.isOnShift) return res.status(400).json({ success: false, message: 'Start a shift before going online', code: 'NOT_ON_SHIFT' });
    }
    await db.update(drivers).set({ isOnline: !!online, updatedAt: new Date() }).where(eq(drivers.id, d.id));
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

// ─── PAYOUT PIN + END-OF-SHIFT CASH-OUT ───

// GET /payout-status — returns whether driver has set a PIN, payout phone, current shift state
router.get('/payout-status', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const [d] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!d) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({
      success: true,
      pinSet: !!d.payoutPinHash,
      payoutPhone: d.payoutPhone || null,
      pendingEarnings: Number(d.pendingEarnings || 0),
      isOnShift: !!d.isOnShift,
      shiftStartedAt: d.shiftStartedAt,
    });
  } catch (err) { next(err); }
});

// POST /payout-pin — set or change PIN.
//   Body: { pin: '1234', currentPin?: '0000', payoutPhone?: '+228...' }
//   - If no PIN exists yet: just sets it (and payoutPhone if provided).
//   - If a PIN exists: requires currentPin to verify.
router.post('/payout-pin', authenticate, requireRole('DRIVER'), endShiftLimiter, async (req, res, next) => {
  try {
    const { pin, currentPin, payoutPhone } = req.body;
    if (!/^\d{4,6}$/.test(String(pin || ''))) {
      return res.status(400).json({ success: false, message: 'PIN must be 4 to 6 digits' });
    }
    const db = getDB();
    const [d] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!d) return res.status(404).json({ success: false, message: 'Driver not found' });

    if (d.payoutPinHash) {
      const ok = currentPin && await bcrypt.compare(String(currentPin), d.payoutPinHash);
      if (!ok) return res.status(401).json({ success: false, message: 'Current PIN is incorrect' });
    }

    const update = {
      payoutPinHash: await bcrypt.hash(String(pin), 10),
      payoutPinSetAt: new Date(),
      updatedAt: new Date(),
    };
    if (payoutPhone) update.payoutPhone = payoutPhone;

    await db.update(drivers).set(update).where(eq(drivers.id, d.id));
    res.json({ success: true, message: 'Payout PIN saved' });
  } catch (err) { next(err); }
});

// POST /payout-pin/reset-request — driver forgot PIN, send OTP to their phone
router.post('/payout-pin/reset-request', authenticate, requireRole('DRIVER'), pinResetLimiter, async (req, res, next) => {
  try {
    if (!req.user.phone) return res.status(400).json({ success: false, message: 'No phone number on file' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const db = getDB();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(otpCodes).values({ userId: req.user.id, code, type: 'payout_pin_reset', expiresAt });
    await sendSMS(req.user.phone, `Your ArgiDrop PIN reset code is: ${code}. Do not share this code.`);
    res.json({ success: true, message: 'Reset code sent to your phone' });
  } catch (err) { next(err); }
});

// POST /payout-pin/reset — verify OTP, set new PIN
router.post('/payout-pin/reset', authenticate, requireRole('DRIVER'), endShiftLimiter, async (req, res, next) => {
  try {
    const { code, newPin, payoutPhone } = req.body;
    if (!/^\d{4,6}$/.test(String(newPin || ''))) {
      return res.status(400).json({ success: false, message: 'PIN must be 4 to 6 digits' });
    }
    const db = getDB();
    const now = new Date();
    const [otp] = await db.select().from(otpCodes)
      .where(and(eq(otpCodes.userId, req.user.id), eq(otpCodes.code, String(code || '')), eq(otpCodes.type, 'payout_pin_reset'), gt(otpCodes.expiresAt, now)))
      .limit(1);
    if (!otp || otp.usedAt) return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    await db.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, otp.id));
    const [d] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!d) return res.status(404).json({ success: false, message: 'Driver not found' });
    const update = {
      payoutPinHash: await bcrypt.hash(String(newPin), 10),
      payoutPinSetAt: now,
      updatedAt: now,
    };
    if (payoutPhone) update.payoutPhone = payoutPhone;
    await db.update(drivers).set(update).where(eq(drivers.id, d.id));
    res.json({ success: true, message: 'PIN reset successfully' });
  } catch (err) { next(err); }
});

// POST /shift/start — driver presses "Start shift" / goes online
router.post('/shift/start', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const [d] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!d) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (d.verificationStatus !== 'APPROVED') return res.status(403).json({ success: false, message: 'Account not yet approved' });
    if (!d.payoutPinHash || !d.payoutPhone) return res.status(400).json({ success: false, message: 'Set your payout PIN and phone before starting a shift', code: 'PAYOUT_NOT_CONFIGURED' });

    await db.update(drivers).set({
      isOnShift: true, isOnline: true, shiftStartedAt: new Date(), shiftEndedAt: null, updatedAt: new Date(),
    }).where(eq(drivers.id, d.id));
    res.json({ success: true, message: 'Shift started' });
  } catch (err) { next(err); }
});

// POST /shift/end — driver presses "End shift & cash out". Verifies PIN, triggers payout.
router.post('/shift/end', authenticate, requireRole('DRIVER'), endShiftLimiter, async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ success: false, message: 'PIN required' });
    const db = getDB();
    const [d] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!d) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (!d.payoutPinHash) return res.status(400).json({ success: false, message: 'No PIN set' });
    const valid = await bcrypt.compare(String(pin), d.payoutPinHash);
    if (!valid) return res.status(401).json({ success: false, message: 'Incorrect PIN' });

    // Get country from associated user
    const [u] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    const result = await processEndShiftPayout(d, { trigger: 'END_SHIFT', countryCode: u?.country || 'TG' });
    if (!result.ok) return res.status(400).json({ success: false, message: result.message || 'Payout failed', code: result.code });
    res.json({
      success: true,
      message: result.message || 'Shift ended. Payout sent.',
      payout: result.payout,
    });
  } catch (err) { next(err); }
});

// GET /payouts — driver's payout history
router.get('/payouts', authenticate, requireRole('DRIVER'), async (req, res, next) => {
  try {
    const db = getDB();
    const [d] = await db.select().from(drivers).where(eq(drivers.userId, req.user.id)).limit(1);
    if (!d) return res.status(404).json({ success: false, message: 'Driver not found' });
    const list = await db.select().from(driverPayouts).where(eq(driverPayouts.driverId, d.id)).orderBy(desc(driverPayouts.createdAt)).limit(50);
    res.json({ success: true, payouts: list });
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
