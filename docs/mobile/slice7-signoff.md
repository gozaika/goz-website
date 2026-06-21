# Mobile Slice 7 (Restaurant Pickup Counter) — Security Sign-Off Record

**Status: SIGNED OFF — accepted by human review on 2026-06-21.**
Reviewer: project owner (tech@razzl.com). Scope: the role-safe restaurant pickup
counter (`/api/mobile/v1/orders*` + `restaurant-mobile` counter screens), branch
`mobile/slice7-counter`, merged to `main` on sign-off.

This is the mandatory human security review the implementation plan (§2, Slice 7)
requires before the slice is considered done. It records the five review decisions
and their evidence.

## Decisions

| # | Area | Decision | Basis |
| - | ---- | -------- | ----- |
| **A** | Role + tenant enforcement | **ACCEPT** | Live-proven. `scripts/smoke/slice7-role-smoke.mjs` → 9/9: FINANCE denied `ROLE_DENIED` on verify/incidents, allowed `viewOrders`; PICKUP_STAFF passes the role gate (404 tenant, not 403); cross-restaurant `FORBIDDEN`; no token `UNAUTHENTICATED`. Enforced by `withMobileRestaurantRole` + per-order `loadOrderRestaurantFk` tenant check. |
| **B** | Pickup credential replay/idempotency | **ACCEPT NOW, harden-later (done)** | Canonical `resolvePickupCredential` (SHA-256 over the pickup secret) + server RPC. Stable per-action idempotency key shipped (`useStableIdempotencyKey`); OTP brute-force throttle (5 failed/order/10 min → `RATE_LIMITED`); raw OTP cleared on terminal result. `scripts/smoke/slice7-verify-smoke.mjs` → 6/6 incl. replay-deduped and rate-limit. |
| **C** | Offline behavior | **KEEP FAIL-SAFE** | Verification stays online-only; a `NETWORK` failure shows "Not confirmed — no network" and never marks collected. No store-and-forward for collection (a queued offline verify could falsely collect). Verified on-device. |
| **D** | Server authority (no-show / incident) | **ACCEPT** | All mutations are server-authoritative via `api_verify_order_pickup` / `api_mark_order_no_show` / `api_create_order_incident`; the no-show window is enforced by the RPC, not the client. |
| **E** | Information leakage | **ACCEPT** | Errors flow through `mobileRpcError` → generic envelope codes/messages; no raw RPC/Postgres text reaches the client. `VALIDATION` fieldErrors echo only our own Zod messages. |

## Evidence summary

- Server: role smoke 9/9, verify smoke 6/6 (against live local Supabase, DB-resolved scopes).
- Device: on-emulator Maestro run PASSED (Pixel_7, dev-client with expo-camera) — login → queue → wrong OTP `INVALID CODE` → correct OTP `Collected`. Caught + fixed a real `spiceLevelCode` nullable contract bug.
- Gate: `node scripts/mobile-ci.mjs` → 7/7 (typecheck, vitest, expo export both apps, drift scans).

## Boundaries / still deferred (not part of this sign-off)

- **Web authorization (defect D2)** remains deferred — these mobile endpoints do not change the web cookie handlers. See `role-matrix-enforcement-gap.md` §6.
- True store-and-forward offline queue: intentionally NOT built for verification (decision C).
- Razorpay/payment (Slice 9) is a separate slice requiring its own review.
