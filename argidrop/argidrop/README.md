# ARGIDROP — B2B Delivery Marketplace

> "Business moves. ARGIDROP delivers."

An Uber-like platform for B2B last-mile delivery. Businesses post delivery jobs with a price, verified nearby drivers accept and complete them, businesses track live.

## 🗂 Project Structure
```
argidrop/
├── backend/          # Node.js + Express + PostgreSQL API
├── web/              # React business dashboard + admin panel  
└── mobile/           # React Native Expo driver app
```

## 🚀 Quick Start

### Backend
```bash
cd backend
cp .env.example .env      # Fill in all values
npm install
npm run db:push           # Push schema to Neon.tech
npm run dev               # Start on :5000
```

### Web Dashboard
```bash
cd web
cp .env.example .env
npm install
npm run dev               # Start on :3000
```

### Mobile App (Driver)
```bash
cd mobile
cp .env.example .env
npm install
npx expo start            # Scan QR with Expo Go
```

## 🔑 Key Services Needed
- **Database**: Neon.tech (free PostgreSQL) → `DATABASE_URL`
- **Payments**: Stripe (escrow + Connect for driver payouts) → `STRIPE_SECRET_KEY`
- **Push Notifications**: Firebase FCM → `FCM_SERVER_KEY`
- **SMS**: Twilio → `TWILIO_ACCOUNT_SID` (Africa's Talking as fallback)
- **Email**: SendGrid → `SENDGRID_API_KEY`
- **Storage**: AWS S3 or Cloudflare R2 → `AWS_ACCESS_KEY_ID`
- **Cache/Queues**: Upstash Redis (free) → `REDIS_URL`

## 🎯 Core Flow
1. Business posts delivery job with price + addresses
2. Nearby verified drivers get push notification + socket alert
3. Driver accepts → business notified → driver navigates to pickup
4. Driver photos package at pickup → recipient gets SMS tracking link
5. Driver delivers → photo proof + GPS timestamp → business confirms
6. Payment auto-releases to driver (minus 18% platform fee) after 1 hour

## 👤 User Roles
- **BUSINESS** — Posts jobs, tracks deliveries, manages invoices
- **DRIVER** — Goes online, accepts jobs, confirms pickup/delivery
- **ADMIN** — Verifies drivers, resolves disputes, views analytics

## 💰 Revenue Model
- 18% commission on every delivery
- Driver receives 82% via Stripe Connect instant payouts
- Optional insurance premium ($1.99), surge pricing, business subscriptions

## 🌍 West Africa / ECOWAS Phase
- Flutterwave integration for XOF/GHS/NGN payments
- Africa's Talking SMS for francophone markets
- Multi-currency (54 African currencies)
- Togolese market pilot (Phase 3)

## 📱 Admin Access
After setup, create admin account:
```sql
UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE email = 'your@email.com';
```

Then visit: https://your-domain.com/admin

---
Built by **ARGILETTE LLC** · St. Louis, MO
