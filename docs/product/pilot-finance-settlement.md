# Slice 7 Product Notes: Pilot Finance & Settlement

Slice 7 gives goZaika ops and restaurant partners an auditable settlement workflow for completed paid pickup orders. It is accounting workflow only; it does not initiate payouts, transfers, refunds, captures, order edits, pickup overrides, or notification sends.

## Settlement Eligibility

- Orders must belong to the selected restaurant and period.
- The order payment must be webhook-confirmed `CAPTURED`.
- The pickup window must be closed.
- The order must be terminally payout-eligible: `COLLECTED` or `NO_SHOW`.
- Orders already attached to a non-cancelled settlement are excluded.
- Refund/debit visibility comes from existing `payment_refund` rows with `PROCESSING` or `SUCCEEDED` status. Slice 7 never creates refunds.

Excluded order reasons are explicit: not captured, pickup window open, not payout-eligible, already settled, or admin access missing.

## Calculation Model

- All money is integer paise.
- Gross sales are positive `ORDER_GROSS` entries.
- Commission uses an active `restaurant_commission_override` at order creation time, then falls back to an active default commission plan. The pilot default is `PILOT_0PCT_30D`.
- Razorpay fee and provider tax already recorded on captured `payment_transaction` rows become `PAYMENT_FEE` and `TAX` deductions.
- Manual adjustments can be added only before lock.
- Net payout is gross minus refunds, commission, payment fees, tax, plus adjustments.

GST/legal invoice wording is still human-reviewed. The database labels these totals as pilot estimates until finance locks the run.

## Admin Workflow

Admin finance opens `/admin/finance` and can:

- Select a restaurant and period.
- Preview eligible and excluded orders.
- Create or recalculate one idempotent draft for the restaurant/period.
- Add a manual credit/debit adjustment with a note.
- Lock a reviewed settlement.
- Issue invoice metadata after lock.
- Mark manual payout status as `SENT`, `PAID`, or `RECONCILED`, or cancel allowed states with notes.

Only `SUPER_ADMIN` and `FINANCE_ADMIN` can mutate finance state. Broader platform admins can view the finance surface but mutation routes require finance access.

## Restaurant Visibility

Restaurant owners and finance users open `/portal/finance` and see only their own restaurants' settlement runs:

- Period and settlement status.
- Gross sales, refunds/debits, commission, payment fee/tax deductions, adjustments, and net payout.
- Masked payout account status.
- Invoice metadata/status.
- Read-only line entries with order number, bag, basis, and signed amount.

No full bank account number, raw Razorpay payload, consumer contact data, private compliance document, service-role key, OTP, QR nonce, or credential hash is exposed.

## Manual Payout Boundary

`SENT`, `PAID`, and `RECONCILED` are manually recorded accounting states. Slice 7 does not call Razorpay Transfers, Payouts, Fund Accounts, or Refund APIs.

## Worker Boundary

`settlement-run-worker` can preview a bounded restaurant/period. It can refresh a draft only when `SETTLEMENT_WORKER_ACTOR_PROFILE_PK` is configured for a finance admin profile and the request explicitly sets `createDraft: true`. It always returns `livePayoutsEnabled: false`.

## Not Included

Live payouts, Razorpay transfers, fund-account creation, refund initiation, GST-compliant final invoice legal automation, CA workflows, reconciliation exports, accounting integrations, native mobile finance screens, ROI reports, broad correction tooling, and restaurant suspension remain out of scope.
