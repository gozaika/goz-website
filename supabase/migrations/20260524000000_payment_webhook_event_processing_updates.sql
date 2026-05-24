-- Payment webhook events are the raw provider ledger, but their processing
-- status columns are intentionally mutable operational state. The original
-- immutability trigger made the webhook handler fail immediately after insert
-- when it tried to mark RECEIVED -> PROCESSING -> PROCESSED/FAILED.

drop trigger if exists payment_webhook_event_immutable on public.payment_webhook_event;

comment on table public.payment_webhook_event is
  'Raw payment provider webhook ledger. '
  'Webhook handler MUST insert this row before mutating payment/order state. '
  'Unique provider_event_id provides idempotency for webhook replays. '
  'signature_verified_flag must be true before processing business effects. '
  'processing_status_code, processed_at, and processing_error_text are mutable operational reconciliation fields. '
  'Do not delete; retained for financial audit.';

comment on column public.payment_webhook_event.processing_status_code is
  'Operational processing state maintained by the webhook handler: RECEIVED -> PROCESSING -> PROCESSED or FAILED/IGNORED.';
