#!/usr/bin/env bash
# Submit the latest iOS production build to App Store Connect.
#
# Required env vars (from Replit Secrets):
#   EXPO_ASC_API_KEY_ID         App Store Connect API Key ID (10 chars)
#   EXPO_ASC_API_KEY_ISSUER_ID  ASC API Issuer ID (UUID)
#   EXPO_ASC_API_KEY_P8         Full contents of the .p8 private key file
#   EXPO_TOKEN                  Expo CLI auth token
#   ASC_APP_ID                  Numeric App Store Connect "Apple ID" of the app
#                               (App Store Connect -> My Apps -> ARGIDROP -> App Information)
#
# Optional:
#   APPLE_ID                    Your Apple Account email (only needed for some flows)
#   EAS_BUILD_ID                Specific build ID to submit; defaults to latest production build

set -euo pipefail

cd "$(dirname "$0")/.."

require() {
  if [ -z "${!1:-}" ]; then
    echo "ERROR: missing required env var: $1" >&2
    exit 1
  fi
}

require EXPO_ASC_API_KEY_ID
require EXPO_ASC_API_KEY_ISSUER_ID
require EXPO_ASC_API_KEY_P8
require EXPO_TOKEN
require ASC_APP_ID

CRED_DIR="$(mktemp -d -t argidrop-asc-XXXXXX)"
KEY_PATH="$CRED_DIR/AuthKey_${EXPO_ASC_API_KEY_ID}.p8"

cleanup() {
  rm -rf "$CRED_DIR"
}
trap cleanup EXIT INT TERM

umask 077
printf '%s' "$EXPO_ASC_API_KEY_P8" > "$KEY_PATH"
chmod 600 "$KEY_PATH"

EXTRA_ARGS=()
if [ -n "${EAS_BUILD_ID:-}" ]; then
  EXTRA_ARGS+=(--id "$EAS_BUILD_ID")
else
  EXTRA_ARGS+=(--latest)
fi
if [ -n "${APPLE_ID:-}" ]; then
  EXTRA_ARGS+=(--apple-id "$APPLE_ID")
fi

echo "Submitting iOS build to App Store Connect (app id: $ASC_APP_ID)..."
npx eas-cli@latest submit \
  --platform ios \
  --profile production \
  --non-interactive \
  --asc-app-id "$ASC_APP_ID" \
  --api-key-path "$KEY_PATH" \
  --api-key-id "$EXPO_ASC_API_KEY_ID" \
  --api-key-issuer-id "$EXPO_ASC_API_KEY_ISSUER_ID" \
  "${EXTRA_ARGS[@]}"
