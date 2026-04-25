// Payment adapter base — every provider implements this interface.
// Adapters that do not have real API credentials configured fall back to
// "demo mode" so the app can be demo-ed end-to-end before merchant agreements
// are in place. Demo mode produces a hosted demo confirmation page that
// simulates the provider webhook synchronously.

const crypto = require('crypto');

class PaymentAdapter {
  // ─── identity (every subclass overrides) ───
  get code() { return 'BASE'; }
  get displayName() { return 'Payment'; }
  get supportedCurrencies() { return []; }
  get colors() { return { bg: '#1B4332', fg: '#FFFFFF' }; }

  // ─── credentials check ───
  // Returns true when real provider credentials are present. False = demo mode.
  isLive() { return false; }

  // ─── operations (subclasses override at minimum initiatePayment + verifyPayment) ───
  async initiatePayment({ amount, currency, customerPhone, customerEmail, reference, description, callbackUrl, redirectUrl }) {
    return this.demoInitiatePayment({ amount, currency, reference, redirectUrl });
  }

  async verifyPayment(providerRef) {
    return this.demoVerifyPayment(providerRef);
  }

  async refund(providerRef, amount) {
    return { success: true, refundRef: `demo-refund-${Date.now()}`, demo: true };
  }

  async initiatePayout({ amount, currency, recipientPhone, recipientName, reference }) {
    return { success: true, providerPayoutRef: `demo-payout-${Date.now()}`, demo: true };
  }

  // signature: header value (HMAC providers)
  // rawBody:   raw POST body buffer (HMAC providers)
  // pathSecret: tail segment of the webhook URL (unsigned providers like MTN/M-Pesa/Orange/Airtel)
  async verifyWebhookSignature(payload, signature, rawBody, pathSecret) {
    if (!this.isLive()) return true; // demo mode accepts any signature
    return false; // subclass must implement
  }

  // ─── demo helpers (used by adapters when no credentials) ───
  demoInitiatePayment({ amount, currency, reference, redirectUrl }) {
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const params = new URLSearchParams({
      provider: this.code,
      reference,
      amount: String(amount),
      currency: currency || 'XOF',
      redirect: redirectUrl || ''
    });
    return {
      success: true,
      demo: true,
      paymentUrl: `${baseUrl}/api/v1/payments/demo/confirm?${params.toString()}`,
      providerRef: reference
    };
  }

  demoVerifyPayment(providerRef) {
    return {
      success: true,
      demo: true,
      amount: null,
      currency: null,
      providerRef,
      providerTxId: `demo-tx-${providerRef}`,
      paidAt: new Date().toISOString()
    };
  }

  // Constant-time string compare for webhook signatures.
  static safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

module.exports = { PaymentAdapter };
