# ArgiDrop — Replit Deployment Prompt v2.0
# Built by ARGILETTE LLC · abel@argilette.co

You are deploying **ArgiDrop**, a B2B delivery marketplace and merchant listing platform for West Africa (ECOWAS). Production-ready codebase. Install dependencies, configure environment, push schema, get all three services running.

---

## What is ArgiDrop

- **Free to join** for merchants and drivers — zero barriers
- **18% commission** on every completed delivery — core revenue
- **10,000 XOF/month merchant fee** for marketplace listing (slides: 8K at 100+ deliveries, 6K at 300+, 5K at 500+)
- **Triple QR verification:** Payment QR → Pickup QR → Delivery QR
- **Pricing engine:** Platform calculates price automatically from distance, weight, urgency
- **Merchant marketplace:** Merchants list products with photos. FREE=5 photos, STANDARD=20, PREMIUM=50, PRO=unlimited
- **Pilot city:** Lomé, Togo · Brand: ArgiDrop by ARGILETTE LLC

---

## Project structure

```
argidrop/
├── backend/   Node.js + Express + Drizzle ORM + Neon PostgreSQL + Socket.IO
├── web/       React + Vite (port 5173) — business dashboard + admin
└── mobile/    React Native Expo — driver app
```

---

## Step 1 — Install

```bash
cd backend && npm install
cd ../web && npm install
cd ../mobile && npm install
```

---

## Step 2 — Create database

Go to **neon.tech** → free account → new project `argidrop` → copy connection string.

---

## Step 3 — Backend .env

Copy `backend/.env.example` → `backend/.env`:

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=any_random_32_chars
JWT_REFRESH_SECRET=another_random_32_chars
BACKEND_URL=https://your-backend.replit.app
WEB_URL=https://your-web.replit.app
DEFAULT_COUNTRY=TG
DEFAULT_CURRENCY=XOF
PLATFORM_COMMISSION=18
MERCHANT_MONTHLY_FEE=10000

# Flutterwave (dashboard.flutterwave.com)
FLW_PUBLIC_KEY=FLWPUBK_TEST-xxx
FLW_SECRET_KEY=FLWSECK_TEST-xxx
FLW_WEBHOOK_SECRET_HASH=any_secret

# Africa's Talking SMS (africastalking.com)
AT_API_KEY=your_key
AT_USERNAME=sandbox
AT_SENDER_ID=ARGIDROP

# Optional — S3/R2 uploads, Firebase FCM, SendGrid, Redis, Google Maps
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=eu-west-3
AWS_S3_BUCKET=argidrop-uploads
FCM_SERVER_KEY=xxx
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@argidrop.africa
REDIS_URL=redis://...
GOOGLE_MAPS_API_KEY=AIzaxxx

# GPS tolerances
PICKUP_GPS_TOLERANCE_M=200
DELIVERY_GPS_TOLERANCE_M=150
PAYMENT_CODE_TTL_MINS=15
PICKUP_CODE_TTL_MINS=120
```

---

## Step 4 — Push schema

```bash
cd backend && npm run db:push
```

Creates 25+ tables including: users, businesses, drivers, jobs, zones, payments, qr_scan_events, merchant_subscriptions, merchant_listings, listing_photos, merchant_profiles, delivery_pricing, and more.

---

## Step 5 — Bootstrap SQL

Run in Neon SQL editor:

```sql
-- 1. Generate bcrypt hash first:
-- node -e "console.log(require('bcryptjs').hashSync('YourPassword123', 10))"

-- Admin user
INSERT INTO users (id, email, phone, password_hash, role, status, first_name, last_name, email_verified, phone_verified, country, language)
VALUES (gen_random_uuid(), 'admin@argidrop.africa', '+22890000001', '$2a$10$PASTE_HASH_HERE', 'ADMIN', 'ACTIVE', 'Admin', 'ArgiDrop', true, true, 'TG', 'fr');

-- Lomé zone
INSERT INTO zones (id, name, city, country, currency, center_lat, center_lng, radius_km, commission_rate, surge_multiplier, minimum_delivery_price, is_active)
VALUES (gen_random_uuid(), 'Lomé Centre', 'Lomé', 'TG', 'XOF', 6.1319, 1.2228, 25, 18.00, 1.00, 1000.00, true);
```

Then add pricing config (get zone ID first with `SELECT id FROM zones WHERE city='Lomé'`):

```sql
INSERT INTO delivery_pricing (id, zone_id, currency, base_fare, per_km_rate, minimum_fare, maximum_fare, weight_threshold_1_kg, weight_surcharge_1, weight_threshold_2_kg, weight_surcharge_2, express_multiplier, instant_multiplier, fragile_surcharge, peak_hour_multiplier, commission_rate, is_active)
VALUES (gen_random_uuid(), 'PASTE_ZONE_ID', 'XOF', 500, 150, 800, 25000, 10, 200, 25, 500, 1.30, 1.80, 300, 1.30, 18.00, true);
```

---

## Step 6 — Start

```bash
cd backend && npm run dev    # port 5000
cd web && npm run dev        # port 5173
cd mobile && npm start       # Expo Go QR
```

Health: `curl https://your-backend.replit.app/health` → `{"status":"ok","service":"ArgiDrop API"}`

---

## Step 7 — Web .env

```env
VITE_API_URL=https://your-backend.replit.app/api/v1
VITE_SOCKET_URL=https://your-backend.replit.app
```

---

## Step 8 — Flutterwave webhook

Dashboard → Settings → Webhooks → URL: `https://your-backend.replit.app/api/v1/webhooks/flutterwave` · Hash: same as `FLW_WEBHOOK_SECRET_HASH`

---

## Full API

### Auth
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

### Pricing engine
```
POST /api/v1/pricing/quote          GPS coords → full price breakdown
GET  /api/v1/pricing/estimate       ?distanceKm=5&urgency=EXPRESS
GET  /api/v1/pricing/zones          Admin: zone pricing configs
PUT  /api/v1/pricing/zones/:zoneId  Admin: upsert zone pricing
```

Price formula: `(baseFare + perKmRate×km + weightSurcharge + fragileSurcharge) × urgencyMultiplier × surge`
Lomé: base=500 XOF, 150/km, min=800 XOF. EXPRESS×1.3, INSTANT×1.8. Peak hours×1.3.

### Jobs
```
POST /api/v1/jobs                   Create + get payment QR (price from engine)
GET  /api/v1/jobs                   List jobs (status filter)
GET  /api/v1/jobs/:id
POST /api/v1/jobs/:id/cancel
GET  /api/v1/jobs/:id/proof
POST /api/v1/jobs/:id/proof         Proof of delivery photo
```

### QR chain
```
POST /api/v1/scans/pickup           Driver at pickup, GPS 200m
POST /api/v1/scans/delivery         Driver at dropoff, GPS 150m → 82% payout
GET  /api/v1/scans/r/:deliveryCode  Public recipient page (no auth)
```

### Merchant listings
```
GET    /api/v1/listings/subscription
GET    /api/v1/listings/profile/me
PATCH  /api/v1/listings/profile/me
POST   /api/v1/listings/profile/photo
GET    /api/v1/listings/listings
POST   /api/v1/listings/listings
PATCH  /api/v1/listings/listings/:id
DELETE /api/v1/listings/listings/:id
POST   /api/v1/listings/listings/:id/photos   (enforces tier photo limit)
DELETE /api/v1/listings/photos/:photoId
PATCH  /api/v1/listings/photos/:photoId/primary
GET    /api/v1/listings/public/merchants
GET    /api/v1/listings/public/merchants/:slug
```

### Drivers
```
POST  /api/v1/drivers/onboarding
POST  /api/v1/drivers/selfie
POST  /api/v1/drivers/documents
POST  /api/v1/drivers/submit-for-review
GET   /api/v1/drivers/me
GET   /api/v1/drivers/jobs
GET   /api/v1/drivers/earnings
PATCH /api/v1/drivers/location
PATCH /api/v1/drivers/online
PATCH /api/v1/drivers/profile
```

### Wallet
```
GET  /api/v1/wallets/balance
POST /api/v1/wallets/deposit
GET  /api/v1/wallets/transactions
```

### Admin
```
GET  /api/v1/admin/dashboard
GET  /api/v1/admin/live-map
GET  /api/v1/admin/scan-analytics
GET  /api/v1/admin/drivers/pending-review
POST /api/v1/admin/drivers/:id/approve       { kycScore, kycNotes }
POST /api/v1/admin/drivers/:id/reject        { reason }
POST /api/v1/admin/drivers/:id/reject-document { docType, reason }
GET  /api/v1/admin/businesses/pending-review
POST /api/v1/admin/businesses/:id/approve
POST /api/v1/admin/businesses/:id/reject
GET  /api/v1/admin/zones
PATCH /api/v1/admin/zones/:id
GET  /api/v1/admin/users
PATCH /api/v1/admin/users/:id/status
GET  /api/v1/admin/jobs
GET  /api/v1/admin/disputes
POST /api/v1/admin/disputes/:id/resolve
```

---

## Revenue streams

| Stream | Amount | Notes |
|---|---|---|
| Delivery commission | 18% per job | Automatic |
| Merchant monthly fee | 10,000 XOF/mo base | Sliding at volume |
| Surge pricing | ×1.2–1.8 | Peak hours auto |
| Package insurance opt-in | 500–2,500 XOF | At job post |
| Instant payout fee | 500 XOF flat | Driver option |
| FX spread | 0.8–1.2% | Cross-border via AYAEL |

## Merchant photo tiers

| Tier | Monthly fee | Photos |
|---|---|---|
| FREE | 0 XOF | 5 |
| STANDARD | 10,000 XOF | 20 |
| PREMIUM | 25,000 XOF | 50 |
| PRO | 50,000 XOF | Unlimited |

## Driver KYC — 10 required documents

SELFIE · SELFIE_WITH_ID · GOVT_ID_FRONT · GOVT_ID_BACK · DRIVERS_LICENSE · VEHICLE_REGISTRATION · VEHICLE_INSURANCE · VEHICLE_PHOTO_FRONT · POLICE_CLEARANCE (< 3mo) · PROOF_OF_ADDRESS (< 3mo)

Admin review: biometric selfie comparison, 8-point checklist (0-100 KYC score), bilingual rejection reasons (FR/EN), image lightbox.

## First 48h checklist

- [ ] `npm run db:push`
- [ ] Insert admin + zone + pricing SQL
- [ ] End-to-end test: post job → pay MoMo → pickup scan → delivery scan → verify payout
- [ ] Register + approve a test driver via Expo Go + admin panel
- [ ] Set Flutterwave webhook to production URL
- [ ] Onboard first 10 drivers + 20 businesses in Lomé
- [ ] Each business: create merchant profile + min 3 product listings

---

Built by ARGILETTE LLC · St. Louis, MO · abel@argilette.co
