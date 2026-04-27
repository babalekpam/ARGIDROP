const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { eq, and, gt, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { users, businesses, drivers, otpCodes, businessDocuments, driverDocuments, zones } = require('../schema');
const { authenticate, generateTokens } = require('../middleware/auth');
const { sendSMS } = require('../services/notification');
const { attributeAtSignup } = require('../services/referral');

const router = express.Router();

// POST /register
router.post('/register', async (req, res, next) => {
  try {
    const { email, phone, password, firstName, lastName, role, companyName, vehicleType, referralCode, marketCode, country } = req.body;
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!['BUSINESS', 'DRIVER'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const db = getDB();
    const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    // Resolve market for the new user. Priority: explicit marketCode in
    // payload → derived from country → first active market as fallback. This
    // is what scopes promos and referral rewards for them.
    let resolvedMarketCode = null;
    if (marketCode) {
      const [m] = await db.select().from(zones).where(eq(zones.code, marketCode)).limit(1);
      if (m) resolvedMarketCode = m.code;
    }
    if (!resolvedMarketCode && country) {
      const [m] = await db.select().from(zones).where(eq(zones.country, country)).limit(1);
      if (m?.code) resolvedMarketCode = m.code;
    }
    if (!resolvedMarketCode) {
      const [m] = await db.select().from(zones).where(eq(zones.isActive, true)).limit(1);
      if (m?.code) resolvedMarketCode = m.code;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      email: email.toLowerCase(), phone, passwordHash, role,
      firstName, lastName, status: 'PENDING',
      marketCode: resolvedMarketCode,
    }).returning();

    // Create role-specific profile
    if (role === 'BUSINESS') {
      await db.insert(businesses).values({ userId: user.id, companyName: companyName || `${firstName}'s Business` });
    } else if (role === 'DRIVER') {
      await db.insert(drivers).values({ userId: user.id, vehicleType: vehicleType || 'CAR' });
    }

    // Best-effort: attribute the signup to a referrer if a code was provided.
    // We never block signup on referral failure — the user already exists.
    let referralResult = null;
    if (referralCode) {
      try {
        referralResult = await attributeAtSignup({
          newUserId: user.id,
          newUserRole: role,
          code: referralCode,
          marketCode: resolvedMarketCode,
        });
      } catch (e) {
        console.warn('Referral attribution failed:', e.message);
      }
    }

    const tokens = generateTokens(user.id, user.role);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      tokens,
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, status: user.status, marketCode: resolvedMarketCode },
      referral: referralResult,
    });
  } catch (err) { next(err); }
});

// POST /login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const db = getDB();
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (user.status === 'BANNED') return res.status(403).json({ success: false, message: 'Account banned' });

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const profile = await loadProfileWithDocs(db, user);

    const tokens = generateTokens(user.id, user.role);
    res.json({
      success: true,
      tokens,
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, status: user.status, avatarUrl: user.avatarUrl },
      profile
    });
  } catch (err) { next(err); }
});

// Shared helper: returns the role-specific profile enriched with documentsCount
// and a documentsSubmitted flag derived from the canonical submission timestamp
// (kycSubmittedAt for businesses, payoutPinSetAt is unrelated — drivers use their
// own documentsCount-only signal because driver docs are graded individually).
async function loadProfileWithDocs(db, user) {
  if (user.role === 'BUSINESS') {
    const [b] = await db.select().from(businesses).where(eq(businesses.userId, user.id)).limit(1);
    if (!b) return null;
    const [{ count: docCount }] = await db
      .select({ count: sql`count(*)::int` })
      .from(businessDocuments)
      .where(eq(businessDocuments.businessId, b.id));
    return { ...b, documentsCount: docCount || 0, documentsSubmitted: !!b.kycSubmittedAt };
  }
  if (user.role === 'DRIVER') {
    const [d] = await db.select().from(drivers).where(eq(drivers.userId, user.id)).limit(1);
    if (!d) return null;
    const [{ count: docCount }] = await db
      .select({ count: sql`count(*)::int` })
      .from(driverDocuments)
      .where(eq(driverDocuments.driverId, d.id));
    return { ...d, documentsCount: docCount || 0, documentsSubmitted: (docCount || 0) > 0 };
  }
  return null;
}

// POST /send-otp
router.post('/send-otp', authenticate, async (req, res, next) => {
  try {
    const { type } = req.body; // 'email' | 'phone'
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const db = getDB();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db.insert(otpCodes).values({ userId: req.user.id, code, type, expiresAt });

    if (type === 'phone' && req.user.phone) {
      await sendSMS(req.user.phone, `Your ARGIDROP verification code is: ${code}`);
    }
    // Email OTP would also be sent here

    res.json({ success: true, message: `OTP sent to ${type}` });
  } catch (err) { next(err); }
});

// POST /verify-otp
router.post('/verify-otp', authenticate, async (req, res, next) => {
  try {
    const { code, type } = req.body;
    const db = getDB();
    const now = new Date();

    const [otp] = await db.select().from(otpCodes)
      .where(and(eq(otpCodes.userId, req.user.id), eq(otpCodes.code, code), eq(otpCodes.type, type), gt(otpCodes.expiresAt, now)))
      .limit(1);

    if (!otp) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    await db.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, otp.id));
    const update = type === 'email' ? { emailVerified: true } : { phoneVerified: true };
    if (req.user.status === 'PENDING') update.status = 'ACTIVE';
    await db.update(users).set(update).where(eq(users.id, req.user.id));

    res.json({ success: true, message: `${type} verified successfully` });
  } catch (err) { next(err); }
});

// GET /me
/**
 * POST /me/push-token — register or refresh this user's push notification
 * token (Expo push token preferred; legacy FCM accepted). Idempotent.
 */
router.post('/me/push-token', authenticate, async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ success: false, message: 'token required' });
    }
    const db = getDB();
    await db.update(users).set({ fcmToken: token.trim(), updatedAt: new Date() })
      .where(eq(users.id, req.user.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const profile = await loadProfileWithDocs(db, req.user);
    const { passwordHash, ...safeUser } = req.user;
    res.json({ success: true, user: safeUser, profile });
  } catch (err) { next(err); }
});

// POST /refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const tokens = generateTokens(decoded.userId, decoded.role);
    res.json({ success: true, tokens });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

module.exports = router;
