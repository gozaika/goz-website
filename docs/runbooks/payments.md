# Payments Runbook

## Non-Negotiables

- Slice 4B creates Razorpay orders from active Slice 4A holds and confirms orders only from verified webhooks.
- Client-side Razorpay success callbacks are only a pending UX signal.
- Payment state changes are trusted only after Razorpay webhook signature verification.
- Money is always bigint paise.
- Webhook event storage is idempotent by Razorpay event id.
- PII must not be logged.
- Raw webhook payloads, Razorpay secrets, pickup QR nonce, OTP, and pickup credential hashes are never exposed to browser-safe views.

## Slice 4A Hold Flow

1. Server validates `claimRequestSchema`.
2. Server checks the public drop is claimable and the consumer is authenticated.
3. Server calls `api_create_inventory_hold`.
4. Consumer sees a payment-pending hold confirmation with expiry.
5. Expired holds are released by `api_release_expired_inventory_holds` through the operational Edge Function path.

No payment provider is contacted in Slice 4A.

## Slice 4B Target Flow

1. Consumer creates an active Slice 4A hold.
2. `POST /api/checkout/razorpay-order` validates the authenticated owner, active status, expiry, quantity, and amount.
3. Server creates or reuses `payment_order_intent`, calls Razorpay Orders API with `RAZORPAY_KEY_SECRET`, and returns Checkout-safe fields plus `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
3. Client opens Razorpay checkout.
4. `supabase/functions/razorpay-webhook` verifies signature.
5. Verified captured payments call `api_convert_paid_hold_to_order`.
6. The RPC records `payment_transaction`, creates `order_order` and `order_item`, appends `PAID` and `CONFIRMED` transitions, appends `HOLD_CONVERTED`, moves reserved inventory to sold inventory, and marks the hold `CONVERTED`.
7. Failed payments call `api_record_razorpay_payment_failed`; the hold remains unpaid and can be retried while active.
8. Expired unpaid holds still release through `api_release_expired_inventory_holds`.

## Required Environment

Consumer web:

```text
NEXT_PUBLIC_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
PICKUP_CREDENTIAL_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

Supabase Edge Function:

```text
RAZORPAY_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

`PICKUP_CREDENTIAL_SECRET` must be at least 32 random characters. Consumer order detail generates a QR nonce and OTP on demand, stores only salted hashes on `order_order`, and returns raw proof only to the authenticated order owner.

## Webhook Idempotency

- Duplicate Razorpay event ids hit the `payment_webhook_event(provider_code, provider_event_id)` unique constraint and return `duplicate: true`.
- Duplicate captured payment ids hit `payment_transaction(provider_code, provider_payment_ref)` and update the existing transaction.
- If a payment intent already has `order_fk`, `api_convert_paid_hold_to_order` returns the existing order instead of creating another one.
- If the hold is already converted, the RPC links the payment intent to the converted order and returns idempotently.

## Smoke Test

1. Create a public active drop and signed-in consumer hold.
2. Open `/checkout/{holdPk}`.
3. Click `Proceed to payment` and complete Razorpay test checkout.
4. Confirm the page says payment is pending after Checkout.js returns.
5. Confirm the webhook row becomes `PROCESSED`.
6. Confirm one `payment_transaction` row exists for the Razorpay payment id.
7. Confirm one order exists for the hold and the hold is `CONVERTED`.
8. Confirm `/orders/{orderPk}` shows order number, paid amount, pickup window, disclosures, QR proof, and OTP.
9. Replay the same webhook payload and confirm no second order is created.

## Rollback Notes

- If checkout creation fails, unset `NEXT_PUBLIC_RAZORPAY_KEY_ID` or disable the payment CTA through deployment rollback. Existing unpaid holds still expire normally.
- If webhook processing fails, leave the raw webhook ledger row intact, fix the processor/RPC, then replay from Razorpay or manually re-send the provider event through the approved support path.
- Do not manually update `quantity_reserved`, `quantity_sold`, or payment/order status tables without a reviewed SQL correction plan.

## HUMAN_REVIEW

Before production, review Razorpay event names, settlement mapping, refund authorization, replay handling, and operational alerting with finance and security.
