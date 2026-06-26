#Requires -Version 5.1
<#
.SYNOPSIS
  Build and install a bundled Android release APK for local device visual QA.

.DESCRIPTION
  Works around Windows MAX_PATH failures in React Native New Architecture CMake codegen
  by syncing the monorepo to a short physical path (default C:\tmp\gozaika-build).

  Does not modify app UX. Release builds embed JS via Gradle export:embed (no Metro/dev launcher).

.PARAMETER App
  Mobile workspace: consumer-mobile or restaurant-mobile.

.PARAMETER BuildRoot
  Short physical path for the build tree. Default: C:\tmp\gozaika-build
  Junctions to the long repo path do NOT work - Gradle/CMake resolve canonical paths.

.PARAMETER SkipSync
  Skip robocopy sync from the real repo (reuse an existing build tree).

.PARAMETER SkipInstall
  Build only; do not adb install.

.PARAMETER CaptureScreenshot
  Save adb screencap to .codex-artifacts after launch.

.EXAMPLE
  pwsh scripts/android-preview-install.ps1 -App consumer-mobile
  pwsh scripts/android-preview-install.ps1 -App restaurant-mobile -CaptureScreenshot
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("consumer-mobile", "restaurant-mobile")]
  [string] $App,

  [string] $BuildRoot = "C:\tmp\gozaika-build",

  [switch] $SkipSync,

  [switch] $SkipInstall,

  [switch] $CaptureScreenshot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$PackageIds = @{
  "consumer-mobile"   = "in.gozaika.customer"
  "restaurant-mobile" = "in.gozaika.restaurant"
}

$PreviewEnv = @{
  NODE_ENV                          = "production"
  EXPO_PUBLIC_SUPABASE_URL          = "https://nxvthewcwimrpjbzbcvx.supabase.co"
  EXPO_PUBLIC_SUPABASE_ANON_KEY     = "sb_publishable_UdIo3YZt5UG7dlrLAcfwsQ_DPQuyWuc"
  EXPO_PUBLIC_CUSTOMER_API_ORIGIN   = "https://customer.gozaika.in"
  EXPO_PUBLIC_RESTAURANT_API_ORIGIN = "https://restaurant.gozaika.in"
}

function Sync-BuildTree {
  param([string] $Root, [string] $SourceRepo)

  New-Item -ItemType Directory -Force -Path $Root | Out-Null
  Write-Host "Syncing monorepo to short build path: $Root"
  Write-Host "(Windows CMake codegen needs a physical copy - junctions resolve to the long path.)"

  $excludeDirs = @(
    ".git",
    ".codex-artifacts",
    "apps\consumer-mobile\android\app\.cxx",
    "apps\consumer-mobile\android\app\build",
    "apps\consumer-mobile\android\build",
    "apps\consumer-mobile\android\.gradle",
    "apps\restaurant-mobile\android\app\.cxx",
    "apps\restaurant-mobile\android\app\build",
    "apps\restaurant-mobile\android\build",
    "apps\restaurant-mobile\android\.gradle"
  )

  $robocopyArgs = @(
    $SourceRepo,
    $Root,
    "/MIR",
    "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np",
    "/XD"
  ) + $excludeDirs

  & robocopy @robocopyArgs | Out-Null
  # robocopy: 0-7 = success; 8+ = some failures (often long-path edge files - verify tree)
  if ($LASTEXITCODE -ge 8) {
    Write-Warning "robocopy reported exit $LASTEXITCODE (some paths may have been skipped)."
  }

  if (-not (Test-Path -LiteralPath "$Root\node_modules\expo\package.json")) {
    Write-Host "node_modules incomplete - running npm ci..."
    Push-Location $Root
    try {
      & npm ci --no-audit --no-fund
      if ($LASTEXITCODE -ne 0) { throw "npm ci failed (exit $LASTEXITCODE)" }
    }
    finally {
      Pop-Location
    }
  }
}

function Ensure-BuildRoot {
  param([string] $Root, [string] $SourceRepo, [bool] $DoSync)

  if ($DoSync) {
    Sync-BuildTree -Root $Root -SourceRepo $SourceRepo
  }

  if (-not (Test-Path -LiteralPath "$Root\package.json")) {
    throw "Build root $Root missing package.json. Run without -SkipSync first."
  }
}

function Ensure-Toolchain {
  $jbr = "C:\Program Files\Android\Android Studio\jbr"
  if (-not (Test-Path -LiteralPath $jbr)) {
    throw "Android Studio JBR not found at $jbr. Set JAVA_HOME manually."
  }
  $env:JAVA_HOME = $jbr
  $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (-not (Test-Path -LiteralPath $sdk)) {
    throw "Android SDK not found at $sdk"
  }
  $env:ANDROID_HOME = $sdk
  $env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools\bin;$env:Path"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceRepo = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$ArtifactDir = Join-Path $SourceRepo ".codex-artifacts\mobile-ux-uplift\android-preview-build"
$AppDir = Join-Path $BuildRoot "apps\$App"
$AndroidDir = Join-Path $AppDir "android"
$ApkPath = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"
$LogPath = Join-Path $ArtifactDir "$App-release-build.log"
$PackageId = $PackageIds[$App]

Ensure-BuildRoot -Root $BuildRoot -SourceRepo $SourceRepo -DoSync:(-not $SkipSync)
Ensure-Toolchain

New-Item -ItemType Directory -Force -Path $ArtifactDir | Out-Null

$devices = & adb devices 2>&1 | Select-String "device$"
if (-not $SkipInstall -and -not $devices) {
  throw "No adb device connected. Run adb devices and retry."
}

foreach ($key in $PreviewEnv.Keys) {
  Set-Item -Path "env:$key" -Value $PreviewEnv[$key]
}

Write-Host "`n=== Android preview release: $App ==="
Write-Host "Build root: $BuildRoot"
Write-Host "Package:    $PackageId"

# Stale .cxx from long-path builds can poison CMake.
Remove-Item -Recurse -Force (Join-Path $AndroidDir "app\.cxx") -ErrorAction SilentlyContinue

Push-Location $AndroidDir
try {
  Write-Host "`nRunning gradlew assembleRelease (arm64-v8a only)..."
  $gradleArgs = @(
    "assembleRelease",
    "-PreactNativeArchitectures=arm64-v8a",
    "--no-daemon"
  )
  & .\gradlew.bat @gradleArgs 2>&1 | Tee-Object -FilePath $LogPath
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle assembleRelease failed (exit $LASTEXITCODE). Log: $LogPath"
  }
}
finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $ApkPath)) {
  throw "APK not found at $ApkPath"
}

Copy-Item -LiteralPath $ApkPath -Destination (Join-Path $ArtifactDir "$App-release.apk") -Force
$artifactLog = Join-Path $ArtifactDir "$App-release-build.log"
if ($LogPath -ne $artifactLog) {
  Copy-Item -LiteralPath $LogPath -Destination $artifactLog -Force
}
Write-Host "APK: $ApkPath"
Write-Host "Artifacts: $ArtifactDir"

if (-not $SkipInstall) {
  Write-Host "`nInstalling on device..."
  & adb install -r $ApkPath
  if ($LASTEXITCODE -ne 0) {
    throw "adb install failed (exit $LASTEXITCODE)"
  }

  Write-Host "Launching $PackageId..."
  & adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n "$PackageId/.MainActivity" 2>&1 | Out-Null
  Start-Sleep -Seconds 6

  if ($CaptureScreenshot) {
    $shotPath = Join-Path $ArtifactDir "$App-release-launch.png"
    cmd /c "adb exec-out screencap -p > `"$shotPath`""
    if ((Get-Item -LiteralPath $shotPath).Length -lt 1000) {
      Write-Warning "Screenshot may be empty - unlock the device and retry capture."
    }
    Write-Host "Screenshot: $shotPath"
  }
}

Write-Host "`nDone. Log: $LogPath"
