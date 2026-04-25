const express = require('express');
const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { payments, jobs, businesses, walletTransactions, businessWallets } = require('../schema');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  listProvidersForCountryDetailed,
  defaultCurrencyForCountry,
  defaultProviderForCountry,
  COUNTRY_PROVIDERS,
} = require('../services/payment-providers');
const { confirmDeposit } = require('../services/wallet');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const router = express.Router();

// ─── GET /providers?country=TG ──────────────────────────────────────
// Returns the ordered list of payment providers available for a given country.
// Open endpoint — used by the deposit / payment screens to render the picker.
router.get('/providers', (req, res) => {
  const country = (req.query.country || 'TG').toUpperCase();
  if (!COUNTRY_PROVIDERS[country]) {
    return res.status(400).json({ success: false, message: `Country ${country} not configured` });
  }
  res.json({
    success: true,
    country,
    currency: defaultCurrencyForCountry(country),
    defaultProvider: defaultProviderForCountry(country),
    providers: listProvidersForCountryDetailed(country),
  });
});

// ─── GET /providers/all ─────────────────────────────────────────────
// Admin-style listing of every supported country + its providers.
router.get('/providers/all', (req, res) => {
  const out = {};
  for (const country of Object.keys(COUNTRY_PROVIDERS)) {
    out[country] = {
      currency: defaultCurrencyForCountry(country),
      providers: listProvidersForCountryDetailed(country),
    };
  }
  res.json({ success: true, countries: out });
});

// ─── /demo/confirm — locked-down demo payment landing ───────────────
// HTML-escapes every interpolated value to prevent reflected XSS, validates
// `redirect` to be a relative same-origin path so it cannot be abused as an
// open redirect, and only accepts known provider codes.
function htmlEscape(s) {
  return String(s).replace(/[&<>"'`/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','/':'&#47;',
  })[c]);
}
function sanitizeRedirect(r) {
  if (!r || typeof r !== 'string') return '/dashboard/wallet';
  // Must be a relative path starting with '/', no protocol, no protocol-relative '//'.
  if (!r.startsWith('/') || r.startsWith('//') || r.includes('\\')) return '/dashboard/wallet';
  if (r.length > 256) return '/dashboard/wallet';
  return r;
}
function sanitizeReference(ref) {
  if (typeof ref !== 'string') return '';
  // refs are alphanumeric + hyphens only (DLV-WDEP-..., DLV-JOB-..., uuid).
  return /^[A-Za-z0-9-]{1,128}$/.test(ref) ? ref : '';
}

router.get('/demo/confirm', (req, res) => {
  const provider = String(req.query.provider || '').toUpperCase();
  const reference = sanitizeReference(req.query.reference);
  const amount = String(req.query.amount || '').replace(/[^\d.]/g, '').slice(0, 14);
  const currency = String(req.query.currency || '').replace(/[^A-Z]/g, '').slice(0, 5);
  const redirect = sanitizeRedirect(req.query.redirect);
  if (!reference || !COUNTRY_PROVIDERS) return res.status(400).send('Missing reference');
  // Provider whitelist — must be a known adapter code.
  const knownProviders = new Set(Object.values(COUNTRY_PROVIDERS).flatMap(c => c.providers));
  if (!knownProviders.has(provider)) return res.status(400).send('Unknown provider');
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Demo Payment — ${htmlEscape(provider)}</title>
<style>
body{font-family:system-ui;background:#F7F3EB;margin:0;padding:24px;color:#1a1a1a}
.card{max-width:480px;margin:48px auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.badge{display:inline-block;padding:6px 12px;background:#FFF3CD;color:#7A5C00;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:16px}
h1{margin:0 0 8px;font-size:22px}.muted{color:#666;font-size:14px;margin:4px 0 24px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px}.row:last-child{border:0}
.btn{display:block;width:100%;padding:14px;border:0;border-radius:10px;font-size:16px;font-weight:600;margin-top:12px;cursor:pointer}
.btn-pay{background:#1B4332;color:#fff}.btn-fail{background:#fff;color:#888;border:1px solid #ddd}
.btn:hover{opacity:.9}
</style></head>
<body><div class="card">
  <div class="badge">DEMO MODE — no real money will move</div>
  <h1>${htmlEscape(provider)} payment</h1>
  <p class="muted">This provider is not yet connected with live API credentials. Confirm below to simulate a successful payment.</p>
  <div class="row"><span>Amount</span><strong>${htmlEscape(amount)} ${htmlEscape(currency)}</strong></div>
  <div class="row"><span>Reference</span><code style="font-size:12px">${htmlEscape(reference)}</code></div>
  <form method="POST" action="/api/v1/payments/demo/confirm">
    <input type="hidden" name="provider" value="${htmlEscape(provider)}">
    <input type="hidden" name="reference" value="${htmlEscape(reference)}">
    <input type="hidden" name="redirect" value="${htmlEscape(redirect)}">
    <button class="btn btn-pay" type="submit" name="action" value="success">Confirm payment</button>
    <button class="btn btn-fail" type="submit" name="action" value="fail">Cancel</button>
  </form>
</div></body></html>`);
});

router.post('/demo/confirm', express.urlencoded({ extended: true }), async (req, res, next) => {
  try {
    const reference = sanitizeReference(req.body.reference);
    const action = req.body.action === 'success' ? 'success' : 'fail';
    const redirect = sanitizeRedirect(req.body.redirect);
    if (action === 'success' && reference) {
      // Demo confirm only credits if the named provider is currently in demo
      // mode. This blocks anyone from forcing a free deposit by hitting this
      // endpoint once a real provider has gone live with credentials.
      const provider = String(req.body.provider || '').toUpperCase();
      try {
        const { getAdapter } = require('../services/payment-providers');
        const adapter = getAdapter(provider);
        if (!adapter.isLive()) {
          await confirmDeposit(reference);
        } else {
          console.warn(`Refused demo confirm for live provider ${provider}`);
        }
      } catch (e) {
        console.log('Demo confirmDeposit error:', e.message);
      }
    }
    const target = redirect + (redirect.includes('?') ? '&' : '?') + 'demo=' + action;
    res.redirect(target);
  } catch (err) { next(err); }
});

// ─── POST /create-intent (Stripe — kept for backward compat) ─────────
router.post('/create-intent', authenticate, requireRole('BUSINESS'), async (req, res, next) => {
  try {
    if (!stripe) return res.status(501).json({ success: false, message: 'Stripe not configured' });
    const { jobId } = req.body;
    const db = getDB();
    const [business] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job || !business) return res.status(404).json({ success: false, message: 'Job or business not found' });

    // Authorization: business must own the job
    if (job.businessId !== business.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const amount = Math.round(parseFloat(job.priceOffered) * 100);
    const intent = await stripe.paymentIntents.create({
      amount, currency: job.currency?.toLowerCase() || 'usd',
      customer: business.stripeCustomerId || undefined,
      metadata: { jobId: job.id, businessId: business.id },
      capture_method: 'manual',
    });

    res.json({ success: true, clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (err) { next(err); }
});

// ─── POST /webhook (Stripe) ──────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(501).send('Stripe not configured');
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
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// ─── GET /:jobId — get payment for a job (authorization-restricted) ──
router.get('/:jobId', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const [payment] = await db.select().from(payments).where(eq(payments.jobId, req.params.jobId)).limit(1);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    // Only the owning business or an admin may see payment details.
    if (req.user.role !== 'ADMIN') {
      const [biz] = await db.select().from(businesses).where(eq(businesses.userId, req.user.id)).limit(1);
      if (!biz || biz.id !== payment.businessId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
    res.json({ success: true, payment });
  } catch (err) { next(err); }
});

module.exports = router;
