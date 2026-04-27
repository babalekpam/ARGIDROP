// Provider registry. Adapters are instantiated lazily once.

const { FlutterwaveAdapter } = require('./flutterwave');
const { PaystackAdapter } = require('./paystack');
const { MtnMomoAdapter } = require('./mtn-momo');
const { OrangeMoneyAdapter } = require('./orange-money');
const { WaveAdapter } = require('./wave');
const { MpesaAdapter } = require('./mpesa');
const { AirtelMoneyAdapter } = require('./airtel-money');
const {
  TmoneyAdapter, FloozAdapter, MoovAdapter,
  VodafoneCashAdapter, AirtelTigoMoneyAdapter, TigoCashAdapter, FreeMoneyAdapter,
} = require('./_demo-only');

const {
  COUNTRY_PROVIDERS, getCountryConfig, listProvidersForCountry,
  defaultCurrencyForCountry, defaultProviderForCountry, listAllCountries,
} = require('../../config/payment-providers');

const _instances = {};
function _instantiate() {
  if (Object.keys(_instances).length) return;
  for (const Cls of [
    FlutterwaveAdapter, PaystackAdapter, MtnMomoAdapter, OrangeMoneyAdapter,
    WaveAdapter, MpesaAdapter, AirtelMoneyAdapter,
    TmoneyAdapter, FloozAdapter, MoovAdapter,
    VodafoneCashAdapter, AirtelTigoMoneyAdapter, TigoCashAdapter, FreeMoneyAdapter,
  ]) {
    const a = new Cls();
    _instances[a.code] = a;
  }
}

function getAdapter(code) {
  _instantiate();
  const a = _instances[code] || _instances[(code || '').toUpperCase()];
  if (!a) throw new Error(`No payment adapter for provider "${code}"`);
  return a;
}

function listAllAdapters() {
  _instantiate();
  return Object.values(_instances);
}

function listProvidersForCountryDetailed(country) {
  _instantiate();
  const cfg = getCountryConfig(country);
  // In production we hide adapters that are not connected to real provider
  // credentials. This prevents the in-app payment WebView from ever landing
  // on the demo-confirm fallback page in front of a real merchant or an
  // App Store reviewer. In dev/staging every adapter is returned so the team
  // can exercise the full flow without live keys.
  const hideDemoProviders = process.env.NODE_ENV === 'production';
  return cfg.providers
    .map(code => _instances[code])
    .filter(Boolean)
    .filter(a => !hideDemoProviders || a.isLive())
    .map(a => ({
      code: a.code,
      displayName: a.displayName,
      colors: a.colors,
      live: a.isLive(),
      supportedCurrencies: a.supportedCurrencies,
    }));
}

module.exports = {
  getAdapter,
  listAllAdapters,
  listProvidersForCountry,
  listProvidersForCountryDetailed,
  defaultCurrencyForCountry,
  defaultProviderForCountry,
  listAllCountries,
  COUNTRY_PROVIDERS,
};
