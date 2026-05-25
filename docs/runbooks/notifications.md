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
NOTIFICATION_WHATSAPP_PROVIDER=META
META_WHATSAPP_ACCESS_TOKEN
META_WHATSAPP_PHONE_NUMBER_ID
META_WHATSAPP_GRAPH_VERSION
META_WHATSAPP_TEMPLATE_LANGUAGE
META_WHATSAPP_TEMPLATE_OVERRIDE
META_WHATSAPP_TEMPLATE_PARAM_ORDER
META_WHATSAPP_SEND_MODE
WATI_API_BASE_URL
WATI_API_TOKEN
WATI_BROADCAST_NAME
```

WhatsApp defaults to Meta Cloud API. Set `NOTIFICATION_WHATSAPP_PROVIDER=WATI` only when switching the worker to WATI later.

Set `NOTIFICATION_DRY_RUN=true` in local or staging when provider delivery should not happen. For provider smoke tests, set `NOTIFICATION_DRY_RUN=false` and configure Meta sandbox credentials instead.

## Deploy And Schedule

Deploy:

```powershell
supabase functions deploy notification-outbox-worker
supabase functions deploy pickup-reminder-cron
supabase functions deploy razorpay-webhook
```

Schedule `pickup-reminder-cron` about every 5 minutes. Schedule or invoke `notification-outbox-worker` every 1-5 minutes, or after each cron/webhook smoke test.

## WhatsApp Provider Setup

### Meta Cloud API Sandbox

Use Meta's test business phone number for development and early pilot smoke tests:

1. In Meta Developers, create/open the app and add WhatsApp.
2. Use the generated test sender phone number and copy its phone number ID and access token.
3. Add tester-owned WhatsApp recipient numbers in the API setup panel. Recipients must be real WhatsApp accounts that can receive messages; invented or non-WhatsApp numbers cannot receive sandbox messages.
4. Configure the worker:

```text
NOTIFICATION_DRY_RUN=false
NOTIFICATION_WHATSAPP_PROVIDER=META
META_WHATSAPP_ACCESS_TOKEN=...
META_WHATSAPP_PHONE_NUMBER_ID=...
META_WHATSAPP_GRAPH_VERSION=v20.0
META_WHATSAPP_TEMPLATE_LANGUAGE=en_US
```

For the quickest sandbox send, set `META_WHATSAPP_TEMPLATE_OVERRIDE=hello_world`; this validates Meta delivery but does not validate goZaika message copy. To validate rendered goZaika message copy, have the tester send a message to the test number first and use `META_WHATSAPP_SEND_MODE=text` inside the active customer-service window, or create/approve matching Meta templates and leave `META_WHATSAPP_SEND_MODE=template`.

If a custom Meta template uses positional body variables, set `META_WHATSAPP_TEMPLATE_PARAM_ORDER` to a comma-separated list of payload keys in template order, for example:

```text
META_WHATSAPP_TEMPLATE_PARAM_ORDER=customer_name,restaurant_name,bag_display_name,pickup_window_label,order_short_code
```

### WATI Future Switch

WATI template refs are stored in `notification_template.provider_template_ref`:

- `gozaika_order_confirmation`
- `gozaika_pickup_reminder`
- `gozaika_restaurant_new_order`
- `gozaika_restaurant_pickup_alert`

Keep WATI or Meta approved templates aligned with the safe fields in `payload_json`. Do not add OTP, QR nonce, hashes, payment payloads, or secrets.

## Operations

- Use `/admin/notifications` to inspect delivery state.
- Retry only provider/config failures after fixing the root cause.
- Suppress queued or failed rows when ops decides manual handling is safer.
- Use `Copy fallback` for manual WhatsApp/email outreach. Treat it as fallback text, not proof of delivery.

## Smoke Test

1. Complete a Razorpay test payment and let the verified webhook create an order.
2. Confirm `api_enqueue_order_notifications` created confirmation and restaurant alert rows.
3. Run `pickup-reminder-cron` for an eligible paid, uncollected order.
4. Run `notification-outbox-worker` with `NOTIFICATION_DRY_RUN=true` once to validate claiming, attempt logging, and UI state without external sends.
5. Confirm outbox rows move to `SENT` with delivery attempts.
6. Queue a fresh WhatsApp row, configure Meta sandbox env, set `NOTIFICATION_DRY_RUN=false`, and run `notification-outbox-worker` again to validate an actual WhatsApp provider attempt.
7. Re-run the webhook/cron and confirm duplicate outbox rows are not created.
8. Revoke WhatsApp transactional consent or disable the WhatsApp preference, then confirm a support-visible `SUPPRESSED` row is created.
9. Unset Meta/WATI/Resend provider env in staging and confirm provider paths fail visibly without breaking consumer, restaurant, admin, payment, or pickup flows.

## Rollback Notes

- If delivery is faulty, pause the worker schedule first. Existing queued rows remain available for retry.
- If reminders are noisy, pause `pickup-reminder-cron`; order confirmation and pickup flows continue.
- Do not delete outbox or delivery attempt rows during incident review.
