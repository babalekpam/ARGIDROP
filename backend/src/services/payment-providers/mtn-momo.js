// MTN Mobile Money (MTN MoMo Open API)
// Used for: Côte d'Ivoire, Bénin, Cameroun, Congo, Ghana, Ouganda
// Docs: https://momodeveloper.mtn.com/
// Required env (when going live):
//   MTN_MOMO_API_USER, MTN_MOMO_API_KEY, MTN_MOMO_SUBSCRIPTION_KEY,
//   MTN_MOMO_TARGET_ENVIRONMENT (sandbox|production), MTN_MOMO_CALLBACK_HOST
// Falls back to demo mode otherwise.

const axios = require('axios');
const crypto = require('crypto');
const { PaymentAdapter } = require('./base');

class MtnMomoAdapter extends PaymentAdapter {
  get code() { return 'MTN_MOMO'; }
  get displayName() { return 'MTN Mobile Money'; }
  get supportedCurrencies() { return ['XOF', 'XAF', 'GHS', 'UGX', 'EUR']; }
  get colors() { return { bg: '#FFCC00', fg: '#000000' }; }

  constructor() {
    super();
    this.apiUser = process.env.MTN_MOMO_API_USER;
    this.apiKey = process.env.MTN_MOMO_API_KEY;
    this.subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    this.targetEnv = process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'sandbox';
    this.callbackHost = process.env.MTN_MOMO_CALLBACK_HOST || process.env.BACKEND_URL;
    this.baseUrl = this.targetEnv === 'production'
      ? 'https://proxy.momoapi.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';
    this._token = null;
    this._tokenExp = 0;
  }

  isLive() {
    return !!(this.apiUser && this.apiKey && this.subscriptionKey);
  }

  async _getToken() {
    if (this._token && Date.now() < this._tokenExp - 60_000) return this._token;
    const auth = Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64');
    const res = await axios.post(`${this.baseUrl}/collection/token/`, null, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      },
    });
    this._token = res.data.access_token;
    this._tokenExp = Date.now() + (res.data.expires_in || 3600) * 1000;
    return this._token;
  }

  async initiatePayment({ amount, currency, customerPhone, reference, description, redirectUrl }) {
    if (!this.isLive()) return this.demoInitiatePayment({ amount, currency, reference, redirectUrl });
    try {
      const token = await this._getToken();
      const referenceId = crypto.randomUUID();
      await axios.post(`${this.baseUrl}/collection/v1_0/requesttopay`, {
        amount: String(amount),
        currency: currency || 'XOF',
        externalId: reference,
        payer: { partyIdType: 'MSISDN', partyId: String(customerPhone || '').replace(/\D/g, '') },
        payerMessage: description || 'ArgiDrop payment',
        payeeNote: reference,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': this.targetEnv,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'X-Callback-Url': `${this.callbackHost}/api/v1/webhooks/mtn-momo/${process.env.WEBHOOK_PATH_SECRET || ''}`,
          'Content-Type': 'application/json',
        },
      });
      // MTN MoMo collection is push-to-phone — no hosted URL. Customer approves on their handset.
      return { success: true, paymentUrl: null, providerRef: referenceId, externalRef: reference, mtnReferenceId: referenceId };
    } catch (err) {
      throw new Error(err.response?.data?.message || 'MTN MoMo initiation failed');
    }
  }

  async verifyPayment(referenceId) {
    if (!this.isLive()) return this.demoVerifyPayment(referenceId);
    try {
      const token = await this._getToken();
      const res = await axios.get(`${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Target-Environment': this.targetEnv,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        },
      });
      const data = res.data;
      return {
        success: data.status === 'SUCCESSFUL',
        amount: parseFloat(data.amount),
        currency: data.currency,
        providerRef: referenceId,
        providerTxId: data.financialTransactionId,
        customerPhone: data.payer?.partyId,
        paidAt: new Date().toISOString(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async initiatePayout({ amount, currency, recipientPhone, reference }) {
    if (!this.isLive()) return { success: true, providerPayoutRef: `demo-mtn-payout-${Date.now()}`, demo: true };
    // Real impl would use the disbursement product (separate subscription key) — left as a stub.
    return { success: false, error: 'MTN MoMo disbursement requires a separate API user. Configure MTN_MOMO_DISBURSE_* env.' };
  }

  async verifyWebhookSignature(payload, signature, _rawBody, pathSecret) {
    if (!this.isLive()) return true;
    // MTN MoMo Open API does not sign callbacks. We require the webhook URL
    // to carry a shared secret in the path: /api/v1/webhooks/mtn-momo/:secret.
    // Without WEBHOOK_PATH_SECRET configured, all live webhook hits are rejected.
    const expected = process.env.WEBHOOK_PATH_SECRET;
    if (!expected || !pathSecret) return false;
    return PaymentAdapter.safeCompare(String(pathSecret), expected);
  }
}

module.exports = { MtnMomoAdapter };
