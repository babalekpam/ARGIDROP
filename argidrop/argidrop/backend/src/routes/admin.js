const express = require('express');
const { eq, desc, sql, count, sum, and } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { users, businesses, drivers, jobs, payments, disputes, driverDocuments, businessDocuments, zones } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /dashboard
router.get('/dashboard', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const [totalUsers] = await db.select({ count: sql`count(*)` }).from(users);
    const [totalJobs] = await db.select({ count: sql`count(*)` }).from(jobs);
    const [totalDrivers] = await db.select({ count: sql`count(*)` }).from(drivers);
    const [totalBusinesses] = await db.select({ count: sql`count(*)` }).from(businesses);
    const allPayments = await db.select().from(payments).where(eq(payments.status, 'RELEASED'));
    const gmv = allPayments.reduce((s, p) => s + parseFloat(p.grossAmount), 0);
    const commission = allPayments.reduce((s, p) => s + parseFloat(p.commissionAmount), 0);

    const pendingDisputes = await db.select().from(disputes).where(eq(disputes.status, 'OPEN'));
    const pendingDriverDocs = await db.select({ driver: drivers, doc: driverDocuments }).from(driverDocuments).leftJoin(drivers, eq(driverDocuments.driverId, drivers.id)).where(eq(driverDocuments.status, 'PENDING'));
    const recentJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(10);

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(totalUsers.count),
        totalJobs: parseInt(totalJobs.count),
        totalDrivers: parseInt(totalDrivers.count),
        totalBusinesses: parseInt(totalBusinesses.count),
        gmv: gmv.toFixed(2),
        commissionRevenue: commission.toFixed(2),
        pendingDisputes: pendingDisputes.length,
        pendingDocReviews: pendingDriverDocs.length
      },
      recentJobs,
      pendingDisputes: pendingDisputes.slice(0, 5)
    });
  } catch (err) { next(err); }
});

// GET /users
router.get('/users', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { role, status, limit = 50, offset = 0 } = req.query;
    let query = db.select().from(users);
    if (role) query = query.where(eq(users.role, role));
    if (status) query = query.where(eq(users.status, status));
    const result = await query.orderBy(desc(users.createdAt)).limit(parseInt(limit)).offset(parseInt(offset));
    const [total] = await db.select({ count: sql`count(*)` }).from(users);
    res.json({ success: true, users: result, total: parseInt(total.count) });
  } catch (err) { next(err); }
});

// PATCH /users/:id/status
router.patch('/users/:id/status', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { status } = req.body;
    const [updated] = await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, req.params.id)).returning();
    res.json({ success: true, user: updated });
  } catch (err) { next(err); }
});

// GET /drivers/pending — Pending driver verifications
router.get('/drivers/pending', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const pending = await db.select({ driver: drivers, user: users, documents: driverDocuments })
      .from(drivers)
      .leftJoin(users, eq(drivers.userId, users.id))
      .where(eq(drivers.verificationStatus, 'PENDING'))
      .orderBy(desc(drivers.createdAt));
    res.json({ success: true, drivers: pending });
  } catch (err) { next(err); }
});

// POST /drivers/:id/verify
router.post('/drivers/:id/verify', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { status, reason } = req.body; // APPROVED | REJECTED
    const [updated] = await db.update(drivers).set({ verificationStatus: status, isActive: status === 'APPROVED', updatedAt: new Date() }).where(eq(drivers.id, req.params.id)).returning();

    if (status === 'APPROVED') {
      await db.update(users).set({ status: 'ACTIVE' }).where(eq(users.id, updated.userId));
    }

    const { sendPushNotification } = require('../services/notification');
    const [driverUser] = await db.select().from(users).where(eq(users.id, updated.userId)).limit(1);
    if (driverUser?.fcmToken) {
      const msg = status === 'APPROVED' ? 'Your driver account is approved! Start accepting jobs.' : `Verification rejected: ${reason}`;
      await sendPushNotification(driverUser.fcmToken, `Account ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`, msg, { type: 'VERIFICATION_UPDATE', status });
    }

    res.json({ success: true, driver: updated });
  } catch (err) { next(err); }
});

// POST /documents/:id/review
router.post('/documents/:id/review', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { status, rejectionReason } = req.body;
    const [updated] = await db.update(driverDocuments).set({ status, rejectionReason, reviewedBy: req.user.id, reviewedAt: new Date() }).where(eq(driverDocuments.id, req.params.id)).returning();
    res.json({ success: true, document: updated });
  } catch (err) { next(err); }
});

// GET /disputes
router.get('/disputes', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { status } = req.query;
    let query = db.select({ dispute: disputes, job: jobs }).from(disputes).leftJoin(jobs, eq(disputes.jobId, jobs.id));
    if (status) query = query.where(eq(disputes.status, status));
    const result = await query.orderBy(desc(disputes.createdAt)).limit(50);
    res.json({ success: true, disputes: result });
  } catch (err) { next(err); }
});

// PATCH /disputes/:id/resolve
router.patch('/disputes/:id/resolve', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { status, resolution } = req.body;
    const [updated] = await db.update(disputes).set({ status, resolution, resolvedBy: req.user.id, resolvedAt: new Date() }).where(eq(disputes.id, req.params.id)).returning();

    if (status === 'RESOLVED_DRIVER') {
      await require('../services/payment').releasePayment(updated.jobId);
    } else if (status === 'RESOLVED_BUSINESS') {
      await require('../services/payment').refundPayment(updated.jobId);
    }

    res.json({ success: true, dispute: updated });
  } catch (err) { next(err); }
});

// GET /jobs — All jobs
router.get('/jobs', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { status, limit = 50, offset = 0 } = req.query;
    let query = db.select({ job: jobs, business: businesses }).from(jobs).leftJoin(businesses, eq(jobs.businessId, businesses.id));
    if (status) query = query.where(eq(jobs.status, status));
    const result = await query.orderBy(desc(jobs.createdAt)).limit(parseInt(limit)).offset(parseInt(offset));
    res.json({ success: true, jobs: result });
  } catch (err) { next(err); }
});

// GET /analytics
router.get('/analytics', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const allJobs = await db.select().from(jobs);
    const allPayments = await db.select().from(payments);

    // Jobs by status
    const byStatus = allJobs.reduce((acc, j) => { acc[j.status] = (acc[j.status] || 0) + 1; return acc; }, {});

    // Revenue by month (last 6 months)
    const now = new Date();
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthPay = allPayments.filter(p => p.status === 'RELEASED' && new Date(p.releasedAt) >= d && new Date(p.releasedAt) < end);
      monthlyRevenue.push({ month: d.toLocaleString('default', { month: 'short', year: 'numeric' }), gmv: monthPay.reduce((s, p) => s + parseFloat(p.grossAmount), 0), commission: monthPay.reduce((s, p) => s + parseFloat(p.commissionAmount), 0), deliveries: monthPay.length });
    }

    res.json({ success: true, byStatus, monthlyRevenue, totalGMV: allPayments.filter(p => p.status === 'RELEASED').reduce((s, p) => s + parseFloat(p.grossAmount), 0).toFixed(2) });
  } catch (err) { next(err); }
});

// CRUD Zones
router.get('/zones', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.select().from(zones).orderBy(zones.name);
    res.json({ success: true, zones: result });
  } catch (err) { next(err); }
});

router.post('/zones', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const [zone] = await db.insert(zones).values({ ...req.body, adminUserId: req.user.id }).returning();
    res.status(201).json({ success: true, zone });
  } catch (err) { next(err); }
});

// ─── DRIVER DOCUMENT APPROVAL ───

router.get('/drivers/pending-review', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.select({ driver: drivers, user: users }).from(drivers)
      .leftJoin(users, eq(drivers.userId, users.id))
      .where(eq(drivers.verificationStatus, 'PENDING'));
    // Attach docs
    const withDocs = await Promise.all(result.map(async r => {
      const docs = await db.select().from(driverDocuments).where(eq(driverDocuments.driverId, r.driver.id));
      return { ...r, documents: docs };
    }));
    res.json({ success: true, drivers: withDocs });
  } catch (err) { next(err); }
});

router.post('/drivers/:driverId/approve', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    await db.update(drivers).set({ verificationStatus: 'APPROVED', isActive: true, updatedAt: new Date() }).where(eq(drivers.id, req.params.driverId));
    // Approve all their PENDING documents
    await db.update(driverDocuments).set({ status: 'APPROVED', reviewedBy: req.user.id, reviewedAt: new Date() })
      .where(eq(driverDocuments.driverId, req.params.driverId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/drivers/:driverId/reject', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { reason, docType } = req.body;
    if (docType) {
      await db.update(driverDocuments).set({ status: 'REJECTED', rejectionReason: reason, reviewedBy: req.user.id, reviewedAt: new Date() })
        .where(eq(driverDocuments.driverId, req.params.driverId));
    }
    await db.update(drivers).set({ verificationStatus: 'REJECTED', updatedAt: new Date() }).where(eq(drivers.id, req.params.driverId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── QR SCAN ANALYTICS ───

router.get('/scan-analytics', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { qrScanEvents } = require('../schema');

    // Last 30 days of scan events
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await db.select().from(qrScanEvents).where(sql`${qrScanEvents.createdAt} > ${thirtyDaysAgo}`);

    // Aggregate
    const byType = { PAYMENT: { total: 0, success: 0, failed: 0 }, PICKUP: { total: 0, success: 0, failed: 0 }, DELIVERY: { total: 0, success: 0, failed: 0 } };
    const failureReasons = {};
    const byDay = {};
    const gpsFarOutliers = []; // scans that succeeded but had high distance

    for (const e of events) {
      const t = e.scanType;
      if (byType[t]) {
        byType[t].total++;
        if (e.success) byType[t].success++;
        else {
          byType[t].failed++;
          failureReasons[e.failureReason || 'Unknown'] = (failureReasons[e.failureReason || 'Unknown'] || 0) + 1;
        }
      }
      const day = new Date(e.createdAt).toISOString().slice(0, 10);
      byDay[day] = byDay[day] || { total: 0, success: 0, failed: 0 };
      byDay[day].total++;
      if (e.success) byDay[day].success++; else byDay[day].failed++;

      if (e.success && e.distanceFromExpectedMeters && parseFloat(e.distanceFromExpectedMeters) > 100) {
        gpsFarOutliers.push({ jobId: e.jobId, scanType: e.scanType, distanceM: e.distanceFromExpectedMeters, userId: e.scannedByUserId, createdAt: e.createdAt });
      }
    }

    // Success rates
    const rates = Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, { ...v, successRate: v.total ? ((v.success / v.total) * 100).toFixed(1) : '0.0' }]));

    // Time series (last 30 days)
    const series = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({ date, ...d }));

    res.json({
      success: true,
      summary: rates,
      topFailureReasons: Object.entries(failureReasons).sort(([, a], [, b]) => b - a).slice(0, 10).map(([reason, count]) => ({ reason, count })),
      dailySeries: series,
      gpsFarOutliers: gpsFarOutliers.slice(0, 50),
      totalEvents: events.length
    });
  } catch (err) { next(err); }
});

router.get('/scan-events/:jobId', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { qrScanEvents } = require('../schema');
    const events = await db.select({ event: qrScanEvents, user: { firstName: users.firstName, lastName: users.lastName, email: users.email } })
      .from(qrScanEvents)
      .leftJoin(users, eq(qrScanEvents.scannedByUserId, users.id))
      .where(eq(qrScanEvents.jobId, req.params.jobId))
      .orderBy(desc(qrScanEvents.createdAt));
    res.json({ success: true, events });
  } catch (err) { next(err); }
});

// ─── LIVE DRIVER MAP ───

router.get('/drivers/live', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.select({
      id: drivers.id,
      userId: drivers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      vehicleType: drivers.vehicleType,
      vehicleMake: drivers.vehicleMake,
      vehicleModel: drivers.vehicleModel,
      vehiclePlate: drivers.vehiclePlate,
      rating: drivers.rating,
      totalDeliveries: drivers.totalDeliveries,
      isActive: drivers.isActive,
      isOnline: drivers.isOnline,
      currentLat: drivers.currentLat,
      currentLng: drivers.currentLng,
      lastLocationAt: drivers.lastLocationAt,
      verificationStatus: drivers.verificationStatus,
    })
      .from(drivers)
      .leftJoin(users, eq(drivers.userId, users.id))
      .where(eq(drivers.isActive, true));
    res.json({ success: true, drivers: result });
  } catch (err) { next(err); }
});

// ─── DISPUTES MANAGEMENT ───

router.get('/disputes', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.select().from(disputes).orderBy(desc(disputes.createdAt)).limit(200);
    res.json({ success: true, disputes: result });
  } catch (err) { next(err); }
});

router.post('/disputes/:id/resolve', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { outcome, resolution } = req.body;
    if (!['RESOLVED_BUSINESS', 'RESOLVED_DRIVER', 'CLOSED'].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'Invalid outcome' });
    }
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, req.params.id)).limit(1);
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

    // If refund decision → refund the business, mark job cancelled
    if (outcome === 'RESOLVED_BUSINESS') {
      const { refundPayment } = require('../services/payment');
      await refundPayment(dispute.jobId).catch(err => console.error('Refund error:', err));
      await db.update(jobs).set({ status: 'CANCELLED' }).where(eq(jobs.id, dispute.jobId));
    } else if (outcome === 'RESOLVED_DRIVER') {
      // Release payment if still held
      const { releasePayment } = require('../services/payment');
      await releasePayment(dispute.jobId).catch(err => console.error('Release error:', err));
    }

    await db.update(disputes).set({
      status: outcome, resolution, resolvedBy: req.user.id, resolvedAt: new Date()
    }).where(eq(disputes.id, req.params.id));

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── BUSINESS KYC APPROVAL ───

router.get('/businesses/pending-review', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.select({ business: businesses, user: users }).from(businesses)
      .leftJoin(users, eq(businesses.userId, users.id))
      .where(eq(businesses.verificationStatus, 'PENDING'));
    const withDocs = await Promise.all(result.map(async r => {
      const docs = await db.select().from(businessDocuments).where(eq(businessDocuments.businessId, r.business.id));
      return { ...r, documents: docs };
    }));
    res.json({ success: true, businesses: withDocs });
  } catch (err) { next(err); }
});

router.post('/businesses/:businessId/approve', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    await db.update(businesses).set({ verificationStatus: 'APPROVED', isVerifiedBadge: true, updatedAt: new Date() })
      .where(eq(businesses.id, req.params.businessId));
    await db.update(businessDocuments).set({ status: 'APPROVED', reviewedBy: req.user.id, reviewedAt: new Date() })
      .where(eq(businessDocuments.businessId, req.params.businessId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/businesses/:businessId/reject', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { reason } = req.body;
    await db.update(businessDocuments).set({ status: 'REJECTED', rejectionReason: reason, reviewedBy: req.user.id, reviewedAt: new Date() })
      .where(eq(businessDocuments.businessId, req.params.businessId));
    await db.update(businesses).set({ verificationStatus: 'REJECTED', updatedAt: new Date() }).where(eq(businesses.id, req.params.businessId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── LIVE OPERATIONS MAP ───
router.get('/live-map', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineDrivers = await db.select({
      id: drivers.id, userId: drivers.userId,
      lat: drivers.currentLat, lng: drivers.currentLng,
      lastLocationAt: drivers.lastLocationAt, isOnline: drivers.isOnline,
      vehicleType: drivers.vehicleType, vehiclePlate: drivers.vehiclePlate, rating: drivers.rating,
      firstName: users.firstName, lastName: users.lastName
    })
      .from(drivers)
      .leftJoin(users, eq(drivers.userId, users.id))
      .where(sql`${drivers.isActive} = true AND ${drivers.currentLat} IS NOT NULL AND (${drivers.isOnline} = true OR ${drivers.lastLocationAt} > ${fiveMinAgo})`);

    const activeJobs = await db.select({
      id: jobs.id, trackingToken: jobs.trackingToken, status: jobs.status,
      pickupLat: jobs.pickupLat, pickupLng: jobs.pickupLng, pickupAddress: jobs.pickupAddress,
      dropoffLat: jobs.dropoffLat, dropoffLng: jobs.dropoffLng, dropoffAddress: jobs.dropoffAddress,
      priceOffered: jobs.priceOffered, currency: jobs.currency,
      driverId: jobs.driverId, matchedAt: jobs.matchedAt, pickedUpAt: jobs.pickedUpAt
    }).from(jobs).where(sql`${jobs.status} IN ('MATCHED', 'IN_TRANSIT')`);

    const postedJobs = await db.select({
      id: jobs.id, pickupLat: jobs.pickupLat, pickupLng: jobs.pickupLng, pickupAddress: jobs.pickupAddress,
      dropoffLat: jobs.dropoffLat, dropoffLng: jobs.dropoffLng,
      priceOffered: jobs.priceOffered, currency: jobs.currency, createdAt: jobs.createdAt
    }).from(jobs).where(eq(jobs.status, 'POSTED')).limit(100);

    res.json({ success: true, drivers: onlineDrivers, activeJobs, postedJobs, snapshotAt: new Date().toISOString() });
  } catch (err) { next(err); }
});


router.patch('/zones/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const [zone] = await db.update(zones).set({ ...req.body, updatedAt: new Date() }).where(eq(zones.id, req.params.id)).returning();
    res.json({ success: true, zone });
  } catch (err) { next(err); }
});
module.exports = router;

router.post('/drivers/:driverId/reject-document', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const db = getDB();
    const { reason, docType } = req.body;
    await db.update(driverDocuments)
      .set({ status: 'REJECTED', rejectionReason: reason, reviewedBy: req.user.id, reviewedAt: new Date() })
      .where(and(eq(driverDocuments.driverId, req.params.driverId), eq(driverDocuments.docType, docType)));
    res.json({ success: true });
  } catch (err) { next(err); }
});
