# Audits

Convention for point-in-time audit runs (hands-on product/technical audits, their
resulting strategy work, and the implementation that closed the gaps they found).

## Folder pattern

Each audit run gets its own dated folder: `docs/audits/<YYYY-MM-DD>-<slug>/`, containing:

- **`README.md`** — run summary: scope, method, verdict, key outcomes, and what shipped
  (link the PR/commit that merged the fix). This is the one file worth reading first.
- **`audit.md`** — the audit findings themselves (scorecard, numbered gaps, evidence
  references). Write-once; don't edit after the run except to correct factual errors.
- **`evidence/`** — screenshots or other artifacts backing specific findings.
- **`follow-ups.md`** — durable items that were *not* closed by the immediate
  implementation push: known bugs, deferred scope, device-verification gaps. Cross-link
  the durable backlog they feed (e.g. `docs/operations/go-live-gap-plan.md`) rather than
  duplicating it — this file is for context and traceability back to the audit, not a
  second source of truth for open work.
- Any strategy artifact the audit produced (e.g. `business-model-strategy.md`) if the
  audit surfaced a positioning/business-model question that needed a separate written
  discussion. If the strategy work is later superseded by a canonical doc elsewhere
  (e.g. `docs/strategy/`), leave a pointer in this folder's README rather than deleting
  the rationale — it explains *why* the canonical doc says what it says.

## What does NOT belong here

- **Live/in-progress session state** (a running "CONTINUE-HERE" doc, current branch name,
  next-step scratch notes). That belongs in the working session only — extract anything
  durable into `follow-ups.md` when the run closes, then delete the live-state file.
  Git history + commit messages are the record of *how* it was built; these folders are
  the record of *what was found and why*.
- **Still-open, actively-worked backlogs.** If a gap list keeps getting updated as items
  close (e.g. a P0/P1/P2 go-live punch list), it isn't audit history — it's an operational
  document. Put it under `docs/operations/` and just link to it from the audit's
  `follow-ups.md`.

## Reusable kickoff prompt

`kickoff-prompt-template.md` is a generalized paste-ready prompt for spinning up a fresh
implementation session off a completed audit. Copy it, fill in the bracketed pointers to
the new audit's `audit.md`/strategy doc, and paste into a fresh session to begin
implementation with full context and the same discipline (handoff docs, gate hygiene,
model/effort guidance, anti-drift rules) that produced good results last time.

## Past runs

- [`2026-07-05-launch-readiness/`](2026-07-05-launch-readiness/README.md) — 5-app
  launch-readiness audit → business-model convergence → feature-parity implementation.
  Closed 2026-07-08 (PR [#1](https://github.com/gozaika/goz-website/pull/1), squash
  `d8dae0d`, merged to `main`).
