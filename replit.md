# ArgiDrop — B2B Delivery Marketplace

## Overview

ArgiDrop is a B2B delivery marketplace and merchant listing platform designed for West Africa (ECOWAS), launching in Lomé, Togo. Its core purpose is to seamlessly connect merchants with a network of verified drivers, facilitating efficient and secure deliveries. The platform utilizes a unique triple QR verification system to ensure transactional integrity from payment to pickup and final delivery.

Key capabilities include:
- Merchant listing and order management.
- Driver management, including KYC, job bidding, and real-time location updates.
- Dynamic delivery pricing engine incorporating various factors.
- Robust payment and payout systems with regional integrations.
- Comprehensive notification system for SMS, push, and email.

The project aims to revolutionize the logistics and delivery landscape in West Africa by providing a reliable, transparent, and scalable solution for B2B operations.

## User Preferences

No specific user preferences were provided in the original `replit.md` file.

## System Architecture

ArgiDrop employs a monorepo structure with distinct components for its backend, web frontend, and mobile application.

**1. Technology Stack:**
    *   **Backend:** Node.js, Express, Drizzle ORM, PostgreSQL, Socket.IO.
    *   **Web Frontend (Business Dashboard & Admin):** React, Vite, Tailwind CSS.
    *   **Mobile App (Driver & Merchant):** React Native Expo.

**2. Database:**
    *   PostgreSQL is used as the primary database, integrated with Drizzle ORM for schema management and interaction.
    *   The schema is defined in `backend/src/schema/index.js` and includes over 25 tables supporting various business entities.

**3. Key Business Logic:**
    *   **Commission:** An 18% platform commission is applied to all completed deliveries.
    *   **Triple QR Chain:** A critical security feature involving QR scans at Payment, Pickup, and Delivery stages to verify transactions.
    *   **Pricing Engine:** Calculates delivery costs based on `(baseFare + perKmRate×km + surcharges) × urgency × surge`.
    *   **Merchant Tiers:** Differentiated access and features based on tiers (FREE, STANDARD, PREMIUM, PRO).
    *   **Driver Payouts:** Drivers are not paid per delivery but accumulate earnings in `pendingEarnings`, which can be cashed out at end-of-shift (PIN-gated) or via a nightly cron sweep. Payouts are race-safe using transactions with `SELECT ... FOR UPDATE`.

**4. Mobile Driver/Merchant App (Expo):**
    *   A single Expo binary serves both driver and merchant roles, with dynamic UI based on `user.role`.
    *   **Maps:** Utilizes MapTiler via `maplibre-gl` within a WebView for both web and mobile, enabling real-time location updates and address picking without native map module dependencies in Expo Go.
    *   **Post-delivery Flow:** Includes `ScanQRScreen`, `ProofOfDelivery` (optional), and `RateDelivery`.
    *   **Native Builds:** Managed via EAS (Expo Application Services) with distinct profiles for `development`, `preview`, and `production` for iOS and Android. `mobile/eas.json` uses `appVersionSource: remote` and `autoIncrement: true` so each build picks up a fresh build number from EAS without manual bumps. NPM scripts (`eas:login`, `eas:init`, `eas:build:android`, `eas:build:ios`, `eas:build:all`, `eas:submit:android`, `eas:submit:ios`) all invoke `npx --yes eas-cli@latest` so no global install is required.
    *   **Production hardening:** Root component is wrapped in `src/components/ErrorBoundary.js`. Native deep linking is configured on `NavigationContainer` (scoped to native via `Platform.OS` so it doesn't break the web preview), with prefixes `argidrop://`, `https://argidrop.com`, `https://www.argidrop.com` and routes `JobDetail: jobs/:jobId`, `Chat: chat/:jobId`, `LiveTrack: track/:token`. `app.json` declares iOS `associatedDomains`, full NSLocation/Camera/PhotoLibrary usage descriptions, `ITSAppUsesNonExemptEncryption: false`, Android `POST_NOTIFICATIONS` permission, and intent filters for `/jobs` and `/track` paths on argidrop.com (with `autoVerify: true`). Bundle id is `com.argilette.argidrop.driver` (kept stable across the Argilette/ArgiDrop rebrand).
    *   **Branded assets:** `assets/icon.png`, `assets/adaptive-icon.png`, and `assets/splash.png` are real branded artwork (cream package mark on forest-green background `#1B4332` / cream `#F7F3EB`), not placeholders.
    *   **SDK 50 dependency pinning:** `expo install --check` must pass before any EAS build. A prior `expo-device@^55.0.15` dependency in `package.json` quietly hoisted `expo-font@55.0.6` into `node_modules`, which broke Gradle on Android with `Plugin [id: 'expo-module-gradle-plugin'] was not found` and `Could not get unknown property 'release' for SoftwareComponent container` — both are symptoms of mismatched expo-modules-core (1.11.x for SDK 50) vs SDK 55 sibling packages. Fix is `npx expo install <pkg>` for each red-flagged package and re-run `expo install --check`. Do not use caret ranges (`^`) on `expo-*` packages — always use the SDK-pinned tilde version Expo recommends.
    *   **EAS build status (27 April 2026):** First successful Android binaries shipped — preview APK `https://expo.dev/artifacts/eas/5pdpn2KhS1FcAH2iMX4EL4.apk` (build `23a24e0a-9605-402d-b0d3-d33255fc9d1b`) and production AAB for Play Store `https://expo.dev/artifacts/eas/iLhzjz547A4gVUY4695ycL.aab` (build `8fda4c28-4734-4e64-95c6-fed7864c6d2a`, versionCode 2). EAS account: `argilette`, projectId `dcc37e84-6bea-4779-8213-e282b40d1716`. Account is at 86% of monthly free build credits — additional builds bill pay-as-you-go.
    *   **iOS build blocker:** Non-interactive iOS builds fail at the credentials step with `Distribution Certificate is not validated for non-interactive builds`. Apple ID + app-specific password env vars (`EXPO_APPLE_ID`, `EXPO_APPLE_APP_SPECIFIC_PASSWORD`) are sufficient for `eas submit` but **not** for first-time distribution-certificate generation when 2FA is enabled. Two unblocking paths: (a) generate an App Store Connect API key (.p8) in App Store Connect → Users and Access → Keys with Admin role, then run `eas credentials --platform ios` once interactively (or pass via `EXPO_ASC_API_KEY_PATH`/`EXPO_ASC_KEY_ID`/`EXPO_ASC_ISSUER_ID`); or (b) the user runs `eas credentials --platform ios` interactively on their own machine to bootstrap the cert into EAS, after which CI builds work non-interactively.

**5. Merchant Create-Delivery Flow:**
    *   A comprehensive mobile-first flow for merchants to post, pay for, and track deliveries.
    *   Includes `NewDeliveryScreen` for order details and dynamic pricing quotes, `MapPickerScreen` for location selection, `PaymentSheetScreen` for payment processing, `PickupQRScreen` for driver matching and QR display, and `LiveTrackScreen` for real-time delivery monitoring.
    *   **Socket Integration:** Emits real-time updates for `job:matched`, `job:picked_up`, `job:delivered` to `business:${businessId}` rooms, and `job:status_change`, `driver:location_update` to `job:${jobId}` rooms.

**6. Proof of Delivery:**
    *   Drivers can upload a photo as proof of delivery via a dedicated endpoint, which is stored and associated with the job.

**7. Backend Query Filters:**
    *   The API supports flexible querying, such as filtering jobs by `status=ACTIVE`, which intelligently expands to include `MATCHED` and `IN_TRANSIT` states.

**8. Legal & Marketing Web Pages:**
    *   `web/src/pages/Privacy.jsx` and `web/src/pages/Terms.jsx` are substantive plain-language legal documents (12 and 15 sections respectively, ECOWAS/Togo-aware, dated 27 April 2026) wired as React Router routes `/privacy` and `/terms`. Both URLs are listed in `web/public/sitemap.xml`. These satisfy iOS App Store and Google Play submission requirements for a public privacy policy and terms of service URL.
    *   Contact emails referenced: `privacy@argidrop.com`, `support@argidrop.com`, `legal@argidrop.com`, `security@argidrop.com`. Update in the page files if mailbox routing changes.

**9. Production Deployment (VPS):**
    *   The web frontend is built with `cd web && VITE_MAPTILER_KEY=… VITE_API_URL=https://argidrop.com/api/v1 VITE_SOCKET_URL=https://argidrop.com npm run build`, then the contents of `web/dist/` are deployed to `/opt/argidrop/web/dist/` on the VPS (served statically by nginx, no PM2 reload needed).
    *   Deploy command pattern (uses `VPS_SSH_HOST`, `VPS_SSH_USER`, `VPS_SSH_PASSWORD` Replit secrets — `rsync` is not available in the Replit environment, so use a tar pipe):
        ```
        SSHCMD="sshpass -e ssh -o StrictHostKeyChecking=no $VPS_SSH_USER@$VPS_SSH_HOST"
        SSHPASS="$VPS_SSH_PASSWORD" $SSHCMD "rm -rf /opt/argidrop/web/dist/*"
        tar -czf - -C web/dist . | SSHPASS="$VPS_SSH_PASSWORD" $SSHCMD "tar -xzf - -C /opt/argidrop/web/dist"
        ```
    *   The backend is in `/opt/argidrop/backend/` on the VPS, managed by PM2 — do not redeploy unless backend code changed.

## External Dependencies

The ArgiDrop platform integrates with several third-party services for critical functionalities:

**1. Payment Gateways:**
    *   **Flutterwave:** Primary for francophone Africa.
    *   **Paystack:** For Nigeria.
    *   **Stripe:** For international and enterprise transactions.

**2. Communication Services:**
    *   **Africa's Talking:** Primary SMS provider.
    *   **Twilio:** Fallback SMS provider.
    *   **Firebase Cloud Messaging (FCM):** For push notifications.
    *   **SendGrid:** For email notifications.

**3. Mapping Services:**
    *   **MapTiler:** Provides map tiles and geocoding services, utilized with `maplibre-gl` for all map-related functionalities across web and mobile platforms.

**4. Other Integrations:**
    *   **Redis:** For caching and potentially other data storage needs.
    *   **Google Maps API:** Optional, likely for specific mapping features or integrations not covered by MapTiler.
    *   **Bull:** A job queue library for background processing (e.g., nightly payouts).
    *   **node-cron:** For scheduling cron jobs like nightly payouts.