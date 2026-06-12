/**
 * Customer Loyalty Points Service
 *
 * NOTE: loyaltyAccounts table not yet in DB. Uses in-memory Maps.
 * Replace with DB table after running the migration that adds
 * `loyalty_accounts` and `loyalty_events` tables.
 *
 * Points: 1 pt per 100 XOF spent. Min 500 pts to redeem; 1 pt = 1 XOF discount.
 * Tiers: EXPLORER(0) / FREQUENT(1000, 5%) / VIP(5000, 10%+priority) / ELITE(15000, 15%+free10th)
 */

// ── In-memory storage (replace with DB after migration) ───────────────────
const accountsStore = new Map();
const historyStore = new Map();

// ── Tier config ────────────────────────────────────────────────────────────
const TIERS = [
  { name: 'EXPLORER',  min: 0,     max: 999,      benefits: [] },
  { name: 'FREQUENT',  min: 1000,  max: 4999,     benefits: ['5% delivery discount'] },
  { name: 'VIP',       min: 5000,  max: 14999,    benefits: ['10% delivery discount', 'priority matching'] },
  { name: 'ELITE',     min: 15000, max: Infinity,  benefits: ['15% delivery discount', 'free delivery every 10th order'] },
];

const POINTS_PER_XOF = 1 / 100;
const REDEEM_RATE_XOF = 1;
const MIN_REDEEM_POINTS = 500;

function getTier(points) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function getNextTier(currentTierName) {
  const idx = TIERS.findIndex(t => t.name === currentTierName);
  return TIERS[idx + 1] ?? null;
}

function ensureAccount(userId) {
  const key = String(userId);
  if (!accountsStore.has(key)) accountsStore.set(key, { points: 0, lifetimePoints: 0 });
  if (!historyStore.has(key)) historyStore.set(key, []);
  return key;
}

// ── Public API ─────────────────────────────────────────────────────────────

function getOrCreateAccount(userId) {
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
}

function awardPoints(userId, amount, reason, refId) {
  const key = ensureAccount(userId);
  const pointsAwarded = Math.floor(amount * POINTS_PER_XOF);
  const acct = accountsStore.get(key);

  if (pointsAwarded > 0) {
    acct.points += pointsAwarded;
    acct.lifetimePoints += pointsAwarded;
    historyStore.get(key).push({
      ts: new Date(), type: 'AWARD', points: pointsAwarded, reason, refId: refId ?? null,
    });
  }

  return { newTotal: acct.points, pointsAwarded, tier: getTier(acct.points).name };
}

function redeemPoints(userId, pointsToRedeem) {
  const key = ensureAccount(userId);
  const acct = accountsStore.get(key);

  if (pointsToRedeem < MIN_REDEEM_POINTS) {
    return { success: false, discountXOF: 0, remainingPoints: acct.points, reason: `Minimum ${MIN_REDEEM_POINTS} points requis pour échanger.` };
  }
  if (acct.points < pointsToRedeem) {
    return { success: false, discountXOF: 0, remainingPoints: acct.points, reason: `Solde insuffisant. Vous avez ${acct.points} points, vous essayez d'échanger ${pointsToRedeem}.` };
  }

  acct.points -= pointsToRedeem;
  const discountXOF = Math.floor(pointsToRedeem * REDEEM_RATE_XOF);

  historyStore.get(key).push({
    ts: new Date(), type: 'REDEEM', points: -pointsToRedeem,
    reason: `Échange pour réduction de ${discountXOF} XOF`, refId: null,
  });

  return { success: true, discountXOF, remainingPoints: acct.points };
}

function getHistory(userId) {
  const key = String(userId);
  const history = historyStore.get(key) ?? [];
  return history.slice(-50).reverse();
}

module.exports = { getOrCreateAccount, awardPoints, redeemPoints, getHistory, TIERS };
