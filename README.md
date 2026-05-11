# goZaika Platform

Premium-access, pickup-only BAM Bag marketplace for India. Hyderabad first.

## Workspace

- `apps/website`: canonical production website and web-stack baseline.
- `apps/consumer-web`: Next.js consumer PWA.
- `apps/restaurant-mgmt-web`: Zayka Pro restaurant portal.
- `apps/admin-web`: internal operations portal.
- `apps/consumer-mobile`: Expo consumer app.
- `apps/restaurant-staff-mobile`: Expo staff pickup app.
- `packages/types`: Zod contracts and status constants.
- `packages/utils`: money, pickup-window, QR, phone, consent, and safe-error helpers.
- `packages/supabase`: Supabase client factories and storage helpers.
- `packages/db`: Prisma setup and database/RPC helpers.
- `packages/ui`: shared design tokens and UI primitives.
- `packages/config`: brand and environment constants.
- `packages/logger`: structured logger.
- `supabase/migrations`: canonical Supabase PostgreSQL schema.
- `supabase/functions`: webhooks and scheduled workers.

## Start

```powershell
npm install
npm run typecheck
npm run test
npm run dev:consumer
```

Copy `.env.example` to an app-local environment file and fill real values locally. Do not commit secrets.

## Web Baseline

All web apps follow the production website stack:

- Next.js `16.2.4`
- React `19.2.4`
- React DOM `19.2.4`
- TypeScript `5.9.x`
- ESLint `9.x` with flat config
- Tailwind CSS `4.x`
- npm workspaces with `package-lock.json`

Do not use `next lint`; use `eslint .`.

## Database Contract

The canonical DDL lives in:

`supabase/migrations/20260425000000_gozaika_consolidated_schema.sql`

Application code should adapt to that schema. New migrations should be additive, documented, and consistent with the existing naming conventions.

## Security Notes

- Service-role Supabase keys are server-only.
- Razorpay webhooks must verify signatures before mutating state.
- Money is bigint paise.
- Inventory holds use `api_create_inventory_hold`.
- Consent is purpose-based and append-only.
