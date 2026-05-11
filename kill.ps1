# kill.ps1

$path = "C:\venkat\limca\gozaika\sourcecode"
$pidDir = Join-Path $path ".dev-pids"

Write-Host "Stopping Gozaika dev processes..." -ForegroundColor Cyan

if (-not (Test-Path $pidDir)) {
    Write-Host "PID folder not found: $pidDir" -ForegroundColor Yellow
    Write-Host "No dev tabs were found from run.ps1." -ForegroundColor Yellow
    exit
}

$pidFiles = Get-ChildItem $pidDir -Filter "*.pid" -ErrorAction SilentlyContinue

if (-not $pidFiles) {
    Write-Host "No PID files found." -ForegroundColor Yellow
    Write-Host "Start the apps using .\run.ps1 first." -ForegroundColor Yellow
    exit
}

foreach ($file in $pidFiles) {
    $pidText = Get-Content $file.FullName -ErrorAction SilentlyContinue | Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($pidText)) {
        continue
    }

    $processId = [int]$pidText
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

    if ($process) {
        Write-Host "Killing process tree PID $processId..." -ForegroundColor Yellow
        taskkill /PID $processId /T /F | Out-Null
    }
    else {
        Write-Host "PID $processId is no longer running." -ForegroundColor DarkYellow
    }
}

Remove-Item "$pidDir\*.pid" -Force -ErrorAction SilentlyContinue

Write-Host "Done. Dev processes killed and tabs should close." -ForegroundColor Green