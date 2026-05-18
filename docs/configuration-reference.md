# Configuration and Environment Reference

## Environment strategy

- Preview and production environments both required.
- Keep same variable names across environments.
- Do not prefix server-only secrets with `NEXT_PUBLIC_`.

## Required variables

- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_GA_ID`
- `GOOGLE_SITE_VERIFICATION`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `WAITLIST_TO_EMAIL`
- `CONTACT_TO_EMAIL`
- `PARTNERS_TO_EMAIL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Current base URLs

| Surface | `NEXT_PUBLIC_BASE_URL` |
| --- | --- |
| Website | `https://gozaika.in` |
| Consumer web | `https://customer.gozaika.in` |
| Restaurant portal | `https://restaurant.gozaika.in` |
| Admin portal | `https://admin.gozaika.in` |

Owned but not necessarily routed domains: `gozaik.in`, `gozaika.com`.

## CI secrets

- Add Lighthouse token if PR comment upload is needed.
- Add deployment tokens only if custom automation is introduced beyond Vercel Git integration.

## Supabase expectations

- Create required lead tables.
- Enable RLS.
- Add anonymous INSERT policies and authenticated SELECT policies.
- Apply Slice 3 migration `20260513000000_slice3_drop_publishing_discovery.sql` before relying on consumer discovery.
- Apply Slice 4A migration `20260518002000_slice4a_claim_hold_order_intent.sql` before deploying claim holds.
- Grant anon/authenticated read to `api_public_drop_card`.
- Grant authenticated read to `api_claim_hold_summary`.
- Enable Realtime for `drop_drop` inventory/status updates if live client updates are required in the target environment.
- Deploy or schedule the `release-expired-holds` Supabase Edge Function so expired Slice 4A holds return availability.
- Add Supabase Auth redirect URLs for:
  - `https://customer.gozaika.in/auth/callback`
  - `https://restaurant.gozaika.in/auth/callback`
  - `https://admin.gozaika.in/auth/callback`

## Vercel expectations

- Root directory points to repo root.
- Build command uses workspace script (`npm run build`).
- Framework detects Next.js in `apps/website`.
- Each app project should run the corresponding npm workspace build command, or a Vercel app configuration that resolves the correct workspace.
