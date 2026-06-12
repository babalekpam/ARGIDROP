/**
 * Corporate Accounts — enterprise B2B tier.
 * Handles account creation, credit line management, and consolidated invoicing.
 */

const express = require('express');
const { eq, and, desc, gte, lte, sql } = require('drizzle-orm');
const crypto = require('crypto');
const { getDB } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  corporateAccounts, corporateInvoices, businesses, jobs, payments,
} = require('../schema');

const router = express.Router();

// ─── ADMIN: Create / activate a corporate account ──────────────────────────
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const {
      businessId, commissionRate, billingCycle, creditLimit,
      codEnabled, apiAccessEnabled, slaMatchGuaranteeMins, slaDeliveryGuaranteeMins,
      contractRef, expiresAt,
    } = req.body;

    if (!businessId) return res.status(400).json({ error: 'businessId is required' });

    const [biz] = await getDB()
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) return res.status(404).json({ error: 'Business not found' });

    const apiKey = apiAccessEnabled
      ? 'ak_live_' + crypto.randomBytes(20).toString('hex')
      : null;

    const [account] = await getDB().insert(corporateAccounts).values({
      businessId,
      accountManagerId: req.user.id,
      contractRef: contractRef || 'CORP-' + Date.now(),
      commissionRate: (commissionRate || 10).toFixed(2),
      billingCycle: billingCycle || 'MONTHLY',
      creditLimit: (creditLimit || 0).toFixed(2),
      codEnabled: !!codEnabled,
      apiAccessEnabled: !!apiAccessEnabled,
      apiKey,
      slaMatchGuaranteeMins: slaMatchGuaranteeMins || 20,
      slaDeliveryGuaranteeMins: slaDeliveryGuaranteeMins || null,
      status: 'ACTIVE',
      activatedAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();

    res.status(201).json({ account });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Business already has a corporate account' });
    res.status(500).json({ error: 'Failed to create corporate account' });
  }
});

// ─── ADMIN: List all corporate accounts ────────────────────────────────────
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const accounts = await getDB()
      .select({
        id: corporateAccounts.id,
        businessId: corporateAccounts.businessId,
        contractRef: corporateAccounts.contractRef,
        commissionRate: corporateAccounts.commissionRate,
        billingCycle: corporateAccounts.billingCycle,
        creditLimit: corporateAccounts.creditLimit,
        currentCreditUsed: corporateAccounts.currentCreditUsed,
        status: corporateAccounts.status,
        activatedAt: corporateAccounts.activatedAt,
        companyName: businesses.companyName,
        city: businesses.city,
        country: businesses.country,
      })
      .from(corporateAccounts)
      .leftJoin(businesses, eq(corporateAccounts.businessId, businesses.id))
      .orderBy(desc(corporateAccounts.activatedAt));

    res.json({ accounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// ─── ADMIN: Generate monthly invoice for a corporate account ────────────────
router.post('/:id/invoices/generate', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart and periodEnd are required' });
    }

    const [account] = await getDB()
      .select()
      .from(corporateAccounts)
      .where(and(eq(corporateAccounts.id, id), eq(corporateAccounts.status, 'ACTIVE')))
      .limit(1);

    if (!account) return res.status(404).json({ error: 'Corporate account not found' });

    // Aggregate completed jobs in the period for this business
    const [agg] = await getDB()
      .select({
        deliveriesCount: sql`count(${payments.id})::int`,
        grossAmount: sql`coalesce(sum(${payments.grossAmount}), 0)`,
        commissionAmount: sql`coalesce(sum(${payments.commissionAmount}), 0)`,
        driverPayout: sql`coalesce(sum(${payments.driverPayout}), 0)`,
      })
      .from(payments)
      .leftJoin(jobs, eq(payments.jobId, jobs.id))
      .where(
        and(
          eq(jobs.businessId, account.businessId),
          eq(payments.status, 'RELEASED'),
          gte(payments.createdAt, new Date(periodStart)),
          lte(payments.createdAt, new Date(periodEnd))
        )
      );

    const grossAmount = parseFloat(agg.grossAmount || 0);
    const commissionAmount = parseFloat(agg.commissionAmount || 0);
    const netAmount = grossAmount - commissionAmount;
    const invoiceNumber = `INV-${account.contractRef}-${Date.now()}`;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 30);

    const [invoice] = await getDB().insert(corporateInvoices).values({
      corporateAccountId: id,
      invoiceNumber,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      deliveriesCount: agg.deliveriesCount || 0,
      grossAmount: grossAmount.toFixed(2),
      commissionAmount: commissionAmount.toFixed(2),
      netAmount: netAmount.toFixed(2),
      currency: 'XOF',
      status: 'SENT',
      sentAt: new Date(),
      dueAt,
    }).returning();

    res.status(201).json({ invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// ─── BUSINESS: Get my corporate account ────────────────────────────────────
router.get('/me', authenticate, requireRole('BUSINESS'), async (req, res) => {
  try {
    const [biz] = await getDB()
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.userId, req.user.id))
      .limit(1);

    if (!biz) return res.status(404).json({ error: 'Business not found' });

    const [account] = await getDB()
      .select()
      .from(corporateAccounts)
      .where(and(eq(corporateAccounts.businessId, biz.id), eq(corporateAccounts.status, 'ACTIVE')))
      .limit(1);

    if (!account) return res.status(404).json({ error: 'No corporate account found' });

    const invoices = await getDB()
      .select()
      .from(corporateInvoices)
      .where(eq(corporateInvoices.corporateAccountId, account.id))
      .orderBy(desc(corporateInvoices.createdAt))
      .limit(12);

    res.json({ account: { ...account, apiKey: undefined }, invoices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch corporate account' });
  }
});

module.exports = router;
