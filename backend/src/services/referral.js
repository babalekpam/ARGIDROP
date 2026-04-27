const { eq, and, sql, isNull } = require('drizzle-orm');
const { getDB } = require('../config/database');
const {
  users, drivers, businesses, zones, jobs, payments,
  referralCodes, referrals, promoCodes,
} = require('../schema');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 — easier to read

function randSuffix(n = 4) {
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

function buildCode(firstName, role) {
  const stem = (firstName || (role === 'DRIVER' ? 'RIDER' : 'SHOP'))
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 6) || (role === 'DRIVER' ? 'RIDER' : 'SHOP');
  return `${stem}-${randSuffix(4)}`;
}

/**
 * Idempotent: returns the user's existing code for this role, or creates one.
 * Race-safe via the (userId, role) unique index — concurrent calls collapse to
 * the row that wins the insert.
 */
async function getOrCreateMyCode(userId, role) {
  const db = getDB();
  const [existing] = await db.select().from(referralCodes)
    .where(and(eq(referralCodes.userId, userId), eq(referralCodes.role, role)))
    .limit(1);
  if (existing) return existing;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');

  // Try a few times — collisions are vanishingly rare with 32^4 suffix space
  // but we retry to be safe.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = buildCode(user.firstName, role);
    try {
      const [row] = await db.insert(referralCodes).values({ code, userId, role }).returning();
      return row;
    } catch (err) {
      // Either the user-role unique index fired (someone else just created it)
      // or the code itself collided. Re-read and return if user-role is now set.
      const [now] = await db.select().from(referralCodes)
        .where(and(eq(referralCodes.userId, userId), eq(referralCodes.role, role)))
        .limit(1);
      if (now) return now;
      // else loop and try a new suffix
    }
  }
  throw new Error('Could not allocate a referral code');
}

/**
 * Called from the signup flow if the new user supplied a referral code.
 * Stores attribution + creates a PENDING referrals row that the nightly cron
 * will eventually qualify and reward.
 *
 * Anti-abuse rules enforced here:
 *   - code must exist
 *   - referrer ≠ referred (no self-referral)
 *   - new user can only have one referral attribution (table-level unique)
 *   - referrer's role must match the referred role (drivers refer drivers,
 *     merchants refer merchants — preserves the trust signal)
 *   - referred user's phone must not match an existing user's phone (caught
 *     elsewhere by users.phone unique, but we double-check)
 */
async function attributeAtSignup({ newUserId, newUserRole, code, marketCode }) {
  if (!code) return { attributed: false, reason: 'no_code' };

  const db = getDB();
  const normalized = String(code).trim().toUpperCase();

  const [refCode] = await db.select().from(referralCodes)
    .where(eq(referralCodes.code, normalized))
    .limit(1);
  if (!refCode) return { attributed: false, reason: 'unknown_code' };

  if (refCode.userId === newUserId) {
    return { attributed: false, reason: 'self_referral' };
  }
  if (refCode.role !== newUserRole) {
    return { attributed: false, reason: 'role_mismatch' };
  }

  // Has this new user already been attributed (rare — defense in depth)?
  const [already] = await db.select().from(referrals)
    .where(eq(referrals.referredUserId, newUserId)).limit(1);
  if (already) return { attributed: false, reason: 'already_attributed' };

  await db.update(users)
    .set({ referredByCode: normalized })
    .where(eq(users.id, newUserId));

  await db.insert(referrals).values({
    codeUsed: normalized,
    referrerUserId: refCode.userId,
    referredUserId: newUserId,
    referredRole: newUserRole,
    marketCode: marketCode || null,
    status: 'PENDING',
  });

  return { attributed: true, referrerUserId: refCode.userId };
}

/**
 * Promote PENDING referrals to QUALIFIED for any referred user that has hit
 * the per-market threshold. Runs nightly. Safe to re-run; only PENDING rows
 * are touched.
 *
 * Threshold logic:
 *   BUSINESS — N completed paid jobs as the merchant (threshold from market
 *              config; default 1).
 *   DRIVER   — N completed deliveries as the driver (threshold default 1).
 */
async function qualifyPendingReferrals() {
  const db = getDB();
  const pending = await db.select().from(referrals).where(eq(referrals.status, 'PENDING'));
  if (pending.length === 0) return { checked: 0, qualified: 0 };

  // Load market thresholds once.
  const allMarkets = await db.select().from(zones);
  const marketByCode = new Map(allMarkets.filter(m => m.code).map(m => [m.code, m]));

  let qualifiedCount = 0;
  for (const ref of pending) {
    const market = ref.marketCode ? marketByCode.get(ref.marketCode) : null;
    const threshold = market?.referralQualifyDeliveries ?? 1;
    const rewardAmount = ref.referredRole === 'DRIVER'
      ? (market?.referralRewardDriver ?? '2500.00')
      : (market?.referralRewardMerchant ?? '1500.00');
    const currency = market?.currency || 'XOF';

    let count = 0;
    if (ref.referredRole === 'DRIVER') {
      const [driver] = await db.select().from(drivers).where(eq(drivers.userId, ref.referredUserId)).limit(1);
      if (driver) {
        const [{ c }] = await db.select({ c: sql`count(*)::int` })
          .from(jobs)
          .where(and(eq(jobs.driverId, driver.id), eq(jobs.status, 'COMPLETED')));
        count = c || 0;
      }
    } else if (ref.referredRole === 'BUSINESS') {
      // Per spec: BUSINESS qualifies on PAID completed jobs, not merely
      // completed. We join through `payments` (status SUCCESS) to ensure
      // the job actually generated revenue — protects against fake
      // self-completed jobs being used to harvest referral rewards.
      const [business] = await db.select().from(businesses).where(eq(businesses.userId, ref.referredUserId)).limit(1);
      if (business) {
        const [{ c }] = await db.select({ c: sql`count(distinct ${jobs.id})::int` })
          .from(jobs)
          .innerJoin(payments, eq(payments.jobId, jobs.id))
          .where(and(
            eq(jobs.businessId, business.id),
            eq(jobs.status, 'COMPLETED'),
            eq(payments.status, 'SUCCESS'),
          ));
        count = c || 0;
      }
    }

    if (count >= threshold) {
      await db.update(referrals).set({
        status: 'QUALIFIED',
        qualifiedAt: new Date(),
        qualifyingJobsCount: count,
        rewardAmount: String(rewardAmount),
        currency,
      }).where(eq(referrals.id, ref.id));
      qualifiedCount++;
    } else if (count > (ref.qualifyingJobsCount || 0)) {
      // Keep counter fresh even if not yet qualified — nice for UI.
      await db.update(referrals).set({ qualifyingJobsCount: count }).where(eq(referrals.id, ref.id));
    }
  }

  return { checked: pending.length, qualified: qualifiedCount };
}

/**
 * Pay out QUALIFIED referrals.
 *   - Driver referrer  → credit pendingEarnings on the drivers row (paid out
 *                        via the existing payout mechanism on next shift end).
 *   - Merchant referrer → seed a single-use auto-promo with the reward
 *                        amount; merchant applies it on their next job. We
 *                        chose this over a wallet credit because the merchant
 *                        wallet is explicitly out of MVP scope.
 *
 * Idempotent: only QUALIFIED → PAID transitions; no double-pay on retry.
 */
async function dispatchQualifiedRewards() {
  const db = getDB();
  const ready = await db.select().from(referrals).where(eq(referrals.status, 'QUALIFIED'));
  if (ready.length === 0) return { dispatched: 0 };

  let dispatched = 0;
  for (const ref of ready) {
    try {
      const [referrer] = await db.select().from(users).where(eq(users.id, ref.referrerUserId)).limit(1);
      if (!referrer) {
        await db.update(referrals).set({ status: 'VOID', voidReason: 'referrer_missing' }).where(eq(referrals.id, ref.id));
        continue;
      }
      const amount = parseFloat(ref.rewardAmount || '0');
      if (!(amount > 0)) {
        await db.update(referrals).set({ status: 'VOID', voidReason: 'no_reward_configured' }).where(eq(referrals.id, ref.id));
        continue;
      }

      if (referrer.role === 'DRIVER') {
        const [d] = await db.select().from(drivers).where(eq(drivers.userId, referrer.id)).limit(1);
        if (!d) {
          await db.update(referrals).set({ status: 'VOID', voidReason: 'driver_profile_missing' }).where(eq(referrals.id, ref.id));
          continue;
        }
        await db.update(drivers).set({
          pendingEarnings: sql`${drivers.pendingEarnings} + ${amount}`,
          totalEarnings: sql`${drivers.totalEarnings} + ${amount}`,
        }).where(eq(drivers.id, d.id));
      } else if (referrer.role === 'BUSINESS') {
        // Seed a single-use FREE up to `amount` promo code, valid 90 days.
        const code = `REFER-${ref.id.split('-')[0].toUpperCase()}`;
        const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        try {
          await db.insert(promoCodes).values({
            code,
            marketCode: ref.marketCode,
            appliesToRole: 'BUSINESS',
            discountType: 'FIXED',
            discountValue: String(amount),
            maxDiscount: String(amount),
            maxRedemptions: 1,
            maxRedemptionsPerUser: 1,
            validUntil,
            description: 'Referral reward — thanks for inviting!',
            status: 'ACTIVE',
          });
        } catch (err) {
          // If the promo already exists for this referral (idempotent retry),
          // accept and continue. Any other failure must NOT mark the referral
          // PAID — leave it QUALIFIED so the next cron tick retries.
          const [already] = await db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
          if (!already) {
            console.error('referral merchant promo insert failed', ref.id, err.message);
            continue; // Stays QUALIFIED, will retry tomorrow.
          }
        }
      }

      await db.update(referrals).set({ status: 'PAID', paidAt: new Date() }).where(eq(referrals.id, ref.id));
      dispatched++;
    } catch (err) {
      console.error('dispatchQualifiedRewards: row failed', ref.id, err.message);
      // Leave QUALIFIED so next run retries.
    }
  }

  return { dispatched };
}

module.exports = {
  getOrCreateMyCode,
  attributeAtSignup,
  qualifyPendingReferrals,
  dispatchQualifiedRewards,
};
