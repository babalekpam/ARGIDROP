const { eq, and, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { promoCodes, promoRedemptions, jobs } = require('../schema');

/**
 * Validate a promo code against an attempted job and return the discount/bonus
 * preview. Pure function: never mutates the DB; the caller (job creation,
 * preview endpoint) decides whether to record a redemption.
 *
 * Returns:
 *   { valid: false, reason }                          — code rejected
 *   { valid: true, promo, discount, finalAmount,     — code accepted
 *     driverBonus, currency }
 *
 * Discount semantics (platform-funded for now):
 *   PERCENT        — discount = min(amount * value/100, maxDiscount)
 *   FIXED          — discount = min(value, amount)        (cannot exceed price)
 *   FREE_DELIVERY  — discount = amount                    (price → 0 to merchant)
 */
async function validatePromo({ code, role, marketCode, jobAmount, userId, isFirstJob = false }) {
  if (!code || typeof code !== 'string') {
    return { valid: false, reason: 'No promo code provided' };
  }
  const normalized = code.trim().toUpperCase();
  const amt = parseFloat(jobAmount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { valid: false, reason: 'Job amount missing' };
  }

  const db = getDB();
  const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, normalized)).limit(1);
  if (!promo) return { valid: false, reason: 'Promo code not found' };

  if (promo.status !== 'ACTIVE') return { valid: false, reason: `Promo is ${promo.status.toLowerCase()}` };

  const now = new Date();
  if (promo.validFrom && new Date(promo.validFrom) > now) {
    return { valid: false, reason: 'Promo not yet active' };
  }
  if (promo.validUntil && new Date(promo.validUntil) < now) {
    return { valid: false, reason: 'Promo has expired' };
  }

  // Role gate. BOTH lets either role apply it (e.g. driver-bonus campaign that
  // a merchant can also use to nudge faster matching).
  if (promo.appliesToRole !== 'BOTH' && promo.appliesToRole !== role) {
    return { valid: false, reason: 'Promo not available for your account type' };
  }

  // Market gate. NULL marketCode on the promo = global; otherwise must match.
  // SECURITY: a market-locked promo with a user that has no marketCode must be
  // rejected — otherwise an unattributed user can redeem any market's promo.
  if (promo.marketCode && promo.marketCode !== marketCode) {
    return { valid: false, reason: 'Promo not available in your city' };
  }

  if (promo.minJobAmount && amt < parseFloat(promo.minJobAmount)) {
    return { valid: false, reason: `Minimum job amount is ${promo.minJobAmount} ${promo.currency || ''}`.trim() };
  }

  if (promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions) {
    return { valid: false, reason: 'Promo fully redeemed' };
  }

  if (promo.firstJobOnly && !isFirstJob) {
    return { valid: false, reason: 'Promo is only valid on your first delivery' };
  }

  // Per-user cap. We count the user's prior redemptions of this promo.
  if (promo.maxRedemptionsPerUser) {
    const [{ c }] = await db
      .select({ c: sql`count(*)::int` })
      .from(promoRedemptions)
      .where(and(eq(promoRedemptions.promoCodeId, promo.id), eq(promoRedemptions.userId, userId)));
    if ((c || 0) >= promo.maxRedemptionsPerUser) {
      return { valid: false, reason: 'You have already used this promo' };
    }
  }

  // Compute discount.
  let discount = 0;
  if (promo.discountType === 'PERCENT') {
    discount = (amt * parseFloat(promo.discountValue)) / 100;
    if (promo.maxDiscount) discount = Math.min(discount, parseFloat(promo.maxDiscount));
  } else if (promo.discountType === 'FIXED') {
    discount = Math.min(parseFloat(promo.discountValue), amt);
  } else if (promo.discountType === 'FREE_DELIVERY') {
    discount = amt;
  }
  discount = Math.round(discount * 100) / 100;

  const finalAmount = Math.max(0, Math.round((amt - discount) * 100) / 100);
  const driverBonus = parseFloat(promo.driverBonus || '0') || 0;

  return {
    valid: true,
    promo: { id: promo.id, code: promo.code, description: promo.description },
    discount,
    finalAmount,
    driverBonus,
    currency: promo.currency || null,
  };
}

/**
 * Record a successful promo redemption against a job. Idempotent on
 * (promoCodeId, jobId) via the unique index — a retried call returns the
 * existing row instead of duplicating.
 *
 * RACE-SAFETY: Caps are enforced atomically here, not in `validatePromo()`
 * (which is a preview). We do a conditional UPDATE on the promo row that
 * only succeeds if the global cap has not been hit, then use the unique
 * constraints on `promo_redemptions` (one per (promo,job); we also count
 * per-user) to gate the per-user cap.
 *
 * Returns the redemption row, or throws { code: 'PROMO_CAP_EXCEEDED' } /
 * { code: 'PROMO_PER_USER_EXCEEDED' } so the caller can rollback the job.
 */
async function recordRedemption({ promoCodeId, userId, jobId, discountApplied, driverBonusApplied = 0, currency }) {
  const db = getDB();

  // Idempotent short-circuit — if we already have a redemption for this
  // (promo, job) pair (e.g. retried POST), return it without bumping caps.
  const [existing] = await db.select().from(promoRedemptions)
    .where(and(eq(promoRedemptions.promoCodeId, promoCodeId), eq(promoRedemptions.jobId, jobId)))
    .limit(1);
  if (existing) return existing;

  // Re-load promo so we have authoritative caps.
  const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, promoCodeId)).limit(1);
  if (!promo) {
    const e = new Error('Promo not found at redemption');
    e.code = 'PROMO_NOT_FOUND';
    throw e;
  }

  // Per-user cap: count this user's existing redemptions of this promo.
  if (promo.maxRedemptionsPerUser) {
    const [{ c }] = await db
      .select({ c: sql`count(*)::int` })
      .from(promoRedemptions)
      .where(and(eq(promoRedemptions.promoCodeId, promoCodeId), eq(promoRedemptions.userId, userId)));
    if ((c || 0) >= promo.maxRedemptionsPerUser) {
      const e = new Error('Per-user promo limit reached');
      e.code = 'PROMO_PER_USER_EXCEEDED';
      throw e;
    }
  }

  // Global cap: atomic conditional bump. If the cap is already met, the
  // UPDATE matches zero rows and we abort. This closes the race where
  // two concurrent jobs both pass `validatePromo` for a single-use promo.
  if (promo.maxRedemptions != null) {
    const updated = await db.update(promoCodes)
      .set({ redemptionCount: sql`${promoCodes.redemptionCount} + 1` })
      .where(and(
        eq(promoCodes.id, promoCodeId),
        sql`${promoCodes.redemptionCount} < ${promoCodes.maxRedemptions}`,
      ))
      .returning({ id: promoCodes.id });
    if (updated.length === 0) {
      const e = new Error('Promo fully redeemed');
      e.code = 'PROMO_CAP_EXCEEDED';
      throw e;
    }
  } else {
    await db.update(promoCodes)
      .set({ redemptionCount: sql`${promoCodes.redemptionCount} + 1` })
      .where(eq(promoCodes.id, promoCodeId));
  }

  try {
    const [row] = await db.insert(promoRedemptions).values({
      promoCodeId, userId, jobId,
      discountApplied: String(discountApplied),
      driverBonusApplied: String(driverBonusApplied),
      currency,
    }).returning();
    return row;
  } catch (err) {
    // Roll back the counter bump if the redemption insert failed (e.g.
    // unique violation from a concurrent retry on same (promo, job)).
    if (promo.maxRedemptions != null) {
      await db.update(promoCodes)
        .set({ redemptionCount: sql`GREATEST(${promoCodes.redemptionCount} - 1, 0)` })
        .where(eq(promoCodes.id, promoCodeId));
    }
    // If the conflict was the (promo, job) idempotency, return existing row.
    const [retryExisting] = await db.select().from(promoRedemptions)
      .where(and(eq(promoRedemptions.promoCodeId, promoCodeId), eq(promoRedemptions.jobId, jobId)))
      .limit(1);
    if (retryExisting) return retryExisting;
    throw err;
  }
}

module.exports = { validatePromo, recordRedemption };
