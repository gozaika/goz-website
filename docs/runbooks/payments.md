# Payments Runbook

## Non-Negotiables

- Slice 4A creates temporary inventory holds only. No Razorpay API, Checkout.js, webhook, payment transaction, paid order, pickup QR, refund, or settlement code is active yet.
- Client-side Razorpay success callbacks are only a pending UX signal.
- Payment state changes are trusted only after Razorpay webhook signature verification.
- Money is always bigint paise.
- Webhook event storage is idempotent by Razorpay event id.
- PII must not be logged.

## Slice 4A Hold Flow

1. Server validates `claimRequestSchema`.
2. Server checks the public drop is claimable and the consumer is authenticated.
3. Server calls `api_create_inventory_hold`.
4. Consumer sees a payment-pending hold confirmation with expiry.
5. Expired holds are released by `api_release_expired_inventory_holds` through the operational Edge Function path.

No payment provider is contacted in Slice 4A.

## Slice 4B Target Flow

1. Server validates claim request and calls `api_create_inventory_hold`.
2. Server creates a Razorpay order and stores `payment_order_intent`.
3. Client opens Razorpay checkout.
4. `supabase/functions/razorpay-webhook` verifies signature.
5. Verified captured payments create payment transactions and convert the hold/order state.
6. Failed or expired payments release inventory through hold expiry logic.

## HUMAN_REVIEW

Before production, review Razorpay event names, settlement mapping, refund authorization, replay handling, and operational alerting with finance and security.
