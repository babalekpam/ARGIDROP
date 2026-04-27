const express = require('express');
const { eq, and, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { users, referralCodes, referrals } = require('../schema');
const { authenticate } = require('../middleware/auth');
const { getOrCreateMyCode } = require('../services/referral');

const router = express.Router();

/**
 * GET /referrals/me
 * Returns my code + stats. Idempotently allocates a code on first call so the
 * mobile app can render the invite screen without a separate setup step.
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const [me] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!me) return res.status(404).json({ success: false, message: 'User not found' });

    if (me.role !== 'BUSINESS' && me.role !== 'DRIVER') {
      return res.status(400).json({ success: false, message: 'Referrals only available for merchants and drivers' });
    }

    const codeRow = await getOrCreateMyCode(me.id, me.role);

    const stats = await db.select({
      status: referrals.status,
      count: sql`count(*)::int`,
      totalReward: sql`coalesce(sum(${referrals.rewardAmount}::numeric), 0)::numeric`,
    })
      .from(referrals)
      .where(eq(referrals.referrerUserId, me.id))
      .groupBy(referrals.status);

    const summary = { pending: 0, qualified: 0, paid: 0, void: 0, totalEarned: 0 };
    for (const row of stats) {
      const k = row.status.toLowerCase();
      if (k in summary) summary[k] = row.count;
      if (row.status === 'PAID') summary.totalEarned = parseFloat(row.totalReward) || 0;
    }

    res.json({
      success: true,
      code: codeRow.code,
      role: codeRow.role,
      summary,
    });
  } catch (err) { next(err); }
});

module.exports = router;
