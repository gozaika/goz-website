# Finance Settlements Runbook

## Remote Migration

Apply `supabase/migrations/20260527000000_slice7_pilot_finance_settlement.sql` after all Slice 6 migrations.

Review the SQL, then run it once through the approved Supabase remote migration path or paste the exact file contents into the Supabase Dashboard SQL editor for the target project. Verify:

```sql
select to_regprocedure('public.api_preview_restaurant_settlement(uuid,timestamp with time zone,timestamp with time zone,uuid)');
select to_regprocedure('public.api_create_or_recalculate_settlement_run(uuid,timestamp with time zone,timestamp with time zone,uuid,text)');
select to_regprocedure('public.api_lock_settlement_run(uuid,uuid,text)');
select to_regprocedure('public.api_mark_settlement_status(uuid,uuid,text,text,text)');
select to_regprocedure('public.api_issue_settlement_invoice(uuid,uuid,text,jsonb,text)');
select to_regclass('public.api_admin_finance_settlement_summary');
select to_regclass('public.api_restaurant_finance_settlement_summary');
```

## Deploy

Redeploy:

```powershell
supabase functions deploy settlement-run-worker
```

Redeploy Vercel projects:

- `restaurant.gozaika.in`
- `admin.gozaika.in`

No Razorpay payout, transfer, fund-account, refund, invoice-generation, or accounting integration env vars are required.

Optional worker draft refresh:

```text
SETTLEMENT_WORKER_ACTOR_PROFILE_PK=<iam_profile_pk for a FINANCE_ADMIN or SUPER_ADMIN>
SUPABASE_SERVICE_ROLE_KEY
```

Leave `SETTLEMENT_WORKER_ACTOR_PROFILE_PK` unset unless ops intentionally wants the worker to create draft settlements.

## Admin Operations

1. Open `/admin/finance`.
2. Select restaurant and closed period.
3. Preview the period.
4. Review eligible rows and excluded reasons.
5. Create or recalculate the draft.
6. Add manual adjustments only with a clear note.
7. Lock after human finance review.
8. Issue invoice metadata after lock.
9. Mark `SENT`, `PAID`, and `RECONCILED` manually with notes and optional UTR/provider reference.

`SENT`, `PAID`, and `RECONCILED` do not trigger bank movement. They only record the accounting status.

## Restaurant Support

Ask the restaurant to open `/portal/finance`. They should see:

- Settlement period and status.
- Gross sales, commission, provider fee/tax, refunds/debits, adjustments, and net payout.
- Masked payout account status.
- Invoice metadata.
- Read-only settlement entries.

If the page is empty, confirm there are webhook-confirmed captured orders whose pickup windows have closed and are `COLLECTED` or `NO_SHOW`.

## ROI Reporting Handoff

Slice 8A ROI reports read settlement summaries and line-entry facts for context only. When a locked settlement exactly matches the selected restaurant and report period, `/portal/reports` and `/admin/reports` can show settlement-backed net recovery. Otherwise they label net recovery as a pilot estimate.

ROI reports do not create, recalculate, lock, cancel, invoice, or mark payout status on settlement runs. Continue using `/admin/finance` for all finance mutations and human review.

## Adjustment Procedure

- Use adjustments before lock only.
- Positive amount increases restaurant net payout.
- Negative amount decreases restaurant net payout.
- Add the reason in plain language.
- After lock, corrections must be represented in a later settlement run.

## Invoice Procedure

Slice 7 stores invoice metadata only. If an invoice file is later attached, store it in private storage and expose it only through authorized signed URLs. Do not publish invoice PDFs or private storage paths directly.

## Rollback Notes

- If admin finance UI is faulty, roll back admin/restaurant deployments first.
- Leave locked settlements and payout entries intact for audit.
- Do not delete finance rows during incident review.
- If a draft is wrong, recalculate while still `DRAFT`/`OPEN`, or cancel the run and create a corrected run.
- If a locked run is wrong, create a later adjustment run rather than editing locked entries.

## Smoke Test

1. Produce or locate a Razorpay webhook-confirmed captured order for the restaurant.
2. Mark it `COLLECTED`, or after pickup close mark it `NO_SHOW`.
3. Open `/admin/finance`, select that restaurant and a period containing `pickup_window_end_at`.
4. Preview and confirm the order is eligible.
5. Create draft and refresh; confirm only one active settlement exists for the restaurant/period.
6. Inspect entries: gross, commission, payment fee/tax if present, refund/debit rows if present, net payout.
7. Add a manual adjustment and confirm totals update.
8. Lock and confirm recalculation/adjustment controls are disabled or rejected.
9. Issue invoice metadata.
10. Mark `SENT`, `PAID`, then `RECONCILED`; confirm no Razorpay transfer/refund/order/pickup mutation occurs.
11. Open `/portal/finance` as the restaurant owner and confirm only own settlement data appears.

## Slice 8B Admin Ops Boundary

Refund support records from `/admin/ops` may be read by future finance workflows, but Slice 8B does not recalculate settlements, create payout entries, lock/unlock settlements, mark payouts, or initiate provider refunds. Finance operators should continue to use `/admin/finance` for settlement preview, lock, invoice metadata, and manual payout status.
