#!/usr/bin/env bash
# Submit the latest iOS production build to App Store Connect.
#
# Required env vars (from Replit Secrets):
#   EXPO_ASC_API_KEY_ID         App Store Connect API Key ID (10 chars)
#   EXPO_ASC_API_KEY_ISSUER_ID  ASC API Issuer ID (UUID)
#   EXPO_ASC_API_KEY_P8         Full contents of the .p8 private key file
#   EXPO_TOKEN                  Expo CLI auth token
#
# Optional:
#   EAS_BUILD_ID                Specific build ID to submit; defaults to latest
#                               production build for the iOS platform
#
# Notes:
#   * `eas submit` does NOT accept --api-key-* flags — credentials must come
#     from eas.json or these env vars (which the EAS CLI reads at submit time):
#         EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID
#     We re-export our slightly different secret names into the canonical ones.
#   * The .p8 file is materialized to a tmpdir with mode 600 and removed on exit.
#   * `ascAppId` and `appleTeamId` come from mobile/eas.json submit.production.ios.

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

CRED_DIR="$(mktemp -d -t argidrop-asc-XXXXXX)"
KEY_PATH="$CRED_DIR/AuthKey_${EXPO_ASC_API_KEY_ID}.p8"

cleanup() {
  rm -rf "$CRED_DIR"
}
trap cleanup EXIT INT TERM

umask 077
printf '%s' "$EXPO_ASC_API_KEY_P8" > "$KEY_PATH"
chmod 600 "$KEY_PATH"

# Translate our secret names to the env var names EAS CLI looks for.
export EXPO_ASC_API_KEY_PATH="$KEY_PATH"
export EXPO_ASC_KEY_ID="$EXPO_ASC_API_KEY_ID"
export EXPO_ASC_ISSUER_ID="$EXPO_ASC_API_KEY_ISSUER_ID"

EXTRA_ARGS=()
if [ -n "${EAS_BUILD_ID:-}" ]; then
  EXTRA_ARGS+=(--id "$EAS_BUILD_ID")
else
  EXTRA_ARGS+=(--latest)
fi

echo "Submitting iOS build to App Store Connect..."
npx eas-cli@latest submit \
  --platform ios \
  --profile production \
  --non-interactive \
  --wait \
  "${EXTRA_ARGS[@]}"
