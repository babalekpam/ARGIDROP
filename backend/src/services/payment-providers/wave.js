// Wave Money — Sénégal, Côte d'Ivoire, Mali, Burkina Faso, Gambie
// Docs: https://docs.wave.com/business
// Required env: WAVE_API_KEY, WAVE_WEBHOOK_SECRET

const axios = require('axios');
const crypto = require('crypto');
const { PaymentAdapter } = require('./base');

class WaveAdapter extends PaymentAdapter {
  get code() { return 'WAVE'; }
  get displayName() { return 'Wave'; }
  get supportedCurrencies() { return ['XOF', 'GMD']; }
  get colors() { return { bg: '#1DC8F4', fg: '#FFFFFF' }; }

  constructor() {
    super();
    this.apiKey = process.env.WAVE_API_KEY;
    this.webhookSecret = process.env.WAVE_WEBHOOK_SECRET;
    this.baseUrl = 'https://api.wave.com/v1';
  }

  isLive() { return !!this.apiKey; }

  async initiatePayment({ amount, currency, reference, redirectUrl, customerPhone }) {
    if (!this.isLive()) return this.demoInitiatePayment({ amount, currency, reference, redirectUrl });
    try {
      const res = await axios.post(`${this.baseUrl}/checkout/sessions`, {
        amount: String(amount),
        currency: currency || 'XOF',
        client_reference: reference,
        success_url: redirectUrl,
        error_url: redirectUrl,
      }, { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } });
      return { success: true, paymentUrl: res.data.wave_launch_url, providerRef: res.data.id };
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Wave initiation failed');
    }
  }

  async verifyPayment(sessionId) {
    if (!this.isLive()) return this.demoVerifyPayment(sessionId);
    try {
      const res = await axios.get(`${this.baseUrl}/checkout/sessions/${sessionId}`,
        { headers: { Authorization: `Bearer ${this.apiKey}` } });
      const data = res.data;
      return {
        success: data.payment_status === 'succeeded',
        amount: parseFloat(data.amount),
        currency: data.currency,
        providerRef: sessionId,
        providerTxId: data.transaction_id,
        paidAt: data.when_completed,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async verifyWebhookSignature(payload, signature, rawBody) {
    if (!this.isLive()) return true;
    if (!this.webhookSecret || !signature) return false;
    // Wave uses HMAC-SHA256 over raw body, header format: "t=..,v1=.."
    const m = signature.match(/v1=([a-f0-9]+)/);
    if (!m) return false;
    const computed = crypto.createHmac('sha256', this.webhookSecret).update(rawBody || JSON.stringify(payload)).digest('hex');
    return PaymentAdapter.safeCompare(computed, m[1]);
  }
}

module.exports = { WaveAdapter };
