# goZaika — Technology Specification v4.0
**Full Production Roadmap — Slices 3.1 through 3.7**  
**Version:** 4.0 | **May 2026** | CONFIDENTIAL  
**Builds on:** Tech Spec v3.0 (Slices 2.1–2.4) + Strategic Analysis v1.0

---

## Preface: v3 Audit — What's Real, What's Missing

Before adding new slices, an honest read of the actual codebase and consolidated schema is required.

### What v3 does not need to build at the DB level (already in consolidated schema)

The `20260425000000_gozaika_consolidated_schema.sql` migration is significantly more mature than v3 implies. The following tables **already exist** and need no new migrations — only application-layer wiring and UI:

| Already in Schema | Covers |
|---|---|
| `consumer_referral`, `consumer_referral_code` | Referral programme (v3 Slice 2.2 schedules a migration — not needed) |
| `consumer_subscription`, `consumer_subscription_plan` | Swaad Club subscription (plan rows and Razorpay ref columns exist) |
| `consumer_passport_stat` | Zayka Passport gamification rollup (BRONZE/SILVER/GOLD/PLATINUM tiers) |
| `geo_city`, `geo_neighborhood` | Multi-city architecture (HYD seeded; BLR/MUM/DEL pre-wired) |
| `restaurant_team_membership`, `restaurant_team_role` | Team management (v3 Slice 2.2 schedules a migration — not needed) |
| `analytics_event` (partitioned by quarter) | Event telemetry |
| `review_review`, `review_media` | Review system (v3 Slice 2.4 — schema exists, only UI needed) |
| `privacy_erasure_request` | DPDP right to erasure |
| `marketing_waitlist_lead`, `marketing_partner_lead` | Waitlist and partner lead capture |

> **Implication for v3 Slice 2.2 and 2.4:** Skip the migration steps. Wire directly to existing tables. This saves significant sprint time.

### What v3 omits entirely (addressed in this v4 spec)

1. **ZaikaIQ** — The B2B SaaS analytics product. Zero schema, zero UI, zero API. This is the long-term revenue engine and must be built as a named product, not just a dashboard tab.
2. **Food Safety Technical Enforcement** — The 5-hour hot-food rule and freshness QR exist only as SOPs. They need API-level enforcement.
3. **WhatsApp Business Cloud API** — v3 uses WATI for notification delivery only. WhatsApp must be a first-class channel: restaurant onboarding bot, consumer insider management, drop alerts, QR-based follow flows.
4. **Dynamic / Last Call Pricing** — No tiered pricing, no sell-through-triggered price drop, no price history.
5. **Zayka Passport UX** — The `consumer_passport_stat` table is live but no screen exists anywhere.
6. **Campus Ambassador Programme** — No schema, no UI, no tracking.
7. **Carbon Credit Data Infrastructure** — No logging, no calculation, no export.

### Current App Readiness (honest audit)

> **Parity note (2026-07-07):** the table below is the **v4-authoring baseline** and is
> now superseded by later work. Since it was written, the web-parity program (W0–W7) and
> Phase 1–2 landed: website copy/SEO + restaurant economics calculator; consumer web+mobile
> thali/variety framing, §16 allergen-conflict gate, CW-1 passport cuisines, and mobile
> checkout/pickup-proof/PeekBar (CM-1/2/3); consumer-mobile is now feature-built (Slices 0–18),
> not a shell. For the live per-surface state, treat these as source of truth:
> `docs/audit/IMPLEMENTATION-PLAN.md`, `docs/audit/CONTINUE-HERE-impl.md`, and
> `docs/audit/launch-readiness-audit-2026-07-05.md`. The percentages below are retained only
> as the historical starting point for the v4 slices.

| App | Real Readiness (v4 baseline) | Key Gaps (as of authoring — many since addressed) |
|---|---|---|
| consumer-web | ~35% → Phase 2 done | Home grid, Swaad Club shell, /restaurants EmptyState — thali framing + §16 gate + passport since built |
| restaurant-mgmt-web | ~55% → +calculator/planner | No analytics tab (→ ZaikaIQ, Slice 3.1/3.2); RP-1/RP-2 open (Phase 3) |
| admin-web | ~60% | 7 tabs functional; no user management tab; no monitoring |
| consumer-mobile | ~5% → feature-built | Was App.tsx shell; now Slices 0–18 (thali, §16 gate, CM-1/2/3, pickup proof) |
| restaurant-staff-mobile | ~3% | App.tsx shell only — RM-1 ROI parity open (Phase 3) |
| website | ~70% → copy/SEO/calculator done | Testimonials + full SEO architecture (Slice 3.7C) still pending |

---

## Slice Roadmap Overview

v3 Slices 2.1–2.4 address the UX gap across existing features. v4 Slices 3.1–3.7 address the **product gap** — capabilities that don't exist at all yet.

| Slice | Name | Primary App(s) | Estimated Effort |
|---|---|---|---|
| 3.1 | ZaikaIQ Foundation — Data Pipeline & Free Tier | restaurant-mgmt-web, Supabase Edge Functions | 2–3 weeks |
| 3.2 | ZaikaIQ Pro — Demand Intelligence & Monetization | restaurant-mgmt-web, admin-web | 2 weeks |
| 3.3 | Food Safety Technical Enforcement | All API routes, consumer-web, restaurant-staff-mobile | 1–2 weeks |
| 3.4 | WhatsApp Growth Engine | Supabase Edge Functions, website, admin-web | 2–3 weeks |
| 3.5 | Dynamic Pricing & Sell-Through Optimization | consumer-web, restaurant-mgmt-web, Edge Functions | 1–2 weeks |
| 3.6 | Zayka Passport & Consumer Gamification | consumer-web, consumer-mobile | 1–2 weeks |
| 3.7 | Growth Infrastructure (Ambassador, Brand, SEO) | website, packages, scripts | 1–2 weeks |

Slices 3.1 and 3.2 are sequentially dependent (need data before intelligence). All others are independently parallelisable.

---

## Slice 3.1 — ZaikaIQ Foundation: Data Pipeline & Free Tier

### Objectives

- Establish ZaikaIQ as a **named product** distinct from the restaurant portal, with its own navigation entry, brand identity (`ZaikaIQ` wordmark), and upgrade path
- Build the daily stats aggregation pipeline that feeds all ZaikaIQ analytics
- Deliver the **ZaikaIQ Starter** dashboard (free, included with all restaurant accounts) covering sell-through, waste recovery, and food savings impact
- Begin carbon credit data logging from Day 1 (data is the asset; the product comes in Slice 3.2)
- Instrument every restaurant and consumer event into `analytics_event` (the table exists; the instrumentation doesn't)

### New Schema

```sql
-- Migration: slice3_1_zaika_iq_foundation.sql
begin;

-- ============================================================
-- ZaikaIQ: Restaurant daily statistics (aggregation target)
-- Populated by a nightly Supabase Edge Function cron job.
-- This is a read-optimised denormalised table; source of truth
-- remains in drop_drop, order_order, order_item.
-- ============================================================
create table if not exists zaika_iq_restaurant_daily_stat (
  restaurant_fk             uuid        not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  stat_date                 date        not null,
  day_of_week               smallint    not null, -- 0=Sunday … 6=Saturday (extract(dow from stat_date))
  bags_listed               integer     not null default 0,
  bags_sold                 integer     not null default 0,
  bags_last_call            integer     not null default 0, -- sold only after price dropped to last-call tier
  bags_expired              integer     not null default 0, -- listed but pickup window closed unsold
  sell_through_pct          numeric(5,2),                   -- null if bags_listed=0
  revenue_recovered_paise   bigint      not null default 0, -- sum of order_item.unit_price_paise for COLLECTED orders
  avg_order_value_paise     bigint,                         -- null if bags_sold=0
  minutes_to_first_claim    integer,                        -- null if no claims
  minutes_to_sell_out       integer,                        -- null if did not sell out
  food_saved_grams          integer     not null default 0, -- bags_sold * template.estimated_weight_grams (default 350g if not set)
  local_event_tag           text,                           -- future: IPL, exam-week, public-holiday
  aggregated_at             timestamptz not null default now(),
  primary key (restaurant_fk, stat_date)
);
comment on table zaika_iq_restaurant_daily_stat is
  'Nightly denormalised rollup of each restaurant''s drop and order activity. '
  'Source for ZaikaIQ dashboards and demand forecasting. '
  'Never expose raw financial figures to other restaurants (cross-restaurant percentile is fine).';

create index idx_zaika_iq_daily_stat_date     on zaika_iq_restaurant_daily_stat (stat_date);
create index idx_zaika_iq_daily_stat_rest_dow on zaika_iq_restaurant_daily_stat (restaurant_fk, day_of_week);

-- ============================================================
-- ZaikaIQ: Carbon credit / food impact log
-- One row per completed (COLLECTED) order item.
-- Append-only: no UPDATE or DELETE (enforced by RLS trigger).
-- ============================================================
create table if not exists zaika_iq_impact_log (
  impact_log_pk         uuid        not null default gen_random_uuid(),
  restaurant_fk         uuid        not null references restaurant_restaurant (restaurant_restaurant_pk),
  order_fk              uuid        not null references order_order (order_order_pk),
  log_date              date        not null,
  bags_count            integer     not null default 1,
  food_saved_grams      integer     not null,  -- bags_count * weight per bag
  co2_equivalent_grams  integer     not null,  -- food_saved_grams * 2.5
  calculation_basis     text        not null default 'WRAP_2021_FOOD_WASTE_FACTOR',
  created_at            timestamptz not null default now(),
  primary key (impact_log_pk),
  unique (order_fk)  -- one impact row per order; idempotent upsert safe
);
comment on table zaika_iq_impact_log is
  'Immutable food-impact ledger. One row per COLLECTED order. '
  'Aggregate over restaurant_fk for monthly ESG report. '
  'Aggregate over all rows for platform-level impact counter on website. '
  'co2_equivalent_grams uses WRAP 2021 factor: 2.5kg CO2e per 1kg food saved.';

-- RLS: restaurants can read their own rows; platform admin can read all; no writes via API
alter table zaika_iq_impact_log enable row level security;
create policy "restaurant read own impact" on zaika_iq_impact_log
  for select using (
    restaurant_fk in (
      select restaurant_fk from restaurant_team_membership
      where iam_profile_fk = auth.uid() and membership_status_code = 'ACTIVE'
    )
  );
create policy "platform admin read all impact" on zaika_iq_impact_log
  for select using (
    exists (select 1 from iam_platform_membership where iam_profile_fk = auth.uid() and membership_status_code = 'ACTIVE')
  );

-- ============================================================
-- ZaikaIQ: Subscription tier per restaurant
-- ============================================================
create table if not exists zaika_iq_subscription (
  restaurant_fk               uuid        not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  tier_code                   text        not null default 'STARTER',  -- STARTER | PRO | ENTERPRISE
  razorpay_subscription_id    text        unique,
  status_code                 text        not null default 'ACTIVE',   -- ACTIVE | CANCELLED | PAST_DUE
  current_period_end_at       timestamptz,
  trial_end_at                timestamptz,
  cancelled_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  primary key (restaurant_fk),
  constraint ck_zaika_iq_tier check (tier_code in ('STARTER', 'PRO', 'ENTERPRISE'))
);
comment on table zaika_iq_subscription is
  'ZaikaIQ SaaS subscription per restaurant. '
  'STARTER is free and auto-created at restaurant activation. '
  'PRO = ₹2,999/month via Razorpay subscription. '
  'ENTERPRISE = ₹7,999/month, manually provisioned by admin. '
  'Middleware reads tier_code to gate /portal/analytics/* routes.';

-- Auto-create STARTER row when a restaurant is activated
create or replace function fn_auto_create_zaika_iq_starter()
returns trigger language plpgsql security definer as $$
begin
  -- Fires when restaurant_restaurant.restaurant_status_code transitions to ACTIVE
  if new.restaurant_status_code = 'ACTIVE' and (old.restaurant_status_code is distinct from 'ACTIVE') then
    insert into zaika_iq_subscription (restaurant_fk, tier_code, status_code)
    values (new.restaurant_restaurant_pk, 'STARTER', 'ACTIVE')
    on conflict (restaurant_fk) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_auto_create_zaika_iq_starter
  after update of restaurant_status_code on restaurant_restaurant
  for each row execute function fn_auto_create_zaika_iq_starter();

-- Add estimated_weight_grams to catalog_bag_template (used for food impact calculation)
alter table catalog_bag_template
  add column if not exists estimated_weight_grams integer not null default 350;
comment on column catalog_bag_template.estimated_weight_grams is
  'Estimated total weight of food in this bag type in grams. '
  'Default 350g (WRAP 2021 average portion). Used to calculate food_saved_grams in zaika_iq_impact_log.';

commit;
```

### New Edge Function: `zaika-iq-daily-aggregator`

**Schedule:** Every day at 23:45 IST (18:15 UTC) — after all pickup windows have closed.

**Logic:**
1. Query all restaurants with at least one drop in the last 48 hours (catch missed runs)
2. For each restaurant × date pair, compute stats from `drop_drop`, `order_order`, `order_item`
3. Upsert into `zaika_iq_restaurant_daily_stat`
4. For all newly COLLECTED orders not yet in `zaika_iq_impact_log`, insert impact rows
5. Update `consumer_passport_stat` for all consumers who collected bags today
6. Write execution summary to `audit_log`

```typescript
// supabase/functions/zaika-iq-daily-aggregator/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (_req) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Aggregate stats for yesterday and today (handle timezone edge cases)
  const dates = [yesterday, today].map(d => d.toISOString().split('T')[0])

  let aggregated = 0, impactLogged = 0

  for (const statDate of dates) {
    // Call DB function that does the heavy lifting in a single SQL pass
    const { error } = await supabase.rpc('fn_aggregate_zaika_iq_daily_stats', {
      p_stat_date: statDate
    })
    if (!error) aggregated++

    // Log impact for collected orders on this date
    const { data: impactError } = await supabase.rpc('fn_log_zaika_iq_impact', {
      p_log_date: statDate
    })
    if (!impactError) impactLogged++
  }

  // Update passport stats for recent collectors
  await supabase.rpc('fn_refresh_passport_stats_batch', { p_since: yesterday.toISOString() })

  await supabase.from('audit_log').insert({
    action_code: 'ZAIKA_IQ_DAILY_AGGREGATION',
    action_metadata_json: { dates, aggregated, impactLogged },
    performed_at: new Date().toISOString()
  })

  return new Response(JSON.stringify({ ok: true, aggregated, impactLogged }))
})
```

> **Note:** The actual aggregation SQL (`fn_aggregate_zaika_iq_daily_stats` and `fn_log_zaika_iq_impact`) are DB functions in the migration — kept in SQL for performance and transactional safety. The Edge Function is a thin orchestrator.

### New API Routes (restaurant-mgmt-web)

```
GET  /api/portal/zaika-iq/overview          → 30-day summary for dashboard hero
GET  /api/portal/zaika-iq/daily-stats       → last N days, day-by-week breakdown
GET  /api/portal/zaika-iq/impact            → total kg saved, CO2, bags count
GET  /api/portal/zaika-iq/impact/report.pdf → monthly ESG report PDF (PRO only)
GET  /api/portal/zaika-iq/tier              → current tier + upgrade CTA data
```

### New Pages — Restaurant Portal

**`/portal/zaika-iq`** — ZaikaIQ Starter Dashboard (all restaurants, no paywall)

Layout: ZaikaIQ wordmark header (distinct from portal nav), then:

- **Waste Recovery Hero** — Total ₹ recovered this month in large saffron type, trend arrow vs. last month
- **Sell-Through Ring Chart** — Donut: sold / last-call sold / expired (Recharts PieChart)
- **Day-of-Week Heatmap** — 7-column grid, each cell coloured by sell_through_pct (forest = high, amber = medium, red = low). Immediately shows "you under-perform on Tuesdays."
- **Food Impact Card** — "This month you saved X kg of food = Y kg CO₂ avoided." Leaf icon, forest green. Shareable PNG export.
- **ZaikaIQ Pro Teaser** — Locked section with blurred preview of demand forecast chart. "Upgrade to see 7-day demand forecast → ₹2,999/month."

### Slice 3.1 — Claude Code Implementation Prompt

```
SYSTEM: goZaika monorepo. Next.js 16 + Supabase + Tailwind 4. npm workspaces only.
Design tokens: saffron #FF6B35, forest #1A5C38, gold #D4A017, cream #FFF8F0, charcoal #2D2D2D.
Money: bigint paise throughout. All DB access via typed supabase-js client.

TASK — Slice 3.1: ZaikaIQ Foundation

1. DATABASE MIGRATION
   File: supabase/migrations/[timestamp]_slice3_1_zaika_iq_foundation.sql
   - Create zaika_iq_restaurant_daily_stat (see spec above for exact DDL)
   - Create zaika_iq_impact_log with append-only RLS
   - Create zaika_iq_subscription with auto-create trigger
   - Add estimated_weight_grams column to catalog_bag_template
   - Write fn_aggregate_zaika_iq_daily_stats(p_stat_date date) DB function:
     * For each restaurant with drops on p_stat_date, compute all stat columns
     * Use a single CTE chain: drops → orders → aggregates
     * UPSERT into zaika_iq_restaurant_daily_stat
   - Write fn_log_zaika_iq_impact(p_log_date date) DB function:
     * Find COLLECTED order_order rows on p_log_date not yet in zaika_iq_impact_log
     * Join to catalog_bag_template for estimated_weight_grams
     * INSERT into zaika_iq_impact_log (on conflict do nothing)
   - Write fn_refresh_passport_stats_batch(p_since timestamptz) DB function:
     * Recompute consumer_passport_stat for consumers who had COLLECTED orders since p_since
     * Update total_bags_collected, total_restaurants_visited, current_tier_code
     * Tier thresholds: BRONZE=0+, SILVER=10+, GOLD=30+, PLATINUM=75+

2. EDGE FUNCTION
   File: supabase/functions/zaika-iq-daily-aggregator/index.ts
   - Implement as described in spec (thin orchestrator calling DB RPCs)
   - Schedule: register in supabase/config.toml as cron "45 18 * * *" (18:15 UTC = 23:45 IST)
   - Handle timezone: statDate should be in Asia/Kolkata date, not UTC date

3. API ROUTES (apps/restaurant-mgmt-web)
   File: app/api/portal/zaika-iq/overview/route.ts
   - Auth: getPortalActor(); 401 if not authenticated
   - Query zaika_iq_restaurant_daily_stat for last 30 days
   - Return: { totalRevenuePaise, totalBagsSold, avgSellThroughPct, trendVsLastMonth, impactKgSaved }

   File: app/api/portal/zaika-iq/daily-stats/route.ts
   - Query param: ?days=30 (default) or ?days=90
   - Return array of daily stat rows including day_of_week for heatmap

   File: app/api/portal/zaika-iq/impact/route.ts
   - Aggregate zaika_iq_impact_log for restaurant
   - Return: { totalFoodSavedKg, totalCo2AvoidedKg, totalBagsCount, monthBreakdown[] }

   File: app/api/portal/zaika-iq/tier/route.ts
   - Join zaika_iq_subscription for the restaurant
   - Return: { tier, status, currentPeriodEndAt, upgradeUrl }

4. ZAIKA IQ DASHBOARD PAGE
   File: apps/restaurant-mgmt-web/app/portal/zaika-iq/page.tsx
   - Server component; fetches from /api/portal/zaika-iq/overview + /daily-stats + /impact
   - ZaikaIQ wordmark: "ZaikaIQ" in Playfair Display 28px, saffron, with "by goZaika" subtitle in forest 12px
   - WasteRecoveryHero: big number, trend arrow (react-feather ArrowUp/ArrowDown)
   - SellThroughDonut: Recharts PieChart (sold=saffron, last-call=gold, expired=slate-200)
   - DayOfWeekHeatmap: 7-cell grid, colour-coded by sell_through_pct
   - FoodImpactCard: kg saved, CO2 avoided, shareable (use html2canvas for PNG export)
   - ZaikaIQProTeaser: blurred recharts LineChart with "Unlock" overlay button

5. ADD ZAIKA IQ TO PORTAL NAV
   File: apps/restaurant-mgmt-web/app/portal/portal-nav.tsx
   - Add "ZaikaIQ" as a nav section with a BarChart2 icon (lucide-react)
   - Show "PRO" badge if tier is PRO or ENTERPRISE; show "Upgrade" badge if STARTER
   - Link to /portal/zaika-iq

6. PLATFORM IMPACT COUNTER API (public, for website)
   File: apps/consumer-web/app/api/public/impact/route.ts
   (or apps/website/app/api/impact/route.ts if website is the right host)
   - Query zaika_iq_impact_log aggregates (no auth required)
   - Return: { totalBagsRescued, totalFoodSavedKg, totalRestaurantsActive }
   - Cache: Cache-Control max-age=3600 (update hourly is fine)
   - Used by website homepage ImpactCounter component

For ALL new code:
- TypeScript strict mode
- JSDoc on all exported functions and components
- Supabase typed client (import type from @gozaika/types)
- Skeleton loaders on all async boundaries
- Error boundaries with user-facing fallback messages
```

---

## Slice 3.2 — ZaikaIQ Pro: Demand Intelligence & Monetization

### Objectives

- Build the **demand forecast engine** — the core value proposition of ZaikaIQ Pro
- Implement **Razorpay subscription checkout** for ZaikaIQ Pro (₹2,999/month) and Enterprise (₹7,999/month, admin-provisioned)
- Build the **ZaikaIQ Pro dashboard** with forecasting, pricing suggestions, competitor benchmarking, and ESG PDF report
- Add **POS webhook receiver** for Petpooja (most common Hyderabad restaurant POS) — enriches forecast with actual sales data

### New Schema

```sql
-- Migration: slice3_2_zaika_iq_pro.sql
begin;

-- Demand forecast cache (refreshed nightly alongside daily stats)
create table if not exists zaika_iq_demand_forecast (
  restaurant_fk         uuid    not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  forecast_date         date    not null,
  recommended_qty       integer not null,
  confidence_level      text    not null default 'LOW', -- LOW | MEDIUM | HIGH
  basis_text            text    not null, -- human-readable: "Based on your last 4 Fridays, avg 8.2 bags sold"
  p10_qty               integer,          -- pessimistic (10th percentile)
  p90_qty               integer,          -- optimistic (90th percentile)
  local_event_tag       text,             -- IPL_MATCH | EXAM_WEEK | PUBLIC_HOLIDAY | null
  generated_at          timestamptz not null default now(),
  primary key (restaurant_fk, forecast_date)
);
comment on table zaika_iq_demand_forecast is
  'Nightly demand forecast per restaurant per future date. '
  'Algorithm: 4-week rolling average with day-of-week weighting. '
  'Minimum 14 days of data for MEDIUM confidence; 28 days for HIGH. '
  'local_event_tag enrichment: future feature, initially null.';

-- Cuisine-level percentile benchmarks (used for "how do you rank" feature)
-- Refreshed weekly; no PII; aggregate only.
create table if not exists zaika_iq_cuisine_benchmark (
  city_fk               uuid    not null references geo_city (geo_city_pk),
  cuisine_code          text    not null,  -- matches master_cuisine.cuisine_code
  benchmark_week        date    not null,  -- Monday of the week
  p25_sell_through_pct  numeric(5,2),
  p50_sell_through_pct  numeric(5,2),
  p75_sell_through_pct  numeric(5,2),
  restaurant_count      integer not null default 0,
  computed_at           timestamptz not null default now(),
  primary key (city_fk, cuisine_code, benchmark_week)
);
comment on table zaika_iq_cuisine_benchmark is
  'Aggregated sell-through percentiles by cuisine and city, computed weekly. '
  'No restaurant-level PII. Used for "You outperform 72% of Biryani restaurants in Hyderabad" feature.';

-- POS integration: Petpooja webhook events
create table if not exists zaika_iq_pos_event (
  pos_event_pk          uuid    not null default gen_random_uuid(),
  restaurant_fk         uuid    not null references restaurant_restaurant (restaurant_restaurant_pk),
  pos_provider_code     text    not null default 'PETPOOJA', -- PETPOOJA | URBANPIPER | POSIST
  event_type_code       text    not null, -- ITEM_SOLD | ITEM_VOIDED | DAY_CLOSE
  event_timestamp       timestamptz not null,
  raw_payload_json      jsonb   not null default '{}',
  processed_at          timestamptz,
  created_at            timestamptz not null default now(),
  primary key (pos_event_pk)
);
comment on table zaika_iq_pos_event is
  'Raw POS webhook events from connected restaurant POS systems. '
  'Enriches demand forecast: if POS shows high dine-in today, surplus probability rises. '
  'raw_payload_json stored for reprocessing; never exposed to consumers.';

-- POS integration credentials (per restaurant)
create table if not exists zaika_iq_pos_credential (
  restaurant_fk         uuid    not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  pos_provider_code     text    not null,
  api_key_encrypted     text,    -- AES-256 encrypted via Supabase Vault
  webhook_secret        text,    -- for signature verification
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  primary key (restaurant_fk, pos_provider_code)
);

commit;
```

### Demand Forecast Algorithm

The algorithm is intentionally "ML-lite" — no ML framework required. It runs as a Supabase DB function for performance.

```sql
-- fn_generate_demand_forecast(p_restaurant_fk uuid, p_target_date date)
-- Returns: recommended_qty, confidence_level, basis_text, p10_qty, p90_qty
--
-- Algorithm:
-- 1. Identify day_of_week for p_target_date (0=Sun … 6=Sat)
-- 2. Pull zaika_iq_restaurant_daily_stat for last 56 days (8 weeks)
--    WHERE day_of_week = target_dow
-- 3. Compute: avg_sold, stddev_sold, count_observations
-- 4. Confidence:
--    count < 4 → LOW (< 1 month of matching DOW data)
--    count 4–7 → MEDIUM
--    count >= 8 → HIGH
-- 5. recommended_qty = CEIL(avg_sold * 1.05)  -- slight buffer vs average
-- 6. p10 = MAX(0, FLOOR(avg_sold - stddev_sold))
-- 7. p90 = CEIL(avg_sold + stddev_sold)
-- 8. basis_text: "Based on your last {count} {day_name}s: avg {avg_sold:.1f} bags sold"
-- 9. If count < 4: basis_text = "Insufficient data — need {4-count} more {day_name}s"
--    recommended_qty = restaurant's all-time avg_bags_sold (fallback)
```

### ZaikaIQ Pro Dashboard

**Route:** `/portal/zaika-iq/pro` — gated by middleware checking `zaika_iq_subscription.tier_code IN ('PRO', 'ENTERPRISE')`

**Sections:**

1. **7-Day Demand Forecast Table**

   | Day | Date | Recommended Qty | Confidence | Range |
   |---|---|---|---|---|
   | Tuesday | 3 Jun | 7 bags | HIGH | 5–9 |
   | Wednesday | 4 Jun | 5 bags | MEDIUM | 3–7 |

   Colour-coded confidence badges. Click any row → "Set this as tomorrow's drop quantity" prefills the new drop form.

2. **Sell-Through vs. Forecast Accuracy Chart** — 4-week area chart comparing what was forecast vs. what was sold. Builds trust in the model over time.

3. **Cuisine Benchmarking Card** — "Your sell-through rate (82%) outperforms 71% of Biryani restaurants in Hyderabad this week." Uses `zaika_iq_cuisine_benchmark`. No competitor names exposed.

4. **Pricing Suggestion** — "On Fridays you sell out in 18 minutes on average. Consider increasing your bag price by ₹30–50 to test demand elasticity." Logic: if sell_out_minutes < 20 consistently → suggest price increase. If bags_expired > 2 consistently → suggest price decrease.

5. **Monthly ESG Report (PDF Download)** — Supabase Edge Function generates a clean single-page PDF (using `pdfkit` npm):
   - Restaurant name, month, goZaika logo
   - Total bags rescued, kg food saved, CO₂ avoided
   - Week-by-week chart
   - Certification-ready language: "This report is generated from verified transaction data on the goZaika platform."
   - Used by restaurant for their own CSR/ESG reporting

6. **POS Integration Setup** (Enterprise only) — Connect Petpooja: enter API key → stored encrypted → webhook endpoint provided to restaurant.

### ZaikaIQ Upgrade Flow

**Route:** `/portal/zaika-iq/upgrade`

- Side-by-side comparison: Starter vs. Pro vs. Enterprise
- Razorpay subscription checkout for Pro (₹2,999/month)
- Enterprise: "Contact us" form → creates `marketing_partner_lead` row with `lead_type = 'ZAIKA_IQ_ENTERPRISE'`
- Post-payment webhook: update `zaika_iq_subscription.tier_code = 'PRO'`, set `current_period_end_at`

### Slice 3.2 — Claude Code Implementation Prompt

```
SYSTEM: goZaika monorepo. Next.js 16 + Supabase + Tailwind 4. npm workspaces only.
Money: bigint paise. Supabase typed client. RLS enforced.

TASK — Slice 3.2: ZaikaIQ Pro

1. DATABASE MIGRATION
   File: supabase/migrations/[timestamp]_slice3_2_zaika_iq_pro.sql
   - Create zaika_iq_demand_forecast, zaika_iq_cuisine_benchmark, zaika_iq_pos_event,
     zaika_iq_pos_credential (exact DDL in spec above)
   - Write fn_generate_demand_forecast(p_restaurant_fk uuid, p_target_date date) as a SQL function
     returning TABLE(recommended_qty int, confidence_level text, basis_text text, p10_qty int, p90_qty int)
   - Write fn_generate_7day_forecast(p_restaurant_fk uuid) — calls above for today+1 through today+7
   - Write fn_compute_cuisine_benchmarks() — weekly aggregation job; no PII
   - RLS on zaika_iq_demand_forecast: restaurant reads own rows only; no direct writes

2. EDGE FUNCTION UPDATE: zaika-iq-daily-aggregator
   - After daily stats aggregation, also call fn_generate_7day_forecast for each active restaurant
   - Weekly (on Monday): call fn_compute_cuisine_benchmarks()
   - Result: forecasts always updated nightly; benchmarks refreshed weekly

3. MIDDLEWARE GATE
   File: apps/restaurant-mgmt-web/middleware.ts (update existing)
   - For routes matching /portal/zaika-iq/pro or /portal/zaika-iq/upgrade/success:
     * Fetch zaika_iq_subscription for the actor's restaurant
     * If tier = STARTER: redirect to /portal/zaika-iq/upgrade
     * If status = PAST_DUE: show payment-required banner
   - Use Supabase server client in middleware (not admin client)

4. ZAIKA IQ PRO DASHBOARD PAGE
   File: apps/restaurant-mgmt-web/app/portal/zaika-iq/pro/page.tsx
   - 7-day forecast table with confidence badges (LOW=slate, MEDIUM=gold, HIGH=forest)
   - "Apply to tomorrow's drop" button: onClick → navigate to /portal/drops/new with ?qty={recommended_qty}
   - DemandAccuracyChart: Recharts AreaChart comparing forecast vs actual (last 4 weeks)
   - CuisineBenchmarkCard: percentile rank in text ("outperforms X% of {cuisine} restaurants in {city}")
   - PricingSuggestionCard: computed server-side from daily stats; shows recommendation + rationale
   - ESGReportDownload: button → GET /api/portal/zaika-iq/impact/report.pdf

5. ESG REPORT PDF
   File: supabase/functions/zaika-iq-esg-report/index.ts
   - Auth: verify JWT, check restaurant is PRO/ENTERPRISE
   - Query zaika_iq_impact_log for the requested month
   - Generate PDF using pdfkit (import from npm:pdfkit)
   - Layout: goZaika logo top-right, restaurant name top-left, month heading,
     3 KPI boxes (bags rescued, kg saved, CO2 avoided), weekly bar chart as SVG,
     footer with "Generated by goZaika ZaikaIQ · Data verified · Date"
   - Return as application/pdf with Content-Disposition: attachment

6. UPGRADE FLOW
   File: apps/restaurant-mgmt-web/app/portal/zaika-iq/upgrade/page.tsx
   - PricingTable component: 3 columns (Starter free, Pro ₹2,999/mo, Enterprise ₹7,999/mo)
   - Feature rows: ✓/✗ per tier for all ZaikaIQ features
   - "Upgrade to Pro" button → POST /api/portal/zaika-iq/subscribe
   File: app/api/portal/zaika-iq/subscribe/route.ts
   - Create Razorpay subscription plan if not cached (env: RAZORPAY_ZAIKA_IQ_PRO_PLAN_ID)
   - Create Razorpay subscription for restaurant → return subscription_id + short_url
   - Redirect to Razorpay hosted page
   File: app/api/webhooks/razorpay-zaika-iq/route.ts
   - Verify HMAC signature
   - On subscription.charged: update zaika_iq_subscription tier=PRO, period_end
   - On subscription.cancelled: set status=CANCELLED; do not downgrade until period_end
   - Enterprise: POST /api/portal/zaika-iq/enterprise-enquiry → creates marketing_partner_lead

7. POS INTEGRATION (Petpooja)
   File: app/api/portal/zaika-iq/pos/connect/route.ts
   - Accept { provider: 'PETPOOJA', apiKey: string }
   - Encrypt apiKey using Supabase Vault (supabase.rpc('vault.create_secret', ...))
   - Store in zaika_iq_pos_credential
   - Return webhook URL: https://restaurant.gozaika.in/api/webhooks/pos/petpooja
   File: app/api/webhooks/pos/petpooja/route.ts
   - Verify X-Petpooja-Signature header
   - Parse payload; insert into zaika_iq_pos_event (raw_payload_json stored as-is)
   - Return 200 immediately; processing is async via next invocation of daily aggregator
```

---

## Slice 3.3 — Food Safety Technical Enforcement

### Objectives

- Enforce the **5-hour hot food / 8-hour cold food / 1-hour raw salad rule at the API level** — not as an SOP, but as a hard validation that rejects non-compliant listings
- Build a **freshness QR system** distinct from the pickup-verification QR: a customer-facing trust signal that proves prep-to-pickup window compliance
- Enhance the **staff handover flow** to require QR scan confirmation before bag release
- Create an **automated food safety incident escalation** for unresolved incidents

### New Schema

```sql
-- Migration: slice3_3_food_safety.sql
begin;

-- Freshness certification record per drop (not per order — one per drop listing)
create table if not exists food_safety_freshness_cert (
  cert_pk               uuid    not null default gen_random_uuid(),
  drop_fk               uuid    not null references drop_drop (drop_drop_pk) on delete cascade,
  qr_token              text    not null unique default gen_random_uuid()::text,
  food_type_code        text    not null, -- HOT | COLD | PASTRY | RAW_SALAD
  max_window_hours      integer not null, -- 5 for HOT, 8 for COLD/PASTRY, 1 for RAW_SALAD
  prep_declared_at      timestamptz not null, -- set by restaurant at listing time
  pickup_window_end_at  timestamptz not null, -- mirrors drop.pickup_window_end
  window_hours_actual   numeric(4,1) not null, -- pickup_window_end - prep_declared_at in hours
  is_compliant          boolean not null, -- true if window_hours_actual <= max_window_hours
  created_at            timestamptz not null default now(),
  primary key (cert_pk),
  unique (drop_fk)  -- one cert per drop
);
comment on table food_safety_freshness_cert is
  'Created at drop listing time. is_compliant enforced by API (non-compliant drops are rejected). '
  'qr_token is a UUID that links to gozaika.in/verify/{token} — customer trust page. '
  'Separate from order_pickup_verification_event (which verifies customer identity at pickup).';

-- QR scan log (customer scans the trust QR; staff scans at handover)
create table if not exists food_safety_qr_scan (
  scan_pk               uuid    not null default gen_random_uuid(),
  cert_fk               uuid    not null references food_safety_freshness_cert (cert_pk),
  scan_type_code        text    not null, -- CUSTOMER_VERIFY | STAFF_HANDOVER
  scan_result_code      text    not null, -- FRESH | APPROACHING_LIMIT | EXPIRED
  scanned_at            timestamptz not null default now(),
  scanner_profile_fk    uuid,            -- null for customer verify (unauthenticated)
  primary key (scan_pk)
);

-- Incident escalation tracker (supplements existing incident_incident)
create table if not exists food_safety_escalation (
  escalation_pk         uuid    not null default gen_random_uuid(),
  incident_fk           uuid    not null references incident_incident (incident_incident_pk),
  escalation_level      integer not null default 1, -- 1=ops, 2=founder, 3=emergency
  escalated_at          timestamptz not null default now(),
  escalated_to_text     text    not null, -- phone/email of escalation target
  resolved_at           timestamptz,
  resolution_note_text  text,
  primary key (escalation_pk)
);

-- Add prep_declared_at to drop_drop (restaurant declares when food was prepared)
alter table drop_drop
  add column if not exists prep_declared_at timestamptz,
  add column if not exists food_type_code text not null default 'HOT',
  add column if not exists freshness_cert_fk uuid references food_safety_freshness_cert (cert_pk);

comment on column drop_drop.prep_declared_at is
  'Time at which restaurant declares food was prepared. '
  'Required for food_safety_freshness_cert creation. '
  'Validated against pickup_window_end: HOT must be within 5h, COLD/PASTRY 8h, RAW 1h.';

comment on column drop_drop.food_type_code is
  'HOT = cooked hot food | COLD = refrigerated food | PASTRY = baked goods | RAW_SALAD = uncooked perishable. '
  'Determines maximum permitted prep-to-pickup window.';

commit;
```

### API Enforcement — Drop Listing Validation

The `drop_publishing_form.tsx` currently does server-side validation in `app/portal/drops/new/`. Update the validation layer:

```typescript
// packages/utils/src/food-safety.ts

export const FOOD_TYPE_MAX_HOURS: Record<string, number> = {
  HOT: 5,
  COLD: 8,
  PASTRY: 8,
  RAW_SALAD: 1,
}

export interface FreshnessCertInput {
  foodTypeCode: keyof typeof FOOD_TYPE_MAX_HOURS
  prepDeclaredAt: Date
  pickupWindowEndAt: Date
}

export interface FreshnessValidationResult {
  isCompliant: boolean
  windowHoursActual: number
  maxWindowHours: number
  errorMessage?: string
}

export function validateFreshnessWindow(input: FreshnessCertInput): FreshnessValidationResult {
  const maxHours = FOOD_TYPE_MAX_HOURS[input.foodTypeCode]
  const windowMs = input.pickupWindowEndAt.getTime() - input.prepDeclaredAt.getTime()
  const windowHours = windowMs / (1000 * 60 * 60)

  if (windowHours < 0) {
    return { isCompliant: false, windowHoursActual: 0, maxWindowHours: maxHours,
      errorMessage: 'Prep time cannot be after pickup window end' }
  }

  const isCompliant = windowHours <= maxHours

  return {
    isCompliant,
    windowHoursActual: Math.round(windowHours * 10) / 10,
    maxWindowHours: maxHours,
    errorMessage: isCompliant ? undefined :
      `${input.foodTypeCode} food must reach customers within ${maxHours} hours of prep. ` +
      `Your window is ${windowHours.toFixed(1)} hours. Reduce quantity or adjust pickup window.`
  }
}
```

This function is called in the drop publishing API route **before** the drop is created. A non-compliant result returns HTTP 422 with the error message. The form shows the error inline.

### Customer Freshness Verification Page

**Route:** `apps/website/app/verify/[token]/page.tsx` (on website domain — public, no auth)

```typescript
// Fetch cert by qr_token
// Compute current status:
//   current_time < pickup_window_end AND window compliant → FRESH (green)
//   current_time > pickup_window_end - 30min → APPROACHING (amber)
//   current_time > pickup_window_end → EXPIRED (red)
// Log scan to food_safety_qr_scan (CUSTOMER_VERIFY)
// Display:
//   ✅ "goZaika Freshness Verified" — restaurant name, food type, prep time, window
//   ⚠️ "Pickup window closing soon" — same info + urgency message
//   ❌ "This pickup window has closed" — do not present food info
```

### Food Safety Incident Escalation Edge Function

**`supabase/functions/food-safety-escalation-cron`** — runs every 2 hours

Logic:
1. Find `incident_incident` rows where `severity_code = 'HIGH'` and `status_code = 'OPEN'` and `created_at < now() - interval '2 hours'` and no `food_safety_escalation` row yet
2. Create escalation record; send WhatsApp message to ops phone number
3. If existing escalation with `escalation_level = 1` and `resolved_at IS NULL` and `escalated_at < now() - interval '4 hours'`: bump to level 2, notify founder phone number

### Slice 3.3 — Claude Code Implementation Prompt

```
SYSTEM: goZaika monorepo. Next.js 16 + Supabase + Tailwind 4. npm workspaces only.
Food safety is a hard enforcement boundary — non-compliant drops must be REJECTED, not warned.

TASK — Slice 3.3: Food Safety Technical Enforcement

1. DATABASE MIGRATION
   File: supabase/migrations/[timestamp]_slice3_3_food_safety.sql
   - Create food_safety_freshness_cert, food_safety_qr_scan, food_safety_escalation
   - ALTER drop_drop: add prep_declared_at, food_type_code, freshness_cert_fk
   - RLS on food_safety_freshness_cert: restaurant reads own; public reads by qr_token (for verify page)
   - RLS on food_safety_qr_scan: append-only via service role only (Edge Function writes)

2. UTILITY PACKAGE
   File: packages/utils/src/food-safety.ts
   - validateFreshnessWindow() as specified above
   - getFoodTypeName(code: string): string — human-readable names for UI
   - Exported TypeScript types: FoodTypeCode, FreshnessCertInput, FreshnessValidationResult
   - Unit tests in packages/utils/src/food-safety.test.ts (vitest):
     * HOT food 4h window → compliant
     * HOT food 5.1h window → non-compliant with correct error message
     * RAW_SALAD 1.5h window → non-compliant
     * PASTRY 8h window exactly → compliant (boundary case)

3. DROP PUBLISHING API UPDATE
   File: apps/restaurant-mgmt-web/app/portal/drops/new/drop-publishing-form.tsx
   - Add FoodTypeSelector (radio buttons: Hot Food / Cold Food / Baked Goods / Raw Salad)
   - Add PrepDeclaredAtPicker (time picker: "When was this food prepared?")
   - Client-side preview: "Your pickup window is X hours after prep — {compliant/warning}"
   File: apps/restaurant-mgmt-web/app/api/portal/drops/route.ts (update existing)
   - After existing validation, import validateFreshnessWindow
   - If not compliant: return 422 with { error: result.errorMessage }
   - If compliant: create drop_drop row, then create food_safety_freshness_cert row
   - Set drop_drop.freshness_cert_fk to the new cert

4. CUSTOMER FRESHNESS VERIFICATION PAGE
   File: apps/website/app/verify/[token]/page.tsx
   - Public page (no auth)
   - Fetch food_safety_freshness_cert by qr_token using service role (RLS policy allows public read by token)
   - Compute scan_result_code (FRESH / APPROACHING_LIMIT / EXPIRED) based on current time
   - Log to food_safety_qr_scan via service role (CUSTOMER_VERIFY)
   - Display:
     * FRESH: green checkmark, "Freshness Verified", restaurant name, food type, prep time, window end
     * APPROACHING_LIMIT: amber, "Pickup Soon", same info + "Please collect within 30 minutes"
     * EXPIRED: red, "Pickup Window Closed", no food details shown
   - Schema.org FoodEstablishment microdata on page for SEO

5. QR CODE IN ORDER DETAIL
   - The existing pickup QR (order verification) is separate from freshness QR
   - In apps/consumer-web/app/orders/[orderId]/page.tsx:
     * Below the existing OTP/pickup QR, add a secondary section: "Food Freshness Certificate"
     * Fetch freshness_cert_fk from drop via order → show a smaller QR linking to /verify/{qr_token}
     * Label: "Scan to verify freshness guarantee"
   - react-qr-code package for QR rendering

6. STAFF HANDOVER ENHANCEMENT
   - In apps/restaurant-staff-mobile (for later when Slice 2.3 is built):
     * After scanning order QR, also scan (or tap) freshness cert QR
     * Log food_safety_qr_scan with STAFF_HANDOVER + scanner_profile_fk
   - In apps/restaurant-mgmt-web (web fallback for staff):
     * On order detail page, "Mark as handed over" button requires clicking "Freshness confirmed" checkbox
     * POST to /api/pickup/handover includes freshness_cert confirmation flag

7. INCIDENT ESCALATION EDGE FUNCTION
   File: supabase/functions/food-safety-escalation-cron/index.ts
   - Cron: every 2 hours ("0 */2 * * *")
   - Query: unescalated HIGH severity open incidents older than 2h → create escalation level 1
   - Query: level-1 escalations unresolved after 4h → bump to level 2
   - Notification: call WhatsApp Cloud API (use env WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID)
   - Template: "food_safety_escalation_alert" — "⚠️ FOOD SAFETY ALERT: Incident #{id} at {restaurant} requires immediate attention. Level: {level}. Created: {time}. Open in admin: {url}"
```

---

## Slice 3.4 — WhatsApp Growth Engine

### Objectives

- Integrate **WhatsApp Business Cloud API (Meta)** as a first-class channel — not just a notification add-on
- Build a **restaurant onboarding conversational bot** accessible via WhatsApp keyword `PARTNER`
- Build **consumer insider subscriber management** with area-specific segments
- Enable **drop alert notifications** via WhatsApp for opted-in consumers (respects `consumer_notification_preference`)
- **QR-based restaurant follow:** a printed sticker at the restaurant counter links to WhatsApp follow opt-in
- Integrate WhatsApp OTP as fallback when Twilio SMS fails (reduces OTP failure rate in India)

### New Schema

```sql
-- Migration: slice3_4_whatsapp_engine.sql
begin;

-- WhatsApp insider subscribers (pre-app sign-up funnel)
-- Note: once a subscriber downloads the app and creates an account,
-- their iam_profile_fk is populated; notification preference governs delivery.
create table if not exists whatsapp_insider_subscriber (
  sub_pk              uuid    not null default gen_random_uuid(),
  phone_e164          text    not null unique,
  display_name        text,
  city_fk             uuid    references geo_city (geo_city_pk),
  area_text           text,   -- free-text neighbourhood: "Kondapur", "Banjara Hills"
  iam_profile_fk      uuid    references iam_profile (iam_profile_pk), -- set when app account created
  source_code         text    not null default 'WEBSITE', -- WEBSITE | QR_SCAN | REFERRAL | WHATSAPP_BOT
  opted_in_at         timestamptz not null default now(),
  opted_out_at        timestamptz,
  last_messaged_at    timestamptz,
  created_at          timestamptz not null default now(),
  primary key (sub_pk)
);
comment on table whatsapp_insider_subscriber is
  'Pre-app funnel: consumers who joined the WhatsApp Insider list before downloading the app. '
  'Receives drop alerts via WhatsApp until they upgrade to the full app. '
  'opted_out_at is set when user replies STOP; platform never messages again after that.';

-- Restaurant WhatsApp onboarding bot state machine
create table if not exists whatsapp_onboarding_session (
  session_pk          uuid    not null default gen_random_uuid(),
  phone_e164          text    not null,
  step_code           text    not null default 'WELCOME',
  -- Steps: WELCOME → RESTAURANT_NAME → AREA → CUISINE → COMPLETE → ABANDONED
  data_json           jsonb   not null default '{}',  -- accumulated answers
  partner_lead_fk     uuid    references marketing_partner_lead (marketing_partner_lead_pk),
  started_at          timestamptz not null default now(),
  last_message_at     timestamptz not null default now(),
  completed_at        timestamptz,
  abandoned_at        timestamptz,
  primary key (session_pk),
  -- Only one active session per phone at a time
  constraint uq_whatsapp_onboarding_active unique (phone_e164)
    deferrable initially deferred
);

-- WhatsApp message log (both inbound and outbound)
create table if not exists whatsapp_message_log (
  log_pk              uuid    not null default gen_random_uuid(),
  direction_code      text    not null, -- INBOUND | OUTBOUND
  phone_e164          text    not null,
  wa_message_id       text,   -- Meta's message ID
  template_name       text,   -- null for inbound or free-form outbound
  body_preview_text   text,   -- first 200 chars of body (for debugging)
  status_code         text    not null default 'SENT', -- SENT | DELIVERED | READ | FAILED | INBOUND
  error_code          text,
  created_at          timestamptz not null default now(),
  primary key (log_pk)
);
comment on table whatsapp_message_log is
  'Audit trail for all WhatsApp messages. Not used for delivery logic — source of truth is Meta. '
  'Used for deliverability analytics and debugging. Retain for 90 days per DPDP policy.';

-- Add WhatsApp consent purpose to privacy_consent_purpose if not seeded
-- (WHATSAPP_TRANSACTIONAL and WHATSAPP_MARKETING may already be seeded)
-- Check before inserting; idempotent.

commit;
```

### WhatsApp Cloud API Service

**File:** `packages/utils/src/whatsapp-api.ts`

```typescript
// Thin wrapper around Meta WhatsApp Cloud API
// All outbound messages MUST use pre-approved templates for marketing/drop alerts
// Free-form text only allowed within 24h of a customer-initiated message (service window)

const WA_API_BASE = 'https://graph.facebook.com/v18.0'

export async function sendWhatsAppTemplate(
  phoneE164: string,
  templateName: string,
  languageCode: string = 'en_IN',
  components: WhatsAppTemplateComponent[]
): Promise<{ messageId: string } | { error: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
  const token = process.env.WHATSAPP_TOKEN!

  const response = await fetch(`${WA_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneE164,
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, components }
    })
  })

  const data = await response.json()
  if (!response.ok) return { error: data.error?.message ?? 'Unknown error' }
  return { messageId: data.messages?.[0]?.id }
}

export async function sendWhatsAppText(
  phoneE164: string,
  text: string
): Promise<{ messageId: string } | { error: string }> {
  // Only callable within 24h service window; checked by caller
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
  const token = process.env.WHATSAPP_TOKEN!

  const response = await fetch(`${WA_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneE164,
      type: 'text',
      text: { body: text, preview_url: false }
    })
  })

  const data = await response.json()
  if (!response.ok) return { error: data.error?.message ?? 'Unknown error' }
  return { messageId: data.messages?.[0]?.id }
}
```

### Required WhatsApp Message Templates (submit to Meta for approval)

| Template Name | Type | Variables | Usage |
|---|---|---|---|
| `gz_order_confirmation` | TRANSACTIONAL | restaurant_name, pickup_window, order_number | After order placed |
| `gz_pickup_reminder` | TRANSACTIONAL | restaurant_name, minutes_remaining | 30 min before window close |
| `gz_drop_alert` | MARKETING | restaurant_name, bag_count, price, pickup_time, claim_url | Insider drop alert |
| `gz_insider_welcome` | MARKETING | user_name | After Insider sign-up |
| `gz_restaurant_welcome` | TRANSACTIONAL | restaurant_name | After restaurant goes live |
| `gz_food_safety_alert` | TRANSACTIONAL | incident_id, restaurant_name, admin_url | Internal ops only |
| `gz_review_prompt` | TRANSACTIONAL | restaurant_name, review_url | 2h post-pickup |

### Restaurant Onboarding Bot (Inbound Handler)

**Edge Function:** `supabase/functions/whatsapp-webhook/index.ts`

State machine steps for the `PARTNER` keyword flow:

```
Incoming message: "PARTNER" (case-insensitive) from unknown phone

→ Check: is this phone already a restaurant team member? If yes: reply "You're already on goZaika! Login at restaurant.gozaika.in"

→ Create whatsapp_onboarding_session (step=WELCOME)
→ Reply: "Welcome to goZaika! 🎉 We're Hyderabad's premium chef's-thali discovery platform — a brand-safe way to win new regulars.
   I'll set up your kitchen in 3 quick questions. What's your restaurant's name?"

[step=RESTAURANT_NAME]
→ Save name to data_json.restaurant_name
→ Reply: "Great, {name}! Which area of Hyderabad are you in? 
   (e.g. Banjara Hills, Kondapur, Jubilee Hills, HITEC City)"

[step=AREA]  
→ Save to data_json.area
→ Reply: "Perfect! What cuisine do you primarily serve? 
   (e.g. Biryani, Multi-cuisine, Continental, Café/Bakery, South Indian)"

[step=CUISINE]
→ Save to data_json.cuisine
→ Create marketing_partner_lead with collected data
→ Set partner_lead_fk on session
→ Set step=COMPLETE
→ Reply: "You're all set! 🙌 
   Your reference: GZ-{lead_id_short}
   Our team will call you within 24 hours to complete your setup.
   Questions? Reply anytime.
   Reply STOP to opt out."
→ Notify admin via WhatsApp (internal alert number)

[STOP at any step]
→ Set opted_out_at; reply: "You've been removed from goZaika messages. Take care!"
```

### Slice 3.4 — Claude Code Implementation Prompt

```
SYSTEM: goZaika monorepo. Next.js 16 + Supabase + Tailwind 4. npm workspaces only.
WhatsApp Cloud API: Meta Business API v18. Env vars: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
WHATSAPP_VERIFY_TOKEN, WHATSAPP_ALERT_PHONE (for internal ops notifications).

TASK — Slice 3.4: WhatsApp Growth Engine

1. DATABASE MIGRATION
   File: supabase/migrations/[timestamp]_slice3_4_whatsapp.sql
   - Create whatsapp_insider_subscriber, whatsapp_onboarding_session, whatsapp_message_log
   - RLS: all tables service-role only for writes; no direct user access
   - Index: whatsapp_insider_subscriber.phone_e164, whatsapp_onboarding_session.phone_e164

2. WHATSAPP API PACKAGE
   File: packages/utils/src/whatsapp-api.ts
   - sendWhatsAppTemplate() and sendWhatsAppText() as specified above
   - verifyWebhookSignature(payload: string, signature: string, secret: string): boolean
     * HMAC-SHA256 of payload using WHATSAPP_VERIFY_TOKEN; compare to X-Hub-Signature-256 header
   - TypeScript types: WhatsAppTemplateComponent, WhatsAppTextMessage, SendResult

3. WHATSAPP WEBHOOK EDGE FUNCTION
   File: supabase/functions/whatsapp-webhook/index.ts
   - GET: verify webhook (hub.mode=subscribe, hub.verify_token, hub.challenge)
   - POST: parse incoming message; verify HMAC signature
   - Route message:
     * If text.body starts with "PARTNER" (case-insensitive) → handle onboarding bot state machine
     * If text.body = "STOP" → opt-out handler: set opted_out_at on subscriber/session
     * If session exists with step != COMPLETE → advance state machine
     * All others → log inbound; no reply (do not auto-reply to unknown messages)
   - All state machine transitions use service role supabase client
   - Log all inbound/outbound to whatsapp_message_log
   - Error handling: any exception → return 200 (Meta will retry on non-200)

4. INSIDER SIGN-UP API + LANDING PAGE
   File: apps/website/app/insider/page.tsx
   - Simple form: Name, Phone (+91 prefix), Area in Hyderabad (dropdown: Banjara Hills, Kondapur,
     Jubilee Hills, HITEC City, Madhapur, Film Nagar, Kukatpally, Other)
   - Submit → POST /api/insider/subscribe
   File: apps/website/app/api/insider/subscribe/route.ts
   - Validate phone format
   - Check not already opted-out (whatsapp_insider_subscriber.opted_out_at IS NULL)
   - Insert/upsert whatsapp_insider_subscriber
   - Send gz_insider_welcome template via WhatsApp
   - Return { ok: true, message: "Check your WhatsApp!" }

5. DROP ALERT TO INSIDERS (update existing notification system)
   File: supabase/functions/notification-outbox-processor/index.ts (update)
   - After sending Expo/FCM push and Resend email for DROP_LIVE events:
   - Query whatsapp_insider_subscriber: opted_out_at IS NULL AND city_fk matches drop's city
   - For each subscriber: send gz_drop_alert template
   - Respect daily message limit: max 1 WhatsApp marketing message per subscriber per day
     (track in whatsapp_message_log; count OUTBOUND + MARKETING templates today)
   - Log each send to whatsapp_message_log

6. TRANSACTIONAL WHATSAPP (replace/augment existing SMS/email)
   Update existing notification templates in notification_template table:
   - ORDER_CONFIRMED → add WhatsApp channel: send gz_order_confirmation
   - PICKUP_REMINDER → add WhatsApp channel: send gz_pickup_reminder
   - REVIEW_PROMPT → add WhatsApp channel: send gz_review_prompt
   These are transactional; no daily-limit restriction.

7. RESTAURANT FOLLOW QR (printed sticker)
   File: apps/restaurant-mgmt-web/app/portal/settings/follow-qr/page.tsx
   - Generate QR linking to: https://wa.me/{WHATSAPP_BUSINESS_NUMBER}?text=FOLLOW+{restaurant_short_id}
   - When consumer scans and sends that message → webhook catches "FOLLOW {id}" → 
     subscribe consumer to that restaurant's drops on WhatsApp
   - QR displayed on screen + downloadable as high-res PNG (800×800px)
   - Instructions: "Print and place at your counter. Customers who scan will get WhatsApp alerts for your drops."

8. ADMIN WHATSAPP MONITORING TAB
   File: apps/admin-web/app/admin/ops/ops-client.tsx (add tab)
   - "WhatsApp" tab: today's message count, failed sends, active onboarding sessions, insider subscriber count by area
   - Search: find subscriber by phone number
   - Action: manually opt-out a subscriber (DPDP compliance)
```

---

## Slice 3.5 — Dynamic Pricing & Sell-Through Optimization

### Objectives

- Implement **three bag price tiers** (Everyday / Standard / Premium) set at template level
- Build the **Last Call engine**: automatically drops price when sell-through is below 70% with 60 minutes to window close
- Track full **price history** per drop for analytics and transparency
- Expose sell-through optimization alerts to restaurants on the portal dashboard

### New Schema

```sql
-- Migration: slice3_5_dynamic_pricing.sql
begin;

-- Bag price tiers (reference table — replaces hardcoded values)
create table if not exists catalog_price_tier (
  tier_code             text    not null,
  display_name          text    not null,
  min_price_paise       bigint  not null,
  max_price_paise       bigint  not null,
  description           text,
  sort_order            integer not null default 0,
  primary key (tier_code)
);

insert into catalog_price_tier (tier_code, display_name, min_price_paise, max_price_paise, description, sort_order)
values
  ('EVERYDAY', 'Everyday', 9900, 19900, 'Canteen / QSR surplus', 1),
  ('STANDARD', 'Standard BAM Bag', 24900, 34900, 'Mid-range restaurant surplus', 2),
  ('PREMIUM', 'Premium Drop', 39900, 54900, 'Banjara Hills / Jubilee Hills fine-casual', 3)
on conflict (tier_code) do nothing;

-- Add price_tier_code to catalog_bag_template
alter table catalog_bag_template
  add column if not exists price_tier_code text references catalog_price_tier (tier_code) default 'STANDARD';

-- Drop price change events (full price history)
create table if not exists drop_price_event (
  event_pk              uuid    not null default gen_random_uuid(),
  drop_fk               uuid    not null references drop_drop (drop_drop_pk) on delete cascade,
  event_type_code       text    not null, -- LISTED | LAST_CALL_TRIGGERED | MANUALLY_ADJUSTED | SOLD_OUT
  price_before_paise    bigint,
  price_after_paise     bigint  not null,
  sell_through_pct_at_trigger numeric(5,2),
  minutes_remaining_at_trigger integer,
  triggered_by_code     text    not null default 'SYSTEM', -- SYSTEM | RESTAURANT | ADMIN
  created_at            timestamptz not null default now(),
  primary key (event_pk)
);
comment on table drop_price_event is
  'Immutable price history for every drop. '
  'LISTED: initial price set. LAST_CALL_TRIGGERED: system drops price. '
  'MANUALLY_ADJUSTED: restaurant changes price mid-drop. '
  'Used for analytics, dispute resolution, and ZaikaIQ pricing suggestions.';

-- Add last_call columns to drop_drop
alter table drop_drop
  add column if not exists is_last_call boolean not null default false,
  add column if not exists last_call_price_paise bigint,
  add column if not exists last_call_triggered_at timestamptz;

commit;
```

### Last Call Edge Function

**`supabase/functions/last-call-engine`** — runs every 15 minutes via Supabase cron

```typescript
// Logic:
// 1. Find all ACTIVE drops where:
//    pickup_window_end BETWEEN now() AND now() + interval '65 minutes'
//    AND is_last_call = false
//    AND (quantity_sold / quantity_total * 100) < 70
// 2. For each qualifying drop:
//    last_call_price = MAX(tier_min_price, current_price * 0.55) rounded to nearest 50 paise
//    Update drop_drop: is_last_call=true, last_call_price_paise, last_call_triggered_at
//    Insert drop_price_event (LAST_CALL_TRIGGERED)
//    Insert notification_outbox row: type=LAST_CALL_ALERT, audience=CITY_CONSUMERS
//    The existing notification-outbox-processor handles sending push + WhatsApp

// Note: minimum Last Call price is the tier's min_price_paise
// Do NOT trigger Last Call if only 1 bag remains (scarcity is more effective than discount)
```

### Slice 3.5 — Claude Code Implementation Prompt

```
SYSTEM: goZaika monorepo. Next.js 16 + Supabase + Tailwind 4. npm workspaces only.
Money: bigint paise. The Last Call price must never go below catalog_price_tier.min_price_paise.

TASK — Slice 3.5: Dynamic Pricing & Sell-Through

1. DATABASE MIGRATION
   File: supabase/migrations/[timestamp]_slice3_5_dynamic_pricing.sql
   - Create catalog_price_tier and seed it (as above)
   - Add price_tier_code to catalog_bag_template
   - Create drop_price_event
   - Add is_last_call, last_call_price_paise, last_call_triggered_at to drop_drop

2. LAST CALL EDGE FUNCTION
   File: supabase/functions/last-call-engine/index.ts
   - Cron: "*/15 * * * *" (every 15 minutes)
   - Query qualifying drops (see spec logic above)
   - For each: update drop_drop, insert drop_price_event, insert notification_outbox
   - last_call_price calculation:
     * raw = current_price_paise * 0.55
     * rounded = Math.round(raw / 50) * 50  (nearest ₹0.50 — so prices end in .50 or .00)
     * final = Math.max(rounded, tier_min_price_paise)
   - Log to audit_log: { drop_fk, drops_triggered: number, timestamp }

3. PRICE TIER SELECTOR IN TEMPLATE FORM
   File: apps/restaurant-mgmt-web/app/portal/templates/template-form.tsx (update)
   - Replace hardcoded price input with:
     * PriceTierSelector: radio cards for EVERYDAY / STANDARD / PREMIUM
     * PriceInput: within the tier's min–max range; shows "₹99–₹199" hint per tier
     * Validation: reject if price outside tier's min/max bounds
   - Display tier description: "PREMIUM — For restaurants in Banjara Hills / Jubilee Hills"

4. LAST CALL BADGE IN CONSUMER UI
   File: apps/consumer-web (update DropCard in packages/ui/src/index.tsx)
   - If drop.is_last_call = true:
     * Show "🔥 Last Call" amber badge over the card
     * Strike through original price, show last_call_price_paise in saffron
     * Pulsing border animation (CSS animation: pulse 1s infinite)
   - If drop.minutes_remaining < 30 AND is_last_call=false:
     * Show "Closing Soon" badge (no price change)

5. SELL-THROUGH ALERT IN RESTAURANT PORTAL
   File: apps/restaurant-mgmt-web/app/portal/dashboard/page.tsx (update)
   - Add SellThroughAlert component:
     * Query drops with pickup_window_end in next 90 minutes AND sell_through < 50%
     * If any: amber banner: "⚠️ {count} drop(s) below 50% sell-through — Last Call will trigger in ~{minutes}m"
     * Link: "View drops" → /portal/drops

6. PRICE HISTORY IN DROP DETAIL (restaurant view)
   File: apps/restaurant-mgmt-web/app/portal/drops/[id]/page.tsx (create)
   - Show drop detail: status, qty listed/sold, sell-through %
   - PriceHistoryTable: list all drop_price_event rows for this drop
     * Columns: Event, Before, After, Time, Trigger (SYSTEM / YOU)
   - Useful for restaurant to understand when/why Last Call triggered
```

---

## Slice 3.6 — Zayka Passport & Consumer Gamification

### Objectives

The `consumer_passport_stat` table already exists with BRONZE/SILVER/GOLD/PLATINUM tiers. The `fn_refresh_passport_stats_batch` DB function is created in Slice 3.1. This slice is entirely **UI and UX** — no new DB schema required.

The Zayka Passport is a key LTV driver: it gives consumers a reason to return beyond discounts, creating identity ("I'm a GOLD BAM Bag collector") that is stickier than price alone.

### Tier Progression

| Tier | Bags Collected | Benefits |
|---|---|---|
| BRONZE | 0+ | Access to all drops; standard claim window |
| SILVER | 10+ | Silver badge on profile; featured in "Power Users" admin analytics |
| GOLD | 30+ | Gold badge; 5-minute priority claim (before general public, after Swaad Club) |
| PLATINUM | 75+ | Platinum badge; invited to test new restaurant partners; exclusive Platinum drops |

### New Screens / Components

**Consumer Web — `/account/passport`**

- Passport card: animated tier badge (CSS-only, saffron gradient for GOLD, iridescent for PLATINUM), bags collected count, next tier milestone ("22 more bags to GOLD")
- Progress ring (SVG, animated on load): bags collected / bags needed for next tier
- "Your journey" stats: restaurants visited, neighbourhoods explored, food saved (from impact log)
- Shareable card: "I've rescued 47 BAM Bags on goZaika 🎉" → PNG export for Instagram Stories

**Consumer Web — Drop Detail Enhancement**

- If consumer is GOLD/PLATINUM: show "Gold Access" claim button (slightly earlier window open)
- After claiming, show "+1 bag to your Passport" micro-animation

**Consumer Mobile — Account Tab Enhancement (Slice 2.3 dependency)**

- Passport card at the top of AccountScreen (replaces generic profile header)
- Tier badge animated with Lottie (expo-av)

### Slice 3.6 — Claude Code Implementation Prompt

```
SYSTEM: goZaika monorepo. Next.js 16 + Supabase + Tailwind 4. npm workspaces only.
The DB tables (consumer_passport_stat) and DB function (fn_refresh_passport_stats_batch from Slice 3.1)
already exist. This slice is UI-only.

TASK — Slice 3.6: Zayka Passport & Gamification

1. PASSPORT API ROUTE
   File: apps/consumer-web/app/api/account/passport/route.ts
   - Auth required (consumer session)
   - Query consumer_passport_stat for the current user's consumer_profile_fk
   - Query zaika_iq_impact_log for total food saved by this consumer's orders
     (join order_order on consumer_profile_fk)
   - Return: { tier, bagsCollected, restaurantsVisited, nextTierBags, foodSavedKg, co2AvoidedKg }

2. PASSPORT PAGE
   File: apps/consumer-web/app/account/passport/page.tsx
   - PassportCard component:
     * BRONZE: copper gradient border (#CD7F32)
     * SILVER: silver gradient (#C0C0C0)
     * GOLD: saffron/gold gradient (#FFD700 → #FF6B35)
     * PLATINUM: iridescent CSS animation (background: linear-gradient rotating)
     * Large tier name in Playfair Display
     * "BAM Bag Collector · {tier}" subtitle
     * Restaurant name, city (from restaurant_public_profile)
   - TierProgressRing: SVG circle, filled arc based on (bagsCollected / nextTierBags)
     * Animated: arc draws in on mount using CSS stroke-dashoffset transition
     * Center: "{bagsCollected} of {nextTierBags} for {nextTier}"
   - ImpactStats: 3 stat cards (bags collected, restaurants visited, kg food saved)
   - NextTierBenefits: what unlocks at the next tier (grey if not achieved)
   - ShareableCard: fixed-size div (1080×1920 ratio) rendered off-screen for html2canvas export
     * "I've rescued {n} BAM Bags on @goZaika 🎉 I'm a {tier} collector!"
     * goZaika logo + saffron background + tier badge

3. ACCOUNT PAGE UPDATE
   File: apps/consumer-web/app/account/account-client.tsx (update)
   - Add PassportPreviewCard at the top (mini version): tier badge + bag count + "View Passport" link
   - Below existing account info

4. DROP DETAIL ENHANCEMENT
   File: apps/consumer-web/app/drops/[id]/claim-panel.tsx (update)
   - After successful claim, show PostClaimAnimation:
     * Brief confetti burst (use canvas-confetti package)
     * "+1 BAM Bag to your Passport" text appears and fades
     * If this claim triggers a tier upgrade: show tier upgrade modal ("You're now SILVER! 🎉")

5. LINK FROM SWAAD CLUB PAGE
   File: apps/consumer-web/app/swaad-club/page.tsx (existing shell — update in Slice 2.2)
   - Add Passport section: "Earn your Zayka Passport alongside Swaad Club — collect 30 bags for GOLD."
   - Link to /account/passport
```

---

## Slice 3.7 — Growth Infrastructure

### Objectives

Three independent sub-systems, deliverable in parallel:

**3.7A — Campus Ambassador Programme** — recruit, track, and pay student ambassadors  
**3.7B — Brand Language Enforcement** — ESLint plugin blocking banned words in all UI code  
**3.7C — SEO Architecture** — city-level landing pages, structured data, sitemap, meta automation

### 3.7A — Campus Ambassador Programme

```sql
-- Migration: slice3_7_growth_infrastructure.sql (partial)

create table if not exists growth_campus_ambassador (
  amb_pk                uuid    not null default gen_random_uuid(),
  iam_profile_fk        uuid    not null references iam_profile (iam_profile_pk),
  campus_name           text    not null,
  city_fk               uuid    not null references geo_city (geo_city_pk),
  status_code           text    not null default 'ACTIVE', -- ACTIVE | PAUSED | CHURNED
  monthly_base_paise    bigint  not null default 300000,   -- ₹3,000
  referral_bonus_paise  bigint  not null default 2500,     -- ₹25 per conversion beyond threshold
  min_conversions_for_bonus integer not null default 20,
  joined_at             timestamptz not null default now(),
  primary key (amb_pk),
  unique (iam_profile_fk)
);

-- Monthly ambassador payout calculation (view used by admin)
create or replace view growth_ambassador_monthly_metrics as
select
  a.amb_pk,
  a.campus_name,
  p.display_name as ambassador_name,
  p.phone_e164,
  date_trunc('month', now()) as report_month,
  count(r.consumer_referral_pk) as referrals_this_month,
  count(r.consumer_referral_pk) filter (where r.referral_status_code = 'REWARDED') as conversions,
  a.monthly_base_paise +
    greatest(0, count(r.consumer_referral_pk) filter (where r.referral_status_code = 'REWARDED') - a.min_conversions_for_bonus)
    * a.referral_bonus_paise as total_payout_paise
from growth_campus_ambassador a
join iam_profile p on p.iam_profile_pk = a.iam_profile_fk
left join consumer_referral_code rc on rc.consumer_profile_fk = (
  select consumer_profile_pk from consumer_profile where iam_profile_fk = a.iam_profile_fk limit 1
)
left join consumer_profile referee_profile on referee_profile.used_referral_code_fk = rc.consumer_referral_code_pk
left join consumer_referral r on r.referred_consumer_profile_fk = referee_profile.consumer_profile_pk
  and date_trunc('month', r.created_at) = date_trunc('month', now())
where a.status_code = 'ACTIVE'
group by a.amb_pk, a.campus_name, p.display_name, p.phone_e164, a.monthly_base_paise, a.min_conversions_for_bonus, a.referral_bonus_paise;
```

**Admin UI addition:** `/admin/growth/ambassadors` — list of active ambassadors, this month's conversion counts, calculated payout, manual "Mark Paid" action.

### 3.7B — Brand Language Enforcement ESLint Plugin

**Package:** `packages/eslint-plugin-gozaika` (new package in monorepo)

```typescript
// packages/eslint-plugin-gozaika/src/rules/no-banned-words.ts
// Custom ESLint rule that scans JSX text nodes and string literals

// Canonical consumer banned-copy list (business doc §6.5). Consumer copy is
// premium/dignity — waste-economics ("surplus", "food rescue") is B2B/restaurant-
// ONLY (§15), so this rule must be scoped to the CONSUMER surfaces (consumer-web,
// consumer-mobile, website consumer sections), NOT restaurant-mgmt-web/mobile.
// Also retire "mystery = you can't choose" — keep the surprise/discovery.
const BANNED_WORDS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(leftover|leftovers)\b/i, replacement: '"chef\'s pick" or "today\'s selection"' },
  { pattern: /\b(stale|expired|near-expiry)\b/i, replacement: 'remove or rephrase' },
  { pattern: /\b(cheap|cheapest)\b/i, replacement: '"value" or "accessible"' },
  { pattern: /\bclearance\b/i, replacement: '"last bags" or "closing soon"' },
  { pattern: /\bliquidation\b/i, replacement: 'remove — never in consumer copy' },
  { pattern: /\b(food rescue|rescued|rescue)\b/i, replacement: 'remove — waste framing is banned consumer-side' },
  { pattern: /\bsample\b/i, replacement: '"a taste" / "discover" — never "sample bag"' },
  { pattern: /\bsurplus\b/i, replacement: 'B2B/restaurant copy ONLY — never consumer-facing (§15)' },
  { pattern: /\bmystery\b/i, replacement: '"a surprise" / "discovery" — retire "mystery = can\'t choose" (§6)' },
  { pattern: /\b(discount|discounted|discounting)\b/i, replacement: '"savings" or "value"' },
]

// Rule checks:
// 1. JSXText nodes (literal text between JSX tags)
// 2. StringLiteral nodes (string values in JSX attributes)
// 3. TemplateLiteral nodes (template strings in JSX)
// Ignores: comments, test files, migrations, markdown

// The rule reports as 'error' (not 'warn') so it blocks CI
```

**Integration:**
- Add `packages/eslint-plugin-gozaika` to each app's ESLint config
- Add to `package.json` CI script: `"lint": "eslint . --ext .ts,.tsx"`
- Pre-commit hook via husky: runs `eslint --fix` on staged files

### 3.7C — SEO Architecture

**Structured Data (Schema.org) — add to existing pages:**

```typescript
// packages/utils/src/seo.ts

export function generateRestaurantSchema(restaurant: RestaurantPublicProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    name: restaurant.restaurantName,
    servesCuisine: restaurant.cuisineTypes,
    address: { '@type': 'PostalAddress', addressLocality: restaurant.neighbourhood, addressRegion: 'Telangana', addressCountry: 'IN' },
    url: `https://customer.gozaika.in/restaurants/${restaurant.slug}`,
    aggregateRating: restaurant.avgRating ? {
      '@type': 'AggregateRating',
      ratingValue: restaurant.avgRating,
      reviewCount: restaurant.reviewCount
    } : undefined
  }
}

export function generateDropOfferSchema(drop: PublicDrop, restaurant: RestaurantPublicProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${restaurant.restaurantName} BAM Bag`,
    description: `Surprise chef-curated bag from ${restaurant.restaurantName}. Allergens: ${drop.allergenSummary}`,
    offers: {
      '@type': 'Offer',
      price: (drop.currentPricePaise / 100).toFixed(2),
      priceCurrency: 'INR',
      availability: drop.quantityAvailable > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      seller: { '@type': 'Organization', name: 'goZaika' }
    }
  }
}
```

**City Landing Pages** — `apps/website/app/cities/[city-slug]/page.tsx`

Dynamic city page with:
- City-specific headline: "Hyderabad's First Premium Chef's-Thali Discovery Platform" (retire "mystery" — keep the surprise; §Brand Language)
- Active drop count from API (live data)
- Restaurant neighbourhood grid (Banjara Hills, Kondapur, Jubilee Hills, HITEC City)
- Local SEO copy mentioning city and neighbourhood names
- Structured data: `LocalBusiness` schema with `areaServed: "Hyderabad"`

**Sitemap generation** — `apps/website/app/sitemap.ts`:
- Static pages: /, /how-it-works, /for-restaurants, /faq, /privacy-policy, /food-safety-policy
- Dynamic: one entry per active restaurant `/restaurants/[slug]`
- Dynamic: one entry per active drop `/drops/[id]` (short TTL: 1 hour)
- City pages: `/cities/[city-slug]`

### Slice 3.7 — Claude Code Implementation Prompt

```
SYSTEM: goZaika monorepo. Next.js 16 + Supabase + Tailwind 4. npm workspaces only.
This slice has three independent deliverables (3.7A, 3.7B, 3.7C). They can be built in parallel.

TASK — Slice 3.7: Growth Infrastructure

=== 3.7A: CAMPUS AMBASSADOR ===

1. DATABASE MIGRATION
   File: supabase/migrations/[timestamp]_slice3_7_growth.sql
   - Create growth_campus_ambassador (spec above)
   - Create growth_ambassador_monthly_metrics view (spec above)
   - RLS: platform admin reads all; ambassadors read own row only

2. ADMIN AMBASSADOR PAGE
   File: apps/admin-web/app/admin/growth/ambassadors/page.tsx
   - Table: ambassador name, campus, city, conversions this month, base pay, bonus, total payout
   - Data source: growth_ambassador_monthly_metrics view
   - Actions: "Mark Paid" → insert to finance_settlement_run (type=AMBASSADOR_PAYOUT)
   - "Add Ambassador" form: search user by phone → assign campus → set monthly_base_paise

3. AMBASSADOR ONBOARDING
   File: apps/consumer-web/app/account/page.tsx (update)
   - If user has growth_campus_ambassador row: show "Ambassador Dashboard" card
     * My referrals this month: count
     * Conversions: count  
     * Estimated payout: ₹X
     * My referral link: gozaika.in/join?ref={referral_code}
     * Share button → pre-filled WhatsApp message

=== 3.7B: BRAND LANGUAGE ENFORCEMENT ===

4. ESLINT PLUGIN PACKAGE
   Directory: packages/eslint-plugin-gozaika/
   Files:
   - package.json: { "name": "@gozaika/eslint-plugin-gozaika", "main": "src/index.js" }
   - src/rules/no-banned-words.ts: implement the AST visitor that checks JSXText + StringLiteral + TemplateLiteral
   - src/index.ts: export { rules: { 'no-banned-words': noBannedWordsRule } }
   - src/rules/no-banned-words.test.ts: vitest unit tests (10+ cases: pass/fail)

5. INTEGRATE INTO MONOREPO
   - Add "@gozaika/eslint-plugin-gozaika": "*" to each app's package.json devDependencies
   - Update each app's .eslintrc.json: add "plugins": ["@gozaika/gozaika"], "rules": {"@gozaika/gozaika/no-banned-words": "error"}
   - Update root package.json CI script to run lint before build

6. HUSKY PRE-COMMIT HOOK
   - Install husky + lint-staged at root
   - .husky/pre-commit: runs lint-staged
   - lint-staged config: { "apps/**/*.{ts,tsx}": ["eslint --fix", "git add"] }

=== 3.7C: SEO ARCHITECTURE ===

7. SEO UTILITIES PACKAGE
   File: packages/utils/src/seo.ts
   - generateRestaurantSchema() and generateDropOfferSchema() as specified above
   - generateLocalBusinessSchema(city: GeoCity): SchemaOrg object for city pages
   - generateBreadcrumbSchema(items: Array<{name: string, url: string}>): SchemaOrg

8. ADD JSON-LD TO PAGES
   Create a JsonLd component in packages/ui: <script type="application/ld+json">{JSON.stringify(schema)}</script>
   Apply to:
   - apps/website/app/page.tsx: LocalBusiness schema
   - apps/consumer-web/app/restaurants/[slug]/page.tsx: FoodEstablishment schema
   - apps/consumer-web/app/drops/[id]/page.tsx: Product + Offer schema

9. DYNAMIC CITY PAGES
   File: apps/website/app/cities/[city-slug]/page.tsx
   - generateStaticParams: returns active city slugs from geo_city
   - generateMetadata: title="{city_name}'s First Premium Chef's-Thali Discovery Platform | goZaika"
   - Page content: city hero, neighbourhood grid, active drop count, restaurant count, how-it-works summary
   - LocalBusiness schema with areaServed

10. SITEMAP + ROBOTS
    File: apps/website/app/sitemap.ts
    - Static routes: / /for-restaurants /how-it-works /faq /cities /privacy-policy /food-safety-policy
    - Dynamic routes: all active restaurants, all active cities
    - Exclude: /admin /portal /auth and all API routes
    File: apps/website/app/robots.ts
    - Allow: /  Disallow: /admin /portal /api /auth
    - Sitemap: https://gozaika.in/sitemap.xml

11. OG TAGS ON DROP PAGES
    File: apps/consumer-web/app/drops/[id]/page.tsx (update generateMetadata)
    - og:title: "BAM Bag from {restaurant} — ₹{price} | goZaika"
    - og:description: "Chef-curated thali from {restaurant} — a generous spread, the lineup a surprise. Allergens: {allergens}. Pickup {time}."
    - og:image: restaurant's cover image from storage_object
    - twitter:card: summary_large_image
```

---

## Implementation Sequencing Recommendation

Given you are a solo architect-developer with AI assistance, recommended execution order:

```
Week 1–2:   Slice 3.1 (ZaikaIQ Foundation) — data pipeline first; without data nothing else works
Week 3–4:   Slice 3.3 (Food Safety) — existential risk mitigation; ship before any press coverage
Week 5–6:   Slice 3.4 (WhatsApp Engine) — primary growth channel; needed before public launch
Week 7–8:   Slice 3.2 (ZaikaIQ Pro) — depends on Slice 3.1 having run for 2+ weeks of data
Week 9:     Slice 3.5 (Dynamic Pricing) — revenue optimization; needs live drops to tune
Week 10:    Slice 3.6 (Zayka Passport) — retention; needs a base of collected orders to feel real
Week 11:    Slice 3.7 (Growth Infrastructure) — SEO and ambassador; lower urgency, higher long-term value
Parallel:   v3 Slices 2.1–2.4 (premium UX, mobile apps) — these unblock each other and can run concurrently with 3.x
```

**Critical constraint:** Slices 3.3 (food safety) and 3.4 (WhatsApp) should ship **before** any restaurant goes live with real consumers. Both are asymmetric — the cost of shipping them early is low; the cost of a food safety incident or a poor WhatsApp first impression before they exist is very high.

---

## Cross-Cutting Technical Standards (Applies to All v4 Slices)

These standards complement the existing v3 system context and must be consistent across all new code.

**Convention carry-forwards from existing codebase:**
- `npm workspaces` only — never pnpm, never `workspace:*` specifiers
- Supabase typed client from `@gozaika/supabase` package — never raw `fetch` to Supabase
- Money: `bigint` paise in DB and API; format to rupees only at display layer using `formatPaise(n: bigint): string`
- Auth: `getPortalActor()` in restaurant app, `getPlatformActor()` in admin app, `getConsumerProfile()` in consumer app — never call `supabase.auth.getUser()` directly in pages
- RLS is the tenancy boundary — never bypass it in app code; service role used only in Edge Functions and server-to-server
- All monetary Razorpay webhooks must verify HMAC-SHA256 signature before processing
- Edge Function environment: Deno + esm.sh imports; no Node.js-specific APIs

**New standards introduced in v4:**
- ZaikaIQ routes: gated by `requireZaikaIqTier(actor, 'PRO')` middleware helper — add this to `packages/utils/src/portal-auth.ts`
- WhatsApp outbound: always log to `whatsapp_message_log` before returning; failures are logged, not thrown
- Food safety: any function that creates a drop must call `validateFreshnessWindow()` — this is non-optional
- Price updates: any price change on an active drop must create a `drop_price_event` row — never update `current_price_paise` without a corresponding audit event
- Brand lint: the ESLint `no-banned-words` rule runs as an error in CI — PRs with banned words do not merge
- Product framing (consumer copy, business doc Part VI): a BAM Bag is a **generous chef's thali** — composition, the "how" — never "mystery"/"sample"/"surplus"; **never promise a dish or serving count** (signal abundance, not a contract); keep the surprise/discovery. Brand = **BAM / Zayka / Swaad** (BAM = "Bada Zayka Ayega Maza"). Waste-economics language is **B2B/restaurant-only**

---

*End of goZaika Technology Specification v4.0*  
*Cross-reference: Tech Spec v3.0 (Slices 2.1–2.4) | Strategic Analysis v1.0 | Master Business Document v3.0*
