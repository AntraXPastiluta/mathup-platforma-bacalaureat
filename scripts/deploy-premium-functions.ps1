param(
  # Optional override; otherwise SUPABASE_PROJECT_REF from .env.local or the shell
  [string]$ProjectRef
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

function Read-DotEnv {
  param([string]$Path)

  $values = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    if ($line -match '^([^=]+)=(.*)$') {
      $values[$matches[1].Trim()] = $matches[2].Trim()
    }
  }
  return $values
}

$envFile = Join-Path $root '.env.local'
if (-not (Test-Path $envFile)) {
  throw "Missing $envFile"
}

$envValues = Read-DotEnv -Path $envFile
$accessToken = $envValues.SUPABASE_ACCESS_TOKEN
if (-not $accessToken) {
  $accessToken = $envValues.SUPABASE_ACCES_TOKEN
}
if (-not $accessToken) {
  $accessToken = $env:SUPABASE_ACCESS_TOKEN
}
if (-not $accessToken) {
  throw 'Set SUPABASE_ACCESS_TOKEN (starts with sbp_) in .env.local or the shell environment.'
}
if ($accessToken -notmatch '^sbp_') {
  throw 'Supabase access token must start with sbp_.'
}
$env:SUPABASE_ACCESS_TOKEN = $accessToken
$required = @(
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_URL',
  'PREMIUM_SEASON_END'
)

$missing = $required | Where-Object { -not $envValues.ContainsKey($_) -or -not $envValues[$_] }
if ($missing.Count -gt 0) {
  throw "Missing values in .env.local: $($missing -join ', ')"
}

$resolvedRef = if ($ProjectRef -and $ProjectRef.Trim()) {
  $ProjectRef.Trim()
} elseif ($envValues.SUPABASE_PROJECT_REF -and $envValues.SUPABASE_PROJECT_REF.Trim()) {
  $envValues.SUPABASE_PROJECT_REF.Trim()
} elseif ($env:SUPABASE_PROJECT_REF -and $env:SUPABASE_PROJECT_REF.Trim()) {
  $env:SUPABASE_PROJECT_REF.Trim()
} else {
  $null
}
if (-not $resolvedRef) {
  throw @'
Missing Supabase project reference. Use one of:
  - Pass -ProjectRef <reference_id>
  - Add SUPABASE_PROJECT_REF to .env.local
  - Set environment variable SUPABASE_PROJECT_REF
Find Reference ID under Supabase Dashboard → Project Settings → General.
'@
}

Write-Host "Setting Supabase Edge Function secrets..."
npx supabase secrets set `
  "STRIPE_SECRET_KEY=$($envValues.STRIPE_SECRET_KEY)" `
  "STRIPE_PRICE_ID=$($envValues.STRIPE_PRICE_ID)" `
  "STRIPE_WEBHOOK_SECRET=$($envValues.STRIPE_WEBHOOK_SECRET)" `
  "SERVICE_ROLE_KEY=$($envValues.SUPABASE_SERVICE_ROLE_KEY)" `
  "APP_URL=$($envValues.APP_URL)" `
  "PREMIUM_SEASON_END=$($envValues.PREMIUM_SEASON_END)" `
  --project-ref $resolvedRef

Write-Host "Deploying create-checkout-session..."
npx supabase functions deploy create-checkout-session `
  --project-ref $resolvedRef `
  --use-api `
  --yes

Write-Host "Deploying stripe-webhook..."
npx supabase functions deploy stripe-webhook `
  --project-ref $resolvedRef `
  --no-verify-jwt `
  --use-api `
  --yes

Write-Host "Deploying cancel-premium-subscription..."
npx supabase functions deploy cancel-premium-subscription `
  --project-ref $resolvedRef `
  --use-api `
  --yes

Write-Host "Done. Test checkout from the app while signed in."
