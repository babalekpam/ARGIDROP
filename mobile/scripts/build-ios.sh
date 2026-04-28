#!/usr/bin/env bash
# Trigger an iOS production build on EAS.
#
# Required env vars (from Replit Secrets):
#   EXPO_TOKEN                  Expo CLI auth token
#   EXPO_ASC_API_KEY_ID         App Store Connect API Key ID
#   EXPO_ASC_API_KEY_ISSUER_ID  ASC API Issuer ID (UUID)
#   EXPO_ASC_API_KEY_P8         Full contents of the .p8 private key file
#
# The ASC API key lets EAS auto-provision the iOS distribution certificate
# and provisioning profile in non-interactive mode (otherwise you have to
# run the build interactively the first time so EAS can prompt for Apple
# credentials). The .p8 is materialized to a tmp dir with mode 600 and
# removed on exit.

set -euo pipefail
cd "$(dirname "$0")/.."

require() {
  if [ -z "${!1:-}" ]; then
    echo "ERROR: missing required env var: $1" >&2
    exit 1
  fi
}

require EXPO_TOKEN
require EXPO_ASC_API_KEY_ID
require EXPO_ASC_API_KEY_ISSUER_ID
require EXPO_ASC_API_KEY_P8
# Apple ID + app-specific password are needed for the FIRST iOS build so EAS
# can generate the distribution certificate / provisioning profile against
# Apple Developer in non-interactive mode. The ASC API key is for App Store
# Connect operations (submit), not Developer Portal cert generation.
require EXPO_APPLE_ID
require EXPO_APPLE_APP_SPECIFIC_PASSWORD

CRED_DIR="$(mktemp -d -t argidrop-asc-XXXXXX)"
KEY_PATH="$CRED_DIR/AuthKey_${EXPO_ASC_API_KEY_ID}.p8"

cleanup() { rm -rf "$CRED_DIR"; }
trap cleanup EXIT INT TERM

umask 077
printf '%s' "$EXPO_ASC_API_KEY_P8" > "$KEY_PATH"
chmod 600 "$KEY_PATH"

# Canonical EAS env var names so `eas build` can talk to App Store Connect.
export EXPO_ASC_API_KEY_PATH="$KEY_PATH"
export EXPO_ASC_KEY_ID="$EXPO_ASC_API_KEY_ID"
export EXPO_ASC_ISSUER_ID="$EXPO_ASC_API_KEY_ISSUER_ID"

# Apple ID auth for Developer Portal cert/profile provisioning in CI mode.
# EAS reads EXPO_APPLE_ID + EXPO_APPLE_PASSWORD; the latter accepts an
# app-specific password (the Apple ID account must have 2FA enabled, which
# is mandatory for new accounts anyway).
export EXPO_APPLE_PASSWORD="$EXPO_APPLE_APP_SPECIFIC_PASSWORD"

# Suppress the "you're using Expo Go" warning — we know, this is a managed
# workflow build.
export EAS_BUILD_NO_EXPO_GO_WARNING=true

echo "Starting iOS production build on EAS..."
npx eas-cli@latest build \
  --platform ios \
  --profile production \
  --non-interactive \
  --no-wait
