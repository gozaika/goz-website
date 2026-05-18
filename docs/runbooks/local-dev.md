# Local Development Runbook

## Prerequisites

- Node.js `>=20.19.0`
- npm workspaces
- Supabase CLI for local database work
- Expo CLI through `npx expo` or npm workspace scripts

## Setup

1. Install dependencies: `npm install`
2. Copy root env: `Copy-Item .env.example .env.local`
3. Copy app env examples as needed.
4. Start Supabase locally and apply migrations from `supabase/migrations`.
5. Seed completed-slice demo data as needed:

   ```powershell
   npm run demo:auth:create
   npm run demo:admin:create
   npm run db:seed:demo:slice2
   ```

   Slice 3 SQL demo data currently lives at `supabase/seeds/demo/003_slice3_drop_publishing_demo.sql`; apply it after Slice 2 restaurant data exists.

6. Run all checks: `npm run ci`

## Useful Commands

- Website: `npm run dev:website`
- Consumer web: `npm run dev:consumer`
- Restaurant portal: `npm run dev:restaurant`
- Admin portal: `npm run dev:admin`
- All type checks: `npm run typecheck`
- Shared tests: `npm run test`

If PowerShell blocks `npm.ps1`, use `npm.cmd` equivalents, for example:

```powershell
npm.cmd --workspace @gozaika/consumer-web run typecheck
```

## Local Slice 3 Smoke Test

After migrations and demo data:

1. Open consumer web at `http://localhost:3000/drops`.
2. Confirm real drop cards render from `api_public_drop_card`.
3. Open `http://localhost:3000/drops/<drop-id>` and confirm allergen/dietary/pickup/price disclosures.
4. Open restaurant portal at `http://localhost:3001/portal/templates`.
5. Create a BAM Bag template as an ACTIVE restaurant owner.
6. Open `http://localhost:3001/portal/drops/new` and publish a scheduled or active drop.
7. Confirm consumer-web discovery updates after refresh; Realtime count updates require Supabase Realtime on `drop_drop`.

## Mobile Native Dependencies

Use Expo's installer so SDK-compatible native versions are selected:

```powershell
npm --workspace @gozaika/consumer-mobile run expo:install-native
npm --workspace @gozaika/restaurant-staff-mobile run expo:install-native
```
