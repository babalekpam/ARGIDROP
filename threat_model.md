# Threat Model

## Project Overview

ArgiDrop is a B2B delivery marketplace for businesses, drivers, recipients, and platform admins. The production system consists of an Express/Node.js backend in `backend/`, a React/Vite web dashboard in `web/`, and an Expo mobile driver app in `mobile/`. The backend owns authentication, authorization, QR-scan workflows, payment initiation and webhook processing, uploads, live tracking, and database access via Drizzle ORM over PostgreSQL.

Production assumptions for this repository:
- `NODE_ENV` is `production` in deployed environments.
- Traffic is encrypted in transit by the platform's managed TLS.
- Mockup/sandbox-only surfaces are not production-reachable unless code shows they are served by the production backend.

## Assets

- **User accounts and sessions** — JWT access and refresh tokens, user identities, roles, and profile records for businesses, drivers, and admins. Compromise enables impersonation and privilege abuse.
- **Operational delivery data** — pickup/dropoff addresses, contact names and phone numbers, live driver locations, scan events, tracking tokens, and proof-of-delivery artifacts. This data reveals sensitive real-world movement and recipient information.
- **Business and driver records** — KYC documents, merchant profiles, vehicle details, ratings, wallet balances, payout accounts, and dispute records. Exposure harms both privacy and financial integrity.
- **Payment state and financial records** — held funds, wallet deposits, payout requests, provider references, commission calculations, and webhook-triggered state transitions. Tampering can redirect or prematurely release money.
- **Application secrets and integrations** — JWT signing keys, database URL, Stripe/Flutterwave secrets, SMS/email provider keys, storage credentials, and Redis credentials. Leakage can lead to full service compromise.
- **Uploaded files** — merchant photos, business verification documents, driver documents/selfies, and delivery proof images. These can contain PII and may become malware or disclosure vectors if handling is weak.

## Trust Boundaries

- **Client to backend API** — browser and mobile clients are untrusted. Every protected route must authenticate and authorize on the server.
- **Public to authenticated/admin boundaries** — public tracking and marketplace routes sit beside business, driver, and admin APIs. Sensitive data must not bleed across these boundaries.
- **Backend to PostgreSQL** — the API has broad database access. Broken authorization or unsafe query construction at the API layer can expose or modify all tenant data.
- **Backend to payment providers** — payment initialization and webhook handling cross into Stripe/Flutterwave trust domains. Callbacks must be authenticated and state transitions must be idempotent and scoped.
- **Backend to object storage** — uploads cross from untrusted user files into persistent storage. File type, naming, path construction, and access semantics matter.
- **Backend to Socket.IO clients** — realtime rooms and events must enforce job/business ownership; authenticated connection alone is not enough.
- **Internal/dev to production boundary** — docs, assets, seed data, placeholder URLs, and local-only tooling are out of scope unless the production backend serves them or relies on them.

## Scan Anchors

- **Primary production entry point:** `backend/server.js`
- **High-risk backend areas:** `backend/src/routes/{auth,jobs,admin,track,scans,uploads,payments,webhooks}.js`, `backend/src/middleware/auth.js`, `backend/src/socket/index.js`, `backend/src/services/{qr,storage,payment,wallet}.js`
- **Public surfaces:** `/health`, `/api/v1/track/:token`, `/api/v1/scans/r/:deliveryCode`, public merchant routes in `backend/src/routes/listings.js`, SPA routes served from `web/dist`
- **Authenticated surfaces:** business, driver, wallet, upload, notification, and job APIs; Socket.IO auth and room joins
- **Admin surfaces:** `backend/src/routes/admin.js`, admin web pages under `web/src/pages/admin/`
- **Usually dev-only / lower-priority for production scans:** `attached_assets/`, `.agents/`, seed/setup docs, placeholder/mock files unless referenced by production code

## Threat Categories

### Spoofing

The application uses JWTs for HTTP and Socket.IO authentication. All protected API routes and realtime subscriptions must validate signed tokens, reject expired or malformed tokens, and derive privilege from the server-side user record rather than trusting client claims alone. Webhooks from payment providers must be authenticated before any payment or job state changes occur.

### Tampering

Businesses, drivers, and admins can mutate jobs, profiles, pricing, disputes, and payout-related records. The server must enforce ownership and role checks on every mutation, calculate security-sensitive state transitions server-side, and prevent user-controlled identifiers or references from changing resources across tenant boundaries.

### Information Disclosure

This project handles exact addresses, phone numbers, live driver coordinates, vehicle identity, KYC documents, and payment-related records. Public routes and cross-tenant authenticated routes must minimize returned data and expose only what the intended audience needs. Logs and error responses must not leak secrets, raw provider payloads, or sensitive user data.

### Denial of Service

Public and authenticated endpoints include login, tracking, uploads, QR scans, and realtime updates. The system must rate-limit abuse-prone endpoints, bound upload sizes and request payloads, and avoid letting unauthenticated or low-privilege users trigger expensive queries, excessive storage use, or unbounded push/SMS fanout.

### Elevation of Privilege

The highest-risk failures in this codebase are broken object-level authorization, broken room membership checks in realtime flows, and payment/scan workflow abuse. Users must only access jobs, payments, uploads, and admin actions they are entitled to, and public tracking mechanisms must not become alternate paths into privileged operational data.