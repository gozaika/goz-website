param(
    [string]$Title,
    [string]$WorkDir,
    [string]$PidFile,
    [string]$Cmd
)

$host.UI.RawUI.WindowTitle = $Title
Set-Location $WorkDir
Set-Content -Path $PidFile -Value $PID
$env:GOZAIKA_DEV_GROUP = "1"

Write-Host "Starting $Title..." -ForegroundColor Green
Write-Host $Cmd -ForegroundColor DarkGray

Invoke-Expression $Cmd
