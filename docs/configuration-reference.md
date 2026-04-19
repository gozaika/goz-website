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

## CI secrets

- Add Lighthouse token if PR comment upload is needed.
- Add deployment tokens only if custom automation is introduced beyond Vercel Git integration.

## Supabase expectations

- Create required lead tables.
- Enable RLS.
- Add anonymous INSERT policies and authenticated SELECT policies.

## Vercel expectations

- Root directory points to repo root.
- Build command uses workspace script (`npm run build`).
- Framework detects Next.js in `apps/website`.
