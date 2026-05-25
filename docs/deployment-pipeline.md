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
- Slice 4B requires migration `20260521000000_slice4b_razorpay_payment_order_confirmation.sql`, consumer Razorpay env vars, `PICKUP_CREDENTIAL_SECRET`, and a deployed `razorpay-webhook` Edge Function before enabling payment checkout.
- Razorpay dashboard webhooks should include `payment.captured` and `payment.failed` and point to the deployed Supabase function URL.
- Slice 5 requires migration `20260525000000_slice5_pickup_verification_incidents.sql` before deploying pickup/no-show/incident UI. No WATI, email, refund, settlement, payout, or finance env vars are added.
- Slice 6 requires migration `20260526000000_slice6_transactional_notifications.sql`, deployed `notification-outbox-worker`, redeployed `pickup-reminder-cron` and `razorpay-webhook`, and notification env vars or `NOTIFICATION_DRY_RUN=true` for non-provider smoke tests. WhatsApp defaults to Meta Cloud API with WATI left as a later provider switch.
- Website deployments should use the approved mailbox mapping: `contact@gozaika.in`, `partners@gozaika.in`, `waitlist@gozaika.in`, `billing@gozaika.in`, `careers@gozaika.in`, and `tech@gozaika.in`.

## Rollback procedure

1. Open Vercel Deployments.
2. Promote last known-good deployment.
3. Disable faulty branch/merge path.
4. Patch and redeploy through normal CI path.
5. For Slice 4B payment incidents, rollback app checkout first if needed; keep webhook ledger rows intact for replay/support investigation.
6. For Slice 5 pickup incidents, rollback restaurant/admin/consumer deployments first; keep pickup verification, status transition, inventory event, and incident audit rows intact.
7. For Slice 6 notification incidents, pause worker/cron schedules first; keep outbox and delivery attempt rows for support review and retry.
