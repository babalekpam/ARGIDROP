/**
 * ArgiDrop Loyalty — customer points & rewards system.
 * 1 point per 100 XOF spent. Tiers: EXPLORER → FREQUENT → VIP → ELITE.
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const loyalty = require('../services/loyalty');

const router = express.Router();

// GET /loyalty/me — get my loyalty account
router.get('/me', authenticate, async (req, res) => {
  try {
    const account = await loyalty.getOrCreateAccount(req.user.id);
    res.json({ account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch loyalty account' });
  }
});

// GET /loyalty/history — transaction history
router.get('/history', authenticate, async (req, res) => {
  try {
    const history = await loyalty.getHistory(req.user.id);
    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /loyalty/redeem — redeem points for a discount
router.post('/redeem', authenticate, async (req, res) => {
  try {
    const { points } = req.body;
    if (!points || parseInt(points) < 500) {
      return res.status(400).json({ error: 'Minimum redemption is 500 points' });
    }
    const result = await loyalty.redeemPoints(req.user.id, parseInt(points));
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to redeem points' });
  }
});

// GET /loyalty/tiers — public: describe the tier benefits
router.get('/tiers', (req, res) => {
  res.json({
    tiers: [
      { name: 'EXPLORER', minPoints: 0, benefits: ['Earn 1pt per 100 XOF', 'Standard delivery'], color: '#6B7280' },
      { name: 'FREQUENT', minPoints: 1000, benefits: ['5% delivery discount', 'Priority support'], color: '#8B6F47' },
      { name: 'VIP', minPoints: 5000, benefits: ['10% discount', 'Priority matching', 'Free SMS tracking'], color: '#B45309' },
      { name: 'ELITE', minPoints: 15000, benefits: ['15% discount', 'Every 10th delivery free', 'Dedicated account manager'], color: '#7C3AED' },
    ],
  });
});

module.exports = router;
