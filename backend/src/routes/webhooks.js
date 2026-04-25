// Webhooks — async payment confirmations from mobile money providers.
// One route per provider. Each route verifies signature → identifies whether
// the reference corresponds to a wallet deposit or a job payment → delegates
// to confirmDeposit() or confirmJobPayment().

const express = require('express');
const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { jobs, payments } = require('../schema');
const { confirmDeposit } = require('../services/wallet');
const { getAdapter } = require('../services/payment-providers');

const router = express.Router();

// Helper — extract the tx_ref / order_id from a provider event.
function extractReference(provider, event) {
  switch (provider) {
    case 'FLUTTERWAVE': return event?.data?.tx_ref;
    case 'PAYSTACK':    return event?.data?.reference;
    case 'MTN_MOMO':    return event?.externalId || event?.referenceId;
    case 'ORANGE_MONEY':return event?.order_id || event?.reference;
    case 'WAVE':        return event?.data?.client_reference;
    case 'MPESA':       return event?.Body?.stkCallback?.MerchantRequestID || event?.merchant_request_id;
    case 'AIRTEL_MONEY':return event?.transaction?.id || event?.reference;
    default:            return event?.reference || event?.tx_ref;
  }
}

function isSuccessful(provider, event) {
  switch (provider) {
    case 'FLUTTERWAVE': return event?.event === 'charge.completed' && event?.data?.status === 'successful';
    case 'PAYSTACK':    return event?.event === 'charge.success';
    case 'MTN_MOMO':    return event?.status === 'SUCCESSFUL';
    case 'ORANGE_MONEY':return event?.status === 'SUCCESS';
    case 'WAVE':        return event?.type === 'checkout.session.completed' && event?.data?.payment_status === 'succeeded';
    case 'MPESA':       return event?.Body?.stkCallback?.ResultCode === 0;
    case 'AIRTEL_MONEY':return event?.transaction?.status_code === 'TS' || event?.transaction?.status === 'TS';
    default:            return false;
  }
}

async function dispatchByReference(reference, provider, event) {
  if (!reference) return;
  if (reference.startsWith('DLV-WDEP-')) {
    await confirmDeposit(reference);
  } else if (reference.startsWith('DLV-JOB-')) {
    // Job IDs are UUIDs (contain hyphens) so split('-')[2] would lose 4 of
    // the 5 UUID segments. Strip the prefix instead.
    const rest = reference.slice('DLV-JOB-'.length);
    // Trim a trailing -<timestamp> if our initiator added one.
    const jobId = rest.replace(/-\d{10,}$/, '');
    await confirmJobPayment(jobId, provider, event);
  }
}

// Generic webhook handler factory — one per provider.
function handlerFor(provider, sigHeader) {
  return async (req, res) => {
    try {
      const adapter = getAdapter(provider);
      const signature = sigHeader ? req.headers[sigHeader.toLowerCase()] : null;
      const rawBody = req.rawBody || (req.body && Buffer.isBuffer(req.body) ? req.body.toString() : null);
      const eventBody = req.body && Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
      // pathSecret is provided for unsigned providers via /:secret URL segment.
      const pathSecret = req.params.secret || null;
      if (!(await adapter.verifyWebhookSignature(eventBody, signature, rawBody, pathSecret))) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      if (isSuccessful(provider, eventBody)) {
        const ref = extractReference(provider, eventBody);
        await dispatchByReference(ref, provider, eventBody);
      }
      res.json({ received: true });
    } catch (err) {
      console.error(`${provider} webhook error:`, err);
      if (err.retryable) return res.status(503).json({ error: 'Transient error — please retry' });
      res.status(200).json({ received: true });
    }
  };
}

// Capture raw body for HMAC-verifying providers.
const rawJson = express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
});

// HMAC-signed providers — single fixed URL.
router.post('/flutterwave',   rawJson, handlerFor('FLUTTERWAVE',   'verif-hash'));
router.post('/paystack',      rawJson, handlerFor('PAYSTACK',      'x-paystack-signature'));
router.post('/wave',          rawJson, handlerFor('WAVE',          'wave-signature'));
// Unsigned providers — require a shared secret in the URL path so a stranger
// cannot forge "payment succeeded" callbacks. Configure WEBHOOK_PATH_SECRET
// in your environment, then register the corresponding URL with each provider:
//   .../mtn-momo/<WEBHOOK_PATH_SECRET>
router.post('/mtn-momo/:secret',     rawJson, handlerFor('MTN_MOMO',     null));
router.post('/orange-money/:secret', rawJson, handlerFor('ORANGE_MONEY', null));
router.post('/mpesa/:secret',        rawJson, handlerFor('MPESA',        null));
router.post('/airtel-money/:secret', rawJson, handlerFor('AIRTEL_MONEY', null));

// Demo-only providers: T-Money, Flooz, Vodafone Cash, AirtelTigo, Tigo, Free Money, Moov.
// These have no public sandbox webhooks. The demo confirm page in routes/payments.js
// fires the dispatch directly. We still expose the endpoint as a no-op so URLs
// stay stable when real APIs come online.
const noop = (req, res) => res.json({ received: true, demo: true });
router.post('/tmoney',          noop);
router.post('/flooz',           noop);
router.post('/moov',            noop);
router.post('/vodafone-cash',   noop);
router.post('/airteltigo-money',noop);
router.post('/tigo-cash',       noop);
router.post('/free-money',      noop);

async function confirmJobPayment(jobId, provider, event) {
  const db = getDB();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return;
  if (job.status !== 'AWAITING_PAYMENT') return;
  const now = new Date();
  const txId = event?.data?.id?.toString() || event?.transaction?.id || event?.referenceId || null;
  await db.update(jobs).set({
    status: 'POSTED',
    paymentConfirmedAt: now,
    paymentProviderRef: txId,
    paymentProvider: provider,
    updatedAt: now,
  }).where(eq(jobs.id, jobId));
  const commissionRate = 18;
  const gross = parseFloat(job.priceOffered);
  const commission = gross * commissionRate / 100;
  await db.insert(payments).values({
    jobId: job.id,
    businessId: job.businessId,
    grossAmount: gross,
    commissionRate,
    commissionAmount: commission,
    driverPayout: gross - commission,
    currency: job.currency,
    status: 'HELD',
    heldAt: now,
    paymentProvider: provider,
    providerTxRef: txId,
  });
  const { findNearbyDrivers, broadcastJobToDrivers } = require('../services/geo');
  const nearby = await findNearbyDrivers(job.pickupLat, job.pickupLng, job.vehicleTypeRequired);
  if (nearby.length > 0) await broadcastJobToDrivers(job, nearby);
}

module.exports = router;
