#!/usr/bin/env bash
# Trigger an Android production build on EAS.
#
# Required env vars:
#   EXPO_TOKEN  Expo CLI auth token
#
# Notes:
#   * Android keystore credentials are managed by EAS (remote) and don't need
#     to be passed via env vars on each build — `eas build` will reuse the
#     keystore that was generated for versionCode 1/2.
#   * Returns immediately (--no-wait); follow the build URL printed at the end.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "ERROR: missing required env var: EXPO_TOKEN" >&2
  exit 1
fi

export EAS_BUILD_NO_EXPO_GO_WARNING=true

echo "Starting Android production build on EAS..."
npx eas-cli@latest build \
  --platform android \
  --profile production \
  --non-interactive \
  --no-wait
