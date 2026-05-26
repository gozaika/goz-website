# Demo Data Runbook

Demo data is local-only by default. Never commit real service-role keys and never run remote demo deletion unless you intentionally set `DEMO_SEED_ALLOW_REMOTE=true`.

## Local Supabase

Start Supabase:

```bash
supabase start
```

Read local environment values:

```bash
supabase status
supabase status -o env
```

Set the values in your shell or local env file:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=...
```

## Reset And Seed

Run migrations and reference seed:

```bash
supabase db reset
```

Slice 1 reference consent purposes are in `supabase/seed.sql` and the Slice 1 migration.

Run the optional SQL demo data:

```bash
npm run db:seed:demo
```

Create demo auth users and Slice 1 profile/consent rows:

```bash
npm run demo:auth:create
```

Delete demo data:

```bash
npm run demo:auth:delete
```

The delete script removes SQL rows registered in `dev_demo_seed_registry` first, then deletes only Supabase Auth users whose `app_metadata` contains `{ app: "gozaika", demo: true }`.

## Demo Credentials

Password for every demo account:

```text
GozaikaDemo@123
```

Consumer demo emails include `aarav.reddy@gozaika.example`, `ananya.sharma@gozaika.example`, and the remaining Slice 1 fake Hyderabad consumers listed in `scripts/demo/demo-auth-shared.ts`.

Restaurant demo emails include:

- `biryani.baithak@gozaika.example`
- `charminar.chai.co@gozaika.example`
- `deccan.dosa.house@gozaika.example`
- `golconda.grills@gozaika.example`
- `hitec.handi@gozaika.example`

## Future Slices

Deterministic SQL fixtures by slice:

- `supabase/seeds/demo/002_slice2_restaurant_onboarding_demo.sql`
- `supabase/seeds/demo/003_slice3_drop_publishing_demo.sql`
- `supabase/seeds/demo/004_slice4a_claim_hold_order_intent_demo.sql`

Every fixture must register owned rows in `dev_demo_seed_registry` and extend `delete_demo_data.sql` in FK-safe order. Do not seed payments, orders, finance, or admin data before the slice that owns those domains.

## Provider Follow-Ups

Phone OTP requires Supabase Auth SMS provider configuration. Google OAuth requires provider credentials and redirect URL approval for `/auth/callback`. Demo email/password users are for local demos and testing only.
# Slice 2 Restaurant Demo Data

After Slice 1 auth users exist, seed restaurant onboarding records:

```bash
npm run demo:auth:create
npm run demo:admin:create
npm run db:seed:demo:slice2
```

The Slice 2 demo seed is `supabase/seeds/demo/002_slice2_restaurant_onboarding_demo.sql`.
It creates deterministic fake restaurant onboarding rows for the five restaurant demo identities from Slice 1, with mixed compliance/document states for UI testing.

Future slices should add deterministic files in order:

- `003_slice3_drop_publishing_demo.sql`
- `004_slice4a_claim_hold_order_intent_demo.sql`
- `006_slice5_pickup_verification_incidents_demo.sql`
- `005_slice4b_payment_order_confirmation_demo.sql`
- `006_slice5_pickup_staff.sql`

Delete demo data safely:

```bash
npm run db:demo:delete
npm run demo:auth:delete
```

Never use demo data in production.

# Slice 3 Drop Publishing Demo Data

After Slice 1 auth users and Slice 2 restaurant onboarding records exist, apply:

```bash
npx supabase db query --local --file supabase/seeds/demo/003_slice3_drop_publishing_demo.sql
```

The Slice 3 seed creates a published BAM Bag template and active public drop for the approved Biryani Baithak demo restaurant. It is designed to exercise consumer discovery and restaurant portal drop state without creating orders, payments, holds, pickup QR/OTP, or finance rows.

# Slice 4A Claim Hold Demo Data

No deterministic hold seed is added for Slice 4A. Holds expire quickly and make demos brittle. Use the Slice 3 public demo drop plus a demo consumer login to create a real hold through the consumer UI.

If a future demo seed adds rows to `drop_inventory_hold`, `drop_inventory_event`, `order_order`, `order_item`, or `order_status_transition`, it must register rows in `dev_demo_seed_registry` and delete them in FK-safe order before auth users are removed.

# Slice 4B Razorpay Payment And Order Confirmation Demo Data

No deterministic Slice 4B payment/order seed is added. Payment rows should usually be produced through Razorpay test mode plus the verified webhook path so idempotency and hold conversion are exercised realistically.

If a local/staging-only seed is later needed, use `supabase/seeds/demo/005_slice4b_payment_order_confirmation_demo.sql` with clearly fake provider refs such as `rzp_demo_*`. The seed must register every row in `dev_demo_seed_registry` and update cleanup for `payment_webhook_event`, `payment_transaction`, `payment_order_intent`, `order_status_transition`, `order_item`, `order_order`, `drop_inventory_hold`, and `drop_inventory_event` in FK-safe order. Never seed real payment provider references in production.

# Slice 5 Pickup Verification And Incident Demo Data

No deterministic Slice 5 demo seed is added in this slice. Pickup events, no-show rows, and incidents should usually be produced through the restaurant/admin UI against a real local or staging paid test order so idempotency and audit behavior are exercised.

If a future seed adds `006_slice5_pickup_verification_incidents_demo.sql`, keep it local/staging-only, use fake provider references inherited from Slice 4B demo rows, register rows in `dev_demo_seed_registry`, and delete in FK-safe order for `incident_event`, `incident_incident`, `order_pickup_verification_event`, `drop_inventory_event`, `order_status_transition`, `order_item`, `order_order`, `payment_transaction`, `payment_order_intent`, and `drop_inventory_hold`.

# Slice 6 Transactional Notifications Demo Data

No deterministic Slice 6 demo seed is added. Notification rows should usually be produced from a real local or staging paid order so webhook enqueue, pickup reminder idempotency, consent suppression, and worker delivery attempts are exercised together.

If a future seed adds `007_slice6_transactional_notifications_demo.sql`, keep it local/staging-only, use fake provider refs such as `wati_demo_*` and `resend_demo_*`, register rows in `dev_demo_seed_registry`, and delete in FK-safe order for `notification_delivery_attempt` before `notification_outbox`. Do not seed real provider references in production.

# Slice 7 Pilot Finance Settlement Demo Data

No deterministic Slice 7 demo seed is added. Settlements should usually be produced from a real local or staging paid order after webhook conversion and pickup terminal state so finance eligibility, idempotency, and line-entry math are exercised together.

If a future seed adds `supabase/seeds/demo/008_slice7_pilot_finance_settlement_demo.sql`, keep it local/staging-only, use fake references such as `settlement_demo_*` and `invoice_demo_*`, register rows in `dev_demo_seed_registry`, and delete in FK-safe order for `finance_invoice`, `finance_restaurant_payout_entry`, `finance_settlement_run`, `payment_refund`, and any related demo order/payment rows. Never seed real bank account numbers, UTRs, provider payout refs, or production finance rows.

# Slice 8A Pilot ROI Reports Demo Data

No deterministic Slice 8A demo seed is added. ROI reports should usually be validated from real local or staging paid pickup facts so drop, payment, pickup, incident, refund, and settlement read models are exercised together.

If a future seed adds `supabase/seeds/demo/009_slice8a_pilot_roi_reports_demo.sql`, keep it local/staging-only, use clearly fake report references such as `roi_demo_*`, register rows in `dev_demo_seed_registry`, and delete rows in FK-safe order. Do not seed real bank account numbers, provider payout references, raw customer PII, provider payloads, pickup credentials, or partner-sensitive notes.

# Slice 8B Admin Ops Hardening Demo Data

No deterministic Slice 8B demo seed is added. Ops rows should usually be produced through local or staging admin actions so pause/reactivate audit, support events, incident events, refund support tracking, and config flag consumption are exercised realistically.

If a future seed adds `supabase/seeds/demo/010_slice8b_admin_ops_hardening_demo.sql`, keep it local/staging-only, use clearly fake references such as `ops_demo_*`, `support_demo_*`, `refund_demo_*`, and `config_demo_*`, register rows in `dev_demo_seed_registry`, and delete rows in FK-safe order for `support_ticket_event`, `incident_event`, `payment_refund`, `support_ticket`, demo incidents, config overrides, and related audit rows. Do not seed real phone numbers, email lists, bank account numbers, provider payout/refund refs, raw customer PII, pickup credentials, private documents, or partner-sensitive notes.
