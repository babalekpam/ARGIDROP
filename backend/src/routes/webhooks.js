// Webhooks — async payment confirmations from mobile money providers
const express = require('express');
const { eq } = require('drizzle-orm');
const { getDB } = require('../config/database');
const { jobs, payments } = require('../schema');
const { confirmDeposit } = require('../services/wallet');
const { getAdapter } = require('../services/payment-adapter');

const router = express.Router();

/**
 * POST /webhooks/flutterwave
 * Flutterwave sends a POST here on payment confirmation
 */
router.post('/flutterwave', express.json(), async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const adapter = getAdapter('FLUTTERWAVE');
    if (!(await adapter.verifyWebhookSignature(req.body, signature))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    const event = req.body;
    if (event?.event === 'charge.completed' && event?.data?.status === 'successful') {
      const reference = event.data.tx_ref;
      // Is this a job payment or a wallet deposit?
      if (reference.startsWith('DLV-WDEP-')) {
        await confirmDeposit(reference);
      } else if (reference.startsWith('DLV-JOB-')) {
        const jobId = reference.split('-')[2]; // parse out
        await confirmJobPayment(jobId, event.data);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Flutterwave webhook error:', err);
    if (err.retryable) {
      // Transient error (concurrent handler, provider timeout, etc.) — return non-200 so
      // Flutterwave retries the delivery once the transient condition clears.
      return res.status(503).json({ error: 'Transient error — please retry' });
    }
    // Permanent error (bad reference, failed payment, etc.) — always 200 to prevent
    // infinite retries for events we cannot process regardless of how many times delivered.
    res.status(200).json({ received: true });
  }
});

async function confirmJobPayment(jobId, data) {
  const db = getDB();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return;
  if (job.status !== 'AWAITING_PAYMENT') return; // already processed

  const now = new Date();
  await db.update(jobs).set({
    status: 'POSTED',
    paymentConfirmedAt: now,
    paymentProviderRef: data.id?.toString(),
    updatedAt: now
  }).where(eq(jobs.id, jobId));

  // Create payment record
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
    paymentProvider: 'FLUTTERWAVE',
    providerTxRef: data.id?.toString()
  });

  // Broadcast to drivers
  const { findNearbyDrivers, broadcastJobToDrivers } = require('../services/geo');
  const nearby = await findNearbyDrivers(job.pickupLat, job.pickupLng, job.vehicleTypeRequired);
  if (nearby.length > 0) await broadcastJobToDrivers(job, nearby);
}

module.exports = router;
