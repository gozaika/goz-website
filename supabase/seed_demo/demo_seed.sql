-- =============================================================================
-- goZaika Demo Seed  |  seed_demo/demo_seed.sql
-- =============================================================================
-- Covers: map view, ratings, reviews, cuisine signals, pickup neighborhoods,
--         drops (all 4 types), full order lifecycle, Swaad Club, Zayka Passport.
--
-- Run order: apply all migrations through slice9 first, then execute this file
-- as service-role / postgres superuser.
--
-- Demo password for all auth.users: DemoPass@2026
--
-- KNOWN EXCEPTIONS (pre-existing bugs in slice9 migration, not fixed here):
--   E1) api_public_restaurant_profile references ga.street_address — column
--       does not exist in geo_address (correct columns: line_1, line_2, landmark).
--       That view will error until patched.
--   E2) api_public_restaurant_reviews and api_restaurant_own_reviews join on
--       oo.order_pk — should be oo.order_order_pk. Both views return empty
--       or error until patched.
--   E3) COMPUTED_quantity_available on drop_drop is a GENERATED STORED column;
--       this seed does NOT include it in INSERT columns.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- UUID legend (deterministic, safe to re-run via on conflict guards)
-- ---------------------------------------------------------------------------
-- Consumer auth.users : 20000000-0000-0000-0000-1000000000{01-08}
-- Consumer iam_profile: 20000000-0000-0000-0000-1100000000{01-08}
-- consumer_profile    : 20000000-0000-0000-0000-1200000000{01-08}
-- Restaurant auth     : 20000000-0000-0000-0000-2000000000{01-05}
-- Restaurant iam      : 20000000-0000-0000-0000-2100000000{01-05}
-- Restaurant rows     : 20000000-0000-0000-0000-3000000000{01-05}
-- geo_address         : 20000000-0000-0000-0000-4000000000{01-05}
-- Bag templates       : 20000000-0000-0000-0000-5000000000{01-10}
-- Bag revisions       : 20000000-0000-0000-0000-6000000000{01-10}
-- Past drops          : 20000000-0000-0000-0000-7000000000{01-10}
-- Today drops         : 20000000-0000-0000-0000-7000000000{11-15}
-- Future drops        : 20000000-0000-0000-0000-7000000000{16-17}
-- Orders              : 20000000-0000-0000-0000-8000000000{01-28}
-- Holds (active)      : 20000000-0000-0000-0000-9000000000{01-03}
-- Payment intents     : 20000000-0000-0000-0000-a000000000{01-28}
-- Payment transactions: 20000000-0000-0000-0000-b000000000{01-25}
-- Reviews             : 20000000-0000-0000-0000-c000000000{01-12}
-- Subscriptions       : 20000000-0000-0000-0000-d000000000{01-05}
-- Sub plans           : 20000000-0000-0000-0000-e000000000{01-03}

-- =============================================================================
-- SECTION 1 — Subscription plans (Swaad Club)
-- =============================================================================

insert into consumer_subscription_plan
  (consumer_subscription_plan_pk, plan_code, plan_name, description,
   billing_interval_code, price_paise, is_active)
values
  ('20000000-0000-0000-0000-e00000000001',
   'SWAAD_MONTHLY', 'Swaad Club — Monthly',
   'Access to member-only drops and early claim windows. ₹99/month.',
   'MONTHLY', 9900, true),
  ('20000000-0000-0000-0000-e00000000002',
   'SWAAD_QUARTERLY', 'Swaad Club — Quarterly',
   '3 months of Swaad Club access. Best value for regulars. ₹249/quarter.',
   'QUARTERLY', 24900, true),
  ('20000000-0000-0000-0000-e00000000003',
   'SWAAD_YEARLY', 'Swaad Club — Annual',
   'Full-year Swaad Club membership. ₹799/year.',
   'YEARLY', 79900, true)
on conflict (plan_code) do update
  set plan_name = excluded.plan_name,
      description = excluded.description,
      price_paise = excluded.price_paise,
      updated_at = now();

-- =============================================================================
-- SECTION 2 — Consumer auth.users (8 demo consumers)
-- =============================================================================

insert into auth.users
  (id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('20000000-0000-0000-0000-100000000001', 'authenticated', 'authenticated',
   'priya.demo@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '25 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Priya Sharma"}',
   now() - interval '25 days', now()),

  ('20000000-0000-0000-0000-100000000002', 'authenticated', 'authenticated',
   'rahul.demo@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '60 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Rahul Mehta"}',
   now() - interval '60 days', now()),

  ('20000000-0000-0000-0000-100000000003', 'authenticated', 'authenticated',
   'anjali.demo@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '15 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Anjali Kumar"}',
   now() - interval '15 days', now()),

  ('20000000-0000-0000-0000-100000000004', 'authenticated', 'authenticated',
   'vikram.demo@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '10 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Vikram Rao"}',
   now() - interval '10 days', now()),

  ('20000000-0000-0000-0000-100000000005', 'authenticated', 'authenticated',
   'deepa.demo@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '90 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Deepa Nair"}',
   now() - interval '90 days', now()),

  ('20000000-0000-0000-0000-100000000006', 'authenticated', 'authenticated',
   'arjun.demo@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '120 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Arjun Singh"}',
   now() - interval '120 days', now()),

  ('20000000-0000-0000-0000-100000000007', 'authenticated', 'authenticated',
   'meera.demo@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '7 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Meera Patel"}',
   now() - interval '7 days', now()),

  ('20000000-0000-0000-0000-100000000008', 'authenticated', 'authenticated',
   'karthik.demo@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '180 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Karthik Reddy"}',
   now() - interval '180 days', now())
on conflict (id) do nothing;

-- =============================================================================
-- SECTION 3 — Restaurant owner auth.users (5 restaurant owners)
-- =============================================================================

insert into auth.users
  (id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('20000000-0000-0000-0000-200000000001', 'authenticated', 'authenticated',
   'bawarchi.owner@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '90 days',
   '{"provider":"email","providers":["email"],"role":"restaurant"}',
   '{"full_name":"Mohammed Bawarchi"}',
   now() - interval '90 days', now()),

  ('20000000-0000-0000-0000-200000000002', 'authenticated', 'authenticated',
   'sattvik.owner@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '75 days',
   '{"provider":"email","providers":["email"],"role":"restaurant"}',
   '{"full_name":"Lakshmi Sattvik"}',
   now() - interval '75 days', now()),

  ('20000000-0000-0000-0000-200000000003', 'authenticated', 'authenticated',
   'smoky.owner@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '60 days',
   '{"provider":"email","providers":["email"],"role":"restaurant"}',
   '{"full_name":"Rajesh Smoky"}',
   now() - interval '60 days', now()),

  ('20000000-0000-0000-0000-200000000004', 'authenticated', 'authenticated',
   'andhra.owner@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '80 days',
   '{"provider":"email","providers":["email"],"role":"restaurant"}',
   '{"full_name":"Venkat Andhra"}',
   now() - interval '80 days', now()),

  ('20000000-0000-0000-0000-200000000005', 'authenticated', 'authenticated',
   'sweet.owner@gozaika.dev',
   extensions.crypt('DemoPass@2026', extensions.gen_salt('bf', 8)),
   now() - interval '45 days',
   '{"provider":"email","providers":["email"],"role":"restaurant"}',
   '{"full_name":"Preethi Sweet"}',
   now() - interval '45 days', now())
on conflict (id) do nothing;

-- =============================================================================
-- SECTION 4 — IAM profiles (consumers)
-- =============================================================================

insert into iam_profile
  (iam_profile_pk, auth_user_fk, email_address, display_name,
   default_city_fk, is_consumer, is_restaurant_user, is_platform_user,
   last_seen_at, created_at, updated_at)
select
  pk, auth_fk, email, display_name,
  (select geo_city_pk from geo_city where city_code = 'HYD'),
  true, false, false,
  now() - interval '1 hour', created, now()
from (values
  ('20000000-0000-0000-0000-110000000001'::uuid,
   '20000000-0000-0000-0000-100000000001'::uuid,
   'priya.demo@gozaika.dev'::citext, 'Priya Sharma',
   now() - interval '25 days'),
  ('20000000-0000-0000-0000-110000000002'::uuid,
   '20000000-0000-0000-0000-100000000002'::uuid,
   'rahul.demo@gozaika.dev'::citext, 'Rahul Mehta',
   now() - interval '60 days'),
  ('20000000-0000-0000-0000-110000000003'::uuid,
   '20000000-0000-0000-0000-100000000003'::uuid,
   'anjali.demo@gozaika.dev'::citext, 'Anjali Kumar',
   now() - interval '15 days'),
  ('20000000-0000-0000-0000-110000000004'::uuid,
   '20000000-0000-0000-0000-100000000004'::uuid,
   'vikram.demo@gozaika.dev'::citext, 'Vikram Rao',
   now() - interval '10 days'),
  ('20000000-0000-0000-0000-110000000005'::uuid,
   '20000000-0000-0000-0000-100000000005'::uuid,
   'deepa.demo@gozaika.dev'::citext, 'Deepa Nair',
   now() - interval '90 days'),
  ('20000000-0000-0000-0000-110000000006'::uuid,
   '20000000-0000-0000-0000-100000000006'::uuid,
   'arjun.demo@gozaika.dev'::citext, 'Arjun Singh',
   now() - interval '120 days'),
  ('20000000-0000-0000-0000-110000000007'::uuid,
   '20000000-0000-0000-0000-100000000007'::uuid,
   'meera.demo@gozaika.dev'::citext, 'Meera Patel',
   now() - interval '7 days'),
  ('20000000-0000-0000-0000-110000000008'::uuid,
   '20000000-0000-0000-0000-100000000008'::uuid,
   'karthik.demo@gozaika.dev'::citext, 'Karthik Reddy',
   now() - interval '180 days')
) t(pk, auth_fk, email, display_name, created)
on conflict (iam_profile_pk) do nothing;

-- =============================================================================
-- SECTION 5 — IAM profiles (restaurant owners)
-- =============================================================================

insert into iam_profile
  (iam_profile_pk, auth_user_fk, email_address, display_name,
   default_city_fk, is_consumer, is_restaurant_user, is_platform_user,
   created_at, updated_at)
select
  pk, auth_fk, email, display_name,
  (select geo_city_pk from geo_city where city_code = 'HYD'),
  false, true, false,
  now() - interval '90 days', now()
from (values
  ('20000000-0000-0000-0000-210000000001'::uuid,
   '20000000-0000-0000-0000-200000000001'::uuid,
   'bawarchi.owner@gozaika.dev'::citext, 'Mohammed Bawarchi'),
  ('20000000-0000-0000-0000-210000000002'::uuid,
   '20000000-0000-0000-0000-200000000002'::uuid,
   'sattvik.owner@gozaika.dev'::citext, 'Lakshmi Sattvik'),
  ('20000000-0000-0000-0000-210000000003'::uuid,
   '20000000-0000-0000-0000-200000000003'::uuid,
   'smoky.owner@gozaika.dev'::citext, 'Rajesh Smoky'),
  ('20000000-0000-0000-0000-210000000004'::uuid,
   '20000000-0000-0000-0000-200000000004'::uuid,
   'andhra.owner@gozaika.dev'::citext, 'Venkat Andhra'),
  ('20000000-0000-0000-0000-210000000005'::uuid,
   '20000000-0000-0000-0000-200000000005'::uuid,
   'sweet.owner@gozaika.dev'::citext, 'Preethi Sweet')
) t(pk, auth_fk, email, display_name)
on conflict (iam_profile_pk) do nothing;

-- =============================================================================
-- SECTION 6 — consumer_profile rows
-- =============================================================================

insert into consumer_profile
  (consumer_profile_pk, iam_profile_fk, first_name, last_name,
   preferred_language_code, marketing_source_code, created_at, updated_at)
values
  ('20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-110000000001',
   'Priya', 'Sharma', 'en', 'INSTAGRAM', now()-interval '25 days', now()),
  ('20000000-0000-0000-0000-120000000002',
   '20000000-0000-0000-0000-110000000002',
   'Rahul', 'Mehta', 'en', 'REFERRAL', now()-interval '60 days', now()),
  ('20000000-0000-0000-0000-120000000003',
   '20000000-0000-0000-0000-110000000003',
   'Anjali', 'Kumar', 'hi', 'GOOGLE', now()-interval '15 days', now()),
  ('20000000-0000-0000-0000-120000000004',
   '20000000-0000-0000-0000-110000000004',
   'Vikram', 'Rao', 'en', 'ORGANIC', now()-interval '10 days', now()),
  ('20000000-0000-0000-0000-120000000005',
   '20000000-0000-0000-0000-110000000005',
   'Deepa', 'Nair', 'en', 'REFERRAL', now()-interval '90 days', now()),
  ('20000000-0000-0000-0000-120000000006',
   '20000000-0000-0000-0000-110000000006',
   'Arjun', 'Singh', 'hi', 'APP_STORE', now()-interval '120 days', now()),
  ('20000000-0000-0000-0000-120000000007',
   '20000000-0000-0000-0000-110000000007',
   'Meera', 'Patel', 'en', 'INSTAGRAM', now()-interval '7 days', now()),
  ('20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-110000000008',
   'Karthik', 'Reddy', 'en', 'ORGANIC', now()-interval '180 days', now())
on conflict (consumer_profile_pk) do nothing;

-- =============================================================================
-- SECTION 7 — Referral codes
-- =============================================================================

insert into consumer_referral_code
  (consumer_referral_code_pk, consumer_profile_fk, referral_code, is_active)
values
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000001', 'GZ-PRIYA01', true),
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000002', 'GZ-RAHUL02', true),
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000003', 'GZ-ANJA03', true),
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000004', 'GZ-VIKR04', true),
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000005', 'GZ-DEEP05', true),
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000006', 'GZ-ARJN06', true),
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000007', 'GZ-MEER07', true),
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000008', 'GZ-KART08', true)
on conflict (consumer_profile_fk) do nothing;

-- Rahul used Deepa's referral code (referral chain)
update consumer_profile
  set used_referral_code_fk = (
    select consumer_referral_code_pk
    from consumer_referral_code
    where referral_code = 'GZ-DEEP05'
  )
where consumer_profile_pk = '20000000-0000-0000-0000-120000000002'
  and used_referral_code_fk is null;

insert into consumer_referral
  (referrer_consumer_profile_fk, referred_consumer_profile_fk,
   referral_status_code, qualified_at, rewarded_at)
values
  ('20000000-0000-0000-0000-120000000005',
   '20000000-0000-0000-0000-120000000002',
   'REWARDED', now()-interval '55 days', now()-interval '50 days')
on conflict (referrer_consumer_profile_fk, referred_consumer_profile_fk) do nothing;

-- =============================================================================
-- SECTION 8 — Consumer dietary preferences
-- =============================================================================
-- Rahul (VEG), Arjun (VEG), Vikram (NON_VEG)

insert into consumer_dietary_preference
  (consumer_profile_fk, dietary_category_code)
values
  ('20000000-0000-0000-0000-120000000002', 'VEG'),
  ('20000000-0000-0000-0000-120000000006', 'VEG'),
  ('20000000-0000-0000-0000-120000000004', 'NON_VEG')
on conflict (consumer_profile_fk, dietary_category_code) do nothing;

-- =============================================================================
-- SECTION 9 — Consumer allergen preferences
-- =============================================================================
-- Priya avoids NUTS; Vikram avoids DAIRY

insert into consumer_allergen_preference
  (consumer_profile_fk, master_allergen_fk, avoid_flag)
select '20000000-0000-0000-0000-120000000001', master_allergen_pk, true
from master_allergen where allergen_code = 'NUTS'
on conflict (consumer_profile_fk, master_allergen_fk) do nothing;

insert into consumer_allergen_preference
  (consumer_profile_fk, master_allergen_fk, avoid_flag)
select '20000000-0000-0000-0000-120000000004', master_allergen_pk, true
from master_allergen where allergen_code = 'DAIRY'
on conflict (consumer_profile_fk, master_allergen_fk) do nothing;

-- =============================================================================
-- SECTION 10 — Consumer city preferences
-- =============================================================================

insert into consumer_city_preference
  (consumer_profile_fk, geo_city_fk, is_default)
select cp.pk, gc.geo_city_pk, true
from (values
  ('20000000-0000-0000-0000-120000000001'::uuid),
  ('20000000-0000-0000-0000-120000000002'::uuid),
  ('20000000-0000-0000-0000-120000000003'::uuid),
  ('20000000-0000-0000-0000-120000000004'::uuid),
  ('20000000-0000-0000-0000-120000000005'::uuid),
  ('20000000-0000-0000-0000-120000000006'::uuid),
  ('20000000-0000-0000-0000-120000000007'::uuid),
  ('20000000-0000-0000-0000-120000000008'::uuid)
) cp(pk)
cross join geo_city gc where gc.city_code = 'HYD'
on conflict (consumer_profile_fk, geo_city_fk) do nothing;

-- =============================================================================
-- SECTION 11 — Zayka Passport stats
-- =============================================================================
-- Reflects full lifetime history (seed orders are a subset of total history)
-- Tier thresholds: BRONZE <5, SILVER 5-14, GOLD 15-29, PLATINUM 30+

insert into consumer_passport_stat
  (consumer_passport_stat_pk, consumer_profile_fk,
   total_bags_collected, total_restaurants_visited,
   total_neighborhoods_visited, current_tier_code,
   last_calculated_at)
values
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000001',
   7,  4, 4, 'SILVER',   now()),   -- Priya
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000002',
   18, 3, 3, 'GOLD',     now()),   -- Rahul (VEG, fewer restaurants)
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000003',
   3,  3, 3, 'BRONZE',   now()),   -- Anjali
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000004',
   2,  2, 2, 'BRONZE',   now()),   -- Vikram
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000005',
   12, 4, 4, 'SILVER',   now()),   -- Deepa
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000006',
   22, 3, 3, 'GOLD',     now()),   -- Arjun (VEG)
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000007',
   2,  2, 2, 'BRONZE',   now()),   -- Meera
  (gen_random_uuid(), '20000000-0000-0000-0000-120000000008',
   35, 5, 5, 'PLATINUM', now())    -- Karthik
on conflict (consumer_profile_fk) do update
  set total_bags_collected      = excluded.total_bags_collected,
      total_restaurants_visited = excluded.total_restaurants_visited,
      total_neighborhoods_visited = excluded.total_neighborhoods_visited,
      current_tier_code         = excluded.current_tier_code,
      last_calculated_at        = excluded.last_calculated_at,
      updated_at                = now();

-- =============================================================================
-- SECTION 12 — Swaad Club subscriptions
-- =============================================================================
-- Priya: ACTIVE monthly  | Rahul: ACTIVE quarterly  | Deepa: PAST_DUE
-- Arjun: ACTIVE yearly   | Karthik: ACTIVE quarterly

insert into consumer_subscription
  (consumer_subscription_pk, consumer_profile_fk,
   consumer_subscription_plan_fk, subscription_status_code,
   started_at, current_period_start_at, current_period_end_at,
   cancel_at_period_end_flag)
values
  -- Priya — active monthly
  ('20000000-0000-0000-0000-d00000000001',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-e00000000001',
   'ACTIVE',
   now()-interval '55 days',
   now()-interval '25 days',
   now()+interval '5 days',
   false),

  -- Rahul — active quarterly
  ('20000000-0000-0000-0000-d00000000002',
   '20000000-0000-0000-0000-120000000002',
   '20000000-0000-0000-0000-e00000000002',
   'ACTIVE',
   now()-interval '60 days',
   now()-interval '60 days',
   now()+interval '30 days',
   false),

  -- Deepa — past due (subscription lapsed)
  ('20000000-0000-0000-0000-d00000000003',
   '20000000-0000-0000-0000-120000000005',
   '20000000-0000-0000-0000-e00000000001',
   'PAST_DUE',
   now()-interval '90 days',
   now()-interval '60 days',
   now()-interval '30 days',
   false),

  -- Arjun — active yearly
  ('20000000-0000-0000-0000-d00000000004',
   '20000000-0000-0000-0000-120000000006',
   '20000000-0000-0000-0000-e00000000003',
   'ACTIVE',
   now()-interval '120 days',
   now()-interval '120 days',
   now()+interval '245 days',
   false),

  -- Karthik — active quarterly (cancel at end requested)
  ('20000000-0000-0000-0000-d00000000005',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-e00000000002',
   'ACTIVE',
   now()-interval '180 days',
   now()-interval '90 days',
   now()+interval '1 day',
   true)
on conflict (consumer_subscription_pk) do nothing;

-- =============================================================================
-- SECTION 13 — Geo addresses for 5 restaurants (lat/lng for map view)
-- =============================================================================

insert into geo_address
  (geo_address_pk, line_1, line_2, landmark,
   geo_city_fk, geo_neighborhood_fk,
   postal_code, latitude, longitude, google_place_id)
select
  t.pk, t.line1, t.line2, t.lm,
  (select geo_city_pk from geo_city where city_code='HYD'),
  (select geo_neighborhood_pk from geo_neighborhood
   where neighborhood_code = t.nbr
     and geo_city_fk = (select geo_city_pk from geo_city where city_code='HYD')),
  t.pincode, t.lat, t.lng, t.gplace
from (values
  ('20000000-0000-0000-0000-400000000001'::uuid,
   '4-1-123, Station Road', 'Near Clock Tower', 'Opposite SBI Bank, Secunderabad',
   'SECUNDERABAD', '500003', 17.4408::numeric(9,6), 78.4975::numeric(9,6),
   'ChIJNQ4sRRSVyzsRoyvQzCwBg1A'),

  ('20000000-0000-0000-0000-400000000002'::uuid,
   '8-2-293, Road No. 3', 'Banjara Hills', 'Near Banjara Hills Club',
   'BANJARA_HILLS', '500034', 17.4126::numeric(9,6), 78.4475::numeric(9,6),
   'ChIJn1xPkxyVyzsRmZXdkFPgOlE'),

  ('20000000-0000-0000-0000-400000000003'::uuid,
   'Plot 47, Gachibowli Tech Park Lane', null, 'Next to Cyber Towers Gate 2',
   'GACHIBOWLI', '500032', 17.4400::numeric(9,6), 78.3489::numeric(9,6),
   'ChIJcR5V0xaVyzsR6iHKYGkReSE'),

  ('20000000-0000-0000-0000-400000000004'::uuid,
   '1-11-252, Jubilee Hills Road', 'Lane 3', 'Near Film Nagar Dairy',
   'JUBILEE_HILLS', '500033', 17.4270::numeric(9,6), 78.4079::numeric(9,6),
   'ChIJ0Z6GhHuVyzsRuvYXoN9qdOY'),

  ('20000000-0000-0000-0000-400000000005'::uuid,
   'G-02, Hitech City Galleria', 'Madhapur Road', 'Ground Floor, beside Westside',
   'HITECH_CITY', '500081', 17.4504::numeric(9,6), 78.3808::numeric(9,6),
   'ChIJG3bx1hyVyzsRwkMFkEtLCeI')
) t(pk, line1, line2, lm, nbr, pincode, lat, lng, gplace)
on conflict (geo_address_pk) do nothing;

-- =============================================================================
-- SECTION 14 — Restaurants (5 demo restaurants, all ACTIVE)
-- =============================================================================

insert into restaurant_restaurant
  (restaurant_restaurant_pk, restaurant_name, restaurant_slug,
   legal_entity_name, restaurant_status_code,
   geo_city_fk, geo_neighborhood_fk, geo_address_fk,
   owner_profile_fk,
   primary_contact_email, primary_contact_phone_e164,
   pickup_instructions,
   COMPUTED_active_drop_count, COMPUTED_total_collected_count)
select
  t.pk::uuid, t.rname, t.slug, t.legal, 'ACTIVE',
  (select geo_city_pk from geo_city where city_code='HYD'),
  (select geo_neighborhood_pk from geo_neighborhood
   where neighborhood_code=t.nbr
     and geo_city_fk=(select geo_city_pk from geo_city where city_code='HYD')),
  t.addr_pk::uuid,
  t.owner_iam::uuid,
  t.email::citext, t.phone,
  t.instructions,
  0, t.total_coll
from (values
  ('20000000-0000-0000-0000-300000000001',
   'Bawarchi Biryani Palace', 'bawarchi-biryani-palace',
   'Bawarchi Foods Pvt Ltd',
   'SECUNDERABAD', '20000000-0000-0000-0000-400000000001',
   '20000000-0000-0000-0000-210000000001',
   'bawarchi.owner@gozaika.dev', '+919876540001',
   'Show QR at billing counter near entrance. Pickup from kitchen window on left.',
   142),

  ('20000000-0000-0000-0000-300000000002',
   'Sattvik Kitchen', 'sattvik-kitchen',
   'Sattvik Foods LLP',
   'BANJARA_HILLS', '20000000-0000-0000-0000-400000000002',
   '20000000-0000-0000-0000-210000000002',
   'sattvik.owner@gozaika.dev', '+919876540002',
   'Present QR to cashier at the front desk. Bag will be handed from the counter.',
   98),

  ('20000000-0000-0000-0000-300000000003',
   'The Smoky Grill', 'the-smoky-grill',
   'Smoky Hospitality Pvt Ltd',
   'GACHIBOWLI', '20000000-0000-0000-0000-400000000003',
   '20000000-0000-0000-0000-210000000003',
   'smoky.owner@gozaika.dev', '+919876540003',
   'Scan QR at the to-go counter. Ask for BAM Bag pickup. Side door preferred.',
   76),

  ('20000000-0000-0000-0000-300000000004',
   'Andhra Spice Trail', 'andhra-spice-trail',
   'Andhra Flavours Restaurant',
   'JUBILEE_HILLS', '20000000-0000-0000-0000-400000000004',
   '20000000-0000-0000-0000-210000000004',
   'andhra.owner@gozaika.dev', '+919876540004',
   'Walk to the parcel counter. Show QR on your phone. No need to wait in queue.',
   210),

  ('20000000-0000-0000-0000-300000000005',
   'Sweet Bytes Bakery', 'sweet-bytes-bakery',
   'Sweet Bytes Patisserie LLP',
   'HITECH_CITY', '20000000-0000-0000-0000-400000000005',
   '20000000-0000-0000-0000-210000000005',
   'sweet.owner@gozaika.dev', '+919876540005',
   'Tap on QR reader at bakery entrance. Your bag will be ready on the shelf labelled goZaika.',
   89)
) t(pk, rname, slug, legal, nbr, addr_pk, owner_iam, email, phone, instructions, total_coll)
on conflict (restaurant_restaurant_pk) do nothing;

-- =============================================================================
-- SECTION 15 — Restaurant public profiles
-- =============================================================================

insert into restaurant_public_profile
  (restaurant_fk, headline, story_markdown, is_featured, published_at)
values
  ('20000000-0000-0000-0000-300000000001',
   'Hyderabad''s legendary Dum Biryani — straight from the handi.',
   E'For three generations, Bawarchi has slow-cooked its signature dum biryani over wood fire. No shortcuts. No compromises.\n\nNow through goZaika, you get the chef''s own selection — off the menu, at the kitchen window.',
   true,
   now()-interval '80 days'),

  ('20000000-0000-0000-0000-300000000002',
   'Pure vegetarian. Traditionally cooked. Nothing hidden.',
   E'Sattvik Kitchen was founded on one principle: every ingredient matters. Our thalis are built around seasonal produce and family recipes unchanged for 40 years.\n\nThe goZaika BAM Bag is exactly what our regulars eat — just without the menu.',
   false,
   now()-interval '65 days'),

  ('20000000-0000-0000-0000-300000000003',
   'Fire, smoke, and the best kebab you''ll have all week.',
   E'The Smoky Grill brought live-fire cooking to Gachibowli''s tech corridor. Our tandoor runs 18 hours a day.\n\nYour BAM Bag contains whatever the pit produced today. Always hot. Never predictable.',
   true,
   now()-interval '50 days'),

  ('20000000-0000-0000-0000-300000000004',
   'Authentic Andhra. Not diluted. Not adjusted for outsiders.',
   E'Andhra Spice Trail serves the real thing: bold spices, proper sourness, and heat that earns its place.\n\nOur BAM Bags are built from the day''s surplus — full meals at the price of a snack.',
   true,
   now()-interval '70 days'),

  ('20000000-0000-0000-0000-300000000005',
   'Small-batch bakes. Seasonal flavours. Worth every bite.',
   E'Sweet Bytes started as a weekend stall. Now we bake 200 items a day — croissants, mille-feuille, choux — all from scratch.\n\nA BAM Bag is the baker''s pick: whatever came out best this morning.',
   false,
   now()-interval '35 days')
on conflict (restaurant_fk) do nothing;

-- =============================================================================
-- SECTION 16 — Restaurant compliance (all APPROVED for ACTIVE restaurants)
-- =============================================================================

insert into restaurant_compliance
  (restaurant_fk, fssai_license_number, fssai_license_expiry_date,
   gstin, pan_number, compliance_status_code, last_reviewed_at)
values
  ('20000000-0000-0000-0000-300000000001',
   '10023042002345', '2027-09-30',
   '36AABCB1234A1Z5', 'AABCB1234A', 'APPROVED', now()-interval '75 days'),

  ('20000000-0000-0000-0000-300000000002',
   '10023042005678', '2027-06-30',
   '36AABCS4321B1Z3', 'AABCS4321B', 'APPROVED', now()-interval '60 days'),

  ('20000000-0000-0000-0000-300000000003',
   '10023042008901', '2026-12-31',
   '36AABCT8765C1Z7', 'AABCT8765C', 'APPROVED', now()-interval '45 days'),

  ('20000000-0000-0000-0000-300000000004',
   '10023042002222', '2027-03-31',
   '36AABCA9999D1Z1', 'AABCA9999D', 'APPROVED', now()-interval '65 days'),

  ('20000000-0000-0000-0000-300000000005',
   '10023042007777', '2027-08-31',
   '36AABCW5555E1Z9', 'AABCW5555E', 'APPROVED', now()-interval '30 days')
on conflict (restaurant_fk) do nothing;

-- =============================================================================
-- SECTION 17 — Restaurant payout accounts
-- =============================================================================

insert into restaurant_payout_account
  (restaurant_fk, account_holder_name, bank_name,
   masked_account_number, ifsc_code,
   razorpay_fund_account_ref, payout_account_status_code)
values
  ('20000000-0000-0000-0000-300000000001',
   'Bawarchi Foods Pvt Ltd', 'HDFC Bank',
   'XXXX8801', 'HDFC0001234', 'fa_demo_bawarchi_01', 'VERIFIED'),
  ('20000000-0000-0000-0000-300000000002',
   'Sattvik Foods LLP', 'ICICI Bank',
   'XXXX5502', 'ICIC0002345', 'fa_demo_sattvik_02', 'VERIFIED'),
  ('20000000-0000-0000-0000-300000000003',
   'Smoky Hospitality Pvt Ltd', 'Axis Bank',
   'XXXX2203', 'UTIB0003456', 'fa_demo_smoky_03', 'VERIFIED'),
  ('20000000-0000-0000-0000-300000000004',
   'Andhra Flavours Restaurant', 'SBI',
   'XXXX9904', 'SBIN0004567', 'fa_demo_andhra_04', 'VERIFIED'),
  ('20000000-0000-0000-0000-300000000005',
   'Sweet Bytes Patisserie LLP', 'Kotak Bank',
   'XXXX1105', 'KKBK0005678', 'fa_demo_sweet_05', 'VERIFIED')
on conflict (restaurant_fk) do nothing;

-- =============================================================================
-- SECTION 18 — Restaurant cuisine maps (cuisine signals for discovery)
-- =============================================================================

insert into restaurant_cuisine_map (restaurant_fk, master_cuisine_fk, is_primary)
select r, mc.master_cuisine_pk, ip
from (values
  ('20000000-0000-0000-0000-300000000001'::uuid, 'BIRYANI',      true),
  ('20000000-0000-0000-0000-300000000001'::uuid, 'HYDERABADI',   false),
  ('20000000-0000-0000-0000-300000000001'::uuid, 'MUGHLAI',      false),

  ('20000000-0000-0000-0000-300000000002'::uuid, 'SOUTH_INDIAN',  true),
  ('20000000-0000-0000-0000-300000000002'::uuid, 'MULTI_CUISINE', false),

  ('20000000-0000-0000-0000-300000000003'::uuid, 'MUGHLAI',       true),
  ('20000000-0000-0000-0000-300000000003'::uuid, 'NORTH_INDIAN',  false),
  ('20000000-0000-0000-0000-300000000003'::uuid, 'CONTINENTAL',   false),

  ('20000000-0000-0000-0000-300000000004'::uuid, 'SOUTH_INDIAN',  true),
  ('20000000-0000-0000-0000-300000000004'::uuid, 'HYDERABADI',    false),
  ('20000000-0000-0000-0000-300000000004'::uuid, 'SEAFOOD',       false),

  ('20000000-0000-0000-0000-300000000005'::uuid, 'BAKERY',        true),
  ('20000000-0000-0000-0000-300000000005'::uuid, 'DESSERTS',      false),
  ('20000000-0000-0000-0000-300000000005'::uuid, 'CONTINENTAL',   false)
) v(r, cuisine_code, ip)
join master_cuisine mc on mc.cuisine_code = v.cuisine_code
on conflict (restaurant_fk, master_cuisine_fk) do nothing;

-- =============================================================================
-- SECTION 19 — Restaurant team memberships (owners)
-- =============================================================================

insert into restaurant_team_membership
  (restaurant_fk, iam_profile_fk, restaurant_team_role_fk,
   is_active, is_default, joined_at)
select
  r.pk::uuid,
  r.iam::uuid,
  rtr.restaurant_team_role_pk,
  true, true,
  now()-interval '85 days'
from (values
  ('20000000-0000-0000-0000-300000000001', '20000000-0000-0000-0000-210000000001'),
  ('20000000-0000-0000-0000-300000000002', '20000000-0000-0000-0000-210000000002'),
  ('20000000-0000-0000-0000-300000000003', '20000000-0000-0000-0000-210000000003'),
  ('20000000-0000-0000-0000-300000000004', '20000000-0000-0000-0000-210000000004'),
  ('20000000-0000-0000-0000-300000000005', '20000000-0000-0000-0000-210000000005')
) r(pk, iam)
cross join restaurant_team_role rtr where rtr.role_code = 'OWNER'
on conflict (restaurant_fk, iam_profile_fk, restaurant_team_role_fk) do nothing;

-- =============================================================================
-- SECTION 20 — Consumer saved restaurants (follows)
-- =============================================================================
-- Shows RESTAURANT_FOLLOWERS segment in action

insert into consumer_saved_restaurant (consumer_profile_fk, restaurant_fk)
values
  -- Priya follows Bawarchi and Andhra
  ('20000000-0000-0000-0000-120000000001', '20000000-0000-0000-0000-300000000001'),
  ('20000000-0000-0000-0000-120000000001', '20000000-0000-0000-0000-300000000004'),
  -- Rahul follows Sattvik and Sweet Bytes (VEG)
  ('20000000-0000-0000-0000-120000000002', '20000000-0000-0000-0000-300000000002'),
  ('20000000-0000-0000-0000-120000000002', '20000000-0000-0000-0000-300000000005'),
  -- Karthik follows all 5
  ('20000000-0000-0000-0000-120000000008', '20000000-0000-0000-0000-300000000001'),
  ('20000000-0000-0000-0000-120000000008', '20000000-0000-0000-0000-300000000002'),
  ('20000000-0000-0000-0000-120000000008', '20000000-0000-0000-0000-300000000003'),
  ('20000000-0000-0000-0000-120000000008', '20000000-0000-0000-0000-300000000004'),
  ('20000000-0000-0000-0000-120000000008', '20000000-0000-0000-0000-300000000005'),
  -- Deepa follows Andhra
  ('20000000-0000-0000-0000-120000000005', '20000000-0000-0000-0000-300000000004'),
  -- Arjun follows Sattvik
  ('20000000-0000-0000-0000-120000000006', '20000000-0000-0000-0000-300000000002')
on conflict (consumer_profile_fk, restaurant_fk) do nothing;

commit;
