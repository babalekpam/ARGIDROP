// Airtel Money (Airtel Africa unified API)
// Used for: Ouganda, Tanzanie, Congo, RDC, Tchad, Gabon, Kenya, Madagascar...
// Docs: https://developers.airtel.africa/
// Required env: AIRTEL_CLIENT_ID, AIRTEL_CLIENT_SECRET, AIRTEL_ENV (staging|production)

const axios = require('axios');
const { PaymentAdapter } = require('./base');

class AirtelMoneyAdapter extends PaymentAdapter {
  get code() { return 'AIRTEL_MONEY'; }
  get displayName() { return 'Airtel Money'; }
  get supportedCurrencies() { return ['XAF', 'XOF', 'KES', 'UGX', 'TZS', 'CDF', 'MGA']; }
  get colors() { return { bg: '#E40000', fg: '#FFFFFF' }; }

  constructor() {
    super();
    this.clientId = process.env.AIRTEL_CLIENT_ID;
    this.clientSecret = process.env.AIRTEL_CLIENT_SECRET;
    this.env = process.env.AIRTEL_ENV || 'staging';
    this.baseUrl = this.env === 'production'
      ? 'https://openapi.airtel.africa'
      : 'https://openapiuat.airtel.africa';
    this._token = null;
    this._tokenExp = 0;
  }

  isLive() { return !!(this.clientId && this.clientSecret); }

  async _getToken() {
    if (this._token && Date.now() < this._tokenExp - 60_000) return this._token;
    const res = await axios.post(`${this.baseUrl}/auth/oauth2/token`, {
      client_id: this.clientId, client_secret: this.clientSecret, grant_type: 'client_credentials',
    }, { headers: { 'Content-Type': 'application/json' } });
    this._token = res.data.access_token;
    this._tokenExp = Date.now() + (res.data.expires_in || 3600) * 1000;
    return this._token;
  }

  // Airtel uses ISO country codes per request; caller provides country (e.g. 'UG', 'KE', 'TZ').
  async initiatePayment({ amount, currency, customerPhone, reference, country = 'UG' }) {
    if (!this.isLive()) return this.demoInitiatePayment({ amount, currency, reference });
    try {
      const token = await this._getToken();
      const phone = String(customerPhone || '').replace(/\D/g, '');
      await axios.post(`${this.baseUrl}/merchant/v1/payments/`, {
        reference,
        subscriber: { country, currency: currency || 'UGX', msisdn: phone },
        transaction: { amount: parseFloat(amount), country, currency: currency || 'UGX', id: reference },
      }, { headers: { Authorization: `Bearer ${token}`, 'X-Country': country, 'X-Currency': currency || 'UGX', 'Content-Type': 'application/json' } });
      return { success: true, paymentUrl: null, providerRef: reference };
    } catch (err) {
      throw new Error(err.response?.data?.status?.message || 'Airtel Money initiation failed');
    }
  }

  async verifyPayment(reference, country = 'UG', currency = 'UGX') {
    if (!this.isLive()) return this.demoVerifyPayment(reference);
    try {
      const token = await this._getToken();
      const res = await axios.get(`${this.baseUrl}/standard/v1/payments/${reference}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Country': country, 'X-Currency': currency } });
      const data = res.data?.data?.transaction;
      return {
        success: data?.status === 'TS',
        amount: data?.amount, currency,
        providerRef: reference, providerTxId: data?.airtel_money_id,
        paidAt: new Date().toISOString(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async verifyWebhookSignature(payload, signature, _rawBody, pathSecret) {
    if (!this.isLive()) return true;
    // Airtel Money does not sign callbacks by default; require shared path secret.
    const expected = process.env.WEBHOOK_PATH_SECRET;
    if (!expected || !pathSecret) return false;
    return PaymentAdapter.safeCompare(String(pathSecret), expected);
  }
}

module.exports = { AirtelMoneyAdapter };
