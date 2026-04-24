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
