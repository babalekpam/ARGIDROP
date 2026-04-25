// Orange Money Web Payment + B2C
// Used for: Côte d'Ivoire, Sénégal, Mali, Burkina Faso, Niger, Cameroun, RDC, RCA
// Docs: https://developer.orange.com/apis/om-webpay
// Required env (when going live):
//   ORANGE_MONEY_MERCHANT_KEY, ORANGE_MONEY_AUTH_HEADER (Basic xxx),
//   ORANGE_MONEY_CALLBACK_URL
// Falls back to demo mode otherwise.

const axios = require('axios');
const { PaymentAdapter } = require('./base');

class OrangeMoneyAdapter extends PaymentAdapter {
  get code() { return 'ORANGE_MONEY'; }
  get displayName() { return 'Orange Money'; }
  get supportedCurrencies() { return ['XOF', 'XAF', 'CDF', 'GNF']; }
  get colors() { return { bg: '#FF7900', fg: '#FFFFFF' }; }

  constructor() {
    super();
    this.merchantKey = process.env.ORANGE_MONEY_MERCHANT_KEY;
    this.authHeader = process.env.ORANGE_MONEY_AUTH_HEADER;
    this.callbackUrl = process.env.ORANGE_MONEY_CALLBACK_URL;
    this.baseUrl = 'https://api.orange.com/orange-money-webpay/dev/v1';
    this._token = null;
    this._tokenExp = 0;
  }

  isLive() { return !!(this.merchantKey && this.authHeader); }

  async _getToken() {
    if (this._token && Date.now() < this._tokenExp - 60_000) return this._token;
    const res = await axios.post('https://api.orange.com/oauth/v3/token',
      'grant_type=client_credentials',
      { headers: { Authorization: this.authHeader, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    this._token = res.data.access_token;
    this._tokenExp = Date.now() + (res.data.expires_in || 3600) * 1000;
    return this._token;
  }

  async initiatePayment({ amount, currency, reference, redirectUrl }) {
    if (!this.isLive()) return this.demoInitiatePayment({ amount, currency, reference, redirectUrl });
    try {
      const token = await this._getToken();
      const res = await axios.post(`${this.baseUrl}/webpayment`, {
        merchant_key: this.merchantKey,
        currency: currency || 'OUV', // OUV = test currency, real prod use 'XOF' etc
        order_id: reference,
        amount: parseFloat(amount),
        return_url: redirectUrl,
        cancel_url: redirectUrl,
        notif_url: this.callbackUrl,
        lang: 'fr',
        reference,
      }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      return { success: true, paymentUrl: res.data.payment_url, providerRef: res.data.pay_token || reference };
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Orange Money initiation failed');
    }
  }

  async verifyPayment(payToken) {
    if (!this.isLive()) return this.demoVerifyPayment(payToken);
    try {
      const token = await this._getToken();
      const res = await axios.get(`${this.baseUrl}/transactionstatus?order_id=${encodeURIComponent(payToken)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      return {
        success: data.status === 'SUCCESS',
        amount: parseFloat(data.amount),
        currency: data.currency,
        providerRef: payToken,
        providerTxId: data.txnid,
        paidAt: new Date().toISOString(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async verifyWebhookSignature(payload, signature, _rawBody, pathSecret) {
    if (!this.isLive()) return true;
    // Orange Money does not sign callbacks. Require a shared secret in the
    // webhook URL path (configure as part of notif_url at registration).
    const expected = process.env.WEBHOOK_PATH_SECRET;
    if (!expected || !pathSecret) return false;
    return PaymentAdapter.safeCompare(String(pathSecret), expected);
  }
}

module.exports = { OrangeMoneyAdapter };
