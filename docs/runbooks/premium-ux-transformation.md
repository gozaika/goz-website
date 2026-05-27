# Premium UX Transformation Runbook

## Deploy

Deploy the affected Vercel projects after the Slice 2.1 commit:

```powershell
customer.gozaika.in
restaurant.gozaika.in
admin.gozaika.in
gozaika.in
```

No Supabase migration is required. Do not apply historical migrations again unless rebuilding from scratch.

## Environment Checks

Required for deployed apps:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY for server-only admin and restaurant routes
```

Optional:

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

The current consumer map fallback does not require Google Maps or a secret key. Google OAuth must be verified in Supabase Auth providers and redirect allow-list before being presented as production-ready.

## Smoke Tests

Consumer:

- Open `/`, `/drops`, `/drops/[id]`, `/restaurants`, `/restaurants/[slug]`, `/auth/login`, `/account`, and `/swaad-club`.
- Search by restaurant/drop/cuisine/dietary/allergen text.
- Toggle list/map. If no public coordinates exist, confirm the clear fallback message appears.
- Claim a BAM Bag through the existing hold path; do not alter Razorpay or pickup state.

Restaurant:

- Open `/portal/dashboard`, `/portal/drops`, `/portal/drops/new`, `/portal/templates`, `/portal/orders`, `/portal/finance`, `/portal/reports`, `/portal/profile`, `/portal/onboarding`.
- Confirm the sidebar is usable on desktop and narrow mobile widths.
- Confirm publishing guardrails still block unsafe publishing.

Admin:

- Open `/admin`, `/admin/ops`, and `/admin/users?q=<known phone/email/name fragment>`.
- Confirm search is bounded, list PII is masked, selected detail is one user only, and no broad export/merge/destructive action exists.

Website:

- Open `/` and `/insider`.
- Confirm testimonial/social proof sections render and website typecheck/lint/build remain green.

Record `document.documentElement.scrollWidth` and `document.documentElement.clientWidth` at 390px and 1440px for customer, restaurant, admin, and website touched pages.

## Support-Safe PII Handling

- Lists should show masked phone/email only.
- Full phone/email may appear only inside one selected admin detail record for an authorized platform actor.
- Do not log PII to console or export broad user lists.
- Any future suspend/reactivate/export/contact-reset mutation must require role authorization, human-readable reason text, and an `audit_log` row.

## Troubleshooting

- If restaurant directory is empty, confirm `api_public_restaurant_profile` and `api_public_drop_card` are readable in the target Supabase project.
- If map view shows fallback, confirm public coordinates are intentionally absent or expose a safe public coordinate read model in a later migration.
- If Google login fails, verify Supabase Google provider, OAuth credentials, and redirect URLs for `https://customer.gozaika.in/auth/callback`.
- If `/admin/users` fails, confirm `SUPABASE_SERVICE_ROLE_KEY` exists only server-side and the signed-in actor has an active platform membership.

## Rollback

Rollback is a Vercel deployment rollback only. No database migration, Edge Function, worker, payment, settlement, payout, or notification provider state is changed by this slice.
