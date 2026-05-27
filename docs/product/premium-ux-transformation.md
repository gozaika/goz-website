# Premium UX Transformation

Slice 2.1 turns the existing pilot web surfaces into production-ready demo and first-city launch experiences without changing payment, pickup, notification, finance, or settlement behavior.

## Consumer Discovery

- `/` and `/drops` use existing public drop data for search, cuisine chips, dietary filters, closing-soon drops, recently-missed drops, and polished empty states.
- Map mode is safe by default. It only renders pins from public coordinates; when coordinates are absent, the UI explains that list view is the source of truth.
- Claim/payment/pickup behavior remains owned by the existing hold, Razorpay, order, QR/OTP, and notification slices.

## Restaurant Directory And Profiles

- `/restaurants` lists public restaurants from `api_public_restaurant_profile` plus public drop context.
- `/restaurants/[slug]` shows public identity, cuisine/dietary tags, active/upcoming drops, public past drop history, share affordance, and food-safety reminders.
- Private compliance documents, legal details, payout fields, team membership, internal notes, and support details are never shown.

## Account, Auth, And Swaad Club

- `/account` highlights profile completeness, order/hold affordances, notification/consent clarity, referral code state, and Swaad Club status.
- Phone OTP remains the primary mobile login path. Google OAuth uses Supabase OAuth and must be configured in Supabase/Vercel before production claims.
- `/swaad-club` is subscription-ready positioning only. It does not create recurring billing, mandates, renewals, or entitlement.

## Restaurant Portal

- Portal pages use a grouped responsive sidebar with active route state, restaurant identity, status badge, and partner support affordance.
- `/portal/dashboard` shows honest metrics from existing drops: estimated today revenue, bags sold/listed, sell-through, AOV, recent drop sell-through, next drop, and quick actions.
- `/portal/drops` lists active/scheduled/closed drops with title, pickup, price, listed/sold, sell-through, status, and safe actions.

## Admin User Management

- `/admin/users` provides bounded search by phone, email, or name with at most 12 server-side results.
- List identifiers are masked. Selecting one user shows profile/auth-provider summary, consent/order/hold/notification/audit counts, and Swaad Club placeholder state.
- This slice intentionally avoids suspend/reactivate, account merge, broad export, bulk user tooling, and destructive actions.

## Website Polish

- Testimonials/social proof and Insider CTA are treated as pilot-safe/static content, not fabricated live metrics.
- Existing metadata, Open Graph/Twitter helpers, JSON-LD-ready layout structure, skip link, and lazy below-fold section patterns remain the website baseline.

## Brand Language

Use: BAM Bags, Limited Drops, Chef's Selection, off-menu discovery, premium access, pickup window, partner action required.

Do not use: leftover, stale, cheap, clearance, liquidation, food rescue, bargain bin.

## Out Of Scope

Slice 2.1 does not add subscriptions, referral rewards, coupons, native mobile parity, multi-city architecture, automated payouts, live refunds, settlement mutations, payment capture changes, notification provider changes, or broad admin exports.
