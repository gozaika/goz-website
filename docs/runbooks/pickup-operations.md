# Pickup Operations Runbook

## Remote Migration

Apply `supabase/migrations/20260525000000_slice5_pickup_verification_incidents.sql` after all Slice 4B migrations.

Review the SQL, then run it once through the approved Supabase remote migration path. Verify:

```sql
select to_regprocedure('public.api_verify_order_pickup(uuid,uuid,uuid,text,text,text,text)');
select to_regprocedure('public.api_mark_order_no_show(uuid,uuid,uuid,text,text)');
select to_regprocedure('public.api_create_order_incident(uuid,uuid,uuid,text,text,text,text,text)');
select to_regclass('public.api_restaurant_pickup_order_summary');
select to_regclass('public.api_admin_pickup_order_summary');
select to_regclass('public.api_admin_incident_summary');
```

## Counter Verification

1. Restaurant staff sign in to `https://restaurant.gozaika.in/`.
2. Open `/portal/orders`.
3. Confirm the order number, restaurant, bag title, pickup window, paid amount, dietary category, and allergen summary.
4. Ask the customer for the 6-digit OTP from their order page.
5. Enter OTP and select `Verify OTP`.
6. If QR payload paste is used, paste the full JSON payload and select `Verify QR payload`.

Successful verification marks the order `COLLECTED`, records a verification event, appends an order status transition, and records `PICKUP_COLLECTED`.

## Failure Handling

- Invalid OTP/QR: ask the customer to refresh their order page and confirm the order number.
- Wrong restaurant: do not hand over food; direct the customer to the restaurant named on the order.
- Already collected: do not hand over a second bag.
- Expired pickup window: do not verify pickup; use no-show only if the customer did not collect.
- Order not ready: check payment/order state in the portal or admin page.

## No-Show

- No-show is allowed only after `pickup_window_end_at`.
- Staff must enter a reason.
- No-show changes order state to `NO_SHOW` and appends audit transition metadata.
- No refund, compensation, settlement, or payout mutation is created.

## Settlement Eligibility Handoff

Slice 7 finance uses pickup completion as an input only. A captured paid order becomes settlement-eligible after its pickup window closes and the order is `COLLECTED` or `NO_SHOW`. Pickup verification and no-show flows do not create finance rows directly; admin finance preview/draft creation reads the terminal pickup state later.

Do not mark pickup state just to force settlement. Use the real counter outcome and leave finance corrections to manual adjustments in the settlement workflow.

## Pickup Reminders

Slice 6 schedules pickup reminder notifications through `pickup-reminder-cron`, which calls `api_enqueue_pickup_reminders`. The cron is idempotent: repeated runs should not create duplicate reminder rows for the same order, channel, and template.

If reminders fail or provider configuration is missing:

- Continue normal counter verification with OTP or QR payload.
- Ask the customer to open `/orders/{orderPk}` for pickup proof.
- Use admin `/admin/notifications` to inspect failed/suppressed rows and copy fallback text when support follow-up is needed.
- Do not create refunds, payment changes, or pickup overrides because a reminder failed.

## Incident Logging

Use the short incident form from restaurant or admin order context.

- `DIETARY_MISMATCH` and `FOOD_SAFETY` are escalation-sensitive.
- Use `P1` for immediate food-safety risk.
- Use `P2` for serious dietary, pickup-not-honored, or missing-order cases.
- Keep descriptions factual and short. Do not paste payment payloads, OTPs, QR payloads, secrets, or private document details.

## Smoke Test

1. Create or find a paid `CONFIRMED` or `READY_FOR_PICKUP` order.
2. Open the consumer order page and note the current OTP.
3. Open restaurant `/portal/orders`.
4. Verify with the OTP.
5. Confirm one `SUCCESS` pickup verification event exists.
6. Confirm one `COLLECTED` transition exists.
7. Confirm one `PICKUP_COLLECTED` inventory event exists.
8. Click verify again and confirm no duplicate collection transition is created.
9. Try an invalid OTP on another eligible order and confirm a support-safe failed attempt is recorded.
10. After a pickup window closes, mark no-show with a reason and confirm no payment/refund mutation occurred.

## Rollback Notes

- If restaurant pickup verification is faulty, roll back the restaurant/admin/consumer deployments first.
- Keep verification, transition, and incident audit rows intact for investigation.
- Do not manually edit order status, inventory counters, or payment tables without a reviewed SQL correction plan.
