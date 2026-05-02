#!/usr/bin/env bash
# Smoke-check backend before/after a production build (CI or local).
# Usage:
#   EXPO_PUBLIC_API_BASE_URL=https://your-backend.hf.space npm run smoke
#
# Optional: also verify GET /api/v1/weather/{id} (same URL shape as the app):
#   SMOKE_FARMER_ID=<uuid> EXPO_PUBLIC_API_BASE_URL=... npm run smoke
set -euo pipefail
BASE="${EXPO_PUBLIC_API_BASE_URL:-http://127.0.0.1:8000}"
code="$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/v1/health" || true)"
if [[ "$code" != "200" ]]; then
  echo "Health check failed: ${BASE}/api/v1/health (HTTP $code)" >&2
  exit 1
fi
echo "OK: ${BASE}/api/v1/health"

if [[ -n "${SMOKE_FARMER_ID:-}" ]]; then
  wcode="$(curl -s -o /dev/null -w "%{http_code}" \
    "${BASE}/api/v1/weather/${SMOKE_FARMER_ID}?connectivity=online&force_refresh=false" \
    -H "accept: application/json" || true)"
  if [[ "$wcode" != "200" ]]; then
    echo "Weather check failed: ${BASE}/api/v1/weather/... (HTTP $wcode)" >&2
    exit 1
  fi
  echo "OK: ${BASE}/api/v1/weather/{farmer_id}?connectivity=online&force_refresh=false"
fi
exit 0
