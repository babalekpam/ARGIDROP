// Paystack — Nigeria + Ghana. Real implementation against Paystack API.
// Falls back to demo mode when PAYSTACK_SECRET_KEY is missing.

const axios = require('axios');
const crypto = require('crypto');
const { PaymentAdapter } = require('./base');

class PaystackAdapter extends PaymentAdapter {
  get code() { return 'PAYSTACK'; }
  get displayName() { return 'Card / Bank (Paystack)'; }
  get supportedCurrencies() { return ['NGN', 'GHS', 'ZAR', 'USD']; }
  get colors() { return { bg: '#011B33', fg: '#FFFFFF' }; }

  constructor() {
    super();
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseUrl = 'https://api.paystack.co';
  }

  isLive() { return !!this.secretKey; }

  async initiatePayment({ amount, currency, customerEmail, reference, callbackUrl, redirectUrl }) {
    if (!this.isLive()) return this.demoInitiatePayment({ amount, currency, reference, redirectUrl });
    try {
      const res = await axios.post(`${this.baseUrl}/transaction/initialize`, {
        email: customerEmail,
        amount: Math.round(parseFloat(amount) * 100), // kobo / pesewa
        currency: currency || 'NGN',
        reference,
        callback_url: callbackUrl || redirectUrl,
      }, { headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' } });
      return { success: true, paymentUrl: res.data.data.authorization_url, providerRef: reference };
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Paystack initiation failed');
    }
  }

  async verifyPayment(reference) {
    if (!this.isLive()) return this.demoVerifyPayment(reference);
    try {
      const res = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${this.secretKey}` } });
      const data = res.data.data;
      return {
        success: data?.status === 'success',
        amount: data?.amount / 100, currency: data?.currency,
        providerRef: reference, providerTxId: data?.id, paidAt: data?.paid_at,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async verifyWebhookSignature(payload, signature, rawBody) {
    if (!this.isLive()) return true;
    if (!this.secretKey || !signature) return false;
    const body = rawBody || JSON.stringify(payload);
    const computed = crypto.createHmac('sha512', this.secretKey).update(body).digest('hex');
    return PaymentAdapter.safeCompare(computed, signature);
  }
}

module.exports = { PaystackAdapter };
