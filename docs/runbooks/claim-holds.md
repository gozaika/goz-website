# Claim Holds Runbook

Slice 4A reserves inventory temporarily without charging payment.

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

## Support Boundaries

- Holds are temporary payment-pending intents.
- A hold is not a paid order.
- Do not tell consumers the bag is confirmed or ready for pickup.
- Do not manually edit `drop_drop.quantity_reserved`; use the release RPC/Edge Function.
- Destructive admin cancellation is out of scope for Slice 4A.
