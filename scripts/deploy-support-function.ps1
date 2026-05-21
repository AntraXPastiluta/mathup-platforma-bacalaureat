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
  throw 'Set SUPABASE_ACCESS_TOKEN (sbp_...) in .env.local'
}

$env:SUPABASE_ACCESS_TOKEN = $accessToken
$projectRef = $envValues.SUPABASE_PROJECT_REF
if (-not $projectRef) {
  $projectRef = 'dhphstiemdzfglncqyev'
}

$secretArgs = @()
if ($envValues.EMAILJS_SERVICE_ID) { $secretArgs += "EMAILJS_SERVICE_ID=$($envValues.EMAILJS_SERVICE_ID)" }
if ($envValues.EMAILJS_TEMPLATE_ID) { $secretArgs += "EMAILJS_TEMPLATE_ID=$($envValues.EMAILJS_TEMPLATE_ID)" }
if ($envValues.EMAILJS_PUBLIC_KEY) { $secretArgs += "EMAILJS_PUBLIC_KEY=$($envValues.EMAILJS_PUBLIC_KEY)" }
if ($envValues.EMAILJS_PRIVATE_KEY) { $secretArgs += "EMAILJS_PRIVATE_KEY=$($envValues.EMAILJS_PRIVATE_KEY)" }
if ($envValues.SUPPORT_NOTIFY_EMAIL) { $secretArgs += "SUPPORT_NOTIFY_EMAIL=$($envValues.SUPPORT_NOTIFY_EMAIL)" }
if ($envValues.SUPABASE_SERVICE_ROLE_KEY) { $secretArgs += "SERVICE_ROLE_KEY=$($envValues.SUPABASE_SERVICE_ROLE_KEY)" }

if ($secretArgs.Count -gt 0) {
  Write-Host 'Setting support-related Edge Function secrets...'
  npx supabase secrets set @secretArgs --project-ref $projectRef
}

Write-Host 'Deploying submit-support-request...'
npx supabase functions deploy submit-support-request `
  --project-ref $projectRef `
  --use-api `
  --yes

Write-Host 'Done. Test from /support while signed in.'
