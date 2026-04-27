#!/usr/bin/env bash
# Trigger an iOS production build on EAS.
#
# Required env vars:
#   EXPO_TOKEN  Expo CLI auth token

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "ERROR: missing required env var: EXPO_TOKEN" >&2
  exit 1
fi

echo "Starting iOS production build on EAS..."
npx eas-cli@latest build \
  --platform ios \
  --profile production \
  --non-interactive \
  --no-wait
