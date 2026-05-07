#!/usr/bin/env bash
set -euo pipefail

echo "== krishi-sathi-ai init =="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed or not on PATH."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed or not on PATH."
  exit 1
fi

echo "-- Versions --"
node --version
npm --version
echo

echo "-- Repo health --"
if [ ! -f package.json ]; then
  echo "ERROR: package.json not found (run from repo root)."
  exit 1
fi

if [ ! -f .env ]; then
  echo "WARN: .env not found. If needed, copy .env.example to .env."
fi

echo
echo "-- Install deps --"
# Prefer npm ci when lockfile exists; fallback to npm install.
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo
echo "-- Quality gates --"
npm run lint
npm run typecheck
npm test

echo
echo "OK: init completed successfully."
echo "Tip: If you changed web-impacting code, also run:"
echo "  npx expo export -p web --output-dir /tmp/web-verify"

