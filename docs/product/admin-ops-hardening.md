# Admin Ops Hardening

Slice 8B gives goZaika ops a compact control center for the first pilot restaurants. It is intentionally operational, audit-heavy, and bounded: it helps pause risky supply, triage support work, and track refund/debit requests without initiating provider refunds, payout transfers, payment captures, or settlement recalculation.

## Roles

- `SUPER_ADMIN`: all Slice 8B ops actions.
- `OPS_ADMIN`: restaurant/drop pause/reactivation, support and incident work, and allowlisted config flags.
- `SUPPORT_ADMIN`: support tickets, incident triage, and refund support tracking.
- `FINANCE_ADMIN`: refund support tracking visibility/status where finance review is needed. Settlement/payout actions remain owned by Slice 7 finance surfaces.

## Pause And Suspension Rules

- Restaurant `PAUSED` or `SUSPENDED` blocks new restaurant portal publishing and removes public claimability for that restaurant.
- Drop `PAUSED` blocks discovery/claims for that drop.
- Historical paid orders, payment captures, pickup state, finance settlements, invoices, notification rows, and ROI facts are not changed by pause/suspend.
- Every privileged status change requires reason text and appends `audit_log`; drop status changes also append a zero-quantity inventory event for operational traceability.

## Support Workflow

Admins can create and update support tickets with type, priority, status, linked restaurant/order/incident/refund, assignment, and internal notes. Internal notes are not copied into support-safe exports by default. Ticket updates append `support_ticket_event` rows and `audit_log` rows.

## Incident Triage

The ops queue reads Slice 5 incidents and lets support/ops move incidents through approved states such as `TRIAGED`, `INVESTIGATING`, `MERCHANT_ACTION_REQUIRED`, `RESOLVED`, and `CLOSED`. Updates append `incident_event` rows and `audit_log` rows.

## Refund Support Tracking

Refund/debit tracking creates or updates `payment_refund` rows as manual support artifacts with `provider_refund_disabled=true` and payload metadata stating that the provider refund API was not called. Slice 8B does not call Razorpay refunds, mutate `payment_transaction`, alter payment capture state, recalculate settlements, or mark payouts.

## Config Allowlist

Only these controls are editable:

- `CLAIMS_ENABLED`: global or restaurant-scoped claim/discovery guardrail.
- `PUBLISHING_ENABLED`: global or restaurant-scoped publishing guardrail.
- `MAX_BAGS_PER_DROP`: global or restaurant-scoped publishing cap guidance.

There is no generic config editor and no secret/value editor.

## Support-Safe Copy And Download

The admin UI can copy/download the current filtered queue, capped at 200 rows. Output includes restaurant, order number, status, severity/priority, amounts, safe IDs, and dates. It excludes consumer phone/email lists, raw provider payloads, pickup credentials/hashes, private documents, internal event bodies, service keys, and broad customer exports.

## Out Of Scope

No advanced CRM, live Razorpay refund API integration, live payouts/transfers, accounting integration, broad customer exports, destructive order edits, pickup override workflows, scheduled export workers, Sentry, native mobile ops screens, reviews, marketing tools, subscriptions, loyalty, referrals, or settlement recalculation.
