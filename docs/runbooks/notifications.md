# Notifications Runbook

## Remote Migration

Apply `supabase/migrations/20260526000000_slice6_transactional_notifications.sql` after all Slice 5 migrations.

Review the SQL, then run it once through the approved Supabase remote migration path. Verify:

```sql
select to_regprocedure('public.api_enqueue_order_notifications(uuid)');
select to_regprocedure('public.api_enqueue_pickup_reminders(integer,integer)');
select to_regprocedure('public.api_claim_notification_batch(integer)');
select to_regprocedure('public.api_record_notification_delivery_attempt(uuid,text,text,text,text,text,text,integer)');
select to_regclass('public.api_admin_notification_delivery_summary');
```

## Environment

Required for the Edge Functions:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Optional for production delivery:

```text
NOTIFICATION_DRY_RUN=false
RESEND_API_KEY
NOTIFICATION_RESEND_FROM_EMAIL
RESEND_FROM_EMAIL
WATI_API_BASE_URL
WATI_API_TOKEN
WATI_BROADCAST_NAME
```

Set `NOTIFICATION_DRY_RUN=true` in local or staging when provider delivery should not happen.

## Deploy And Schedule

Deploy:

```powershell
supabase functions deploy notification-outbox-worker
supabase functions deploy pickup-reminder-cron
supabase functions deploy razorpay-webhook
```

Schedule `pickup-reminder-cron` about every 5 minutes. Schedule or invoke `notification-outbox-worker` every 1-5 minutes, or after each cron/webhook smoke test.

## Template Mapping

WATI template refs are stored in `notification_template.provider_template_ref`:

- `gozaika_order_confirmation`
- `gozaika_pickup_reminder`
- `gozaika_restaurant_new_order`
- `gozaika_restaurant_pickup_alert`

Keep WATI approved templates aligned with the safe fields in `payload_json`. Do not add OTP, QR nonce, hashes, payment payloads, or secrets.

## Operations

- Use `/admin/notifications` to inspect delivery state.
- Retry only provider/config failures after fixing the root cause.
- Suppress queued or failed rows when ops decides manual handling is safer.
- Use `Copy fallback` for manual WhatsApp/email outreach. Treat it as fallback text, not proof of delivery.

## Smoke Test

1. Complete a Razorpay test payment and let the verified webhook create an order.
2. Confirm `api_enqueue_order_notifications` created confirmation and restaurant alert rows.
3. Run `pickup-reminder-cron` for an eligible paid, uncollected order.
4. Run `notification-outbox-worker` with `NOTIFICATION_DRY_RUN=true`.
5. Confirm outbox rows move to `SENT` with delivery attempts.
6. Re-run the webhook/cron and confirm duplicate outbox rows are not created.
7. Revoke WhatsApp transactional consent or disable the WhatsApp preference, then confirm a support-visible `SUPPRESSED` row is created.
8. Unset WATI/Resend provider env in staging and confirm provider paths fail visibly without breaking consumer, restaurant, admin, payment, or pickup flows.

## Rollback Notes

- If delivery is faulty, pause the worker schedule first. Existing queued rows remain available for retry.
- If reminders are noisy, pause `pickup-reminder-cron`; order confirmation and pickup flows continue.
- Do not delete outbox or delivery attempt rows during incident review.
