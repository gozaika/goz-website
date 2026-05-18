# GitHub -> Vercel CI/CD Pipeline

## Branch strategy

- `main`: production deploy target.
- `dev`: integration preview target.
- `feature/*`: short-lived branches with preview URLs.

## GitHub protection rules (recommended)

- Require pull request before merge to `main`.
- Require all CI checks to pass before merge.
- Restrict direct pushes to protected branches.
- Require at least one approving review (can be founder + future reviewer model).

## Required PR checks

- `Quality Gates`
- `Smoke E2E`
- `Accessibility Audit`
- `Lighthouse Audit`

## Vercel integration

- Connect GitHub repository once.
- Auto-create preview deployments for PR branches.
- Auto-deploy production from `main`.

## Current production domain mapping

| Vercel project / app | Production URL |
| --- | --- |
| `apps/website` | `https://gozaika.in/` |
| `apps/consumer-web` | `https://customer.gozaika.in/` |
| `apps/restaurant-mgmt-web` | `https://restaurant.gozaika.in/` |
| `apps/admin-web` | `https://admin.gozaika.in/` |

Owned domains also include `gozaik.in` and `gozaika.com`. Treat these as reserved domains unless DNS and Vercel aliases are explicitly configured.

## Environment mapping

- Preview environment variables: non-production keys where possible.
- Production environment variables: live Supabase, Resend, Upstash, Turnstile, and GA IDs.
- Keep names consistent so code paths do not branch by variable names.
- Consumer and restaurant projects must include Supabase Auth redirect URLs for their `/auth/callback` routes.
- Slice 3 requires the `api_public_drop_card` view and `drop_drop` Realtime path to be deployed in the target Supabase environment.
- Slice 4A requires migration `20260518002000_slice4a_claim_hold_order_intent.sql` and the existing `release-expired-holds` Edge Function path before enabling claim holds.

## Rollback procedure

1. Open Vercel Deployments.
2. Promote last known-good deployment.
3. Disable faulty branch/merge path.
4. Patch and redeploy through normal CI path.
