# ArgiDrop — B2B Delivery Marketplace

Built by ARGILETTE LLC · abel@argilette.co

## Overview

ArgiDrop is a B2B delivery marketplace and merchant listing platform for West Africa (ECOWAS), launching in Lomé, Togo. It connects merchants with verified drivers using a triple QR verification system.

## Architecture

```
argidrop/
├── backend/   Node.js + Express + Drizzle ORM + PostgreSQL + Socket.IO  (port 3000)
├── web/       React + Vite + Tailwind CSS (port 5000) — business dashboard + admin
└── mobile/    React Native Expo — driver app
```

## Running Services

- **Backend API**: workflow `Backend API` → `cd backend && npm run dev` → port 3000
- **Web Frontend**: workflow `Start application` → `cd web && npm run dev` → port 5000 (webview)

## Database

- Replit built-in PostgreSQL (DATABASE_URL set automatically)
- ORM: Drizzle ORM (drizzle-orm/node-postgres with `pg` driver)
- Schema: `backend/src/schema/index.js` — 25+ tables
- Push schema: `cd backend && npm run db:push`

## Key Environment Variables (set in Replit Secrets/Env)

- `JWT_SECRET`, `JWT_REFRESH_SECRET` — auth tokens (set as secrets)
- `PORT=3000` — backend port
- `NODE_ENV=development`
- `PLATFORM_COMMISSION=18`
- `DEFAULT_CURRENCY=XOF`, `DEFAULT_COUNTRY=TG`
- Optional: `FLW_SECRET_KEY`, `AT_API_KEY`, `FCM_SERVER_KEY`, `SENDGRID_API_KEY`, `REDIS_URL`, `GOOGLE_MAPS_API_KEY`

## Seeded Data

- Admin account: `admin@argidrop.africa` / `Admin123!`
- Lomé Centre zone (center: 6.1319, 1.2228, radius 25km)
- Delivery pricing: base=500 XOF, 150/km, min=800 XOF, EXPRESS×1.3, INSTANT×1.8

## Key Business Logic

- 18% commission on completed deliveries
- Triple QR chain: Payment → Pickup → Delivery
- Pricing engine: `(baseFare + perKmRate×km + surcharges) × urgency × surge`
- Driver earns ~82% of delivery fee (platform keeps 18%)
- Merchant tiers: FREE (5 photos), STANDARD (20), PREMIUM (50), PRO (unlimited)

## Bug Fixes Applied

1. **Database driver**: Replaced Neon-specific `@neondatabase/serverless` with standard `pg` + `drizzle-orm/node-postgres` for Replit PostgreSQL compatibility
2. **Drizzle config**: Fixed `dialect` → `driver: 'pg'` and `connectionString` for drizzle-kit v0.20
3. **db:push script**: Fixed command from `push` to `push:pg` for the installed drizzle-kit version
4. **Vite config**: Changed port 5173→5000 (webview port), added `host: '0.0.0.0'` and `allowedHosts: true` for Replit preview
5. **Backend port**: Changed to 3000 (console workflow) so web can occupy 5000 (webview)
6. **Web proxy**: Updated proxy target from `localhost:5000` → `localhost:3000`

## SMS / Notifications

- Primary SMS: Africa's Talking (`AT_API_KEY`, `AT_USERNAME=sandbox`, `AT_SENDER_ID=ARGIDROP`)
- Fallback SMS: Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`)
- Push: Firebase FCM (`FCM_SERVER_KEY`)
- Email: SendGrid (`SENDGRID_API_KEY`)

## Payment Integrations

- Flutterwave (primary, francophone Africa)
- Paystack (Nigeria)
- Stripe (international/enterprise)

## Maps (MapTiler)

- Library: `maplibre-gl@^4.7.0` (web)
- Provider: MapTiler — style `streets-v2`, key from `VITE_MAPTILER_KEY` (Replit secret)
- Reusable components:
  - `web/src/components/MapView.jsx` — wraps maplibre-gl: markers, route polylines, click handler, `fitToMarkers`. Reacts to `center`/`zoom` prop changes via `easeTo`. Renders a graceful fallback message when WebGL is unavailable.
  - `web/src/components/AddressPicker.jsx` — MapTiler geocoding (country=tg, proximity=Lomé) with debounced search, AbortController-based request sequencing, click-to-place pin via reverse geocoding.
- Call sites: `pages/business/PostJob.jsx` (pickup + dropoff steps), `pages/business/DeliveryTracking.jsx` (live driver via socket `driver:location_update`), `pages/admin/LiveMap.jsx` (active drivers + active jobs).
- Note: the Replit preview/test browser has no WebGL; maps render the WebGL fallback there but work in real user browsers.

## Mobile Driver App (Expo)

- **Unified app** — single Expo binary serves both Driver and Merchant roles. `RootNavigator.js` mounts `DriverTabs` or `MerchantTabs` based on `user.role` from `AuthContext`. New users land on `RoleSelectScreen`.
- Driver screens: auth, KYC, driver dashboard, jobs (browse → bid → accept → pickup → delivery → proof → rating), earnings, support.
- Merchant screens: register → onboarding (company info) → KYC (BUSINESS_LICENSE + GOVT_ID_FRONT + SELFIE_WITH_ID required, optional PROOF_OF_ADDRESS) → pending-review → tabs (Home / History / NewDelivery / More).
- Maps: `mobile/src/components/MapView.js` — WebView wrapping maplibre-gl JS + MapTiler tiles. No native map module / Google key required (works in Expo Go). Reads key from `EXPO_PUBLIC_MAPTILER_KEY` env or `app.json` extra. Uses a postMessage bridge with a `ready` handshake; pending state is queued and flushed on map load. Updates markers, center, zoom, and the user-location dot dynamically without rebuilding HTML.
- Assets: placeholder PNGs in `mobile/assets/` (icon, adaptive-icon, splash, notification-icon, favicon) so Expo can boot without missing-file crashes.
- `mobile/app.json`: removed broken EAS placeholder, added iOS Info.plist permissions for camera/location, exposes `extra.maptilerKey`.
- Post-delivery flow: ScanQRScreen → ProofOfDelivery → RateDelivery (skips ProofOfDelivery if business doesn't require photo).

## Driver Payouts (M2)

Drivers are NOT paid per delivery. Each completed delivery credits `drivers.pendingEarnings` (an intra-shift balance). Drivers cash out at end-of-shift (PIN-gated) or via a nightly cron sweep at 23:59. We never accumulate driver money long-term.

- **Schema** (drivers table): `payoutPinHash` (bcrypt), `payoutPhone`, `payoutPinSetAt`, `pendingEarnings` (decimal), `isOnShift` / `shiftStartedAt` / `shiftEndedAt`. Plus a new `driver_payouts` table (one row per disbursement attempt) with `status` ∈ {SUCCESS, PENDING, FAILED, PROCESSING} and `trigger` ∈ {END_SHIFT, NIGHTLY_AUTO, ADMIN_MANUAL}.
- **Disbursement abstraction** (`backend/src/services/payout.js`): `pickDisbursementProvider(country)` routes to a real provider when configured, otherwise to `BANK_TRANSFER` (the MANUAL fallback that creates a `PENDING` payout row + `MANUAL-XXX` reference for the admin to process). Real provider adapters drop into `services/payment-providers/<name>/disburse.js`.
- **Endpoints** (under `/api/v1/drivers/`, all role-gated, PIN routes rate-limited): `GET /payout-status`, `POST /payout-pin` (set/change), `POST /payout-pin/reset-request` + `POST /payout-pin/reset` (OTP flow), `POST /shift/start`, `POST /shift/end` (PIN required), `GET /payouts` (history).
- **Going online** requires APPROVED status + PIN+phone configured + on-shift. Both `PATCH /online` and legacy `PATCH /online-status` enforce this.
- **`processEndShiftPayout`** is race-safe: wraps everything in a transaction with `SELECT ... FOR UPDATE` on the driver row, atomically zeroes `pendingEarnings` before disbursement, re-credits on FAILED.
- **`releasePayment`** (`services/payment.js`) is idempotent: uses an atomic conditional `UPDATE ... WHERE status='HELD' RETURNING *` to claim the transition; only the winner credits driver earnings + completes the job.
- **Nightly cron** (`backend/src/jobs/nightly-payouts.js`) scheduled at 23:59 server time via `node-cron`. Sweeps any driver with `pendingEarnings > 0` and a `payoutPhone`, runs `processEndShiftPayout` with trigger `NIGHTLY_AUTO`.
- **Mobile screens**: `PayoutPinSetupScreen` (4–6 digit PIN + payout phone, with current-PIN check on change and OTP-based reset), `EndShiftScreen` (PIN keypad authorizes cash-out, handles SUCCESS/PENDING/FAILED + zero-balance), `EarningsScreen` (pending balance hero + lifetime stats + payout history), `HomeScreen` (pending earnings widget surfaces "End shift" CTA when balance > 0; online toggle now starts a shift first and reverts on failure with a nudge to set up PIN).

## Proof of Delivery

- Schema: `jobs.deliveryProofUrl` (text, nullable).
- Endpoint: `POST /api/v1/jobs/:id/proof` (driver-only, multer single `photo` field). Validates: job exists, requesting driver owns the job, job is `DELIVERED`/`COMPLETED`, no proof already on file. Stores via `uploadFile()` (returns placeholder URL when `AWS_S3_BUCKET` unset).

## Backend Query Filters

- `GET /api/v1/jobs` accepts `status=ACTIVE` as a UI shorthand → expands to `IN (MATCHED, IN_TRANSIT)` (the only enum-valid in-progress states). Role + status conditions are combined with `and(...)` in a single `.where()` so role scoping isn't dropped.

## Security: Accepted Residual Risk

After the dependency hardening pass, the backend retains 3 lodash advisories (1 high + 2 moderate, all flavors of GHSA-r5fr-rjxr-66jc / GHSA-f23m-r3pf-42rh / GHSA-xxjr-mmjv-4gpg). These are **formally accepted as residual risk** because:

1. lodash 4.x has no patched version — the GitHub Security Advisories list these as unfixed for the entire 4.x line, and lodash 5 has never been released.
2. lodash is a required transitive of `bull` (job queue) and `express-validator` (request validation), both already at their latest published versions.
3. Eliminating it would require migrating the queue to BullMQ and replacing the validator — a multi-week refactor outside the scope of dependency hygiene.
4. The vulnerable surfaces are `_.template` (we never call `_.template`) and `_.unset` / `_.omit` with attacker-controlled property paths (we never pass user input as a path argument anywhere). Exploitability in our codebase is effectively zero.

If/when lodash gets a patch or we migrate to BullMQ + Zod/manual validation, this section can be removed.

## Runtime Requirements (post-upgrade)

- **Node.js >= 20.19** (required by Vite 7 in the web app build step).
- npm overrides are used in all three workspaces to pin transitives — make sure to use npm 8.3+ (default with Node 18+).
