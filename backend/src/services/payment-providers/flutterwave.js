// Flutterwave — pan-African aggregator. Real implementation against Flutterwave v3 API.
// Falls back to demo mode when FLW_SECRET_KEY is missing.

const axios = require('axios');
const { PaymentAdapter } = require('./base');

class FlutterwaveAdapter extends PaymentAdapter {
  get code() { return 'FLUTTERWAVE'; }
  get displayName() { return 'Card / Bank Transfer (Flutterwave)'; }
  get supportedCurrencies() { return ['XOF', 'XAF', 'NGN', 'GHS', 'KES', 'UGX', 'TZS', 'USD']; }
  get colors() { return { bg: '#F5A623', fg: '#000000' }; }

  constructor() {
    super();
    this.secretKey = process.env.FLW_SECRET_KEY;
    this.webhookSecret = process.env.FLW_WEBHOOK_SECRET_HASH;
    this.baseUrl = 'https://api.flutterwave.com/v3';
  }

  isLive() { return !!this.secretKey; }

  async initiatePayment({ amount, currency, customerPhone, customerEmail, reference, description, redirectUrl }) {
    if (!this.isLive()) return this.demoInitiatePayment({ amount, currency, reference, redirectUrl });
    try {
      const res = await axios.post(`${this.baseUrl}/payments`, {
        tx_ref: reference,
        amount: parseFloat(amount),
        currency: currency || 'XOF',
        redirect_url: redirectUrl,
        customer: { email: customerEmail, phonenumber: customerPhone },
        customizations: { title: 'ArgiDrop', description },
        payment_options: 'mobilemoneyfranco,mobilemoneyghana,mobilemoneyuganda,mobilemoneyzambia,card,banktransfer'
      }, { headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' } });
      return { success: true, paymentUrl: res.data.data?.link, providerRef: reference };
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Flutterwave initiation failed');
    }
  }

  async verifyPayment(providerRef) {
    if (!this.isLive()) return this.demoVerifyPayment(providerRef);
    try {
      const res = await axios.get(`${this.baseUrl}/transactions/verify_by_reference?tx_ref=${providerRef}`,
        { headers: { Authorization: `Bearer ${this.secretKey}` } });
      const data = res.data.data;
      return {
        success: data?.status === 'successful',
        amount: data?.amount, currency: data?.currency, providerRef,
        providerTxId: data?.id, customerPhone: data?.customer?.phone_number, paidAt: data?.created_at,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async initiatePayout({ amount, currency, recipientPhone, recipientName, reference, provider }) {
    if (!this.isLive()) return { success: true, providerPayoutRef: `demo-flw-payout-${Date.now()}`, demo: true };
    try {
      const res = await axios.post(`${this.baseUrl}/transfers`, {
        account_bank: provider || 'MTN',
        account_number: recipientPhone,
        amount: parseFloat(amount),
        currency: currency || 'XOF',
        narration: 'ArgiDrop driver payout',
        reference,
        beneficiary_name: recipientName,
      }, { headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' } });
      return { success: true, providerPayoutRef: res.data?.data?.id };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  async refund(providerTxId, amount) {
    if (!this.isLive()) return { success: true, refundRef: `demo-flw-refund-${Date.now()}`, demo: true };
    try {
      const res = await axios.post(`${this.baseUrl}/transactions/${providerTxId}/refund`, { amount },
        { headers: { Authorization: `Bearer ${this.secretKey}` } });
      return { success: true, refundRef: res.data?.data?.id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async verifyWebhookSignature(payload, signature) {
    if (!this.isLive()) return true;
    if (!this.webhookSecret || !signature) return false;
    return PaymentAdapter.safeCompare(signature, this.webhookSecret);
  }
}

module.exports = { FlutterwaveAdapter };
