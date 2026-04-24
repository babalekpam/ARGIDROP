# ArgiDrop — Production Launch Guide

Everything you need to launch the Lomé pilot and expand across ECOWAS.

---

## Day-0 launch sequence

### 1. Infrastructure
- **Database:** Create free Neon PostgreSQL at [neon.tech](https://neon.tech). Copy connection string.
- **Deploy target:** Replit (primary), Render, or Railway. All support Node.js + WebSockets.
- **Redis (optional, for queue processing at scale):** [Upstash](https://upstash.com) free tier works.
- **Storage:** AWS S3 bucket in `eu-west-3` (closest to West Africa) for driver documents and package photos.

### 2. External services — get API keys
- **[Flutterwave](https://flutterwave.com):** sandbox keys for testing → live keys for launch
- **[Africa's Talking](https://africastalking.com):** SMS for recipient tracking link (request sender ID approval — takes 2-3 business days)
- **[Paystack](https://paystack.com):** only if targeting Nigeria
- **Google Maps API:** for address autocomplete + distance calculations
- **Firebase:** push notifications (optional; SMS is primary for Africa)

### 3. Configure backend
```bash
cd backend
cp .env.example .env
# Fill in: DATABASE_URL, FLW_SECRET_KEY, AT_API_KEY, JWT_SECRET (32+ chars)
npm install
npm run db:push        # creates all tables
npm run seed           # admin user + zones + platform settings
npm run dev            # or `npm start` for production
```

After seeding: **login at `/admin` with `admin@argidrop.africa` / `ArgiDropAdmin2026!`** — change the password immediately.

### 4. Configure web
```bash
cd web
cp .env.example .env
# Set VITE_API_URL=https://api.yourdomain.com/api/v1
npm install
npm run build
# Serve the dist/ folder (Replit does this automatically)
```

### 5. Configure mobile app
```bash
cd mobile
# In .env or app.json, set API_URL to your backend
npm install
npx expo start
# Scan QR with Expo Go for testing; use EAS Build for production APK/IPA
```

### 6. Flutterwave webhook
- Dashboard → Settings → Webhooks
- URL: `https://api.yourdomain.com/api/v1/webhooks/flutterwave`
- Set secret hash and put in `.env` as `FLW_WEBHOOK_SECRET_HASH`

### 7. Smoke test
- Register a business through the web app
- Login, top up wallet 20,000 XOF via Flutterwave sandbox
- Post a test delivery with `paymentMethod: 'wallet'`
- On Expo Go, register a driver, complete onboarding, upload sample documents
- From `/admin/driver-approval`, approve the driver
- Driver goes online, sees the test job, accepts
- Visit `/pickup-qr/:jobId` as the business, show QR
- Driver scans pickup QR → status becomes IN_TRANSIT
- Recipient SMS arrives with link to `/r/:code` showing delivery QR
- Driver scans delivery QR at dropoff GPS → payment releases
- Check admin `/scan-analytics` — success metrics should all be 100%

---

## Week-1 operations

### Monitoring
- Check `/admin` daily — open disputes, pending driver docs, platform health
- Check `/admin/scan-analytics` weekly — any failure rate above 10% means a real problem (bad GPS, training issue, fraud attempt)
- Check `/admin/live-map` during peak hours — see where drivers cluster, where demand exceeds supply

### Driver onboarding playbook
1. In-person sign-up events in Lomé — Avenue de la Libération, Grand Marché, Adidogomé
2. Hand out a laminated card with: "Scan QR → Register → Upload docs → Approved in 24h → Start earning"
3. Send demo MoMo payment (100 XOF) on first sign-up so they learn the flow
4. Give each new driver 3 training deliveries (you as the business) to practice pickup/delivery scans
5. Target: 20 drivers online in Lomé Central by Week 2, 50 by Week 4

### Business outreach
- Focus on: pharmacies, restaurants, small clothing shops, electronics retailers
- Value prop: "Vos clients, livrés en 45 minutes. Sans que vous embauchiez un livreur."
- Onboarding incentive: first 10 deliveries free of commission
- Target: 40 businesses in Lomé by Week 2, 100 by Week 4

### Commission adjustments
Default 18% is competitive. Adjust per zone if needed:
- Edit in admin `/admin/analytics` → Zone settings
- Or via SQL: `UPDATE zones SET commission_rate = 20 WHERE city = 'Lomé';`

---

## Known gotchas

### Africa's Talking sender ID
SMS will send with a generic ID until your sender ID is approved. Apply day 1. Until approved, messages look like `+228-generic: "Bonjour..."`. Once approved, they show as `ARGIDROP`.

### Flutterwave test phone numbers
In sandbox, use test numbers: +22890000000, +22891111111, etc. Real MoMo flow requires production keys.

### Port 25 blocking
If you self-host email via Postal on Hetzner, port 25 is blocked. Use AWS SES or SendGrid. Already configured in `.env.example`.

### GPS accuracy in dense areas
Tall buildings in Abidjan Plateau can cause GPS errors of 100m+. The 200m pickup tolerance / 150m delivery tolerance handles this. If you see high GPS failure rates in specific zones, increase tolerance for that zone only.

### Driver trust score
Starts at 100. Decreases for: cancelled jobs after accepting (-10), missed pickups (-15), customer complaints (-5). Below 50 → suspended. Visible in admin `/drivers`.

---

## Scaling checklist

### At 50 active drivers in one city
- Move from Replit to a dedicated VPS (Hetzner CX22 is perfect, $5/mo)
- Add Redis for job broadcasting queue
- Enable CDN for static assets (Cloudflare)

### At 500 active drivers
- Split backend into: API + Socket + Queue workers
- Add read replica on Neon
- Move documents from base64 in DB to S3 + CloudFront
- Add rate limiting per user (already scaffolded in `server.js`)

### At 5,000 active drivers / 50k deliveries a month
- Apply for your own PSP license in target country (currently using Flutterwave's)
- Direct integrations with MTN MoMo + Wave to skip aggregator fees (saves 0.5% of GMV)
- Add fraud detection ML model using `qr_scan_events` training data
- Multi-region database (Neon → AWS RDS multi-AZ)

---

## Regulatory compliance

### Togo / UEMOA (your pilot)
- BCEAO regulates payments across 8 francophone countries
- **Your AYAEL Remittance license (Côte d'Ivoire) covers ECOWAS cross-border payments** — this is a strategic moat
- No separate PSP registration needed while using Flutterwave as aggregator

### Nigeria
- CBN requires PSP license for holding merchant funds
- Use Paystack partnership until you exceed 10M NGN monthly GMV
- Then apply for your own Payment Service Solution Provider license (~12 months, ₦5M capital)

### Data protection
- Store driver documents encrypted (S3 server-side encryption enabled in `.env`)
- Never log payment details or full MoMo numbers
- Driver locations persist 30 days then archive (GDPR/NDPR compliance)

---

## Support runbook

### Driver can't scan pickup QR
1. Check the job status in `/admin/jobs/:id` — must be MATCHED
2. Check driver's GPS — if >200m from pickup, they need to move closer
3. Check pickup code TTL — expires 2h after driver accepts; if expired, cancel and re-post

### Business's payment won't confirm
1. Check Flutterwave dashboard for the transaction
2. If successful there but not in ArgiDrop, check webhook logs: `/admin/webhooks-log`
3. Manually confirm via admin `POST /admin/jobs/:id/confirm-payment`

### Driver payment missed
1. Check `payments` table, status should be RELEASED after delivery
2. If stuck at HELD, check Flutterwave payout API errors
3. Retry via admin `POST /admin/payments/:id/retry-payout`
4. Worst case: manually pay driver via MoMo and mark payment as RELEASED

---

## What to build next (post-launch)

### Month 2
- Multi-stop deliveries (already scaffolded in `jobStops` table)
- Business subscription tiers (Pro $49, Enterprise $299)
- Driver Elite ($19/mo for priority job access)

### Month 3
- Cross-border deliveries (Togo → Ghana) using AYAEL license
- Insurance premium ($1.99-$9.99 per delivery)
- White-label API for grocery chains (Phase 3)

### Month 6
- Direct MoMo integrations (MTN, Orange, Wave) to bypass aggregator
- ML-based fraud detection on `qr_scan_events`
- Predictive driver allocation (place drivers where demand will spike)

---

## Contact for operational questions
**ARGILETTE LLC** — Founder: Abel Lekpam Nkawula
Email: abel@argilette.co

Built with ❤️ in St. Louis for West Africa.
