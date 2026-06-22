param(
  [string]$SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$MarketingRoot = "C:\venkat\limca\gozaika\marketing"
)

$ErrorActionPreference = "Stop"

$sourceRootFull = [System.IO.Path]::GetFullPath($SourceRoot).TrimEnd('\')
$marketingRootFull = [System.IO.Path]::GetFullPath($MarketingRoot).TrimEnd('\')
$expectedMarketingRoot = "C:\venkat\limca\gozaika\marketing"

if ($marketingRootFull -ne $expectedMarketingRoot) {
  throw "Refusing unexpected marketing root: $marketingRootFull"
}

$manifestSource = Join-Path $sourceRootFull "docs\product\gozaika-marketing-asset-library-manifest-v1.json"
$readmeSource = Join-Path $sourceRootFull "docs\product\gozaika-marketing-asset-library-readme-v1.md"
$manifest = Get-Content -LiteralPath $manifestSource -Raw | ConvertFrom-Json
$assetRoot = Join-Path $marketingRootFull "asset-library"

function Copy-Safe {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  $sourceFull = [System.IO.Path]::GetFullPath($Source)
  $destinationFull = [System.IO.Path]::GetFullPath($Destination)

  if (-not $destinationFull.StartsWith($marketingRootFull + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Destination escapes marketing root: $destinationFull"
  }
  if (-not (Test-Path -LiteralPath $sourceFull -PathType Leaf)) {
    throw "Missing source asset: $sourceFull"
  }

  $destinationDirectory = Split-Path -Parent $destinationFull
  New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null

  if (Test-Path -LiteralPath $destinationFull -PathType Leaf) {
    $sourceHash = (Get-FileHash -LiteralPath $sourceFull -Algorithm SHA256).Hash
    $destinationHash = (Get-FileHash -LiteralPath $destinationFull -Algorithm SHA256).Hash
    if ($sourceHash -ne $destinationHash) {
      throw "Refusing to overwrite a different existing file: $destinationFull"
    }
    return "unchanged"
  }

  Copy-Item -LiteralPath $sourceFull -Destination $destinationFull
  return "copied"
}

$published = @()
foreach ($asset in $manifest.assets) {
  $source = Join-Path $sourceRootFull ($asset.source -replace '/', '\')
  $destination = Join-Path $assetRoot ($asset.destination -replace '/', '\')
  $status = Copy-Safe -Source $source -Destination $destination
  $destinationFull = [System.IO.Path]::GetFullPath($destination)
  $published += [pscustomobject]@{
    id = $asset.id
    class = $asset.class
    status = $status
    destination = $destinationFull.Substring($marketingRootFull.Length + 1).Replace('\', '/')
    bytes = (Get-Item -LiteralPath $destinationFull).Length
    sha256 = (Get-FileHash -LiteralPath $destinationFull -Algorithm SHA256).Hash.ToLowerInvariant()
  }
}

$releaseMetaRoot = Join-Path $assetRoot "releases\v1.2"
Copy-Safe -Source $readmeSource -Destination (Join-Path $releaseMetaRoot "README.md") | Out-Null
Copy-Safe -Source $manifestSource -Destination (Join-Path $releaseMetaRoot "manifest.json") | Out-Null

$inventory = [pscustomobject]@{
  schemaVersion = 1
  publishedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
  sourceRoot = $sourceRootFull
  marketingRoot = $marketingRootFull
  assets = $published
}

$inventoryPath = Join-Path $releaseMetaRoot "published-inventory.json"
$inventoryJson = $inventory | ConvertTo-Json -Depth 6
$inventoryJson | Set-Content -LiteralPath $inventoryPath -Encoding utf8

$published | Sort-Object class, id | Format-Table class, id, status, bytes, destination -AutoSize
