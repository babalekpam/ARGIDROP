/**
 * ArgiDrop Zone Manager Franchise — revenue sharing model
 *
 * TODO: Migrate franchiseContracts Map and payoutLog to DB tables:
 *   zone_franchise_contracts
 *   zone_franchise_payouts
 */

const express = require('express');
const crypto = require('crypto');
const { eq, and, gte, lte, sql } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { zones, payments, jobs, users } = require('../schema');

const router = express.Router();

// ── In-memory stores (TODO: migrate to DB) ────────────────────────────────
const franchiseContracts = new Map();
const payoutLog = [];

// ── Helpers ────────────────────────────────────────────────────────────────

function generateContractRef() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FRC-${timestamp}-${random}`;
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function calcRevenueShare(db, contract, periodStart, periodEnd) {
  const result = await db
    .select({
      totalRevenue: sql`COALESCE(SUM(${payments.amount}), 0)`.as('totalRevenue'),
      totalCommission: sql`COALESCE(SUM(${payments.commissionAmount}), 0)`.as('totalCommission'),
    })
    .from(payments)
    .innerJoin(jobs, eq(payments.jobId, jobs.id))
    .where(
      and(
        eq(jobs.zoneId, contract.zoneId),
        eq(payments.status, 'RELEASED'),
        gte(payments.createdAt, new Date(periodStart)),
        lte(payments.createdAt, new Date(periodEnd))
      )
    );

  const periodRevenue = Number(result[0]?.totalRevenue || 0);
  const commissionEarned = Number(result[0]?.totalCommission || 0);
  const revenueShare = Math.round((commissionEarned * contract.revenueSharePct) / 100);

  const alreadyPaid = payoutLog
    .filter(p =>
      p.contractId === contract.id &&
      p.periodStart === periodStart &&
      p.periodEnd === periodEnd &&
      p.status === 'PAID'
    )
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayout = Math.max(0, revenueShare - alreadyPaid);
  return { periodRevenue, commissionEarned, revenueShare, pendingPayout, alreadyPaid };
}

// ── Routes ─────────────────────────────────────────────────────────────────

// POST / — ADMIN: create franchise contract
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const {
      zoneManagerUserId, zoneId, revenueSharePct = 5,
      monthlyTarget, contractStart, contractEnd,
    } = req.body;

    if (!zoneManagerUserId || !zoneId || !contractStart || !contractEnd) {
      return res.status(400).json({ error: 'zoneManagerUserId, zoneId, contractStart, contractEnd are required' });
    }

    if (revenueSharePct < 0 || revenueSharePct > 100) {
      return res.status(400).json({ error: 'revenueSharePct must be between 0 and 100' });
    }

    const db = getDB();

    const [zone] = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    const [manager] = await db.select().from(users).where(eq(users.id, zoneManagerUserId)).limit(1);
    if (!manager) return res.status(404).json({ error: 'Zone manager user not found' });
    if (manager.role !== 'ZONE_MANAGER') return res.status(400).json({ error: 'User does not have ZONE_MANAGER role' });

    const existingActive = Array.from(franchiseContracts.values()).find(
      c => c.zoneId === zoneId && c.status === 'ACTIVE'
    );
    if (existingActive) {
      return res.status(409).json({ error: 'Active franchise contract already exists for this zone', existingContractId: existingActive.id });
    }

    const contract = {
      id: crypto.randomUUID(),
      contractRef: generateContractRef(),
      zoneManagerUserId,
      zoneId,
      revenueSharePct: Number(revenueSharePct),
      monthlyTarget: monthlyTarget ? Number(monthlyTarget) : null,
      contractStart,
      contractEnd,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      createdByAdminId: req.user.id,
    };

    franchiseContracts.set(contract.id, contract);
    return res.status(201).json({ contract });
  } catch (err) {
    console.error('[franchise] POST / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /me — ZONE_MANAGER: own contract + current month share (registered before /:id)
router.get('/me', authenticate, requireRole('ZONE_MANAGER'), async (req, res) => {
  try {
    const contract = Array.from(franchiseContracts.values()).find(
      c => c.zoneManagerUserId === req.user.id && c.status === 'ACTIVE'
    );

    if (!contract) return res.status(404).json({ error: 'No active franchise contract found for your account' });

    const db = getDB();
    const [zone] = await db.select().from(zones).where(eq(zones.id, contract.zoneId)).limit(1);
    const { start, end } = getCurrentMonthRange();
    const revenueData = await calcRevenueShare(db, contract, start, end);

    return res.json({
      contract: { ...contract, zone: zone || null },
      currentMonth: { periodStart: start, periodEnd: end, ...revenueData, currency: 'XOF' },
    });
  } catch (err) {
    console.error('[franchise] GET /me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / — ADMIN: list all contracts
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const allContracts = Array.from(franchiseContracts.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const enriched = await Promise.all(
      allContracts.map(async (contract) => {
        const [zone] = await db.select().from(zones).where(eq(zones.id, contract.zoneId)).limit(1);
        const [manager] = await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
          .from(users)
          .where(eq(users.id, contract.zoneManagerUserId))
          .limit(1);
        return { ...contract, zone: zone || null, manager: manager || null };
      })
    );

    return res.json({ contracts: enriched, total: enriched.length });
  } catch (err) {
    console.error('[franchise] GET / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/revenue — ADMIN: calculate revenue share for a period
router.get('/:id/revenue', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const contract = franchiseContracts.get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Franchise contract not found' });

    const { periodStart, periodEnd } = req.query;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart and periodEnd query params are required (ISO 8601)' });
    }

    const db = getDB();
    const revenueData = await calcRevenueShare(db, contract, periodStart, periodEnd);

    return res.json({
      contractId: contract.id,
      contractRef: contract.contractRef,
      zoneId: contract.zoneId,
      revenueSharePct: contract.revenueSharePct,
      periodStart,
      periodEnd,
      ...revenueData,
      currency: 'XOF',
    });
  } catch (err) {
    console.error('[franchise] GET /:id/revenue error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/payout — ADMIN: record payout
router.post('/:id/payout', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const contract = franchiseContracts.get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Franchise contract not found' });

    const { periodStart, periodEnd, amount, paymentReference, notes } = req.body;

    if (!periodStart || !periodEnd || amount == null) {
      return res.status(400).json({ error: 'periodStart, periodEnd, and amount are required' });
    }
    if (amount <= 0) return res.status(400).json({ error: 'amount must be positive' });

    const db = getDB();
    const revenueData = await calcRevenueShare(db, contract, periodStart, periodEnd);

    if (amount > revenueData.pendingPayout) {
      return res.status(400).json({
        error: `Amount exceeds pending payout. Pending: ${revenueData.pendingPayout} XOF`,
        pendingPayout: revenueData.pendingPayout,
      });
    }

    const payout = {
      id: crypto.randomUUID(),
      contractId: contract.id,
      zoneManagerUserId: contract.zoneManagerUserId,
      periodStart,
      periodEnd,
      amount: Number(amount),
      currency: 'XOF',
      paymentReference: paymentReference || null,
      notes: notes || null,
      status: 'PAID',
      paidAt: new Date().toISOString(),
      recordedByAdminId: req.user.id,
    };

    payoutLog.push(payout);
    return res.status(201).json({ payout });
  } catch (err) {
    console.error('[franchise] POST /:id/payout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
