#!/usr/bin/env bash
# Production Android APK via EAS Build.
#
# Prerequisites:
#   npm i -g eas-cli   (or use npx eas-cli below)
#   eas login
#   .env with EXPO_PUBLIC_* (see .env.example)
#
# Usage:
#   npm run eas:android:production
#   npm run eas:android:production -- --local   # build on this machine (needs Android SDK)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Avoid corrupted npx cache (ENOTEMPTY on plist) in CI/sandbox environments.
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-/tmp/npm-eas-cache}"
EAS="${EAS:-npx --yes eas-cli@latest}"

required_keys=(
  EXPO_PUBLIC_API_BASE_URL
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_KEY
)
optional_keys=(
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  EXPO_PUBLIC_DATA_GOV_API_KEY
)

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

missing=()
for key in "${required_keys[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required env vars (set in .env or EAS production environment):" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

for key in "${optional_keys[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "WARN: $key is unset — related features will be disabled in this build." >&2
  fi
done

echo "==> Production contract tests"
npm run test:production-contract

echo "==> Backend smoke (EXPO_PUBLIC_API_BASE_URL)"
npm run smoke

echo "==> Push non-empty EXPO_PUBLIC_* from .env to EAS production"
EAS_ENV_FILE="$(mktemp)"
trap 'rm -f "$EAS_ENV_FILE"' EXIT
: >"$EAS_ENV_FILE"
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" =~ ^[[:space:]]*$ ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  [[ "$key" == EXPO_PUBLIC_* ]] || continue
  [[ -n "$val" ]] || continue
  printf '%s=%s\n' "$key" "$val" >>"$EAS_ENV_FILE"
done <.env
$EAS env:push production --path "$EAS_ENV_FILE" --force

echo "==> EAS production APK build (profile: production)"
$EAS build --platform android --profile production "$@"
