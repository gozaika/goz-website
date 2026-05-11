# Payments Runbook

## Non-Negotiables

- Client-side Razorpay success callbacks are only a pending UX signal.
- Payment state changes are trusted only after Razorpay webhook signature verification.
- Money is always bigint paise.
- Webhook event storage is idempotent by Razorpay event id.
- PII must not be logged.

## Flow

1. Server validates claim request and calls `api_create_inventory_hold`.
2. Server creates a Razorpay order and stores `payment_order_intent`.
3. Client opens Razorpay checkout.
4. `supabase/functions/razorpay-webhook` verifies signature.
5. Verified captured payments create payment transactions and convert the hold/order state.
6. Failed or expired payments release inventory through hold expiry logic.

## HUMAN_REVIEW

Before production, review Razorpay event names, settlement mapping, refund authorization, replay handling, and operational alerting with finance and security.

