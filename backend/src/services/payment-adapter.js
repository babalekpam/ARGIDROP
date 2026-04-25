// Backwards-compatible shim. The real adapters now live in
// backend/src/services/payment-providers/. Existing callers that import
// { getAdapter, defaultProviderForCountry, defaultCurrencyForCountry } from
// this path keep working.

module.exports = require('./payment-providers');
