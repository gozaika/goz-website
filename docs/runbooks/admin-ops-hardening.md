# Admin Ops Hardening Runbook

## Apply Migration

Apply after Slice 8A:

```powershell
Get-Content -Raw supabase/migrations/20260529000000_slice8b_admin_ops_hardening.sql
```

Review the SQL, then run it once in the Supabase Dashboard SQL editor or approved remote migration path. Verify:

```sql
select to_regprocedure('public.api_admin_set_restaurant_operational_status(uuid,uuid,text,text,text)');
select to_regprocedure('public.api_admin_set_drop_operational_status(uuid,uuid,text,text)');
select to_regprocedure('public.api_ops_claims_enabled(uuid)');
select to_regprocedure('public.api_ops_publishing_enabled(uuid)');
select to_regprocedure('public.api_ops_max_bags_per_drop(uuid)');
select to_regclass('public.api_admin_ops_restaurant_summary');
select to_regclass('public.api_admin_ops_support_queue');
select to_regclass('public.api_admin_ops_refund_queue');
select to_regclass('public.api_admin_ops_config_flag');
select to_regclass('public.api_admin_ops_audit_log');
```

No new environment variables, Supabase Edge Functions, workers, storage buckets, provider secrets, or cron jobs are required.

## Role Setup

Confirm admin users have active `iam_platform_membership` rows. Minimum permissions:

- `OPS_ADMIN` for pause/reactivate and config flags.
- `SUPPORT_ADMIN` for support/incident/refund queues.
- `FINANCE_ADMIN` for refund support tracking review.
- `SUPER_ADMIN` for all actions.

## Daily Workflow

1. Open `/admin/ops`.
2. Filter by restaurant, status, and date.
3. Review open incidents, support tickets, refund support records, paused restaurants/drops, config overrides, and recent audit rows.
4. Copy or download the current filtered support-safe queue for founder/manual ops review.

## Pause Or Reactivate

1. Enter a specific reason in the required reason field.
2. For restaurants, choose Pause, Suspend, or Reactivate.
3. For drops, choose Paused, Active, or Scheduled.
4. Confirm consumer discovery/claims and restaurant publishing respect the new state.
5. Review recent audit activity for the target.

Closed, sold-out, cancelled, emergency-closed, and completed pickup objects are not resumed from this surface.

## Support, Incident, Refund

- Create/update support tickets from the support tab. Internal notes stay admin-only.
- Triage incidents from the incident tab. Food safety and dietary mismatch remain escalation-sensitive.
- Track refund/debit requests from the refunds tab. This is support/finance metadata only. Razorpay refund APIs, payment captures, settlements, and payouts are not mutated.

## Config Changes

Only update `CLAIMS_ENABLED`, `PUBLISHING_ENABLED`, and `MAX_BAGS_PER_DROP`. Use restaurant scope for a single partner issue and global scope only for launch-wide kill switches. Each update requires a reason and writes audit history.

## Troubleshooting

- Admin page says migration missing: apply and verify Slice 8B SQL.
- Restaurant can still publish: check restaurant status is `ACTIVE` and `PUBLISHING_ENABLED` overrides.
- Consumer can still claim: check drop status, restaurant status, `CLAIMS_ENABLED`, and `api_create_inventory_hold`.
- Refund row appears in finance reports: only `PROCESSING`/`SUCCEEDED` refund statuses affect existing finance/ROI deductions. Slice 8B support tracking defaults to request/review metadata and does not mark provider success.

## Rollback Notes

To stop ops actions without schema rollback, remove/disable admin routes at deploy or revoke admin membership roles. Do not delete audit/support/incident/refund rows. To re-enable claims/publishing, set allowlisted flags back to enabled or reactivate the restaurant/drop.

## Smoke Test

1. Open `/admin/ops` desktop and mobile.
2. Filter by restaurant/status/date.
3. Pause a restaurant with a reason, then confirm `/portal/drops/new` blocks publishing and customer drop pages are unavailable or non-claimable.
4. Reactivate the restaurant, pause/resume one active/scheduled drop, and confirm paid orders are unchanged.
5. Create/update a support ticket, triage an incident, and save a refund support record.
6. Copy/download queue rows and confirm no PII, raw provider payloads, pickup secrets, private docs, or internal notes are present.
