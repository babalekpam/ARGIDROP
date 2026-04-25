// QR Scan Service — triple-verification system
// Handles Payment QR, Pickup QR, and Delivery QR validation

const { eq, and } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/database');
const { jobs, qrScanEvents, drivers, businesses, users } = require('../schema');
const { haversineKm } = require('./geo');

// Acceptable GPS proximity to pickup/dropoff (in meters)
const PICKUP_GPS_TOLERANCE_M = 200;
const DELIVERY_GPS_TOLERANCE_M = 150;
// How long QR codes remain valid
const PICKUP_CODE_TTL_MINS = 120; // 2 hours after driver accepts
const DELIVERY_CODE_TTL_MINS = 60; // 1 hour after pickup confirmed
const PAYMENT_CODE_TTL_MINS = 15; // 15 minutes to complete payment

/**
 * Generate a new Pickup QR when driver accepts the job
 */
async function generatePickupCode(jobId) {
  const db = getDB();
  const code = uuidv4();
  await db.update(jobs).set({
    pickupCode: code,
    pickupCodeGeneratedAt: new Date(),
    updatedAt: new Date()
  }).where(eq(jobs.id, jobId));
  return code;
}

/**
 * Generate a Delivery QR when driver confirms pickup
 */
async function generateDeliveryCode(jobId) {
  const db = getDB();
  const code = uuidv4();
  await db.update(jobs).set({
    deliveryCode: code,
    deliveryCodeGeneratedAt: new Date(),
    updatedAt: new Date()
  }).where(eq(jobs.id, jobId));
  return code;
}

/**
 * Log every scan attempt — success or failure
 */
async function logScanEvent({ jobId, scanType, scannedByUserId, scannedCode, gps, success, failureReason, deviceInfo, ipAddress, distanceM }) {
  const db = getDB();
  await db.insert(qrScanEvents).values({
    jobId,
    scanType,
    scannedByUserId,
    scannedCode,
    gpsLat: gps?.lat,
    gpsLng: gps?.lng,
    gpsAccuracyMeters: gps?.accuracy,
    distanceFromExpectedMeters: distanceM,
    deviceInfo,
    ipAddress,
    success,
    failureReason
  });
}

/**
 * Scan PICKUP QR — driver scans business's QR at pickup
 * Verifies: driver match, code validity, GPS proximity, timing
 */
async function scanPickupCode({ jobId, scannedCode, scannedByUserId, gps, deviceInfo, ipAddress }) {
  const db = getDB();

  // Load job + assigned driver
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) {
    await logScanEvent({ jobId, scanType: 'PICKUP', scannedByUserId, scannedCode, gps, success: false, failureReason: 'Job not found', deviceInfo, ipAddress });
    throw new ScanError('JOB_NOT_FOUND', 'Job not found');
  }

  // Verify driver is the assigned one
  const [driver] = await db.select().from(drivers).where(eq(drivers.userId, scannedByUserId)).limit(1);
  if (!driver || driver.id !== job.driverId) {
    await logScanEvent({ jobId, scanType: 'PICKUP', scannedByUserId, scannedCode, gps, success: false, failureReason: 'Not the assigned driver', deviceInfo, ipAddress });
    throw new ScanError('WRONG_DRIVER', 'You are not the assigned driver for this delivery');
  }

  // Verify job status
  if (job.status !== 'MATCHED') {
    await logScanEvent({ jobId, scanType: 'PICKUP', scannedByUserId, scannedCode, gps, success: false, failureReason: `Invalid status: ${job.status}`, deviceInfo, ipAddress });
    throw new ScanError('INVALID_STATUS', `Cannot scan pickup — job is ${job.status}`);
  }

  // Verify code matches
  if (!job.pickupCode || job.pickupCode !== scannedCode) {
    await logScanEvent({ jobId, scanType: 'PICKUP', scannedByUserId, scannedCode, gps, success: false, failureReason: 'Invalid pickup code', deviceInfo, ipAddress });
    throw new ScanError('INVALID_CODE', 'The scanned code is invalid');
  }

  // Verify code not expired
  const codeAge = Date.now() - new Date(job.pickupCodeGeneratedAt).getTime();
  if (codeAge > PICKUP_CODE_TTL_MINS * 60 * 1000) {
    await logScanEvent({ jobId, scanType: 'PICKUP', scannedByUserId, scannedCode, gps, success: false, failureReason: 'Code expired', deviceInfo, ipAddress });
    throw new ScanError('CODE_EXPIRED', 'This pickup code has expired. Please contact the business.');
  }

  // Verify GPS proximity to pickup location
  let distanceM = null;
  if (gps?.lat && gps?.lng && job.pickupLat && job.pickupLng) {
    const distKm = haversineKm(parseFloat(gps.lat), parseFloat(gps.lng), parseFloat(job.pickupLat), parseFloat(job.pickupLng));
    distanceM = distKm * 1000;
    if (distanceM > PICKUP_GPS_TOLERANCE_M) {
      await logScanEvent({ jobId, scanType: 'PICKUP', scannedByUserId, scannedCode, gps, success: false, failureReason: `Too far from pickup (${Math.round(distanceM)}m)`, deviceInfo, ipAddress, distanceM });
      throw new ScanError('GPS_MISMATCH', `You appear to be ${Math.round(distanceM)}m from the pickup location. Please move closer and try again.`);
    }
  }

  // ALL CHECKS PASSED — update job status and generate delivery code + separate recipient secret
  const deliveryCode = uuidv4();
  const recipientSecret = uuidv4(); // Authorization secret for delivery QR — never exposed in public URLs
  const now = new Date();
  await db.update(jobs).set({
    status: 'IN_TRANSIT',
    pickupScannedAt: now,
    pickupScanLat: gps?.lat,
    pickupScanLng: gps?.lng,
    pickedUpAt: now,
    deliveryCode,
    recipientSecret,
    deliveryCodeGeneratedAt: now,
    updatedAt: now
  }).where(eq(jobs.id, jobId));

  await logScanEvent({ jobId, scanType: 'PICKUP', scannedByUserId, scannedCode, gps, success: true, deviceInfo, ipAddress, distanceM });

  return { success: true, jobId, newStatus: 'IN_TRANSIT', deliveryCode };
}

/**
 * Scan DELIVERY QR — driver scans recipient's QR at dropoff
 * Verifies: driver match, code validity, GPS proximity, pickup was completed
 * On success: triggers payment release
 */
async function scanDeliveryCode({ jobId, scannedCode, scannedByUserId, gps, deviceInfo, ipAddress }) {
  const db = getDB();

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) {
    await logScanEvent({ jobId, scanType: 'DELIVERY', scannedByUserId, scannedCode, gps, success: false, failureReason: 'Job not found', deviceInfo, ipAddress });
    throw new ScanError('JOB_NOT_FOUND', 'Job not found');
  }

  const [driver] = await db.select().from(drivers).where(eq(drivers.userId, scannedByUserId)).limit(1);
  if (!driver || driver.id !== job.driverId) {
    await logScanEvent({ jobId, scanType: 'DELIVERY', scannedByUserId, scannedCode, gps, success: false, failureReason: 'Not the assigned driver', deviceInfo, ipAddress });
    throw new ScanError('WRONG_DRIVER', 'You are not the assigned driver for this delivery');
  }

  if (job.status !== 'IN_TRANSIT') {
    await logScanEvent({ jobId, scanType: 'DELIVERY', scannedByUserId, scannedCode, gps, success: false, failureReason: `Invalid status: ${job.status}`, deviceInfo, ipAddress });
    throw new ScanError('INVALID_STATUS', `Cannot scan delivery — job is ${job.status}. Did you confirm pickup?`);
  }

  // Validate against recipientSecret (the private QR authorization value, not the public URL token)
  if (!job.recipientSecret || job.recipientSecret !== scannedCode) {
    await logScanEvent({ jobId, scanType: 'DELIVERY', scannedByUserId, scannedCode, gps, success: false, failureReason: 'Invalid delivery code', deviceInfo, ipAddress });
    throw new ScanError('INVALID_CODE', 'The scanned code is invalid');
  }

  // Check code expiry
  const codeAge = Date.now() - new Date(job.deliveryCodeGeneratedAt).getTime();
  if (codeAge > DELIVERY_CODE_TTL_MINS * 60 * 1000 * 4) { // 4h buffer for delivery
    await logScanEvent({ jobId, scanType: 'DELIVERY', scannedByUserId, scannedCode, gps, success: false, failureReason: 'Delivery code expired', deviceInfo, ipAddress });
    throw new ScanError('CODE_EXPIRED', 'This delivery code has expired.');
  }

  // GPS proximity to dropoff
  let distanceM = null;
  if (gps?.lat && gps?.lng && job.dropoffLat && job.dropoffLng) {
    const distKm = haversineKm(parseFloat(gps.lat), parseFloat(gps.lng), parseFloat(job.dropoffLat), parseFloat(job.dropoffLng));
    distanceM = distKm * 1000;
    if (distanceM > DELIVERY_GPS_TOLERANCE_M) {
      await logScanEvent({ jobId, scanType: 'DELIVERY', scannedByUserId, scannedCode, gps, success: false, failureReason: `Too far from dropoff (${Math.round(distanceM)}m)`, deviceInfo, ipAddress, distanceM });
      throw new ScanError('GPS_MISMATCH', `You appear to be ${Math.round(distanceM)}m from the dropoff. Please verify location.`);
    }
  }

  // ALL CHECKS PASSED — mark delivered and release payment
  const now = new Date();
  await db.update(jobs).set({
    status: 'DELIVERED',
    deliveryScannedAt: now,
    deliveryScanLat: gps?.lat,
    deliveryScanLng: gps?.lng,
    deliveredAt: now,
    completedAt: now,
    updatedAt: now
  }).where(eq(jobs.id, jobId));

  await logScanEvent({ jobId, scanType: 'DELIVERY', scannedByUserId, scannedCode, gps, success: true, deviceInfo, ipAddress, distanceM });

  // Trigger payment release (async, don't block the scan response)
  const { releasePayment } = require('./payment');
  releasePayment(jobId).catch(err => console.error('Payment release failed for', jobId, err));

  return { success: true, jobId, newStatus: 'DELIVERED', paymentReleasing: true };
}

class ScanError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.statusCode = 400;
  }
}

module.exports = {
  generatePickupCode,
  generateDeliveryCode,
  scanPickupCode,
  scanDeliveryCode,
  logScanEvent,
  ScanError,
  PICKUP_CODE_TTL_MINS,
  DELIVERY_CODE_TTL_MINS,
  PAYMENT_CODE_TTL_MINS,
};
