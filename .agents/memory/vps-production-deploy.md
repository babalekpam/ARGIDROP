---
name: ArgiDrop production VPS deployment
description: How the live argidrop.com is actually hosted and how to deploy to it
---

# ArgiDrop production = a shared Plesk VPS (NOT the Replit deployment)

`getDeploymentInfo()` reports a Replit vm deployment for argidrop.com, but the
**real live site is a self-managed Plesk VPS** reached via the `VPS_SSH_*`
secrets (root). DNS for argidrop.com / www.argidrop.com points at that VPS.
The Replit deployment is effectively not the production users hit.

The VPS is **shared/multi-tenant** — pm2 also runs cobo-api, navimed,
nevral-api, nt-fitness-api, raiz-api. Touch ONLY argidrop. Up 265+ days.

## Layout
- Backend: `/opt/argidrop/backend`, run by pm2 as **`argidrop-api`** (node 20).
- Web: backend serves the SPA statically from `/opt/argidrop/web/dist`.
- nginx `/etc/nginx/conf.d/argidrop.com.conf`: `upstream argidrop_backend ->
  127.0.0.1:3040`, TLS via letsencrypt. So everything is proxied to the backend.
- **PORT gotcha:** prod `.env` sets `PORT=3040` (server.js default is `||5000`).
  nginx upstream is **3040**. Health-check 127.0.0.1:**3040**, never 3000/5000.
  Getting this wrong makes a perfectly healthy deploy look dead.
- No git repo on the server. Deploys are file copies; they keep `*.bak`/`*.old`.

## Deploy procedure (no local rsync; use tar-over-ssh)
1. Build web locally (`cd web && npm run build`).
2. Web: `tar czf - -C web/dist .` -> remote extract to `dist.new`, then back up
   old `dist` to `dist.bak.<ts>` and swap. No restart needed (static).
3. Backend: only `server.js` + `src/` change on merges (verify package.json
   md5 matches remote -> skip `npm install`). tar those over, back up
   `server.js`/`src` to `.bak.<ts>`, overwrite in place, `pm2 restart
   argidrop-api --update-env`.
4. Verify `curl 127.0.0.1:3040/health` == 200 AND external
   `https://argidrop.com/health` == 200; roll back from the `.bak.<ts>` copies
   if not. Never `npm install`/migrate unless deps/schema actually changed.

**Never overwrite** the server's `/opt/argidrop/backend/.env` (prod secrets) or
delete server-side files (no rsync --delete).

## Consumer service activation (July 2026)
Prod `platform_settings` has `CONSUMER_POOL_BUSINESS_ID` pointing to the
"ArgiDrop Consumer Pool" business (owner user `consumer-pool@argidrop.com`,
random unusable password). Without this row, `POST /consumer/order` returns 503.
Dev uses a different pool business id — never copy ids between envs; look them
up via the settings row.
