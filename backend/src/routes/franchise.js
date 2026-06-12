/**
 * ArgiDrop Zone Manager Franchise — revenue sharing model.
 * TODO: migrate in-memory franchiseContracts and payoutLog Maps to DB table zone_franchise_contracts
 */

import { Router } from 'express';
import crypto from 'crypto';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getDB } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { zones, payments, jobs, users } from '../schema.js';

const router = Router();

// ---------------------------------------------------------------------------
// In-memory stores (TODO: replace with DB tables)
// ---------------------------------------------------------------------------
const franchiseContracts = new Map(); // id → contract object
const payoutLog = new Map();          // id → [ payout entries ]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateContractRef() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FRC-${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// POST / — ADMIN — create franchise contract
// ---------------------------------------------------------------------------
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const {
      zoneManagerUserId,
      zoneId,
      revenueSharePct = 5,
      monthlyTarget,
      contractStart,
      contractEnd,
    } = req.body;

    const required = { zoneManagerUserId, zoneId, monthlyTarget, contractStart, contractEnd };
    const missing = Object.entries(required).filter(([, v]) => v == null || v === '').map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const db = getDB();

    // Validate zone exists
    const [zone] = await db.select().from(zones).where(eq(zones.id, zoneId));
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    // Validate manager user exists
    const [manager] = await db.select().from(users).where(eq(users.id, zoneManagerUserId));
    if (!manager) return res.status(404).json({ error: 'Zone manager user not found' });

    const contractId = crypto.randomUUID();
    const contractRef = generateContractRef();

    const contract = {
      id: contractId,
      contractRef,
      zoneManagerUserId,
      zoneId,
      zoneName: zone.name,
      managerName: manager.name || manager.email,
      revenueSharePct: parseFloat(revenueSharePct),
      monthlyTarget: parseFloat(monthlyTarget),
      contractStart: new Date(contractStart).toISOString(),
      contractEnd: new Date(contractEnd).toISOString(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      createdByUserId: req.user.id,
    };

    franchiseContracts.set(contractId, contract);
    payoutLog.set(contractId, []);

    return res.status(201).json({ contract });
  } catch (err) {
    console.error('[franchise] POST / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET / — ADMIN — list all franchise contracts
// ---------------------------------------------------------------------------
router.get('/', authenticate, requireRole('ADMIN'), (req, res) => {
  try {
    const contracts = [...franchiseContracts.values()].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return res.json({ contracts, count: contracts.length });
  } catch (err) {
    console.error('[franchise] GET / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /me — ZONE_MANAGER auth — my contract + current month revenue share
// ---------------------------------------------------------------------------
router.get('/me', authenticate, requireRole('ZONE_MANAGER'), async (req, res) => {
  try {
    const contract = [...franchiseContracts.values()].find(
      c => c.zoneManagerUserId === req.user.id && c.status === 'ACTIVE'
    );

    if (!contract) {
      return res.status(404).json({ error: 'No active franchise contract found for your account' });
    }

    // Current month boundaries
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const db = getDB();

    // Sum released payments for jobs in this zone within the current month
    const [revenueRow] = await db
      .select({ total: sql`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(jobs, eq(jobs.id, payments.jobId))
      .where(
        and(
          eq(jobs.zoneId, contract.zoneId),
          eq(payments.status, 'RELEASED'),
          gte(payments.createdAt, new Date(periodStart)),
          lte(payments.createdAt, new Date(periodEnd))
        )
      );

    const periodRevenue = parseFloat(revenueRow?.total ?? 0);
    // Platform commission is assumed to be stored in payments.platformFee; fall back to 10 % of revenue
    const commissionEarned = periodRevenue * 0.10;
    const revenueShare = commissionEarned * (contract.revenueSharePct / 100);

    const payouts = payoutLog.get(contract.id) || [];
    const paidOut = payouts
      .filter(p => p.periodStart === periodStart)
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingPayout = Math.max(0, revenueShare - paidOut);

    return res.json({
      contract,
      currentMonth: {
        periodStart,
        periodEnd,
        periodRevenue,
        commissionEarned,
        revenueSharePct: contract.revenueSharePct,
        revenueShare,
        paidOut,
        pendingPayout,
      },
    });
  } catch (err) {
    console.error('[franchise] GET /me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/revenue — ADMIN — calculate revenue share for a period
// ---------------------------------------------------------------------------
router.get('/:id/revenue', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const contract = franchiseContracts.get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Franchise contract not found' });

    const { periodStart, periodEnd } = req.query;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart and periodEnd query params are required' });
    }

    const db = getDB();

    const [revenueRow] = await db
      .select({ total: sql`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(jobs, eq(jobs.id, payments.jobId))
      .where(
        and(
          eq(jobs.zoneId, contract.zoneId),
          eq(payments.status, 'RELEASED'),
          gte(payments.createdAt, new Date(periodStart)),
          lte(payments.createdAt, new Date(periodEnd))
        )
      );

    const periodRevenue = parseFloat(revenueRow?.total ?? 0);
    const commissionEarned = periodRevenue * 0.10; // 10 % platform commission
    const revenueShare = commissionEarned * (contract.revenueSharePct / 100);

    const payouts = payoutLog.get(contract.id) || [];
    const paidOut = payouts
      .filter(p => p.periodStart === periodStart && p.periodEnd === periodEnd)
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingPayout = Math.max(0, revenueShare - paidOut);

    return res.json({
      contractId: contract.id,
      contractRef: contract.contractRef,
      zoneId: contract.zoneId,
      zoneName: contract.zoneName,
      periodStart,
      periodEnd,
      periodRevenue,
      commissionEarned,
      revenueSharePct: contract.revenueSharePct,
      revenueShare,
      paidOut,
      pendingPayout,
      currency: 'XOF',
    });
  } catch (err) {
    console.error('[franchise] GET /:id/revenue error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/payout — ADMIN — mark revenue share as paid out
// ---------------------------------------------------------------------------
router.post('/:id/payout', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const contract = franchiseContracts.get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Franchise contract not found' });

    const { amount, periodStart, periodEnd, paymentReference, notes } = req.body;
    if (amount == null || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'amount, periodStart, periodEnd are required' });
    }

    const payoutEntry = {
      id: crypto.randomUUID(),
      contractId: contract.id,
      contractRef: contract.contractRef,
      zoneManagerUserId: contract.zoneManagerUserId,
      amount: parseFloat(amount),
      currency: 'XOF',
      periodStart,
      periodEnd,
      paymentReference: paymentReference || null,
      notes: notes || null,
      paidByUserId: req.user.id,
      paidAt: new Date().toISOString(),
    };

    const log = payoutLog.get(contract.id) || [];
    log.push(payoutEntry);
    payoutLog.set(contract.id, log);

    return res.status(201).json({ payout: payoutEntry });
  } catch (err) {
    console.error('[franchise] POST /:id/payout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
