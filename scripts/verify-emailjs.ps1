$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$envFile = Join-Path $root '.env.local'
if (-not (Test-Path $envFile)) { throw "Missing $envFile" }

$values = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { $values[$matches[1].Trim()] = $matches[2].Trim() }
}

$required = @('EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY')
foreach ($key in $required) {
  if (-not $values[$key]) { throw "Missing $key in .env.local" }
}

Write-Host "Public Key length: $($values.EMAILJS_PUBLIC_KEY.Length) (verifică în dashboard că e copiat complet)"
Write-Host "Template ID: $($values.EMAILJS_TEMPLATE_ID)"
Write-Host "Service ID: $($values.EMAILJS_SERVICE_ID)"
Write-Host 'Testing EmailJS send...'

$body = @{
  service_id = $values.EMAILJS_SERVICE_ID
  template_id = $values.EMAILJS_TEMPLATE_ID
  user_id = $values.EMAILJS_PUBLIC_KEY
  accessToken = $values.EMAILJS_PRIVATE_KEY
  template_params = @{
    name = 'Test MathUP'
    email = 'test@example.com'
    reply_to = 'test@example.com'
    email_subject = '[MathUP Suport] Test verify-emailjs'
    subject = 'Test'
    message = 'Mesaj de test din verify-emailjs.ps1'
    category_label = 'Altele'
    request_id = 'verify-test'
    created_at = (Get-Date).ToString('o')
  }
} | ConvertTo-Json -Depth 5

try {
  $r = Invoke-WebRequest -Uri 'https://api.emailjs.com/api/v1.0/email/send' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing
  Write-Host "SUCCESS ($($r.StatusCode)): $($r.Content)"
  Write-Host 'Verifică inbox + Spam la adresa din șablonul EmailJS (To Email).'
} catch {
  $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
  $detail = $reader.ReadToEnd()
  Write-Host "FAILED: $detail"
  Write-Host ''
  Write-Host 'Remedii:'
  Write-Host '1. https://dashboard.emailjs.com/admin/templates → copiază Template ID corect'
  Write-Host '2. https://dashboard.emailjs.com/admin/account → API Keys → Public + Private Key complete'
  Write-Host '3. https://dashboard.emailjs.com/admin/account/security → Allow non-browser API'
  Write-Host '4. Actualizează .env.local și rulează: .\scripts\deploy-support-function.ps1'
  exit 1
}
