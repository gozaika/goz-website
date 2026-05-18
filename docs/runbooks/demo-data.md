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
- `supabase/seeds/demo/004_slice4_checkout_payment.sql`

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
- `004_slice4_checkout_payment.sql`
- `005_slice5_pickup_staff.sql`

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
