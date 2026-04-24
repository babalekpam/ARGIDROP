# ARGIDROP Setup Guide

## 1. Database (Neon.tech — free)
1. Sign up at https://neon.tech
2. Create project → copy `DATABASE_URL` connection string
3. Paste into `backend/.env`

## 2. Backend Deploy (Replit)
1. Create new Replit from Node.js template
2. Upload `backend/` folder contents
3. Add all environment variables from `.env.example` to Replit Secrets
4. Run: `npm install && npm run db:push && npm start`
5. Copy Replit URL — you'll need it for web/mobile

## 3. Web Dashboard Deploy (Replit)
1. Create another Replit
2. Upload `web/` folder contents
3. Set Secret `VITE_API_URL` to your backend Replit URL + `/api/v1`
4. Run: `npm install && npm run dev`

## 4. Mobile App (Local + Expo)
```bash
cd mobile
npm install
# Set EXPO_PUBLIC_API_URL in .env
npx expo start
```
Scan QR with Expo Go on your phone.

## 5. Create Admin User
After registering normally, run in Neon SQL Editor:
```sql
UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE email = 'your@email.com';
```

## 6. Production Services Setup
- **Stripe**: stripe.com → get keys → enable Connect for driver payouts
- **Firebase**: console.firebase.google.com → Project Settings → Cloud Messaging → Server key
- **Twilio**: twilio.com → buy phone number
- **SendGrid**: sendgrid.com → API key → verify sender domain
- **AWS S3**: Create bucket → IAM user with S3 access → keys
- **Upstash Redis**: upstash.com → free Redis instance
- **Google Maps**: console.cloud.google.com → enable Maps JS API + Places API

## 7. Stripe Webhook
After deploying backend, add webhook in Stripe Dashboard:
- Endpoint: `https://your-backend-url.replit.app/api/v1/payments/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET` env var

## 8. Go Live Checklist
- [ ] Database migrated (`npm run db:push`)
- [ ] Admin user created
- [ ] Stripe in live mode
- [ ] FCM configured for push notifications
- [ ] SMS provider working (Twilio or AT)
- [ ] S3 bucket created for uploads
- [ ] Admin panel accessible at /admin
- [ ] Test complete flow: Post job → Accept → Deliver → Payment release
