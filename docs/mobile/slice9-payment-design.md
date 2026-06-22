# Mobile Slice 9 — Payment + gated simulator (design & security record)

Status: in progress (2026-06-22). Security model reviewed with the project owner.
Decisions: **single env-flag gate** for the simulator; **build the full simulator
path now + stub the real Razorpay provider** (real keys arrive ~1 month out).

## Why a simulator
Razorpay test/live accounts require an India entity + India mobile number, which we
don't have yet. We build the *real* integration architecture now, with a controlled
simulator standing in for the Razorpay gateway so the claim → pay → order → pickup
loop is demo-/test-able today and swaps to real Razorpay by config later.

## Canonical flow (must not be bypassed)
1. Claim a drop → `api_create_inventory_hold(p_drop_pk, p_idempotency_key, p_quantity, p_hold_minutes)` → hold.
2. Checkout → insert `payment_order_intent` (CREATED) → create the provider order.
3. Payment captured → **`api_convert_paid_hold_to_order(...)`** (the webhook's RPC) →
   real `order_order` + pickup credential. This is server-authoritative and the ONLY
   way an order becomes paid.
4. Pickup proof (OTP/QR) → the customer shows it; the restaurant counter verifies it
   (Slice 7, `api_verify_order_pickup`).

The web surface already implements 1–3 (`consumer-web/app/api/checkout/*`, the
`razorpay-webhook` edge function). Slice 9 brings this to the customer mobile app and
adds the simulator.

## Mobile BFF endpoints (`consumer-web/app/api/mobile/v1`, bearer-auth)
- `POST /claims` — create a hold (reuses `api_create_inventory_hold`).
- `POST /checkout/order` — create the payment intent + provider order. Returns
  `{ mode, ... }`:
  - `mode: "razorpay"` (real): creates the Razorpay order, returns the **public**
    `keyId` + order ref + prefill (the real flow; provider call **stubbed** until keys).
  - `mode: "simulated"`: creates the intent with `provider_order_ref: "sim_<uuid>"`,
    **no Razorpay call**, returns the order summary.
- `GET /checkout/status?holdPk=` — poll hold/intent/order (reuses the web status logic).
- `POST /checkout/simulate` — **GATED, dev/demo only.** Body `{ holdPk, outcome }`.
  - `SUCCESS` → insert a `payment_webhook_event` tagged `SIMULATED` → call the *same*
    `api_convert_paid_hold_to_order` with the `sim_` refs → real order + pickup credential.
  - `FAILURE` → `api_record_razorpay_payment_failed`.
- `GET /orders/:id/pickup-proof` — the order's pickup OTP/QR (consumer owns the order).

## Provider mode resolution
`mode` is `"simulated"` iff `PAYMENTS_SIMULATOR_ENABLED === "true"`, else `"razorpay"`.
When real keys land: set the flag to `false` (or unset) and configure the Razorpay
keys; `checkout/order` returns `mode: "razorpay"` and the simulator path is unreachable
at runtime.

## Security model (review record)
1. **Server is always authoritative.** Even simulated payments run the canonical
   `api_convert_paid_hold_to_order`; the resulting order + pickup credential are
   identical to a real payment. The client never marks itself paid; it polls status.
2. **Simulator gate (single guard, per owner decision).** `/checkout/simulate` returns
   `NOT_FOUND` unless `PAYMENTS_SIMULATOR_ENABLED === "true"` (explicit; defaults off).
   Every invocation is logged (`payment_simulate_invoked`) for an audit trail, and the
   simulated payment refs are tagged `sim_` in `payment_order_intent` /
   `payment_webhook_event` so they're distinguishable in the ledger.
   - **⚠ Caveat of single-guard:** there is no `NODE_ENV !== "production"` backstop, so
     this flag **must be `false` in every production/live environment**. Treat enabling
     it in production as equivalent to opening a payment backdoor. (Two-guard was
     offered and declined for demo-on-deployed-env flexibility.) Re-evaluate before go-live.
3. **No secrets on mobile.** `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` stay
   server-side. Mobile receives only the public `keyId` in the real flow.
4. **Simulator bypasses only the Razorpay signature** (there is no real payment to
   sign). It does NOT bypass: hold ownership/validity/expiry, amount derivation,
   idempotency, or order creation — all run exactly as in production.

## Real Razorpay provider (stub until keys)
The `checkout/order` real branch mirrors `consumer-web/app/api/checkout/razorpay-order`
(create intent → POST `api.razorpay.com/v1/orders` with `keyId:secret` → return payload).
Until keys exist it returns a clear `503 "Razorpay not configured"`; the React-Native
Razorpay checkout (SDK/WebView) is wired behind the same client interface as the
simulated screen, so dropping in keys + the flag flip activates the real path with no
client rework.
