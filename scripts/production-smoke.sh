#!/usr/bin/env bash
# Smoke-check API (set BASE before running, e.g. in CI)
set -euo pipefail
BASE="${EXPO_PUBLIC_API_BASE_URL:-http://127.0.0.1:8000}"
code="$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/v1/health" || true)"
if [[ "$code" != "200" ]]; then
  echo "Health check failed: ${BASE}/api/v1/health (HTTP $code)" >&2
  exit 1
fi
echo "OK: ${BASE}/api/v1/health"
exit 0
