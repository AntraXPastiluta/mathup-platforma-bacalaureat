param(
    [switch]$Local,
    [switch]$Preview,
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$buildFlag = if ($Build -or -not $Preview) { @("--build") } else { @() }

if ($Preview) {
    docker compose --profile preview up @buildFlag frontend-preview
    exit $LASTEXITCODE
}

if ($Local) {
    docker compose --profile local up @buildFlag frontend
    exit $LASTEXITCODE
}

docker compose up @buildFlag frontend
