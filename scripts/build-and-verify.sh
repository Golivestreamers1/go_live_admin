#!/usr/bin/env bash
# Build the admin with a given VITE_API_BASE_URL, serve the dist via
# `vite preview`, verify the URL is baked into the served bundle, then stop.
#
# Usage:
#   ./scripts/build-and-verify.sh                              # uses default URL
#   ./scripts/build-and-verify.sh https://example.com/api/v1   # override URL
#   API_URL=https://example.com/api/v1 ./scripts/build-and-verify.sh

set -euo pipefail

API_URL="${1:-${API_URL:-https://slothyy.com/api/v1}}"
PORT="${PORT:-4173}"
HOST="127.0.0.1"

LOCAL="$(cd "$(dirname "$0")/.." && pwd)"
cd "$LOCAL"

PREVIEW_PID=""
cleanup() {
  if [ -n "$PREVIEW_PID" ] && kill -0 "$PREVIEW_PID" 2>/dev/null; then
    echo "==> Stopping preview server (pid $PREVIEW_PID)"
    kill "$PREVIEW_PID" 2>/dev/null || true
    wait "$PREVIEW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "==> [1/4] Building dist with VITE_API_BASE_URL=$API_URL"
VITE_API_BASE_URL="$API_URL" npm run build

if [ ! -f "$LOCAL/dist/index.html" ]; then
  echo "ERROR: build did not produce dist/index.html" >&2
  exit 1
fi

echo "==> [2/4] Verifying URL is baked into bundle"
if grep -rqF "$API_URL" "$LOCAL/dist/assets/"; then
  echo "    OK: '$API_URL' found in dist/assets/"
else
  echo "ERROR: '$API_URL' NOT found in built bundle" >&2
  exit 1
fi

echo "==> [3/4] Starting preview server on http://$HOST:$PORT"
npx vite preview --port "$PORT" --host "$HOST" >/tmp/admin-preview.log 2>&1 &
PREVIEW_PID=$!

# Wait up to 15s for the server to come up.
for i in $(seq 1 30); do
  if curl -sf -o /dev/null "http://$HOST:$PORT/"; then
    break
  fi
  sleep 0.5
  if [ "$i" -eq 30 ]; then
    echo "ERROR: preview server did not respond after 15s" >&2
    cat /tmp/admin-preview.log >&2 || true
    exit 1
  fi
done

echo "==> [4/4] Probing served bundle"
INDEX_HTML="$(curl -sf "http://$HOST:$PORT/")"
JS_PATH="$(printf '%s' "$INDEX_HTML" | grep -oE '/assets/index-[^"]+\.js' | head -n1)"
if [ -z "$JS_PATH" ]; then
  echo "ERROR: could not find JS bundle reference in served index.html" >&2
  exit 1
fi
echo "    served bundle: $JS_PATH"

JS_TMP="$(mktemp)"
trap 'cleanup; rm -f "$JS_TMP"' EXIT INT TERM
curl -sf --compressed "http://$HOST:$PORT$JS_PATH" -o "$JS_TMP"
echo "    fetched $(wc -c < "$JS_TMP") bytes"
if grep -qF "$API_URL" "$JS_TMP"; then
  echo "    OK: '$API_URL' present in served bundle"
else
  echo "ERROR: '$API_URL' NOT present in served bundle" >&2
  exit 1
fi

# Probe the API itself — any HTTP response (even 401) means routing works.
API_STATUS="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$API_URL/auth/login" -X POST -H 'content-type: application/json' -d '{"login":"_probe_","password":"_probe_"}' || echo "000")"
echo "    upstream API $API_URL/auth/login -> HTTP $API_STATUS"
if [ "$API_STATUS" = "000" ]; then
  echo "WARN: upstream API unreachable" >&2
fi

echo "==> All checks passed. Stopping server."
