// Wallet Routes — business wallet top-up and balance management

const express = require('express');
const { eq, desc } = require('drizzle-orm');
const { authenticate, requireRole } = require('../middleware/auth');
const { getDB } = require('../config/database');
const { businesses, businessWallets, walletTransactions } = require('../schema');
const { getOrCreateWallet, initiateDeposit, confirmDeposit } = require('../services/wallet');

const router = express.Router();

router.get('/balance', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });
    const wallet = await getOrCreateWallet(biz.id);
    const available = parseFloat(wallet.balance) - parseFloat(wallet.heldBalance);
    res.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        heldBalance: wallet.heldBalance,
        available: available.toFixed(2),
        currency: wallet.currency,
        country: biz.country,
        autoTopupEnabled: wallet.autoTopupEnabled,
        lastDepositAt: wallet.lastDepositAt
      }
    });
  } catch (err) { next(err); }
});

router.post('/deposit', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const { amount, provider = 'FLUTTERWAVE', phone } = req.body;
    if (!amount || parseFloat(amount) < 1) return res.status(400).json({ success: false, message: 'Invalid amount' });
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });
    const result = await initiateDeposit(biz.id, amount, provider, phone || req.user.phone, req.user.email);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

router.post('/auto-topup', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const { enabled, threshold, amount } = req.body;
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    const wallet = await getOrCreateWallet(biz.id);
    await db.update(businessWallets).set({
      autoTopupEnabled: enabled,
      autoTopupThreshold: threshold?.toString(),
      autoTopupAmount: amount?.toString(),
      updatedAt: new Date()
    }).where(eq(businessWallets.id, wallet.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/transactions', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const db = getDB();
    const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    const wallet = await getOrCreateWallet(biz.id);
    const txs = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(100);
    res.json({ success: true, transactions: txs });
  } catch (err) { next(err); }
});

module.exports = router;
