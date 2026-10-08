#!/usr/bin/env bash
#
# run-both.sh — start ONE Metro bundler and install/launch the dev build on
# both the connected iPhone and the connected Android device at once, so both
# apps talk to the same bundler for live testing (Fast Refresh hits both).
#
#   Usage:  ./run-both.sh      (or: npm run both)
#   Stop:   Ctrl-C             (stops Metro; the apps stay installed)
#
set -uo pipefail
cd "$(dirname "$0")"

# ---- config (edit if your device / Apple team changes) ---------------------
IOS_UDID="00008120-000C051404014032"   # Priyansh's iPhone
APPLE_TEAM_ID="8FPBM37PSU"
# ----------------------------------------------------------------------------

log()  { printf '\033[1;36m▶ %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$1"; }

log "Stopping any Metro already on :8081…"
lsof -tiTCP:8081 -sTCP:LISTEN 2>/dev/null | xargs kill 2>/dev/null || true
sleep 1

log "Starting Metro (dev-client)…"
npx expo start --dev-client &
METRO_PID=$!

cleanup() { echo; log "Shutting down Metro…"; kill "$METRO_PID" 2>/dev/null || true; exit 0; }
trap cleanup INT TERM

log "Waiting for Metro to come up…"
until curl -s http://localhost:8081/status >/dev/null 2>&1; do sleep 1; done
log "Metro is up on http://localhost:8081"

# ---- iOS -------------------------------------------------------------------
if xcrun devicectl list devices 2>/dev/null | grep -q "available (paired)"; then
  log "iOS: building & installing to iPhone ($IOS_UDID)…"
  EXPO_APPLE_TEAM_ID="$APPLE_TEAM_ID" npx expo run:ios --device "$IOS_UDID" --no-bundler &
else
  warn "iOS: no paired device detected — skipping iOS."
fi

# ---- Android ---------------------------------------------------------------
ANDROID_SERIAL="$(adb devices 2>/dev/null | awk 'NR>1 && $2=="device"{print $1; exit}')"
if [ -n "$ANDROID_SERIAL" ]; then
  log "Android: building & installing to device ($ANDROID_SERIAL)…"
  ANDROID_SERIAL="$ANDROID_SERIAL" npx expo run:android --no-bundler &
else
  warn "Android: no device detected — skipping Android."
fi

log "Both builds launched. Metro logs stream below — press Ctrl-C to stop."
wait
