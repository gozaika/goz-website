# Claim Holds Runbook

Slice 4A reserves inventory temporarily. Slice 4B can convert an active hold into a paid confirmed order after a verified Razorpay webhook.
Slice 5 keeps converted holds as history while pickup verification changes only the paid order state to `COLLECTED` or `NO_SHOW`.

## Remote Migration

Apply `supabase/migrations/20260518002000_slice4a_claim_hold_order_intent.sql` to the target Supabase project before deploying the app changes.

Exact operator path:

1. Open the target Supabase project.
2. Open SQL Editor.
3. Paste the full contents of `supabase/migrations/20260518002000_slice4a_claim_hold_order_intent.sql`.
4. Run it once.
5. Verify:

```sql
select to_regprocedure('public.api_create_inventory_hold(uuid,text,integer,integer)');
select to_regclass('public.api_claim_hold_summary');
```

## Hold Creation Smoke Test

1. Confirm at least one public `ACTIVE` or `SCHEDULED` drop exists with available quantity.
2. Open the drop on `https://customer.gozaika.in/drops/{dropPk}` in a signed-out browser.
3. Tap `Hold this BAM Bag`.
4. Confirm login opens with a return path.
5. Sign in and complete required consent if prompted.
6. Confirm the hold confirmation screen appears.
7. Confirm the screen says payment is not implemented yet and does not show QR/OTP.
8. Return to the drop and confirm remaining availability decreased.

## Restaurant Smoke Test

1. Sign in to `https://restaurant.gozaika.in/`.
2. Open `/portal/drops/new`.
3. Confirm recent drops show available quantity and held/not-paid quantity.
4. Confirm staff cannot create consumer holds manually.

## Admin Smoke Test

1. Sign in to `https://admin.gozaika.in/`.
2. Open `/admin/drops`.
3. Confirm active/scheduled drops still show launch comms copy.
4. Confirm active/recent hold intents show hold id, consumer reference, restaurant, drop, quantity, pickup window, expiry, and status.
5. Confirm the page does not expose payment provider data, private compliance data, QR, OTP, or refund actions.

## Expired Hold Release

The existing Supabase Edge Function is `release-expired-holds`. It calls:

```sql
select public.api_release_expired_inventory_holds(500);
```

Run or schedule the Edge Function using the approved Supabase operations path for the target project. A successful run returns a JSON payload with `ok: true` and `released: <count>`.

Post-run verification:

```sql
select hold_status_code, count(*)
from drop_inventory_hold
group by hold_status_code
order by hold_status_code;
```

Availability returns when expired `ACTIVE` holds are marked `EXPIRED`, `drop_drop.quantity_reserved` is decremented, and a `HOLD_EXPIRED` row is appended to `drop_inventory_event`.

## Hold To Paid Order Conversion

Slice 4B does not release a hold from the browser callback. The flow is:

1. Consumer starts payment from `/checkout/{holdPk}`.
2. Server creates or reuses `payment_order_intent` and Razorpay order.
3. Razorpay sends a signed `payment.captured` webhook.
4. `api_convert_paid_hold_to_order` verifies the hold is still active/unexpired, amount and currency match, and the hold belongs to the payment intent.
5. The RPC changes the hold to `CONVERTED`, links the order, decrements reserved inventory, increments sold inventory, and appends `HOLD_CONVERTED`.

If the hold expires before a captured webhook is processed, conversion fails and the normal expired-hold release path should return availability. Failed or dismissed payment attempts do not convert or release the hold.

## After Paid Order Creation

Once a hold is `CONVERTED`, it is no longer actionable as a hold. Consumer account shows it in hold history, while the order appears in paid order history. Pickup verification and no-show handling happen on `order_order`; they do not release or reconvert holds.

## Support Boundaries

- Active holds are temporary payment-pending intents.
- A converted hold points to a paid order and should not be released by the expiry job.
- Do not tell consumers the bag is confirmed or ready for pickup until the verified webhook-backed order exists.
- Do not manually edit `drop_drop.quantity_reserved`; use the release RPC/Edge Function.
- Destructive admin cancellation is out of scope for Slice 4A.
