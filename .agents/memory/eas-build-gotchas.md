---
name: EAS build gotchas from Replit
description: Why EAS builds fail when launched from a Replit workspace, and the working launch recipe.
---

## Lockfile poisoned by Replit package firewall
`npm install` inside Replit writes `resolved` URLs like `http://package-firewall.replit.local/npm/...` into `package-lock.json`. On EAS builders `npm ci` then dies — either `EALLOWREMOTE` (npm 12) or a silent crash "Exit handler never called!" (npm 10/11), which surfaces as an "Install dependencies" or "Read app config" (expo package not found) failure.
**Fix:** after regenerating the lockfile, run `sed -i 's|http://package-firewall.replit.local/npm|https://registry.npmjs.org|g' package-lock.json` before uploading a build.
**How to apply:** any time mobile deps change and an EAS build follows.

## Launch recipe
- EAS CLI must run detached or it dies with the shell: `setsid nohup npx eas build ... > /tmp/log 2>&1 < /dev/null & disown`.
- Env needed: `EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 EAS_BUILD_NO_EXPO_GO_WARNING=true` (fingerprint step hangs forever in Replit; Expo Go warning stalls output).
- Poll status/logs via GraphQL `api.expo.dev` with `Bearer $EXPO_TOKEN`: `builds.byId { status error { message } logFiles artifacts { buildUrl } }`; log files are NDJSON with `phase` and `msg` fields.

## Expo SDK 57 web white screen
A single module-level throw (e.g. `import * as Camera from 'expo-camera'` → "Cannot set property default of #<Object> which has only a getter") kills the whole Metro web bundle with a blank white page and NO browser console error — the error only appears in the Metro workflow logs ("Web ERROR ..."). Check Metro logs first for white screens; use named imports from expo packages.
