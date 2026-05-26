# ROI Reports Runbook

## Remote Migration

Apply `supabase/migrations/20260528000000_slice8a_pilot_roi_reports.sql` after all Slice 7 migrations.

Review the SQL, then run it once through the approved Supabase remote migration path or paste the exact file contents into the Supabase Dashboard SQL editor. Verify:

```sql
select to_regclass('public.api_restaurant_roi_drop_detail');
select to_regclass('public.api_admin_roi_drop_detail');
select to_regclass('public.api_restaurant_roi_report_note');
select to_regclass('public.api_admin_roi_report_note');
```

No new Edge Function, worker, cron schedule, environment variable, storage bucket, or provider secret is required.

## Deploy

Redeploy Vercel projects:

- `restaurant.gozaika.in`
- `admin.gozaika.in`

No consumer or website deployment is required unless the release process deploys all apps together.

## Weekly Partner Review

1. Open `/admin/reports`.
2. Select the pilot restaurant and weekly period.
3. Confirm drops listed, bags sold, sell-through, GMV, net recovery basis, pickup completion, no-shows, incidents, and refunds/debits.
4. If pickup windows are still open, mark the report incomplete and review again after pickup close.
5. If an exact locked settlement exists, use the settlement-backed net. Otherwise treat net recovery as pilot reporting guidance.
6. Copy or download the partner-safe report text.
7. Use the next actions as talking points for the founder-led partner review.

Restaurant partners can open `/portal/reports` to view their own report and drop-level rows.

## Data Quality Checks

- No drops listed: create/publish a Limited Drop for the selected period.
- No paid orders: confirm the drop was active, visible, and manually promoted with approved copy.
- Pickup window open: wait for the window to close before treating pickup completion as final.
- Settlement not locked: net is an estimate until finance locks an exact-period settlement.
- Repeat-buyer data thin: use the first-time/repeat counts only as directional when fewer than three buyer signals exist.
- Incidents/refunds present: review notes before partner sharing.

## Security Boundaries

ROI views are read-only and use existing restaurant/admin RLS helpers. They do not expose consumer phone/email, raw Razorpay payloads, notification destinations, private documents, pickup secrets/hashes, provider secrets, or full export files.

Slice 8A does not mutate payment, refund, order, pickup, settlement, payout, invoice, or notification state.

## Rollback Notes

- If reporting UI is faulty, roll back restaurant/admin deployments first.
- Leave the read-only migration in place unless a reviewed SQL rollback is required.
- Do not delete payment, order, pickup, incident, refund, settlement, or finance rows during report debugging.

## Smoke Test

1. Apply the migration to the target Supabase project.
2. Redeploy restaurant/admin apps.
3. Open `/portal/reports` as a restaurant owner and confirm only that restaurant appears.
4. Open `/admin/reports`, select the same restaurant and week, and confirm metrics match the restaurant view.
5. Confirm copy/download report text contains no consumer PII or internal/provider details.
6. Check desktop and mobile layouts for `/portal/reports` and `/admin/reports`.
7. Confirm consumer pages do not expose ROI or settlement report details.
