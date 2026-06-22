# Functional test harness (mobile BFF integration)

Black-box functional tests that hit the **running** mobile BFF (`/api/mobile/v1`)
against **local Supabase** with **real bearer tokens** minted for each demo role,
asserting the role matrix, happy paths and no-leakage invariants across every
shipped mobile slice. This is the integration layer above Vitest contract tests and
below Maestro device E2E.

## What it covers
- **auth & envelope** — unauthenticated → 401, stale schema → 426, `GET /me`, `POST /auth/bootstrap`.
- **counter (Slice 7)** — `GET /orders` for all roles, cross-restaurant 403, verify/incidents FINANCE-denied vs PICKUP-allowed.
- **profile (Slice 12)** — read for all roles, `canEditBasics` per role, PATCH role gating, no raw FSSAI/GSTIN/PAN, geo-options.
- **templates & drops (Slice 13)** — list/publish role gating; OWNER publish happy path.
- **dashboard (Slice 14)** — role-shaped variants (FULL / QUEUE_ONLY / SUMMARY) + section presence.
- **finance (Slice 15)** — `viewFinance` gating; masked-payout-only invariant.

## Run it (turnkey, Windows PowerShell 5.1 or PS7)
Starts the BFF, runs the suites, tears down. Use `powershell` (you do **not** need
to install `pwsh`):
```powershell
npm run db:seed:functional                                                  # one-time per DB
powershell -ExecutionPolicy Bypass -File scripts/functional/run.ps1         # all suites
powershell -ExecutionPolicy Bypass -File scripts/functional/run.ps1 -Filter finance
powershell -ExecutionPolicy Bypass -File scripts/functional/run.ps1 -KeepServer
```
Prereqs: local Supabase running (`npx supabase start`). `npm run db:seed:functional`
applies the seeds the harness needs (active template + counter order). Cold/unmigrated
DB: `npx supabase db reset` first, then `npm run db:seed:functional`.

## Run it (manual / CI)
With the BFF already running and env set:
```bash
ANON_KEY=<local anon key> SUPABASE_URL=http://127.0.0.1:54321 BFF_ORIGIN=http://127.0.0.1:3001 \
  node scripts/functional/run.mjs            # or: npm run test:functional
```
Exit code is 0 on all-pass, 1 on failure, 2 on preflight failure (BFF/keys missing).

## Architecture
- `harness.mjs` — zero-dependency framework (`suite`/`test`/`expect`, ordered runner, PASS/FAIL report, exit code).
- `context.mjs` — config + demo-role **token minting** (test_otp) + thin `api()` HTTP client. Identity only; no secrets.
- `suites/*.mjs` — one file per domain; each registers cases via `suite()`.
- `run.mjs` — preflight + register suites + run. `run.ps1` — turnkey wrapper.

Adding a slice = add `suites/<name>.mjs` and import it in `run.mjs`.
