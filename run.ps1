# run.ps1

$commands = @(
    @{ Name = "consumer";   Title = "Consumer App";   Cmd = "npm run dev:consumer" },
    @{ Name = "restaurant"; Title = "Restaurant App"; Cmd = "npm run dev:restaurant" },
    @{ Name = "admin";      Title = "Admin App";      Cmd = "npm run dev:admin" }
    # @{ Name = "website"; Title = "Website App"; Cmd = "npm run dev:website -- --port 3004" }
)

$path = "C:\venkat\limca\gozaika\sourcecode"
$pidDir = Join-Path $path ".dev-pids"
$runnerScript = Join-Path $pidDir "run-one.ps1"

if (-not (Test-Path $path)) {
    throw "Path not found: $path"
}

if (-not (Test-Path $pidDir)) {
    New-Item -ItemType Directory -Path $pidDir | Out-Null
}

Remove-Item "$pidDir\*.pid" -Force -ErrorAction SilentlyContinue

# Create helper script used by each tab
@'
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
'@ | Set-Content -Path $runnerScript -Encoding UTF8

foreach ($item in $commands) {
    Write-Host "Launching: $($item.Title) - $($item.Cmd)" -ForegroundColor Green

    $pidFile = Join-Path $pidDir "$($item.Name).pid"

    if (Get-Command wt.exe -ErrorAction SilentlyContinue) {
        & wt.exe `
            -w 0 `
            new-tab `
            --title "$($item.Title)" `
            --suppressApplicationTitle `
            -d "$path" `
            powershell.exe `
            -NoLogo `
            -NoProfile `
            -ExecutionPolicy Bypass `
            -File "$runnerScript" `
            -Title "$($item.Title)" `
            -WorkDir "$path" `
            -PidFile "$pidFile" `
            -Cmd "$($item.Cmd)"
    }
    else {
        Start-Process powershell.exe -ArgumentList @(
            "-NoLogo",
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", "$runnerScript",
            "-Title", "$($item.Title)",
            "-WorkDir", "$path",
            "-PidFile", "$pidFile",
            "-Cmd", "$($item.Cmd)"
        )
    }
}

Write-Host ""
Write-Host "All apps launched!" -ForegroundColor Cyan
Write-Host "To kill apps and close tabs, run:" -ForegroundColor Yellow
Write-Host ".\kill.ps1" -ForegroundColor White