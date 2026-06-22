<#
  Turnkey functional harness runner (Windows PowerShell).
  Resolves local Supabase keys, starts the BFF against local Supabase, waits for
  health, runs the functional suites, then tears the BFF down.

  Usage:
    pwsh scripts/functional/run.ps1                # all suites
    pwsh scripts/functional/run.ps1 -Filter finance
    pwsh scripts/functional/run.ps1 -KeepServer    # leave the BFF running

  Assumes local Supabase is up (npx supabase start) and the demo seed is applied.
#>
param(
  [string]$Filter = "",
  [int]$Port = 3001,
  [switch]$KeepServer
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path "$PSScriptRoot/../.."
Set-Location $repo

Write-Host "Resolving local Supabase keys..." -ForegroundColor Cyan
$envLines = npx supabase status -o env
$kv = @{}
foreach ($line in $envLines) {
  if ($line -match '^(\w+)="?([^"]*)"?$') { $kv[$Matches[1]] = $Matches[2] }
}
if (-not $kv['ANON_KEY']) { throw "Could not read ANON_KEY from 'supabase status'. Is local Supabase running?" }

$env:NEXT_PUBLIC_SUPABASE_URL = $kv['API_URL']
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $kv['ANON_KEY']
$env:SUPABASE_SERVICE_ROLE_KEY = $kv['SERVICE_ROLE_KEY']
$env:PICKUP_CREDENTIAL_SECRET = "local-functional-secret-0123456789-abcdef"
# For the harness itself:
$env:ANON_KEY = $kv['ANON_KEY']
$env:SUPABASE_URL = $kv['API_URL']
$env:BFF_ORIGIN = "http://127.0.0.1:$Port"

Write-Host "Starting BFF on port $Port..." -ForegroundColor Cyan
$bff = Start-Process -PassThru -WindowStyle Hidden -FilePath "npm" `
  -ArgumentList @("run", "-w", "@gozaika/restaurant-mgmt-web", "dev", "--", "-p", "$Port")

try {
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $h = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/api/mobile/v1/health" -TimeoutSec 3
      if ($h.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 2 }
  }
  if (-not $ready) { throw "BFF did not become healthy on port $Port." }
  Write-Host "BFF ready. Running functional harness..." -ForegroundColor Green

  $args = @("scripts/functional/run.mjs")
  if ($Filter) { $args += @("--filter", $Filter) }
  node @args
  $code = $LASTEXITCODE
} finally {
  if (-not $KeepServer -and $bff -and -not $bff.HasExited) {
    Write-Host "Stopping BFF..." -ForegroundColor Cyan
    Stop-Process -Id $bff.Id -Force -ErrorAction SilentlyContinue
  }
}
exit $code
