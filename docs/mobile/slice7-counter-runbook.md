# Slice 7 — Restaurant Counter Runbook

How to verify the pickup counter (role enforcement, server-authoritative
verification, idempotency/replay, rate-limit, and the device flow) on local
Supabase. Companion to the Slice 7 plan section and `mobile-parity-ledger.md`.

## Prerequisites

- Local Supabase up (`supabase start`); REST at `http://127.0.0.1:54321`.
- Demo role staff seeded (`supabase/seed_demo/demo_test_otp_linkage.sql`) — Bawarchi
  OWNER/ADMIN/OPERATIONS/PICKUP_STAFF/FINANCE with `test_otp` logins.
- Verifiable order seeded:
  `psql < supabase/seed_demo/slice7_counter_pickup_order.sql`
  → order `GZ-SMOKE-0001` on Bawarchi, OTP **246810**, paired with
  `PICKUP_CREDENTIAL_SECRET = local-smoke-pickup-secret-0123456789-abcdef`.

## Server smokes (no device needed)

Start the BFF against local Supabase with the matching secret:

```bash
eval "$(npx supabase status -o env | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY|API_URL)=')"
NEXT_PUBLIC_SUPABASE_URL=$API_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY \
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
PICKUP_CREDENTIAL_SECRET=local-smoke-pickup-secret-0123456789-abcdef \
npm run -w @gozaika/restaurant-mgmt-web dev -- -p 3001
```

1. **Role + tenant isolation** (`scripts/smoke/slice7-role-smoke.mjs`) — FINANCE
   denied on verify/incidents (`ROLE_DENIED`), allowed on `GET /orders`;
   PICKUP_STAFF allowed; cross-restaurant `FORBIDDEN`; no token `UNAUTHENTICATED`.
   Last run: **9/9**.
2. **Verification + replay + rate-limit** (`scripts/smoke/slice7-verify-smoke.mjs`) —
   wrong→`INVALID_CODE`, correct→`SUCCESS`, replay same key→`SUCCESS` (deduped),
   re-verify→`ALREADY_COLLECTED`, 5 failures then `RATE_LIMITED`. Inserts a fresh
   order per run (the verification-event table is append-only). Last run: **6/6**.

```bash
ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY SUPABASE_URL=$API_URL \
PICKUP_CREDENTIAL_SECRET=local-smoke-pickup-secret-0123456789-abcdef \
  node scripts/smoke/slice7-verify-smoke.mjs
```

## Device flow (Maestro)

`apps/restaurant-mobile/.maestro/counter-pickup.yaml` drives Orders → open
`GZ-SMOKE-0001` → wrong OTP (`INVALID CODE`) → correct OTP (`Collected`).

> **Native rebuild required:** Slice 7 added `expo-camera`, so the QR scanner needs
> a fresh dev-client build before this flow runs on an emulator:
> `cd apps/restaurant-mobile && npx expo run:android` (JBR JDK 21, Gradle 8.13 — see
> the Slice 6 native build notes). Sign in as PICKUP_STAFF (+91 98765 30003 / OTP
> 300003), select Bawarchi, then `maestro test .../counter-pickup.yaml`.

## Notes

- The verify event table (`order_pickup_verification_event`) is **append-only** (DB
  immutability trigger) — smokes create fresh orders rather than resetting it.
- The pickup OTP hash is `sha256(SECRET || ':' || OTP)`; the seed computes it with
  pgcrypto `digest()` so it matches the BFF's `hashPickupCredential`.
