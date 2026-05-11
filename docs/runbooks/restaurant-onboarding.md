# Restaurant Onboarding Runbook

Slice 2 adds the minimal Zayka Pro onboarding path for restaurant owners and the matching admin review queue.

## Local Setup

1. Start Supabase locally:
   ```bash
   supabase start
   ```
2. Copy local env values from:
   ```bash
   supabase status -o env
   ```
   into the root `.env.local`. Never commit real service-role keys.
3. Apply migrations/reset when needed:
   ```bash
   dotenv -e .env.local -- supabase db reset
   ```
4. Seed demo auth/domain rows:
   ```bash
   npm run demo:auth:create
   npm run demo:admin:create
   npm run db:seed:demo:slice2
   ```

## Demo Credentials

Restaurant owner:
- `biryani.baithak@gozaika.example`
- `GozaikaDemo@123`

Admin:
- `admin.ops@gozaika.example`
- `GozaikaDemo@123`

Local phone OTP test config:
- phone: `+15555550100`
- OTP: `123456`

## Owner Flow

1. Run `npm run dev:restaurant`.
2. Open `http://localhost:3001/auth/login`.
3. Sign in with a demo restaurant owner.
4. Open `http://localhost:3001/portal/onboarding`.
5. Save restaurant basics and compliance details.
6. Upload required documents. Private KYC/FSSAI files use `private-documents` and signed upload URLs only.

## Admin Flow

1. Run `npm run dev:admin`.
2. Open `http://localhost:3002/auth/login`.
3. Sign in as `admin.ops@gozaika.example`.
4. Open `http://localhost:3002/admin/restaurants/onboarding`.
5. Review documents, approve/reject compliance, then activate only when all gates are satisfied.

## Safety Notes

- KYC/FSSAI/PAN/bank documents must never use public buckets.
- Full bank account numbers are not collected in Slice 2; only masked account numbers are accepted.
- Restaurant owners cannot self-approve compliance or documents.
- Remote demo deletion is blocked unless `DEMO_SEED_ALLOW_REMOTE=true` is explicitly set.
