const express = require('express');
const { eq, desc, sql } = require('drizzle-orm');
const multer = require('multer');
const { getDB } = require('../config/database');
const { businesses, users, jobs, payments, businessDocuments } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = express.Router();

// POST /onboarding — business fills company info (called after register, before first delivery)
router.post('/onboarding', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const { companyName, taxId, businessType, website, address, city, country, billingEmail, preferredMomoNumber, defaultPaymentProvider } = req.body;
    if (!companyName) return res.status(400).json({ success: false, message: 'Company name is required' });
    let [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) {
      [biz] = await db.insert(businesses).values({
        userId: req.user.id, companyName, taxId, businessType, website,
        address, city, country: country || 'TG',
        billingEmail, preferredMomoNumber, defaultPaymentProvider: defaultPaymentProvider || 'FLUTTERWAVE'
      }).returning();
    } else {
      [biz] = await db.update(businesses).set({
        companyName, taxId, businessType, website, address, city, country,
        billingEmail, preferredMomoNumber, defaultPaymentProvider, updatedAt: new Date()
      }).where(eq(businesses.id, biz.id)).returning();
    }
    res.json({ success: true, business: biz });
  } catch (err) { next(err); }
});

// GET /me — lightweight profile check
router.get('/me', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) return res.status(404).json({ success: false, message: 'Business profile not found' });
    res.json(biz);
  } catch (err) { next(err); }
});

// GET /me/documents
router.get('/me/documents', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) return res.json({ success: true, documents: [] });
    const docs = await db.select().from(businessDocuments).where(eq(businessDocuments.businessId, biz.id));
    res.json({ success: true, documents: docs });
  } catch (err) { next(err); }
});

// POST /documents — upload business verification doc (license, owner ID)
router.post('/documents', authenticate, requireRole('BUSINESS'), upload.single('file'), async (req, res, next) => {
  try {
    const db = getDB();
    const { docType } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) return res.status(404).json({ success: false, message: 'Business profile not found' });
    const fileUrl = await uploadFile(req.file, `businesses/${biz.id}/docs`);
    const [doc] = await db.insert(businessDocuments).values({
      businessId: biz.id, docType, fileUrl, fileName: req.file.originalname, status: 'PENDING'
    }).returning();
    res.status(201).json({ success: true, document: doc });
  } catch (err) { next(err); }
});

// POST /submit-for-review — business marks themselves ready for admin KYC review.
// We require the three minimum docs (BUSINESS_LICENSE, GOVT_ID_FRONT, SELFIE_WITH_ID)
// and then stamp kycSubmittedAt as the explicit "they're done" signal.
router.post('/submit-for-review', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });
    const docs = await db.select().from(businessDocuments).where(eq(businessDocuments.businessId, biz.id));
    const types = new Set(docs.map(d => d.docType));
    const required = ['BUSINESS_LICENSE', 'GOVT_ID_FRONT', 'SELFIE_WITH_ID'];
    const missing = required.filter(t => !types.has(t));
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload all required documents before submitting',
        missing,
      });
    }
    await db.update(businesses).set({
      verificationStatus: 'PENDING',
      kycSubmittedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(businesses.id, biz.id));
    res.json({ success: true, message: 'Submitted for review' });
  } catch (err) { next(err); }
});

// GET /profile
router.get('/profile', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!business) return res.status(404).json({ success: false, message: 'Business profile not found' });
    res.json({ success: true, business });
  } catch (err) { next(err); }
});

// PATCH /profile — only updates the fields actually sent in the request body so
// callers can do partial updates without overwriting unrelated columns to null.
router.patch('/profile', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const allowed = ['companyName', 'ein', 'businessType', 'website', 'address', 'city', 'state', 'country', 'zipCode', 'billingEmail'];
    const update = { updatedAt: new Date() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        const v = typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k];
        update[k] = v === '' ? null : v;
      }
    }
    const [updated] = await db.update(businesses).set(update).where(eq(businesses.userId, req.user.id)).returning();
    res.json({ success: true, business: updated });
  } catch (err) { next(err); }
});

// GET /dashboard — Business stats
router.get('/dashboard', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    const allJobs = await db.select().from(jobs).where(eq(jobs.businessId, business.id));
    const activeJobs = allJobs.filter(j => ['POSTED', 'MATCHED', 'PICKUP', 'IN_TRANSIT'].includes(j.status));
    const completedJobs = allJobs.filter(j => j.status === 'COMPLETED');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthJobs = allJobs.filter(j => new Date(j.createdAt) >= startOfMonth);

    const myPayments = await db.select().from(payments).where(eq(payments.businessId, business.id));
    const totalSpent = myPayments.filter(p => p.status === 'RELEASED').reduce((s, p) => s + parseFloat(p.grossAmount), 0);
    const monthSpent = myPayments.filter(p => p.status === 'RELEASED' && new Date(p.releasedAt) >= startOfMonth).reduce((s, p) => s + parseFloat(p.grossAmount), 0);

    res.json({
      success: true,
      stats: {
        totalJobs: allJobs.length,
        activeJobs: activeJobs.length,
        completedJobs: completedJobs.length,
        thisMonthJobs: monthJobs.length,
        totalSpent: totalSpent.toFixed(2),
        thisMonthSpent: monthSpent.toFixed(2),
        rating: business.rating,
        ratingCount: business.ratingCount
      },
      recentJobs: allJobs.slice(-5).reverse()
    });
  } catch (err) { next(err); }
});

// GET /invoices
router.get('/invoices', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    const myPayments = await db.select({ payment: payments, job: jobs })
      .from(payments)
      .leftJoin(jobs, eq(payments.jobId, jobs.id))
      .where(eq(payments.businessId, business.id))
      .orderBy(desc(payments.createdAt))
      .limit(100);

    res.json({ success: true, invoices: myPayments });
  } catch (err) { next(err); }
});

module.exports = router;
