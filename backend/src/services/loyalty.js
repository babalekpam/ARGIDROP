/**
 * Customer Loyalty Points Service
 *
 * NOTE: The `loyaltyAccounts` table does not yet exist in the database.
 * This module uses in-memory Maps as a mock layer.
 * Replace with a real DB table after running the migration that adds
 * `loyaltyAccounts` and `loyaltyEvents` tables.
 *
 * Points system:
 *   - 1 point per 100 XOF spent
 *   - Minimum 500 points to redeem; 1 point = 1 XOF discount
 *
 * Tiers:
 *   EXPLORER  0–999      no special benefit
 *   FREQUENT  1000–4999  5% delivery discount
 *   VIP       5000–14999 10% delivery discount + priority matching
 *   ELITE     15000+     15% delivery discount + free delivery every 10th order
 */

// ---------------------------------------------------------------------------
// In-memory mock storage (replace with DB table after migration)
// ---------------------------------------------------------------------------

/**
 * @type {Map<string, { points: number, lifetimePoints: number }>}
 */
const accountsStore = new Map();

/**
 * @type {Map<string, Array<{ ts: Date, type: 'AWARD'|'REDEEM', points: number, reason: string, refId: string|null }>>}
 */
const historyStore = new Map();

// ---------------------------------------------------------------------------
// Tier configuration
// ---------------------------------------------------------------------------

const TIERS = [
  {
    name: 'EXPLORER',
    min: 0,
    max: 999,
    benefits: [],
  },
  {
    name: 'FREQUENT',
    min: 1000,
    max: 4999,
    benefits: ['5% delivery discount'],
  },
  {
    name: 'VIP',
    min: 5000,
    max: 14999,
    benefits: ['10% delivery discount', 'priority matching'],
  },
  {
    name: 'ELITE',
    min: 15000,
    max: Infinity,
    benefits: ['15% delivery discount', 'free delivery every 10th order'],
  },
];

const POINTS_PER_XOF = 1 / 100; // 1 point per 100 XOF
const REDEEM_RATE_XOF = 1;      // 1 point = 1 XOF discount
const MIN_REDEEM_POINTS = 500;

const getTier = (points) => {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
};

const getNextTier = (currentTierName) => {
  const idx = TIERS.findIndex((t) => t.name === currentTierName);
  return TIERS[idx + 1] ?? null;
};

const ensureAccount = (userId) => {
  const key = String(userId);
  if (!accountsStore.has(key)) accountsStore.set(key, { points: 0, lifetimePoints: 0 });
  if (!historyStore.has(key)) historyStore.set(key, []);
  return key;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get or create a loyalty account for a user.
 *
 * @param {string|number} userId
 * @returns {{ userId: string, points: number, tier: string, benefits: string[], nextTier: string|null, pointsToNext: number|null }}
 */
export const getOrCreateAccount = (userId) => {
  const key = ensureAccount(userId);
  const { points } = accountsStore.get(key);
  const tier = getTier(points);
  const next = getNextTier(tier.name);

  return {
    userId: key,
    points,
    tier: tier.name,
    benefits: tier.benefits,
    nextTier: next?.name ?? null,
    pointsToNext: next ? next.min - points : null,
  };
};

/**
 * Award loyalty points to a user based on XOF amount spent.
 * 1 point per 100 XOF. Fractional points are floored.
 *
 * @param {string|number} userId
 * @param {number} amount    - Amount in XOF
 * @param {string} reason    - Human-readable reason (e.g. 'Delivery completed')
 * @param {string} [refId]   - Optional reference ID (e.g. job ID)
 * @returns {{ newTotal: number, pointsAwarded: number, tier: string }}
 */
export const awardPoints = (userId, amount, reason, refId) => {
  const key = ensureAccount(userId);
  const pointsAwarded = Math.floor(amount * POINTS_PER_XOF);

  const acct = accountsStore.get(key);

  if (pointsAwarded > 0) {
    acct.points += pointsAwarded;
    acct.lifetimePoints += pointsAwarded;

    historyStore.get(key).push({
      ts: new Date(),
      type: 'AWARD',
      points: pointsAwarded,
      reason,
      refId: refId ?? null,
    });
  }

  const tier = getTier(acct.points);
  return { newTotal: acct.points, pointsAwarded, tier: tier.name };
};

/**
 * Redeem loyalty points for an XOF discount.
 * Requires a minimum of 500 points. 1 point = 1 XOF discount.
 *
 * @param {string|number} userId
 * @param {number} pointsToRedeem
 * @returns {{ success: boolean, discountXOF: number, remainingPoints: number, reason?: string }}
 */
export const redeemPoints = (userId, pointsToRedeem) => {
  const key = ensureAccount(userId);
  const acct = accountsStore.get(key);

  if (pointsToRedeem < MIN_REDEEM_POINTS) {
    return {
      success: false,
      discountXOF: 0,
      remainingPoints: acct.points,
      reason: `Minimum ${MIN_REDEEM_POINTS} points requis pour échanger.`,
    };
  }

  if (acct.points < pointsToRedeem) {
    return {
      success: false,
      discountXOF: 0,
      remainingPoints: acct.points,
      reason: `Solde insuffisant. Vous avez ${acct.points} points, vous essayez d'échanger ${pointsToRedeem}.`,
    };
  }

  acct.points -= pointsToRedeem;
  const discountXOF = Math.floor(pointsToRedeem * REDEEM_RATE_XOF);

  historyStore.get(key).push({
    ts: new Date(),
    type: 'REDEEM',
    points: -pointsToRedeem,
    reason: `Échange pour réduction de ${discountXOF} XOF`,
    refId: null,
  });

  return { success: true, discountXOF, remainingPoints: acct.points };
};

/**
 * Get the last 50 loyalty events for a user, most recent first.
 *
 * @param {string|number} userId
 * @returns {Array<{ ts: Date, type: string, points: number, reason: string, refId: string|null }>}
 */
export const getHistory = (userId) => {
  const key = String(userId);
  const history = historyStore.get(key) ?? [];
  return history.slice(-50).reverse();
};
