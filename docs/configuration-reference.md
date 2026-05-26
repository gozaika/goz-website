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
- `SUPABASE_SERVICE_ROLE_KEY` for server-only admin, restaurant support, checkout, and Edge Function mutation paths.
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `WAITLIST_TO_EMAIL`
- `CONTACT_TO_EMAIL`
- `PARTNERS_TO_EMAIL`
- `CAREERS_TO_EMAIL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` for consumer Checkout.js.
- `RAZORPAY_KEY_SECRET` for server-side Razorpay Orders API calls.
- Consumer checkout creates INR Razorpay orders. Use India payment gateway API keys for INR checkout; keys that look like `rzp_test_us_...` or `rzp_live_us_...` are not valid for this INR flow.
- `RAZORPAY_WEBHOOK_SECRET` for Supabase `razorpay-webhook` signature verification.
- `PICKUP_CREDENTIAL_SECRET` for hashing pickup QR nonce and OTP proof. Use at least 32 random characters.
- Slice 6 transactional notifications:
  - `NOTIFICATION_DRY_RUN=true` for local/staging worker tests without provider sends.
  - `RESEND_API_KEY` and `NOTIFICATION_RESEND_FROM_EMAIL` or `RESEND_FROM_EMAIL` for email delivery.
  - `NOTIFICATION_WHATSAPP_PROVIDER=META` by default for WhatsApp delivery through Meta Cloud API.
  - `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, optional `META_WHATSAPP_GRAPH_VERSION`, `META_WHATSAPP_TEMPLATE_LANGUAGE`, `META_WHATSAPP_TEMPLATE_OVERRIDE`, `META_WHATSAPP_TEMPLATE_PARAM_ORDER`, and `META_WHATSAPP_SEND_MODE` for Meta WhatsApp sandbox or direct Cloud API delivery.
  - `WATI_API_BASE_URL`, `WATI_API_TOKEN`, and optional `WATI_BROADCAST_NAME` for a future WhatsApp/WATI switch with `NOTIFICATION_WHATSAPP_PROVIDER=WATI`.
- Slice 7 pilot finance settlements:
  - No live payout, Razorpay transfer, refund, fund-account, invoice-generation, or accounting integration env vars are required.
  - Optional `SETTLEMENT_WORKER_ACTOR_PROFILE_PK` lets `settlement-run-worker` refresh draft runs for a configured `FINANCE_ADMIN`/`SUPER_ADMIN` profile. Leave it unset unless ops intentionally enables worker-created drafts.
- Slice 8A pilot ROI reports:
  - No new environment variables are required.
  - Reports read existing drop, order, payment, pickup, incident, refund, and settlement facts through authenticated app sessions.
- Approved public mailbox mapping: general `contact@gozaika.in`, partners `partners@gozaika.in`, waitlist `waitlist@gozaika.in`, billing/refund finance `billing@gozaika.in`, careers `careers@gozaika.in`, and technical/security/platform `tech@gozaika.in`.

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
- Apply Slice 4B migration `20260521000000_slice4b_razorpay_payment_order_confirmation.sql` before enabling Razorpay checkout or deploying the updated `razorpay-webhook`.
- Apply Slice 5 migration `20260525000000_slice5_pickup_verification_incidents.sql` before enabling restaurant pickup verification, no-show, or incident creation UI.
- Apply Slice 6 migration `20260526000000_slice6_transactional_notifications.sql` before deploying notification UI or notification workers.
- Apply Slice 7 migration `20260527000000_slice7_pilot_finance_settlement.sql` before deploying `/admin/finance`, `/portal/finance`, or the hardened `settlement-run-worker`.
- Apply Slice 8A migration `20260528000000_slice8a_pilot_roi_reports.sql` before deploying `/admin/reports` or `/portal/reports`.
- Grant anon/authenticated read to `api_public_drop_card`.
- Grant authenticated read to `api_claim_hold_summary`.
- Enable Realtime for `drop_drop` inventory/status updates if live client updates are required in the target environment.
- Deploy or schedule the `release-expired-holds` Supabase Edge Function so expired Slice 4A holds return availability.
- Deploy `razorpay-webhook` with `RAZORPAY_WEBHOOK_SECRET` after Slice 4B migration is applied.
- Deploy `notification-outbox-worker` and redeploy `pickup-reminder-cron` after Slice 6 migration is applied.
- Deploy `settlement-run-worker` after Slice 7 migration is applied. The worker is bounded and reports `livePayoutsEnabled=false`.
- Add Supabase Auth redirect URLs for:
  - `https://customer.gozaika.in/auth/callback`
  - `https://restaurant.gozaika.in/auth/callback`
  - `https://admin.gozaika.in/auth/callback`

## Vercel expectations

- Root directory points to repo root.
- Build command uses workspace script (`npm run build`).
- Framework detects Next.js in `apps/website`.
- Each app project should run the corresponding npm workspace build command, or a Vercel app configuration that resolves the correct workspace.
