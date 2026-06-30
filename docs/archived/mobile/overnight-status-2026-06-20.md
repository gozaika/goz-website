# Overnight status — 2026-06-20 (mobile parity)

Written autonomously while you slept. This is the morning handoff. No blocking
questions — decisions + assumptions are noted inline.

## TL;DR

- **Slices 0–6 are merged to `main` and pushed to GitHub** (`origin/main` @ `7b72c64`).
- **Server-side consolidated smoke PASSED** against real local Supabase (Slices 3+4+5+6 end-to-end). This is the authoritative "it works" evidence.
- **Native Android build now compiles** after fixing three toolchain issues (npm, JDK, Gradle 9→8.13). Maestro is installed. Native UI E2E was in progress at write time — see "In-flight".
- **3 agents launched in parallel** on Slices 8, 12, 15 (isolated worktrees). Review/merge in the morning.

## What's done and on `main`

| Slice | What | State |
|---|---|---|
| 0 | Parity ledger, role-matrix gap doc, demo-identity manifest, drift gate | merged |
| 1 | Rename → `restaurant-mobile`, goZaika identities, Expo Router shells | merged |
| 2 | `@gozaika/mobile-core` + `mobile-ui` + Maestro/test harness | merged |
| 3 | Bearer BFF foundation + canonical contracts (`packages/types/src/mobile`) | merged |
| 4 | Restaurant role policy (`capabilities.ts`) + bootstrap (fixes D1) | merged |
| 5 | Demo phone/OTP linkage (partial — see "Known issue: linkage SQL") | merged |
| 6 | Native auth (phone OTP, SecureStore, consent, sign-out) | merged |

Drift gate `node scripts/mobile-ci.mjs` was green 7/7 at each merge.

## Server-side smoke — PASSED ✅

Orchestrator: `scripts/smoke/otp-bff-smoke.sh` (+ `scripts/smoke/probe.mjs`). Against local Supabase + the restaurant BFF:

- Phone-OTP via `test_otp` → tokens minted for owner/finance/pickup/consumer (Slice 5).
- BFF `/health` + `/me` envelope correct; no-auth → 401 (Slice 3).
- Restaurant bootstrap → actor `isRestaurantUser`, memberships + roles (Slice 4).
- **Live policy**: owner asking for another restaurant's summary → **403 FORBIDDEN** (tenant isolation).
- **D1 invariant**: owner bootstrap created **0** consumer_profile rows.

To reproduce, see "Local smoke runbook" below.

## Two environment issues I worked around (NOT code bugs — for your awareness)

1. **`.env.local` points at a *remote* Supabase** (`nxvthewcwimrpjbzbcvx`, new `sb_*` keys) while your local stack uses legacy `eyJ…` keys. A *local* smoke needs local URL+keys. I temporarily swapped them in and **restored `.env.local`** afterward. For routine local work you'll want a dedicated local env profile. (Backup was `/tmp/env.local.bak`.)
2. **`expo run:android` prebuild injected `expo`/`react`/`react-native` into the *root* `package.json`**, breaking `expo-router`'s `@expo/log-box` peer (ERESOLVE). I removed that stray block and added a root **`.npmrc`** (`legacy-peer-deps=true`). These two files are **uncommitted** alongside your image-script WIP — commit them when you commit that work.

## Known issue: the Slice 5 linkage SQL is incomplete for GoTrue OTP

`supabase/seed_demo/demo_test_otp_linkage.sql` sets phones but **not** the fields GoTrue needs to OTP a SQL-seeded user. To make the smoke reproducible without manual psql, it must also, for the demo users (`id like '20000000%'`):
- `instance_id = '00000000-0000-0000-0000-000000000000'`
- coalesce NULL → `''` for: `confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token`
- (ideally) an `auth.identities` row per phone, though instance_id + token columns were sufficient for OTP sign-in in testing.

**Recommended follow-up**: add these UPDATEs to the linkage SQL + commit `scripts/smoke/`. (Left for review rather than auto-committed into the seed.)

## Native Android E2E — build pipeline fixed

Path to a dev build on `emulator-5554` (host reachable at `10.0.2.2`), in order of blockers hit + fixed:
1. **npm ERESOLVE** — fixed (root deps removed + `.npmrc`).
2. **`JAVA_HOME` not set** — JDK is Android Studio's JBR at `C:\Program Files\Android\Android Studio\jbr` (OpenJDK 21).
3. **Gradle 9.0.0 `JvmVendorSpec.IBM_SEMERU`** — RN 0.83's plugin is incompatible with Gradle 9; **downgraded the wrapper to 8.13** (`apps/consumer-mobile/android/gradle/wrapper/gradle-wrapper.properties`). Build then compiled past the error.

Device env baked into the build: `apps/consumer-mobile/.env` and `apps/restaurant-mobile/.env` (gitignored) point EXPO_PUBLIC at `10.0.2.2:54321` (Supabase) and `:3000/:3001` (BFF) with the **local** anon key.

Maestro installed at `~/.maestro/bin/maestro` (needs `JAVA_HOME` set to the JBR to run).

## Native UI E2E — PASSED ✅ (Maestro on the emulator)

The Android dev build built (Gradle 8.13), installed `in.gozaika.customer` on `emulator-5554`, loaded the Metro bundle, and **renders the real app** — confirmed by screenshot: the correct **5-tab customer IA (Home/Drops/Restaurants/Orders/Account)**, goZaika brand (saffron accent, forest header), and the Slice-6 auth/consent entry points, all from `@gozaika/mobile-ui`.

`maestro test apps/consumer-mobile/.maestro/smoke-devclient.yaml` → **all steps COMPLETED (exit 0)**: Home → Drops ("Limited Drops") → Restaurants → Orders ("Your orders") → Account → Home. So the full native pipeline (build → install → Metro → render → Maestro-driven nav) works on-device.

Notes for reuse:
- The committed `smoke.yaml` (`launchApp` + clearState) is for a **preview build (no expo-dev-client)** — the dev-client launcher/dev-menu overlay breaks a clean `launchApp` flow. `smoke-devclient.yaml` is for a locally-loaded dev build.
- To run: set `JAVA_HOME` to the Android Studio JBR and put `platform-tools` on PATH, then `~/.maestro/bin/maestro test ...`. Device env baked at build time via `apps/consumer-mobile/.env` (host `10.0.2.2`, local keys).
- A login E2E (enter demo phone/OTP) is the natural next flow — the app points at local Supabase, so `+919876510001 / 100001` would sign in. Not yet scripted.

## In-flight at write time (will update / see notifications)

- **3 parallel agents** (isolated git worktrees, on branches):
  - **Slice 8** — customer discovery + restaurant profiles (BFF + native screens + contracts).
  - **Slice 12** — restaurant onboarding/compliance/profile (role-gated via Slice 4 `withMobileRestaurantRole`).
  - **Slice 15** — restaurant finance/ROI (read-only, role-gated).
  Each was told to: `npm install` in its worktree, follow the canonical contract pattern, pass `node scripts/mobile-ci.mjs --fast`, update the ledger + plan, and commit. **They avoided payment/pickup (Slices 7/9) which require your human review.**

## Morning review checklist

1. **Agents**: each worktree has a branch with a commit. Review each, run `node scripts/mobile-ci.mjs` in it, then merge to `main`. Expect a trivial conflict on `packages/types/src/mobile/index.ts` (each adds export lines) — resolve by keeping all exports.
2. **Native E2E**: check if the build installed (`adb shell pm list packages | grep gozaika`); if so, run the Maestro flow.
3. **Commit** the `.npmrc` + root `package.json` cleanup (with your image WIP) and consider the linkage-SQL fix above.
4. **Human-review gate**: Slice 4's role policy (`packages/types/src/mobile/capabilities.ts`, `apps/restaurant-mgmt-web/lib/mobile/restaurant-auth.ts`) needs your sign-off before Slice 7 (counter) is built.

## Local smoke runbook (reproduce anytime)

```bash
# 1. local Supabase up (docker), migrations applied
# 2. demo data + phone linkage:
for f in demo_seed demo_seed_part2_catalog_drops demo_seed_part3_orders_reviews demo_seed_part4_functions demo_test_otp_linkage; do
  docker exec -i supabase_db_sourcecode psql -U postgres < "supabase/seed_demo/$f.sql"; done
# 2b. GoTrue-compat patch (until linkage SQL is fixed): set instance_id + ''-token columns (see "Known issue")
# 3. ensure config.toml [auth.sms.test_otp] is loaded:  supabase stop && supabase start
# 4. point a local env at the LOCAL stack (URL + legacy eyJ keys from `supabase status -o env`)
# 5. run a BFF dev server with that local env (npm run dev:restaurant), then:
bash scripts/smoke/otp-bff-smoke.sh http://localhost:3001
```
