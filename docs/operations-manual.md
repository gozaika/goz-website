# goZaika Website Operations Manual

## Deploy

1. Ensure all CI stages pass (quality, smoke e2e, accessibility, lighthouse).
2. Merge to protected production branch.
3. Vercel auto-builds and deploys `apps/website`.
4. Verify homepage, form APIs, redirects, robots, and sitemap in production URL.

## Rollback

1. Open Vercel project deployments.
2. Select last known-good deployment.
3. Promote deployment to production.
4. Open incident note with issue summary, impact, root cause, and fix owner.

## Monitoring

- Check Vercel build logs and runtime function logs.
- Check Resend delivery logs for API route email notifications.
- Check Supabase table inserts and RLS behaviour.
- Check GA4 DebugView for event collection health.

## Incident handling

- **P0:** Homepage down or forms non-functional in production.
- **P1:** Broken legal route, critical accessibility regression, or failed redirect matrix.
- **P2:** Non-blocking copy/visual issues with no conversion impact.

## Credential-gated checks

The following require active credentials and cannot be fully validated offline:

- Turnstile token verification with production secret.
- Supabase insert path with live project credentials.
- Resend outbound mail delivery.
- GA4 realtime and Search Console verification.
