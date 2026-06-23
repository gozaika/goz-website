#requires -Version 7
<#
  autorun-overnight.ps1 — unattended, rate-limit-resilient mobile-slice build loop.

  WHAT IT DOES
    Repeatedly launches a FRESH headless Claude Code session that reads
    docs/mobile/CONTINUE-HERE.md and builds the next slice(s). When the usage limit is
    hit the session just exits; this loop waits and relaunches. Progress is detected by
    a change in git HEAD — so it needs NO reset-time lookup and NO log parsing:
      * new commit since last run  -> it made progress, relaunch quickly for the next slice
      * no new commit              -> probably rate-limited (or stuck), sleep then retry
    Relaunching during an active limit just exits fast, so the loop is self-correcting.

  USAGE
    Run at night:    pwsh ./scripts/autorun-overnight.ps1
    Lower cost:      pwsh ./scripts/autorun-overnight.ps1 -Model sonnet
    Stop in the day: Ctrl+C   (or: create a file named STOP-AUTORUN in the repo root)

  STOPS ON ITS OWN when the agent prints  AUTORUN_HALT: <reason>  — emitted when it
  reaches a review-gated item, the gate can't be fixed, it would touch another agent's
  files, or all buildable slices are done (see CONTINUE-HERE.md "Headless mode").

  ⚠ CONCURRENCY: run this ONLY when no other Claude session is working this repo. Two
    agents writing the same tree collide. The loop itself is safe — its runs are
    sequential (each waits for the previous to exit).

  ⚠ SECURITY: uses --dangerously-skip-permissions so the agent can build/commit/push
    unattended. Run only on a repo + machine where that is acceptable.
#>
param(
  [int]$PollMinutes = 15,
  [string]$RepoRoot = "C:\venkat\limca\gozaika\sourcecode",
  [string]$Model = "opus",
  [int]$MaxRuns = 0   # 0 = unlimited
)

$ErrorActionPreference = "Stop"
Set-Location $RepoRoot

$logDir = Join-Path $RepoRoot "scripts\autorun-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stopFile = Join-Path $RepoRoot "STOP-AUTORUN"
$haltPattern = 'AUTORUN_HALT:'

$prompt = @'
You are running UNATTENDED and HEADLESS overnight. Build the goZaika mobile slices autonomously.

1. Read docs/mobile/CONTINUE-HERE.md (the authoritative entry point) and follow it EXACTLY, including the "Headless / overnight autonomous mode" section.
2. Confirm state first: `git log --oneline -20` and `node scripts/mobile-ci.mjs` (must be 7/7 before AND after your work).
3. Build the NEXT not-yet-done slice in the listed order, one vertical at a time: contracts -> BFF -> screens -> fixture/test -> gate 7/7 -> live-prove -> commit+push ONLY your slice's files -> update the slice tracker AND CONTINUE-HERE.md "Current state"/"Next-up" in the same commit so the next run never redoes work.
4. Do as many slices as the budget allows, committing+pushing each.

HARD STOP — print the EXACT line `AUTORUN_HALT: <reason>` and then END (do not continue) when:
 - you reach a review-gated item (Slice 12 document upload, real Razorpay) — do NOT build it;
 - the gate (node scripts/mobile-ci.mjs) fails and you cannot fix it cleanly;
 - the only remaining work would touch another agent's product-media files;
 - all buildable slices are done.
NEVER exit with an uncommitted tree: finish+commit the vertical, or `git restore`/`git clean` your partial edits before halting.
'@

$run = 0
while ($true) {
  if (Test-Path $stopFile) { Write-Host "STOP-AUTORUN present — exiting loop." -ForegroundColor Yellow; break }
  if ($MaxRuns -gt 0 -and $run -ge $MaxRuns) { Write-Host "MaxRuns ($MaxRuns) reached — exiting loop." -ForegroundColor Yellow; break }
  $run++

  # Best-effort: stay current with the active remote (safe when the tree is clean).
  git pull --ff-only 2>$null | Out-Null

  $headBefore = (git rev-parse HEAD).Trim()
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $log = Join-Path $logDir "run-$stamp.log"
  Write-Host "[$stamp] run #$run — launching headless claude ($Model) -> $log" -ForegroundColor Cyan

  # Headless agentic run; tee to the log for morning review.
  claude -p $prompt --model $Model --dangerously-skip-permissions 2>&1 | Tee-Object -FilePath $log
  $out = (Get-Content $log -Raw -ErrorAction SilentlyContinue) ?? ""

  if ($out -match $haltPattern) {
    Write-Host "[$(Get-Date -Format HH:mm:ss)] agent halted intentionally — loop stops:" -ForegroundColor Green
    ($out | Select-String $haltPattern).Line | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
    break
  }

  $headAfter = (git rev-parse HEAD).Trim()
  if ($headAfter -ne $headBefore) {
    Write-Host "[$(Get-Date -Format HH:mm:ss)] progress: $($headBefore.Substring(0,7)) -> $($headAfter.Substring(0,7)); relaunching in 20s." -ForegroundColor Green
    Start-Sleep -Seconds 20
  } else {
    Write-Host "[$(Get-Date -Format HH:mm:ss)] no new commit (likely rate-limited); sleeping $PollMinutes min." -ForegroundColor DarkGray
    Start-Sleep -Seconds ($PollMinutes * 60)
  }
}
