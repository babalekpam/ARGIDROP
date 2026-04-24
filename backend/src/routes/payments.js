const express = require('express');
const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { payments, jobs, businesses } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// POST /create-intent — Create Stripe payment intent for a job
router.post('/create-intent', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    const { jobId } = req.body;
    const db = getDB();
    const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job || !business) return res.status(404).json({ success: false, message: 'Job or business not found' });

    const amount = Math.round(parseFloat(job.priceOffered) * 100); // cents
    const intent = await stripe.paymentIntents.create({
      amount, currency: job.currency?.toLowerCase() || 'usd',
      customer: business.stripeCustomerId || undefined,
      metadata: { jobId: job.id, businessId: business.id },
      capture_method: 'manual' // authorize now, capture after delivery
    });

    res.json({ success: true, clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (err) { next(err); }
});

// POST /webhook — Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    const db = getDB();

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      await db.update(payments).set({ status: 'HELD', heldAt: new Date() }).where(eq(payments.stripePaymentIntentId, pi.id));
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// GET /:jobId — Get payment for a job
router.get('/:jobId', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const [payment] = await db.select().from(payments).where(eq(payments.jobId, req.params.jobId)).limit(1);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment });
  } catch (err) { next(err); }
});

module.exports = router;
