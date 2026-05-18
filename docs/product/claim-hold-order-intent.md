# Slice 4A Product Notes: Claim Hold / Order Intent

Slice 4A turns public drop discovery into a temporary reservation flow without taking payment.

## Product Promise

A signed-in consumer can hold one available BAM Bag from a public active or scheduled drop, see the hold expiry and safety disclosures, and understand that payment is not charged yet.

## Included

- Claim CTA on public drop cards and detail pages for eligible active/scheduled drops.
- Anonymous claim gate through `/auth/login?next=...`, preserving the intended drop claim flow through consent where practical.
- `POST /api/claims` creates a temporary hold through `api_create_inventory_hold`.
- Client idempotency keys plus server-side duplicate active-hold checks prevent retry/double-click duplicate holds.
- Hold confirmation at `/checkout/{holdPk}` shows restaurant, bag title, dietary category, allergens, pickup window, price, quantity held, and expiry countdown.
- Account page shows active/recent claim holds as payment-pending intents.
- Restaurant recent drops show held quantity separately from available quantity and make clear holds are not paid.
- Admin `/admin/drops` shows active/recent hold metadata for launch support.
- Expired hold release remains an operational job through `api_release_expired_inventory_holds` and the existing `release-expired-holds` Edge Function.

## Not Included

- Razorpay order creation or Checkout.js.
- Payment capture or webhook verification.
- Paid, confirmed, ready-for-pickup, collected, refund, settlement, invoice, payout, or finance states.
- Pickup QR/OTP.
- WATI, email, push, notification outbox processing, or campaign management.
- Admin destructive hold cancellation.

## Claimability Rules

A drop can be held when:

- It is visible through the public drop read model.
- The restaurant is active.
- The drop status is `ACTIVE` or `SCHEDULED`.
- The drop is published.
- The pickup window has not ended.
- Computed available quantity is at least the requested quantity.

Disabled states must be specific: sold out, paused, drop closed, drop cancelled, pickup window closed, or not available to claim.

## Safety Copy

Consumer screens must not say the bag is paid, confirmed, ready for pickup, or collectible. The correct state is a temporary hold/payment-pending intent. Dietary and allergen disclosures stay visible in the confirmation flow because they are safety-critical.

## Completion Gate

The slice is complete when a signed-in consumer can create one temporary hold without oversell, anonymous consumers are returned through login, expired holds can be released operationally, and restaurant/admin can see enough hold state for launch support without direct database access.
