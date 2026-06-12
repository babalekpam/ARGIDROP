/**
 * Driver Welfare — minimum earnings guarantee management.
 * Gold+ drivers who work a 4h shift below 5,000 XOF get topped up by the platform.
 */

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /welfare/me — driver checks their welfare status
router.get('/me', authenticate, requireRole('DRIVER'), async (req, res) => {
  try {
    const { checkWelfareEligibility } = require('../services/welfare');
    const result = await checkWelfareEligibility(req.user.id);
    res.json({ welfare: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check welfare status' });
  }
});

// POST /welfare/claim — driver manually requests welfare topup
router.post('/claim', authenticate, requireRole('DRIVER'), async (req, res) => {
  try {
    const { checkWelfareEligibility, processWelfareTopup } = require('../services/welfare');
    const eligibility = await checkWelfareEligibility(req.user.id);
    if (!eligibility.eligible) {
      return res.status(400).json({ error: eligibility.reason || 'Not eligible for welfare topup' });
    }
    const result = await processWelfareTopup(req.user.id);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process welfare claim' });
  }
});

// GET /welfare/history — admin views all welfare payments
router.get('/history', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { getWelfareHistory } = require('../services/welfare');
    const history = await getWelfareHistory();
    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch welfare history' });
  }
});

// POST /welfare/run — admin triggers manual welfare check run
router.post('/run', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { runWelfareCheck } = require('../services/welfare');
    const result = await runWelfareCheck();
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to run welfare check' });
  }
});

module.exports = router;
