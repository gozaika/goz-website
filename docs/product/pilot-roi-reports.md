# Slice 8A Product Notes: Pilot ROI Reports

Slice 8A gives restaurant partners and goZaika ops a weekly, partner-safe ROI report for the 30-day zero-commission pilot. It reads existing drop, paid order, pickup, incident, refund, and settlement facts. It does not create or mutate payments, refunds, pickup state, settlements, invoices, payouts, notifications, or orders.

## Metric Definitions

- Drops listed: Limited Drops with pickup start inside the selected report period.
- Bags listed: Sum of `drop_drop.quantity_total` for the selected drops.
- Bags sold: Captured paid order quantities for the selected drops.
- Sell-through: bags sold divided by bags listed, shown with the denominator context.
- GMV: Captured paid order value in paise, formatted as INR only in UI.
- Estimated net recovery: GMV minus visible refunds/debits and captured provider fee/tax. During the zero-commission pilot this is reporting guidance unless an exact locked settlement exists.
- Settlement-backed net: Used only when a locked settlement matches the exact selected restaurant and period.
- Pickup completion: collected bags divided by collected plus no-show outcomes. Open pickup windows are called out separately.
- No-shows: Captured paid orders moved to `NO_SHOW`.
- Incidents: Order-linked pilot incidents in the selected period/drop rows.
- Refunds/debits: Existing `payment_refund` rows in `PROCESSING` or `SUCCEEDED` status. Slice 8A never initiates refunds.
- First-time/repeat buyer signals: Counts only, derived by checking whether a captured buyer had a prior captured order for the same restaurant. No consumer PII is exposed.

## Restaurant Visibility

Restaurant owners open `/portal/reports` from portal navigation. They see only active restaurants where they have membership. The surface shows:

- Weekly period selector.
- Metric cards for bags, sell-through, GMV, net recovery, pickup completion, incidents/refunds.
- Drop-level rows with listed/sold/collected/no-show/GMV/net/refund/incident counts.
- Plain report assumptions and next actions.
- Empty states for no drops, no paid orders, open pickup windows, no settlement lock, thin repeat-buyer data, and no incidents/refunds.

## Admin Workflow

Ops opens `/admin/reports`, selects restaurant and period, and reviews the same partner-facing metrics with compact ops context:

- Restaurant selector and weekly presets.
- Open pickup count and settlement link/status when an exact locked settlement is available.
- Incident/refund notes.
- Partner-safe report text with copy and text download actions.

The copied text avoids consumer PII, internal notes, provider payloads, private documents, pickup credentials, and raw secrets.

## Wording Guardrails

Partner-facing copy uses "BAM Bags", "Limited Drops", "sell-through", "incremental recovery", and "partner report". It avoids brand-damaging terms such as discount, leftover, stale, or rescue.

## Out Of Scope

No Zaika Pro advanced analytics, forecasting, heatmaps, cohorts beyond simple repeat-buyer counts, benchmarking, scheduled email digest, export jobs, CRM, native mobile reporting, refund initiation, payout initiation, settlement recalculation, pickup override, accounting integration, or legal invoice automation is included.
