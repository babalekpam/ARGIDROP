// Generic demo-only adapter for providers without a public sandbox API.
// Lets the app demo every market end-to-end while you negotiate merchant
// agreements directly with each operator. Once you have real credentials,
// replace the relevant subclass with a full implementation (see mtn-momo.js
// or orange-money.js as templates).

const { PaymentAdapter } = require('./base');

class DemoOnlyAdapter extends PaymentAdapter {
  // Subclasses override `_meta` only; everything else is inherited.
  get _meta() { return { code: 'DEMO', displayName: 'Demo', currencies: ['XOF'], colors: { bg: '#888', fg: '#FFF' } }; }
  get code() { return this._meta.code; }
  get displayName() { return this._meta.displayName; }
  get supportedCurrencies() { return this._meta.currencies; }
  get colors() { return this._meta.colors; }
  isLive() { return false; }
}

class TmoneyAdapter extends DemoOnlyAdapter {
  get _meta() { return { code: 'TMONEY', displayName: 'T-Money (Togocom)', currencies: ['XOF'], colors: { bg: '#005BAA', fg: '#FFFFFF' } }; }
}
class FloozAdapter extends DemoOnlyAdapter {
  get _meta() { return { code: 'FLOOZ', displayName: 'Flooz (Moov Africa)', currencies: ['XOF'], colors: { bg: '#0099CC', fg: '#FFFFFF' } }; }
}
class MoovAdapter extends DemoOnlyAdapter {
  get _meta() { return { code: 'MOOV', displayName: 'Moov Money', currencies: ['XOF', 'XAF'], colors: { bg: '#0066B3', fg: '#FFFFFF' } }; }
}
class VodafoneCashAdapter extends DemoOnlyAdapter {
  get _meta() { return { code: 'VODAFONE_CASH', displayName: 'Vodafone Cash', currencies: ['GHS'], colors: { bg: '#E60000', fg: '#FFFFFF' } }; }
}
class AirtelTigoMoneyAdapter extends DemoOnlyAdapter {
  get _meta() { return { code: 'AIRTELTIGO_MONEY', displayName: 'AirtelTigo Money', currencies: ['GHS'], colors: { bg: '#0066CC', fg: '#FFFFFF' } }; }
}
class TigoCashAdapter extends DemoOnlyAdapter {
  get _meta() { return { code: 'TIGO_CASH', displayName: 'Tigo Cash', currencies: ['XAF', 'TZS'], colors: { bg: '#1E4D8C', fg: '#FFFFFF' } }; }
}
class FreeMoneyAdapter extends DemoOnlyAdapter {
  get _meta() { return { code: 'FREE_MONEY', displayName: 'Free Money', currencies: ['XOF'], colors: { bg: '#CD1719', fg: '#FFFFFF' } }; }
}

module.exports = {
  DemoOnlyAdapter,
  TmoneyAdapter, FloozAdapter, MoovAdapter,
  VodafoneCashAdapter, AirtelTigoMoneyAdapter, TigoCashAdapter, FreeMoneyAdapter,
};
