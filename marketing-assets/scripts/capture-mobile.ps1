#Requires -Version 5.1
<#
.SYNOPSIS
  Run a scenario-linked Maestro smoke flow and save raw Android evidence for launch assets.

.DESCRIPTION
  This script is intentionally strict. It checks adb, a connected unlocked device, the real installed
  app package, and Maestro before it writes capture evidence. If device state is unavailable, it fails
  with an actionable message rather than producing placeholder UI.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("consumer-mobile", "restaurant-mobile")]
  [string] $App,

  [Parameter(Mandatory = $true)]
  [string] $Flow,

  [string] $OutputRoot = "marketing-assets\captures\raw\mobile",

  [switch] $PreflightOnly,

  [switch] $SkipMaestro
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
trap {
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

$PackageIds = @{
  "consumer-mobile"   = "in.gozaika.customer"
  "restaurant-mobile" = "in.gozaika.restaurant"
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$FlowPath = Join-Path $RepoRoot "marketing-assets\flows\maestro\$Flow.yaml"
$OutputDir = Join-Path $RepoRoot (Join-Path $OutputRoot $Flow)
$PackageId = $PackageIds[$App]

function Require-Command {
  param([string] $Name, [string] $InstallHint)
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "$Name was not found. $InstallHint"
  }
}

function Get-ConnectedDevice {
  $devices = & adb devices 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "adb devices failed. Ensure Android platform-tools are installed and on PATH.`n$devices"
  }

  $connected = @($devices | Where-Object { $_ -match "^\S+\s+device$" })
  if ($connected.Count -ne 1) {
    throw "Expected exactly one unlocked adb device, found $($connected.Count). Output:`n$($devices -join "`n")"
  }

  return ($connected[0] -split "\s+")[0]
}

function Assert-DeviceUnlocked {
  $lockState = & adb shell dumpsys window 2>&1 | Select-String -Pattern "mDreamingLockscreen=true|mShowingLockscreen=true|isStatusBarKeyguard=true"
  if ($lockState) {
    throw "Android device appears locked or on keyguard. Unlock it and rerun the capture."
  }
}

function Assert-PackageInstalled {
  param([string] $TargetPackage)
  $path = & adb shell pm path $TargetPackage 2>&1
  if ($LASTEXITCODE -ne 0 -or -not ($path -match "^package:")) {
    throw "$TargetPackage is not installed on the connected device. Build/install it first, for example: scripts\android-preview-install.ps1 -App $App"
  }
}

function Write-Metadata {
  param(
    [string] $ScreenshotPath,
    [string] $MaestroLogPath,
    [string] $DeviceId
  )
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ScreenshotPath).Hash.ToLowerInvariant()
  $commit = (& git -C $RepoRoot rev-parse HEAD 2>$null)
  if (-not $commit) { $commit = "unknown" }
  $metadataPath = [System.IO.Path]::ChangeExtension($ScreenshotPath, ".json")
  $metadata = [ordered]@{
    schemaVersion = 1
    captureKind = "mobile-maestro-smoke"
    app = $App
    packageId = $PackageId
    flow = $Flow
    deviceId = $DeviceId
    sourceCommit = "$commit".Trim()
    capturedAt = (Get-Date).ToUniversalTime().ToString("o")
    sha256 = $hash
    file = $ScreenshotPath.Replace("\", "/")
    maestroFlow = $FlowPath.Replace("\", "/")
    maestroLog = $MaestroLogPath.Replace("\", "/")
    protectedRegions = @()
    truthGuard = "Raw Android screenshot only. Do not alter UI, claims, prices, QR, OTP, order state, or restaurant identity."
  }
  $metadata | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $metadataPath -Encoding UTF8
}

if (-not (Test-Path -LiteralPath $FlowPath)) {
  throw "Maestro flow not found: $FlowPath"
}

Require-Command -Name "adb" -InstallHint "Install Android platform-tools or open a shell with Android SDK platform-tools on PATH."
if (-not $SkipMaestro) {
  Require-Command -Name "maestro" -InstallHint "Install Maestro CLI and ensure it is on PATH."
}

$deviceId = Get-ConnectedDevice
Assert-DeviceUnlocked
Assert-PackageInstalled -TargetPackage $PackageId

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$maestroLogPath = Join-Path $OutputDir "$Flow-$timestamp-maestro.log"
$screenshotPath = Join-Path $OutputDir "$Flow-$timestamp.png"

Write-Host "Mobile capture preflight passed."
Write-Host "Device:  $deviceId"
Write-Host "Package: $PackageId"
Write-Host "Flow:    $FlowPath"

if ($PreflightOnly) {
  Write-Host "PreflightOnly set; not running Maestro or writing screenshot evidence."
  exit 0
}

if (-not $SkipMaestro) {
  $maestroOutput = & maestro test $FlowPath 2>&1
  $maestroOutput | Set-Content -LiteralPath $maestroLogPath -Encoding UTF8
  if ($LASTEXITCODE -ne 0) {
    throw "Maestro flow failed. Log: $maestroLogPath`n$($maestroOutput -join "`n")"
  }
} else {
  "Maestro skipped by -SkipMaestro." | Set-Content -LiteralPath $maestroLogPath -Encoding UTF8
}

Start-Sleep -Seconds 2
cmd /c "adb exec-out screencap -p > `"$screenshotPath`""
if ($LASTEXITCODE -ne 0) {
  throw "adb screencap failed."
}
if ((Get-Item -LiteralPath $screenshotPath).Length -lt 1000) {
  throw "Screenshot looks empty or invalid: $screenshotPath"
}

Write-Metadata -ScreenshotPath $screenshotPath -MaestroLogPath $maestroLogPath -DeviceId $deviceId
Write-Host "Screenshot: $screenshotPath"
