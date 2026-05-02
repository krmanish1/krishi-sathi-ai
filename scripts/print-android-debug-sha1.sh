#!/usr/bin/env bash
# Prints SHA-1 for the default Android debug keystore (local dev builds).
# Run from project root: bash scripts/print-android-debug-sha1.sh

set -euo pipefail

KEYTOOL=""
for candidate in \
  "keytool" \
  "$HOME/Library/Android/sdk/cmdline-tools/latest/bin/keytool" \
  "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" \
  "/Applications/Android Studio.app/Contents/jre/Contents/Home/bin/keytool"; do
  if command -v "$candidate" >/dev/null 2>&1; then
    KEYTOOL=$(command -v "$candidate")
    break
  fi
  if [[ -x "$candidate" ]]; then
    KEYTOOL="$candidate"
    break
  fi
done

if [[ -z "$KEYTOOL" ]]; then
  echo "keytool not found. Install Android Studio or JDK, then retry." >&2
  exit 1
fi

STORE="$HOME/.android/debug.keystore"
if [[ ! -f "$STORE" ]]; then
  echo "Debug keystore not found at: $STORE" >&2
  echo "Build once with: npx expo run:android — it creates the keystore." >&2
  exit 1
fi

echo ""
echo "=== Copy these into Google Cloud → OAuth client (Android) ==="
echo ""
echo "Package name:"
echo "  ai.krishisaathi.app"
echo ""
echo "SHA-1:"
"$KEYTOOL" -list -v \
  -keystore "$STORE" \
  -alias androiddebugkey \
  -storepass android \
  -keypass android 2>/dev/null | grep -E 'SHA1:|SHA-1' | head -1 | sed 's/^[[:space:]]*//'
echo ""
echo "(Optional) Full variant — run from android/: ./gradlew signingReport"
echo ""
