const express = require('express');
const { eq, and } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { users, businesses, drivers, jobs } = require('../schema');
const { authenticate } = require('../middleware/auth');
const { validatePromo } = require('../services/promo');

const router = express.Router();

/**
 * POST /promo/validate
 * Body: { code, jobAmount }
 *
 * Stateless preview — never records a redemption. The same code can be
 * validated repeatedly without consuming the per-user cap. The cap is
 * checked against historical redemptions, so a successful validate does NOT
 * guarantee a successful job-create (race window is fine; loser sees an
 * `already redeemed` error).
 */
router.post('/validate', authenticate, async (req, res, next) => {
  try {
    const { code, jobAmount } = req.body || {};
    if (!code) return res.status(400).json({ success: false, message: 'Code required' });

    const db = getDB();
    const [u] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);

    // Determine isFirstJob — count this user's role-side jobs.
    let isFirstJob = false;
    if (u.role === 'BUSINESS') {
      const [biz] = await db.select().from(businesses).where(eq(businesses.userId, u.id)).limit(1);
      if (biz) {
        const existing = await db.select({ id: jobs.id }).from(jobs)
          .where(eq(jobs.businessId, biz.id)).limit(1);
        isFirstJob = existing.length === 0;
      } else {
        isFirstJob = true;
      }
    } else if (u.role === 'DRIVER') {
      const [drv] = await db.select().from(drivers).where(eq(drivers.userId, u.id)).limit(1);
      if (drv) {
        const existing = await db.select({ id: jobs.id }).from(jobs)
          .where(eq(jobs.driverId, drv.id)).limit(1);
        isFirstJob = existing.length === 0;
      } else {
        isFirstJob = true;
      }
    }

    const result = await validatePromo({
      code,
      role: u.role,
      marketCode: u.marketCode,
      jobAmount,
      userId: u.id,
      isFirstJob,
    });

    if (!result.valid) return res.status(400).json({ success: false, message: result.reason });
    return res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

module.exports = router;
