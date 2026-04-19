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

## Environment mapping

- Preview environment variables: non-production keys where possible.
- Production environment variables: live Supabase, Resend, Upstash, Turnstile, and GA IDs.
- Keep names consistent so code paths do not branch by variable names.

## Rollback procedure

1. Open Vercel Deployments.
2. Promote last known-good deployment.
3. Disable faulty branch/merge path.
4. Patch and redeploy through normal CI path.
