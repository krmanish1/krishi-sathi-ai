#!/usr/bin/env bash
# Build a release APK locally (no EAS / Expo cloud).
#
# Requires: Android SDK, JDK 17+, and android/ from `npx expo prebuild --platform android`.
#
# Usage:
#   npm run android:apk:local
#   npm run android:apk:local -- --skip-tests
#
# Output:
#   dist/krishisaathi-release.apk  (copy)
#   android/app/build/outputs/apk/release/app-release.apk  (gradle default)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_TESTS=false
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
  esac
done

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ ! -f android/gradlew ]]; then
  echo "==> No android/ project — running expo prebuild"
  npx expo prebuild --platform android --no-install
fi

if [[ "$SKIP_TESTS" != true ]]; then
  echo "==> Production contract tests"
  npm run test:production-contract
  if [[ -n "${EXPO_PUBLIC_API_BASE_URL:-}" ]]; then
    echo "==> Backend smoke"
    npm run smoke
  fi
fi

echo "==> Gradle assembleRelease (bundles JS via Expo export:embed)"
cd android
./gradlew assembleRelease --no-daemon
cd "$ROOT"

APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$APK_SRC" ]]; then
  echo "APK not found at $APK_SRC" >&2
  exit 1
fi

mkdir -p dist
APK_OUT="dist/krishisaathi-release.apk"
cp "$APK_SRC" "$APK_OUT"

echo ""
echo "Release APK ready:"
echo "  $APK_OUT"
echo "  $APK_SRC"
echo ""
echo "Install: adb install -r \"$APK_OUT\""
echo "Note: release is signed with debug.keystore (fine for testing). For Play Store, configure a release keystore in android/app/build.gradle."
