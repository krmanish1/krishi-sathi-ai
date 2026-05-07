Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [Parameter(Mandatory=$true)][string] $Title,
    [Parameter(Mandatory=$true)][scriptblock] $Command
  )

  Write-Host ""
  Write-Host "-- $Title --"
  & $Command
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Write-Host "== krishi-sathi-ai init =="
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "node is not installed or not on PATH."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is not installed or not on PATH."
}

Write-Host "-- Versions --"
node --version
npm --version
Write-Host ""

Write-Host "-- Repo health --"
if (-not (Test-Path -Path ".\package.json")) {
  throw "package.json not found (run from repo root)."
}
if (-not (Test-Path -Path ".\.env")) {
  Write-Warning ".env not found. If needed, copy .env.example to .env."
}

Write-Host ""
if (Test-Path -Path ".\package-lock.json") {
  Invoke-Step -Title "Install deps (npm ci)" -Command { npm ci }
} else {
  Invoke-Step -Title "Install deps (npm install)" -Command { npm install }
}

Invoke-Step -Title "Quality gates (lint)" -Command { npm run lint }
Invoke-Step -Title "Quality gates (typecheck)" -Command { npm run typecheck }
Invoke-Step -Title "Quality gates (test)" -Command { npm test }

Write-Host ""
Write-Host "OK: init completed successfully."
Write-Host "Tip: If you changed web-impacting code, also run:"
Write-Host "  npx expo export -p web --output-dir /tmp/web-verify"

