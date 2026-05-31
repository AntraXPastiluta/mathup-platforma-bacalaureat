param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

docker compose down --remove-orphans

if ($Local) {
    docker compose --profile local-down run --rm supabase-stop
}
