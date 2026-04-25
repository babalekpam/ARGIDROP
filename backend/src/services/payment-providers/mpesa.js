// M-Pesa (Safaricom Daraja API) — Kenya, Tanzania (via Vodacom), DRC
// Docs: https://developer.safaricom.co.ke/docs
// Required env: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
//               MPESA_PASSKEY, MPESA_CALLBACK_URL, MPESA_ENV (sandbox|production)

const axios = require('axios');
const { PaymentAdapter } = require('./base');

class MpesaAdapter extends PaymentAdapter {
  get code() { return 'MPESA'; }
  get displayName() { return 'M-Pesa'; }
  get supportedCurrencies() { return ['KES', 'TZS', 'CDF']; }
  get colors() { return { bg: '#43B649', fg: '#FFFFFF' }; }

  constructor() {
    super();
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    this.env = process.env.MPESA_ENV || 'sandbox';
    this.baseUrl = this.env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    this._token = null;
    this._tokenExp = 0;
  }

  isLive() { return !!(this.consumerKey && this.consumerSecret && this.shortcode && this.passkey); }

  async _getToken() {
    if (this._token && Date.now() < this._tokenExp - 60_000) return this._token;
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    const res = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } });
    this._token = res.data.access_token;
    this._tokenExp = Date.now() + (parseInt(res.data.expires_in) || 3600) * 1000;
    return this._token;
  }

  async initiatePayment({ amount, currency, customerPhone, reference, description }) {
    if (!this.isLive()) return this.demoInitiatePayment({ amount, currency, reference });
    try {
      const token = await this._getToken();
      const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      const password = Buffer.from(`${this.shortcode}${this.passkey}${ts}`).toString('base64');
      const res = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(parseFloat(amount)),
        PartyA: String(customerPhone || '').replace(/\D/g, ''),
        PartyB: this.shortcode,
        PhoneNumber: String(customerPhone || '').replace(/\D/g, ''),
        CallBackURL: this.callbackUrl,
        AccountReference: reference,
        TransactionDesc: description || 'ArgiDrop',
      }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      return { success: true, paymentUrl: null, providerRef: res.data.CheckoutRequestID, externalRef: reference };
    } catch (err) {
      throw new Error(err.response?.data?.errorMessage || 'M-Pesa STK push failed');
    }
  }

  async verifyPayment(checkoutRequestId) {
    if (!this.isLive()) return this.demoVerifyPayment(checkoutRequestId);
    try {
      const token = await this._getToken();
      const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      const password = Buffer.from(`${this.shortcode}${this.passkey}${ts}`).toString('base64');
      const res = await axios.post(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      return {
        success: res.data.ResultCode === '0',
        amount: null, currency: 'KES',
        providerRef: checkoutRequestId,
        providerTxId: res.data.MpesaReceiptNumber,
        paidAt: new Date().toISOString(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async verifyWebhookSignature(payload, signature, _rawBody, pathSecret) {
    if (!this.isLive()) return true;
    // Daraja does not sign callbacks. Require the shared secret in the URL path
    // (registered as part of MPESA_CALLBACK_URL).
    const expected = process.env.WEBHOOK_PATH_SECRET;
    if (!expected || !pathSecret) return false;
    return PaymentAdapter.safeCompare(String(pathSecret), expected);
  }
}

module.exports = { MpesaAdapter };
