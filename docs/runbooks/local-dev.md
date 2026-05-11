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
5. Run all checks: `npm run ci`

## Useful Commands

- Website: `npm run dev:website`
- Consumer web: `npm run dev:consumer`
- Restaurant portal: `npm run dev:restaurant`
- Admin portal: `npm run dev:admin`
- All type checks: `npm run typecheck`
- Shared tests: `npm run test`

## Mobile Native Dependencies

Use Expo's installer so SDK-compatible native versions are selected:

```powershell
npm --workspace @gozaika/consumer-mobile run expo:install-native
npm --workspace @gozaika/restaurant-staff-mobile run expo:install-native
```
