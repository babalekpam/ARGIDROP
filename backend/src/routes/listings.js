// Merchant Listings Routes
// Handles: merchant profile, product listings, photo uploads, public marketplace

const express = require('express');
const { eq, and, desc, asc, ilike, sql } = require('drizzle-orm');
const multer = require('multer');
const { getDB } = require('../config/database');
const {
  businesses, merchantListings, listingPhotos, merchantProfiles,
  merchantSubscriptions, users
} = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');
const { TIER_PHOTO_LIMITS, TIER_FEES, recommendedFee } = require('../services/pricing');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = express.Router();

// ─── MERCHANT SUBSCRIPTION ───────────────────────────────────────────────────

router.get('/subscription', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });

    let [sub] = await db.select().from(merchantSubscriptions).where(eq(merchantSubscriptions.businessId, biz.id)).limit(1);
    if (!sub) {
      // Auto-create FREE tier on first access
      [sub] = await db.insert(merchantSubscriptions).values({
        businessId: biz.id, tier: 'FREE', monthlyFee: '0.00', photoLimit: 5
      }).returning();
    }

    // Count current photos used
    const photoRows = await db.select({ count: sql`count(*)` }).from(listingPhotos).where(eq(listingPhotos.businessId, biz.id));
    const photosUsed = parseInt(photoRows[0]?.count || 0);
    const photoLimit = TIER_PHOTO_LIMITS[sub.tier];

    // Recommend fee based on delivery volume
    const recommended = recommendedFee(sub.deliveriesThisMonth || 0);

    res.json({
      success: true,
      subscription: {
        ...sub,
        photosUsed,
        photoLimit,
        photoLimitLabel: photoLimit === null ? 'Unlimited' : `${photosUsed} / ${photoLimit}`,
        tierFees: TIER_FEES,
        recommendedFee: recommended,
        canUploadMore: photoLimit === null || photosUsed < photoLimit,
      }
    });
  } catch (err) { next(err); }
});

// ─── MERCHANT PROFILE ────────────────────────────────────────────────────────

router.get('/profile/me', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });
    let [profile] = await db.select().from(merchantProfiles).where(eq(merchantProfiles.businessId, biz.id)).limit(1);
    if (!profile) {
      [profile] = await db.insert(merchantProfiles).values({ businessId: biz.id }).returning();
    }
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

router.patch('/profile/me', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });

    const allowedFields = ['tagline', 'taglineEn', 'taglineFr', 'categories', 'openingHours',
      'deliveryRadius', 'minimumOrderAmount', 'averageDeliveryTime', 'isPublic',
      'whatsapp', 'instagram', 'facebook'];
    const updates = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updatedAt = new Date();

    // Auto-generate slug from company name if not set
    if (!updates.slug && biz.companyName) {
      const base = biz.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      updates.slug = `${base}-${biz.id.substring(0, 6)}`;
    }

    const [profile] = await db.update(merchantProfiles).set(updates).where(eq(merchantProfiles.businessId, biz.id)).returning();
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

// Upload cover photo / logo
router.post('/profile/photo', authenticate, requireRole('BUSINESS'), upload.single('file'), async (req, res, next) => {
  try {
    const db = getDB();
    const { type } = req.body; // 'cover' | 'logo'
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    const fileUrl = await uploadFile(req.file, `merchants/${biz.id}/profile`);
    const updateData = type === 'cover' ? { coverPhotoUrl: fileUrl } : { logoUrl: fileUrl };
    updateData.updatedAt = new Date();
    const [profile] = await db.update(merchantProfiles).set(updateData).where(eq(merchantProfiles.businessId, biz.id)).returning();
    res.json({ success: true, fileUrl, profile });
  } catch (err) { next(err); }
});

// ─── LISTINGS ────────────────────────────────────────────────────────────────

router.get('/listings', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    const listings = await db.select().from(merchantListings)
      .where(and(eq(merchantListings.businessId, biz.id), sql`${merchantListings.status} != 'ARCHIVED'`))
      .orderBy(asc(merchantListings.sortOrder), desc(merchantListings.createdAt));

    // Attach photos to each listing
    const withPhotos = await Promise.all(listings.map(async l => {
      const photos = await db.select().from(listingPhotos)
        .where(eq(listingPhotos.listingId, l.id))
        .orderBy(asc(listingPhotos.sortOrder));
      return { ...l, photos };
    }));

    res.json({ success: true, listings: withPhotos });
  } catch (err) { next(err); }
});

router.post('/listings', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    const { name, nameFr, nameEn, description, descriptionFr, descriptionEn,
      price, currency, unit, category, listingType, tags } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Listing name is required' });

    const [listing] = await db.insert(merchantListings).values({
      businessId: biz.id, name, nameFr, nameEn, description, descriptionFr, descriptionEn,
      price, currency: currency || biz.country === 'GH' ? 'GHS' : 'XOF',
      unit, category, listingType: listingType || 'PRODUCT',
      tags: tags || [], status: 'ACTIVE'
    }).returning();

    res.status(201).json({ success: true, listing });
  } catch (err) { next(err); }
});

router.patch('/listings/:id', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    const allowed = ['name', 'nameFr', 'nameEn', 'description', 'descriptionFr', 'descriptionEn',
      'price', 'unit', 'category', 'inStock', 'status', 'sortOrder', 'tags'];
    const updates = { updatedAt: new Date() };
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const [listing] = await db.update(merchantListings).set(updates)
      .where(and(eq(merchantListings.id, req.params.id), eq(merchantListings.businessId, biz.id)))
      .returning();
    res.json({ success: true, listing });
  } catch (err) { next(err); }
});

router.delete('/listings/:id', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    await db.update(merchantListings).set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(and(eq(merchantListings.id, req.params.id), eq(merchantListings.businessId, biz.id)));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── PHOTOS ──────────────────────────────────────────────────────────────────

router.post('/listings/:id/photos', authenticate, requireRole('BUSINESS'), upload.array('photos', 10), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);

    // Check photo limit
    const [sub] = await db.select().from(merchantSubscriptions).where(eq(merchantSubscriptions.businessId, biz.id)).limit(1);
    const tier = sub?.tier || 'FREE';
    const limit = TIER_PHOTO_LIMITS[tier];

    const currentPhotos = await db.select({ count: sql`count(*)` }).from(listingPhotos).where(eq(listingPhotos.businessId, biz.id));
    const used = parseInt(currentPhotos[0]?.count || 0);

    if (limit !== null && used + req.files.length > limit) {
      return res.status(403).json({
        success: false,
        code: 'PHOTO_LIMIT_EXCEEDED',
        message: `Your ${tier} plan allows ${limit} photos. You have ${used} used. Upgrade to add more.`,
        currentTier: tier,
        limit,
        used,
      });
    }

    // Get listing
    const [listing] = await db.select().from(merchantListings)
      .where(and(eq(merchantListings.id, req.params.id), eq(merchantListings.businessId, biz.id))).limit(1);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    // Upload all files
    const existing = await db.select().from(listingPhotos).where(eq(listingPhotos.listingId, listing.id));
    const isPrimaryNeeded = existing.length === 0;

    const uploaded = await Promise.all(req.files.map(async (file, i) => {
      const fileUrl = await uploadFile(file, `merchants/${biz.id}/listings/${listing.id}`);
      const [photo] = await db.insert(listingPhotos).values({
        listingId: listing.id,
        businessId: biz.id,
        fileUrl,
        fileName: file.originalname,
        isPrimary: isPrimaryNeeded && i === 0,
        sizeBytes: file.size,
        sortOrder: existing.length + i,
      }).returning();
      return photo;
    }));

    res.status(201).json({ success: true, photos: uploaded, totalUsed: used + req.files.length });
  } catch (err) { next(err); }
});

router.delete('/photos/:photoId', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    await db.delete(listingPhotos)
      .where(and(eq(listingPhotos.id, req.params.photoId), eq(listingPhotos.businessId, biz.id)));
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/photos/:photoId/primary', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    const [photo] = await db.select().from(listingPhotos)
      .where(and(eq(listingPhotos.id, req.params.photoId), eq(listingPhotos.businessId, biz.id))).limit(1);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });
    // Clear existing primary on this listing
    await db.update(listingPhotos).set({ isPrimary: false }).where(eq(listingPhotos.listingId, photo.listingId));
    await db.update(listingPhotos).set({ isPrimary: true }).where(eq(listingPhotos.id, photo.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── PUBLIC MARKETPLACE ──────────────────────────────────────────────────────

// Browse merchants
router.get('/public/merchants', async (req, res, next) => {
  try {
    const db = getDB();
    const { category, city, search, limit = 20, offset = 0 } = req.query;

    let query = db.select({
      profile: merchantProfiles,
      business: {
        id: businesses.id,
        companyName: businesses.companyName,
        city: businesses.city,
        country: businesses.country,
        rating: businesses.rating,
        ratingCount: businesses.ratingCount,
      }
    })
      .from(merchantProfiles)
      .leftJoin(businesses, eq(merchantProfiles.businessId, businesses.id))
      .where(eq(merchantProfiles.isPublic, true));

    const results = await query
      .orderBy(desc(merchantProfiles.isFeatured), desc(merchantProfiles.rating))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({ success: true, merchants: results });
  } catch (err) { next(err); }
});

// Get single merchant public profile with listings
router.get('/public/merchants/:slug', async (req, res, next) => {
  try {
    const db = getDB();
    const [profile] = await db.select().from(merchantProfiles).where(eq(merchantProfiles.slug, req.params.slug)).limit(1);
    if (!profile || !profile.isPublic) return res.status(404).json({ success: false, message: 'Merchant not found' });

    const [biz] = await db.select().from(businesses).where(eq(businesses.id, profile.businessId)).limit(1);

    // Get active listings with photos
    const listings = await db.select().from(merchantListings)
      .where(and(eq(merchantListings.businessId, profile.businessId), eq(merchantListings.status, 'ACTIVE')))
      .orderBy(desc(merchantListings.isFeatured), asc(merchantListings.sortOrder));

    const withPhotos = await Promise.all(listings.map(async l => {
      const photos = await db.select().from(listingPhotos)
        .where(eq(listingPhotos.listingId, l.id))
        .orderBy(asc(listingPhotos.sortOrder));
      return { ...l, photos };
    }));

    // Increment view count
    await db.update(merchantProfiles).set({ viewCount: sql`${merchantProfiles.viewCount} + 1` })
      .where(eq(merchantProfiles.id, profile.id));

    res.json({ success: true, merchant: { ...profile, business: biz, listings: withPhotos } });
  } catch (err) { next(err); }
});

module.exports = router;
