param(
  [string]$SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$MarketingRoot = "C:\venkat\limca\gozaika\marketing"
)

$ErrorActionPreference = "Stop"
$sourceRootFull = [System.IO.Path]::GetFullPath($SourceRoot).TrimEnd('\')
$marketingRootFull = [System.IO.Path]::GetFullPath($MarketingRoot).TrimEnd('\')
$expectedMarketingRoot = "C:\venkat\limca\gozaika\marketing"
if ($marketingRootFull -ne $expectedMarketingRoot) { throw "Refusing unexpected marketing root: $marketingRootFull" }

$releaseRoot = Join-Path $marketingRootFull "restaurant-sales-kit\v1.0"

function Copy-Safe {
  param([string]$RelativeSource, [string]$RelativeDestination)
  $source = [System.IO.Path]::GetFullPath((Join-Path $sourceRootFull $RelativeSource))
  $destination = [System.IO.Path]::GetFullPath((Join-Path $releaseRoot $RelativeDestination))
  if (-not $destination.StartsWith($releaseRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw "Destination escapes release root: $destination" }
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing release source: $source" }
  New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
  if (Test-Path -LiteralPath $destination -PathType Leaf) {
    if ((Get-FileHash $source -Algorithm SHA256).Hash -ne (Get-FileHash $destination -Algorithm SHA256).Hash) {
      throw "Refusing to overwrite a different released file: $destination"
    }
    $status = "unchanged"
  } else {
    Copy-Item -LiteralPath $source -Destination $destination
    $status = "copied"
  }
  [pscustomobject]@{ status=$status; destination=$destination.Substring($marketingRootFull.Length + 1).Replace('\','/'); bytes=(Get-Item $destination).Length; sha256=(Get-FileHash $destination -Algorithm SHA256).Hash.ToLowerInvariant() }
}

$files = @(
  @("output\pdf\gozaika-rsk-a4-en-print-v1.0.pdf", "en\print\gozaika-rsk-a4-en-print-v1.0.pdf"),
  @("output\pdf\gozaika-rsk-a6-en-print-v1.0.pdf", "en\print\gozaika-rsk-a6-en-print-v1.0.pdf"),
  @("output\pdf\gozaika-rsk-email-one-pager-en-v1.0.pdf", "en\digital\gozaika-rsk-email-one-pager-en-v1.0.pdf"),
  @("output\marketing\restaurant-sales-kit\digital\gozaika-rsk-whatsapp-en-v1.0.png", "en\digital\gozaika-rsk-whatsapp-en-v1.0.png"),
  @("output\marketing\restaurant-sales-kit\digital\gozaika-rsk-follow-up-email-en-v1.0.txt", "en\digital\gozaika-rsk-follow-up-email-en-v1.0.txt"),
  @("output\marketing\restaurant-sales-kit\digital\gozaika-rsk-follow-up-whatsapp-en-v1.0.txt", "en\digital\gozaika-rsk-follow-up-whatsapp-en-v1.0.txt"),
  @("output\presentations\gozaika-rsk-sales-deck-en-v1.0\gozaika-rsk-sales-deck-en-v1.0.pptx", "en\deck\gozaika-rsk-sales-deck-en-v1.0.pptx"),
  @("output\marketing\restaurant-sales-kit\qa\qa-report.md", "qa\qa-report.md"),
  @("output\marketing\restaurant-sales-kit\qa\qr-verification.json", "qa\qr-verification.json"),
  @("output\marketing\restaurant-sales-kit\qa\release-manifest.json", "manifest.json")
)

$published = foreach ($file in $files) { Copy-Safe -RelativeSource $file[0] -RelativeDestination $file[1] }
$published | Format-Table status,bytes,destination -AutoSize
