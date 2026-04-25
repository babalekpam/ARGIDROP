// Country → currency + ordered provider preference.
// Provider codes match adapter `code` in backend/src/services/payment-providers/.
// Order matters: first entry is the default suggested option in the UI.

const COUNTRY_PROVIDERS = {
  // ─── West Africa (XOF zone unless noted) ───
  TG: { currency: 'XOF', providers: ['TMONEY', 'FLOOZ', 'MTN_MOMO', 'ORANGE_MONEY', 'FLUTTERWAVE'] },
  CI: { currency: 'XOF', providers: ['MTN_MOMO', 'ORANGE_MONEY', 'WAVE', 'MOOV', 'FLUTTERWAVE'] },
  SN: { currency: 'XOF', providers: ['WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'FLUTTERWAVE'] },
  BJ: { currency: 'XOF', providers: ['MTN_MOMO', 'MOOV', 'FLUTTERWAVE'] },
  BF: { currency: 'XOF', providers: ['ORANGE_MONEY', 'MOOV', 'FLUTTERWAVE'] },
  ML: { currency: 'XOF', providers: ['ORANGE_MONEY', 'MOOV', 'FLUTTERWAVE'] },
  NE: { currency: 'XOF', providers: ['ORANGE_MONEY', 'MOOV', 'FLUTTERWAVE'] },
  GH: { currency: 'GHS', providers: ['MTN_MOMO', 'VODAFONE_CASH', 'AIRTELTIGO_MONEY', 'FLUTTERWAVE'] },
  NG: { currency: 'NGN', providers: ['PAYSTACK', 'FLUTTERWAVE'] },

  // ─── Central Africa (XAF zone unless noted) ───
  CM: { currency: 'XAF', providers: ['MTN_MOMO', 'ORANGE_MONEY', 'FLUTTERWAVE'] },
  CG: { currency: 'XAF', providers: ['MTN_MOMO', 'AIRTEL_MONEY', 'FLUTTERWAVE'] },
  CD: { currency: 'CDF', providers: ['ORANGE_MONEY', 'AIRTEL_MONEY', 'MPESA', 'FLUTTERWAVE'] },
  GA: { currency: 'XAF', providers: ['AIRTEL_MONEY', 'MOOV', 'FLUTTERWAVE'] },
  TD: { currency: 'XAF', providers: ['AIRTEL_MONEY', 'TIGO_CASH', 'FLUTTERWAVE'] },
  CF: { currency: 'XAF', providers: ['ORANGE_MONEY', 'FLUTTERWAVE'] },

  // ─── East Africa ───
  KE: { currency: 'KES', providers: ['MPESA', 'AIRTEL_MONEY', 'FLUTTERWAVE'] },
  UG: { currency: 'UGX', providers: ['MTN_MOMO', 'AIRTEL_MONEY', 'FLUTTERWAVE'] },
  TZ: { currency: 'TZS', providers: ['MPESA', 'AIRTEL_MONEY', 'TIGO_CASH', 'FLUTTERWAVE'] },
};

const DEFAULT_COUNTRY = 'TG';

function getCountryConfig(country) {
  return COUNTRY_PROVIDERS[country] || COUNTRY_PROVIDERS[DEFAULT_COUNTRY];
}

function listProvidersForCountry(country) {
  return getCountryConfig(country).providers;
}

function defaultCurrencyForCountry(country) {
  return getCountryConfig(country).currency;
}

function defaultProviderForCountry(country) {
  return getCountryConfig(country).providers[0];
}

function listAllCountries() {
  return Object.keys(COUNTRY_PROVIDERS);
}

module.exports = {
  COUNTRY_PROVIDERS,
  DEFAULT_COUNTRY,
  getCountryConfig,
  listProvidersForCountry,
  defaultCurrencyForCountry,
  defaultProviderForCountry,
  listAllCountries,
};
