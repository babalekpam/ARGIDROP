# ArgiDrop — B2B Delivery Marketplace

## Overview

ArgiDrop is a B2B delivery marketplace and merchant listing platform for West Africa (ECOWAS), launching in Lomé, Togo. It connects merchants with verified drivers for efficient and secure deliveries using a triple QR verification system for transactional integrity. The platform offers merchant and driver management, dynamic delivery pricing, robust payment and payout systems with regional integrations, and a comprehensive notification system. ArgiDrop aims to provide a reliable, transparent, and scalable logistics solution for B2B operations in West Africa.

## User Preferences

No specific user preferences were provided in the original `replit.md` file.

## System Architecture

ArgiDrop uses a monorepo architecture with a Node.js/Express/Drizzle ORM/PostgreSQL/Socket.IO backend, a React/Vite/Tailwind CSS web frontend, and a React Native Expo mobile app. The PostgreSQL database, managed by Drizzle ORM, defines over 25 tables.

Key business logic includes an 18% platform commission, a triple QR chain for transaction verification, a dynamic pricing engine considering base fare, per-kilometer rates, surcharges, urgency, and surge pricing, and merchant tiers (FREE, STANDARD, PREMIUM, PRO). Driver payouts accumulate in `pendingEarnings` and can be cashed out end-of-shift or via a nightly cron.

The mobile app, built with Expo, serves both drivers and merchants dynamically based on user roles. It uses MapTiler via `maplibre-gl` in a WebView for mapping and real-time location updates. The merchant create-delivery flow is mobile-first, supporting order posting, payment, and tracking with real-time updates via Socket.IO. Proof of delivery involves photo uploads. Backend APIs support flexible querying, such as filtering jobs by status. Legal and marketing web pages are provided for privacy and terms of service.

### Merchant settings (May 2026)

The merchant `MoreScreen` has a real backing screen for every row. Six dedicated screens live in `mobile/src/screens/merchant/Settings*.js` and are registered as Stack screens in `RootNavigator` under the `BUSINESS` branch:

- `SettingsBusinessScreen` — edits the business profile (calls `PATCH /businesses/profile`, which is a partial update — only fields actually present in the request body are written).
- `SettingsPersonalScreen`, `SettingsPasswordScreen`, `SettingsLanguageScreen` — call `PATCH /auth/me` and `POST /auth/change-password`. `PATCH /auth/me` validates `language` (must be `fr` or `en`) and rejects empty `firstName`/`lastName` with a 400.
- `SettingsSupportScreen` — opens mail, FAQ (`https://argidrop.com/aide` or `/help`), privacy, terms, and account-deletion URLs.
- `SettingsRoadmapScreen` — single reusable "Coming in 2026" page used for Team members / Catalog / Invoices, behind `route.params.feature in {team, catalog, invoices}`.

Localization uses `mobile/src/utils/i18n.js` (`t(key, lang, vars)`); `getLang(user)` reads `user.language`. Switching language calls `PATCH /auth/me` then `refreshUser()`, which now propagates errors instead of silently swallowing them.

Session revocation on password change is enforced via a `pwdAt` JWT claim. The `users.password_changed_at` column (added May 2026) is bumped by `POST /auth/change-password`, and both the auth middleware and `POST /auth/refresh` reject any token whose embedded `pwdAt` is older than the column. The change-password response returns a fresh access+refresh pair so the calling device stays signed in; every other device is logged out on its next request. Tokens issued before this feature shipped have no `pwdAt` claim and are treated as `pwdAt=0`, so they keep working until the user changes their password (then they're revoked along with everything else).

## External Dependencies

ArgiDrop integrates with the following third-party services:

*   **Payment Gateways:** Flutterwave (francophone Africa), Paystack (Nigeria), Stripe (international).
*   **Communication Services:** Africa's Talking (primary SMS), Twilio (fallback SMS), Firebase Cloud Messaging (push notifications), SendGrid (email notifications).
*   **Mapping Services:** MapTiler (map tiles and geocoding with `maplibre-gl`).
*   **Other Integrations:** Redis (caching), Bull (job queue), node-cron (scheduling).