// Payment Adapter — abstracts payment providers behind unified interface
// Supports: Flutterwave (aggregator), direct MTN/Orange/Wave/Moov/TMoney, Stripe

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Adapter interface: every provider must implement these methods
class PaymentAdapter {
  async initiatePayment({ amount, currency, customerPhone, customerEmail, reference, description, callbackUrl, redirectUrl }) { throw new Error('Not implemented'); }
  async verifyPayment(providerRef) { throw new Error('Not implemented'); }
  async refund(providerRef, amount) { throw new Error('Not implemented'); }
  async initiatePayout({ amount, currency, recipientPhone, recipientName, reference, provider }) { throw new Error('Not implemented'); }
  async verifyWebhookSignature(payload, signature) { throw new Error('Not implemented'); }
}

// ─── FLUTTERWAVE (primary aggregator for Africa) ───
class FlutterwaveAdapter extends PaymentAdapter {
  constructor() {
    super();
    this.secretKey = process.env.FLW_SECRET_KEY;
    this.baseUrl = 'https://api.flutterwave.com/v3';
  }

  async initiatePayment({ amount, currency, customerPhone, customerEmail, reference, description, callbackUrl, redirectUrl }) {
    try {
      const res = await axios.post(`${this.baseUrl}/payments`, {
        tx_ref: reference,
        amount: parseFloat(amount),
        currency: currency || 'XOF',
        redirect_url: redirectUrl,
        customer: { email: customerEmail, phonenumber: customerPhone },
        customizations: { title: 'ArgiDrop', description },
        payment_options: 'mobilemoneyfranco,mobilemoneyghana,mobilemoneyuganda,mobilemoneyzambia,card,banktransfer'
      }, {
        headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' }
      });
      return { success: true, paymentUrl: res.data.data?.link, providerRef: reference };
    } catch (err) {
      console.error('Flutterwave initiate error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.message || 'Payment initiation failed');
    }
  }

  async verifyPayment(providerRef) {
    try {
      const res = await axios.get(`${this.baseUrl}/transactions/verify_by_reference?tx_ref=${providerRef}`, {
        headers: { Authorization: `Bearer ${this.secretKey}` }
      });
      const data = res.data.data;
      return {
        success: data?.status === 'successful',
        amount: data?.amount,
        currency: data?.currency,
        providerRef,
        providerTxId: data?.id,
        customerPhone: data?.customer?.phone_number,
        paidAt: data?.created_at
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async initiatePayout({ amount, currency, recipientPhone, recipientName, reference, provider }) {
    // provider: 'MTN' | 'ORANGE' | 'MOOV' | 'WAVE' etc
    try {
      const payoutBody = {
        account_bank: provider || 'MTN',
        account_number: recipientPhone,
        amount: parseFloat(amount),
        currency: currency || 'XOF',
        narration: 'ArgiDrop driver payout',
        reference,
        beneficiary_name: recipientName
      };
      const res = await axios.post(`${this.baseUrl}/transfers`, payoutBody, {
        headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' }
      });
      return { success: true, providerPayoutRef: res.data?.data?.id };
    } catch (err) {
      console.error('Flutterwave payout error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  async refund(providerTxId, amount) {
    try {
      const res = await axios.post(`${this.baseUrl}/transactions/${providerTxId}/refund`, { amount },
        { headers: { Authorization: `Bearer ${this.secretKey}` } });
      return { success: true, refundRef: res.data?.data?.id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async verifyWebhookSignature(payload, signature) {
    return signature === process.env.FLW_WEBHOOK_SECRET_HASH;
  }
}

// ─── PAYSTACK (Nigeria/Ghana) ───
class PaystackAdapter extends PaymentAdapter {
  constructor() {
    super();
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseUrl = 'https://api.paystack.co';
  }

  async initiatePayment({ amount, currency, customerEmail, reference, callbackUrl }) {
    try {
      const res = await axios.post(`${this.baseUrl}/transaction/initialize`, {
        email: customerEmail,
        amount: Math.round(parseFloat(amount) * 100), // kobo
        currency: currency || 'NGN',
        reference,
        callback_url: callbackUrl
      }, {
        headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' }
      });
      return { success: true, paymentUrl: res.data.data.authorization_url, providerRef: reference };
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Paystack initiation failed');
    }
  }

  async verifyPayment(reference) {
    try {
      const res = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${this.secretKey}` } });
      const data = res.data.data;
      return {
        success: data?.status === 'success',
        amount: data?.amount / 100,
        currency: data?.currency,
        providerRef: reference,
        providerTxId: data?.id,
        paidAt: data?.paid_at
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  async initiatePayout() { throw new Error('Paystack transfers require Nigerian bank partnership setup'); }
  async refund() { return { success: false, error: 'Not implemented' }; }
  async verifyWebhookSignature() { return true; }
}

// ─── ROUTER — pick adapter by provider enum or country ───
const adapters = {
  FLUTTERWAVE: new FlutterwaveAdapter(),
  PAYSTACK: process.env.PAYSTACK_SECRET_KEY ? new PaystackAdapter() : null,
};

function getAdapter(provider = 'FLUTTERWAVE') {
  const adapter = adapters[provider] || adapters.FLUTTERWAVE;
  if (!adapter) throw new Error(`No payment adapter configured for ${provider}`);
  return adapter;
}

// Country → default provider mapping
function defaultProviderForCountry(country) {
  const map = {
    'NG': 'PAYSTACK',  // Nigeria
    'GH': 'FLUTTERWAVE',
    'TG': 'FLUTTERWAVE',
    'CI': 'FLUTTERWAVE',
    'SN': 'FLUTTERWAVE', // Wave via Flutterwave
    'BJ': 'FLUTTERWAVE',
    'BF': 'FLUTTERWAVE',
    'ML': 'FLUTTERWAVE',
    'NE': 'FLUTTERWAVE',
  };
  return map[country] || 'FLUTTERWAVE';
}

// Country → default currency
function defaultCurrencyForCountry(country) {
  const map = {
    'NG': 'NGN', 'GH': 'GHS',
    'TG': 'XOF', 'CI': 'XOF', 'SN': 'XOF', 'BJ': 'XOF', 'BF': 'XOF', 'ML': 'XOF', 'NE': 'XOF',
    'KE': 'KES', 'UG': 'UGX', 'TZ': 'TZS',
  };
  return map[country] || 'XOF';
}

module.exports = { getAdapter, defaultProviderForCountry, defaultCurrencyForCountry };
