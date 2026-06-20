-- =============================================================================
-- goZaika Demo Seed — Part 2: Catalog (templates/revisions) and Drops
-- Run AFTER demo_seed.sql (Part 1)
-- =============================================================================

begin;

-- =============================================================================
-- SECTION 21 — Bag templates (2 per restaurant, 10 total)
-- =============================================================================

insert into catalog_bag_template
  (catalog_bag_template_pk, restaurant_fk, template_name,
   template_status_code, created_by_profile_fk)
values
  -- Bawarchi
  ('20000000-0000-0000-0000-500000000001',
   '20000000-0000-0000-0000-300000000001',
   'Hyderabadi Biryani BAM Bag', 'ACTIVE',
   '20000000-0000-0000-0000-210000000001'),
  ('20000000-0000-0000-0000-500000000002',
   '20000000-0000-0000-0000-300000000001',
   'Double Mutton Delight', 'ACTIVE',
   '20000000-0000-0000-0000-210000000001'),
  -- Sattvik
  ('20000000-0000-0000-0000-500000000003',
   '20000000-0000-0000-0000-300000000002',
   'Full Veg Thali Bag', 'ACTIVE',
   '20000000-0000-0000-0000-210000000002'),
  ('20000000-0000-0000-0000-500000000004',
   '20000000-0000-0000-0000-300000000002',
   'Jain Special Discovery', 'ACTIVE',
   '20000000-0000-0000-0000-210000000002'),
  -- Smoky Grill
  ('20000000-0000-0000-0000-500000000005',
   '20000000-0000-0000-0000-300000000003',
   'Tandoor Surprise Bag', 'ACTIVE',
   '20000000-0000-0000-0000-210000000003'),
  ('20000000-0000-0000-0000-500000000006',
   '20000000-0000-0000-0000-300000000003',
   'Smoky Spotlight Selection', 'ACTIVE',
   '20000000-0000-0000-0000-210000000003'),
  -- Andhra Spice Trail
  ('20000000-0000-0000-0000-500000000007',
   '20000000-0000-0000-0000-300000000004',
   'Andhra Meals BAM Bag', 'ACTIVE',
   '20000000-0000-0000-0000-210000000004'),
  ('20000000-0000-0000-0000-500000000008',
   '20000000-0000-0000-0000-300000000004',
   'Coastal Delight Chef''s Bag', 'ACTIVE',
   '20000000-0000-0000-0000-210000000004'),
  -- Sweet Bytes
  ('20000000-0000-0000-0000-500000000009',
   '20000000-0000-0000-0000-300000000005',
   'Artisan Bakes Surprise', 'ACTIVE',
   '20000000-0000-0000-0000-210000000005'),
  ('20000000-0000-0000-0000-500000000010',
   '20000000-0000-0000-0000-300000000005',
   'Dessert Dreams Bag', 'ACTIVE',
   '20000000-0000-0000-0000-210000000005')
on conflict (catalog_bag_template_pk) do nothing;

-- =============================================================================
-- SECTION 22 — Bag template revisions (1 published revision per template)
-- =============================================================================

insert into catalog_bag_template_revision
  (catalog_bag_template_revision_pk, catalog_bag_template_fk,
   revision_number, display_name, short_description,
   dietary_category_code, spice_level_code,
   serves_min, serves_max,
   max_holding_minutes, holding_guidance_text,
   min_menu_value_paise, suggested_price_paise,
   allergen_summary_text, included_item_hint_text,
   revision_status_code, published_at,
   created_by_profile_fk)
values
  -- T01: Bawarchi Biryani (NON_VEG, HOT)
  ('20000000-0000-0000-0000-600000000001',
   '20000000-0000-0000-0000-500000000001',
   1, 'Hyderabadi Biryani BAM Bag',
   'Slow-cooked dum biryani with raita, salan and a fresh salad.',
   'NON_VEG', 'HOT', 1, 2, 120,
   'Consume within 2 hours of pickup. Reheat on low flame if not eaten immediately.',
   30000, 14900,
   'Contains WHEAT_GLUTEN (bread accompaniment), DAIRY (raita). May contain NUTS.',
   'A portion of our signature dum biryani with accompaniments chosen by the chef.',
   'PUBLISHED', now()-interval '85 days',
   '20000000-0000-0000-0000-210000000001'),

  -- T02: Bawarchi Double Mutton (NON_VEG, EXTRA_HOT)
  ('20000000-0000-0000-0000-600000000002',
   '20000000-0000-0000-0000-500000000002',
   1, 'Double Mutton Delight',
   'Chef''s selection of two mutton preparations — typically biryani and a curry.',
   'NON_VEG', 'EXTRA_HOT', 2, 3, 90,
   'Best consumed within 90 minutes. Keep sealed until ready to eat.',
   50000, 24900,
   'Contains WHEAT_GLUTEN. May contain DAIRY, NUTS, SESAME.',
   'Two mutton items: usually a rice preparation and a slow-cooked curry or kebab.',
   'PUBLISHED', now()-interval '85 days',
   '20000000-0000-0000-0000-210000000001'),

  -- T03: Sattvik Veg Thali (VEG, MILD)
  ('20000000-0000-0000-0000-600000000003',
   '20000000-0000-0000-0000-500000000003',
   1, 'Full Veg Thali Bag',
   'A complete vegetarian meal: rice, two sabzis, dal, roti, and a sweet.',
   'VEG', 'MILD', 1, 2, 150,
   'Best within 2 hours. Roti stays soft in closed packaging.',
   22000, 9900,
   'Contains DAIRY (ghee, paneer), WHEAT_GLUTEN (roti). May contain SOY.',
   'Rice, two vegetable dishes, lentil preparation, bread and a small dessert.',
   'PUBLISHED', now()-interval '70 days',
   '20000000-0000-0000-0000-210000000002'),

  -- T04: Sattvik Jain Special (JAIN, MILD)
  ('20000000-0000-0000-0000-600000000004',
   '20000000-0000-0000-0000-500000000004',
   1, 'Jain Special Discovery',
   'A curated Jain thali — no root vegetables, no onion, no garlic.',
   'JAIN', 'MILD', 1, 2, 150,
   'Jain preparation confirmed. Consume within 2 hours.',
   25000, 12900,
   'Contains DAIRY (ghee, milk-based sweet), WHEAT_GLUTEN (roti). No onion/garlic/root vegetables.',
   'Jain-compliant rice, two dry sabzis, arhar dal, roti and a sweet. No root vegetables.',
   'PUBLISHED', now()-interval '70 days',
   '20000000-0000-0000-0000-210000000002'),

  -- T05: Smoky Tandoor (NON_VEG, HOT)
  ('20000000-0000-0000-0000-600000000005',
   '20000000-0000-0000-0000-500000000005',
   1, 'Tandoor Surprise Bag',
   'Fresh-from-the-tandoor selection — tikka, kebab or seekh with a bread and chutney.',
   'NON_VEG', 'HOT', 1, 2, 90,
   'Consume within 90 minutes for best quality. Do not microwave seekh kebab.',
   35000, 17900,
   'Contains WHEAT_GLUTEN (bread), DAIRY (marinade). May contain EGGS, SESAME.',
   'One or two items from the live tandoor — chicken or mutton, served with naan or roti.',
   'PUBLISHED', now()-interval '55 days',
   '20000000-0000-0000-0000-210000000003'),

  -- T06: Smoky Spotlight Mix (NON_VEG, MEDIUM) — SPOTLIGHT type
  ('20000000-0000-0000-0000-600000000006',
   '20000000-0000-0000-0000-500000000006',
   1, 'Smoky Spotlight Selection',
   'The chef''s weekly highlight — a premium preparation not on the regular menu.',
   'NON_VEG', 'MEDIUM', 2, 3, 120,
   'This is a premium cut. Consume within 2 hours. Keep warm if possible.',
   60000, 19900,
   'Contains WHEAT_GLUTEN, DAIRY. May contain NUTS, EGGS, SESAME.',
   'Chef''s weekly selection: premium protein with rice or bread and a curated side.',
   'PUBLISHED', now()-interval '55 days',
   '20000000-0000-0000-0000-210000000003'),

  -- T07: Andhra Meals (NON_VEG, HOT)
  ('20000000-0000-0000-0000-600000000007',
   '20000000-0000-0000-0000-500000000007',
   1, 'Andhra Meals BAM Bag',
   'Authentic Andhra meal: rice, pappu, two curries, rasam, pickle, papad and sweet.',
   'NON_VEG', 'HOT', 1, 2, 180,
   'Andhra curries stay well for 3 hours. Keep sealed.',
   20000, 9900,
   'Contains DAIRY (ghee), SOY (papad). May contain MUSTARD, SESAME.',
   'Full Andhra meal with rice, lentil, two non-veg curries, rasam and accompaniments.',
   'PUBLISHED', now()-interval '75 days',
   '20000000-0000-0000-0000-210000000004'),

  -- T08: Andhra Coastal Delight (NON_VEG, HOT) — CHEF_SPECIAL type
  ('20000000-0000-0000-0000-600000000008',
   '20000000-0000-0000-0000-500000000008',
   1, 'Coastal Delight Chef''s Bag',
   'Seafood-forward chef''s selection from the Andhra coast — prawn, fish or both.',
   'NON_VEG', 'HOT', 1, 2, 90,
   'Seafood degrades fast. Consume within 90 minutes of pickup. Do not refrigerate and reheat.',
   55000, 19900,
   'Contains FISH, SHELLFISH (prawns). May contain MUSTARD, SESAME, SOY.',
   'One or two coastal seafood preparations — typically prawn curry or fish fry with rice.',
   'PUBLISHED', now()-interval '75 days',
   '20000000-0000-0000-0000-210000000004'),

  -- T09: Sweet Bytes Artisan Bakes (VEG, MILD) — BLIND_ADVENTURE type
  ('20000000-0000-0000-0000-600000000009',
   '20000000-0000-0000-0000-500000000009',
   1, 'Artisan Bakes Surprise',
   'A baker''s selection of today''s freshest pastries — you won''t know until you open it.',
   'VEG', 'MILD', 1, 2, 240,
   'Croissants best within 4 hours. Store in paper bag, not plastic. Refrigerate cream items.',
   40000, 14900,
   'Contains DAIRY (butter, cream), EGGS, WHEAT_GLUTEN. May contain NUTS, SOY.',
   'A curated box of baked goods from today''s batch. Could include croissants, tarts, choux, or cake slices.',
   'PUBLISHED', now()-interval '40 days',
   '20000000-0000-0000-0000-210000000005'),

  -- T10: Sweet Bytes Dessert Dreams (VEG, MILD)
  ('20000000-0000-0000-0000-600000000010',
   '20000000-0000-0000-0000-500000000010',
   1, 'Dessert Dreams Bag',
   'A sweet selection for dessert lovers — mousse, macarons, or mini cakes.',
   'VEG', 'MILD', 1, 2, 180,
   'Keep refrigerated. Consume mousse and cream desserts within 3 hours of pickup.',
   30000, 11900,
   'Contains DAIRY, EGGS, WHEAT_GLUTEN. May contain NUTS, SOY.',
   'Two to four dessert items from today''s batch — mousses, choux, macarons, or petit fours.',
   'PUBLISHED', now()-interval '40 days',
   '20000000-0000-0000-0000-210000000005')
on conflict (catalog_bag_template_revision_pk) do nothing;

-- Link active_revision_fk on each template
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000001'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000001';
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000002'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000002';
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000003'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000003';
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000004'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000004';
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000005'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000005';
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000006'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000006';
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000007'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000007';
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000008'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000008';
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000009'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000009';
update catalog_bag_template
  set active_revision_fk = '20000000-0000-0000-0000-600000000010'
  where catalog_bag_template_pk = '20000000-0000-0000-0000-500000000010';

-- =============================================================================
-- SECTION 23 — Bag allergen declarations
-- =============================================================================

insert into catalog_bag_template_allergen
  (catalog_bag_template_revision_fk, master_allergen_fk,
   contains_flag, may_contain_flag)
select t.rev::uuid, ma.master_allergen_pk, t.contains, t.may_contain
from (values
  -- T01: Bawarchi Biryani — WHEAT_GLUTEN contains, DAIRY contains, NUTS may contain
  ('20000000-0000-0000-0000-600000000001', 'WHEAT_GLUTEN', true,  false),
  ('20000000-0000-0000-0000-600000000001', 'DAIRY',        true,  false),
  ('20000000-0000-0000-0000-600000000001', 'NUTS',         false, true),
  -- T02: Mutton Delight — WHEAT_GLUTEN contains, DAIRY/NUTS/SESAME may contain
  ('20000000-0000-0000-0000-600000000002', 'WHEAT_GLUTEN', true,  false),
  ('20000000-0000-0000-0000-600000000002', 'DAIRY',        false, true),
  ('20000000-0000-0000-0000-600000000002', 'NUTS',         false, true),
  ('20000000-0000-0000-0000-600000000002', 'SESAME',       false, true),
  -- T03: Veg Thali — DAIRY, WHEAT_GLUTEN contains; SOY may contain
  ('20000000-0000-0000-0000-600000000003', 'DAIRY',        true,  false),
  ('20000000-0000-0000-0000-600000000003', 'WHEAT_GLUTEN', true,  false),
  ('20000000-0000-0000-0000-600000000003', 'SOY',          false, true),
  -- T04: Jain Special — DAIRY, WHEAT_GLUTEN contains
  ('20000000-0000-0000-0000-600000000004', 'DAIRY',        true,  false),
  ('20000000-0000-0000-0000-600000000004', 'WHEAT_GLUTEN', true,  false),
  -- T05: Tandoor — WHEAT_GLUTEN, DAIRY contains; EGGS, SESAME may contain
  ('20000000-0000-0000-0000-600000000005', 'WHEAT_GLUTEN', true,  false),
  ('20000000-0000-0000-0000-600000000005', 'DAIRY',        true,  false),
  ('20000000-0000-0000-0000-600000000005', 'EGGS',         false, true),
  ('20000000-0000-0000-0000-600000000005', 'SESAME',       false, true),
  -- T06: Spotlight Mix
  ('20000000-0000-0000-0000-600000000006', 'WHEAT_GLUTEN', true,  false),
  ('20000000-0000-0000-0000-600000000006', 'DAIRY',        true,  false),
  ('20000000-0000-0000-0000-600000000006', 'NUTS',         false, true),
  ('20000000-0000-0000-0000-600000000006', 'EGGS',         false, true),
  ('20000000-0000-0000-0000-600000000006', 'SESAME',       false, true),
  -- T07: Andhra Meals — DAIRY contains; MUSTARD, SESAME, SOY may contain
  ('20000000-0000-0000-0000-600000000007', 'DAIRY',        true,  false),
  ('20000000-0000-0000-0000-600000000007', 'SOY',          true,  false),
  ('20000000-0000-0000-0000-600000000007', 'MUSTARD',      false, true),
  ('20000000-0000-0000-0000-600000000007', 'SESAME',       false, true),
  -- T08: Coastal Delight — FISH, SHELLFISH contains; MUSTARD, SESAME, SOY may contain
  ('20000000-0000-0000-0000-600000000008', 'FISH',         true,  false),
  ('20000000-0000-0000-0000-600000000008', 'SHELLFISH',    true,  false),
  ('20000000-0000-0000-0000-600000000008', 'MUSTARD',      false, true),
  ('20000000-0000-0000-0000-600000000008', 'SESAME',       false, true),
  ('20000000-0000-0000-0000-600000000008', 'SOY',          false, true),
  -- T09: Artisan Bakes — DAIRY, EGGS, WHEAT_GLUTEN contains; NUTS, SOY may contain
  ('20000000-0000-0000-0000-600000000009', 'DAIRY',        true,  false),
  ('20000000-0000-0000-0000-600000000009', 'EGGS',         true,  false),
  ('20000000-0000-0000-0000-600000000009', 'WHEAT_GLUTEN', true,  false),
  ('20000000-0000-0000-0000-600000000009', 'NUTS',         false, true),
  ('20000000-0000-0000-0000-600000000009', 'SOY',          false, true),
  -- T10: Dessert Dreams — DAIRY, EGGS, WHEAT_GLUTEN contains; NUTS, SOY may contain
  ('20000000-0000-0000-0000-600000000010', 'DAIRY',        true,  false),
  ('20000000-0000-0000-0000-600000000010', 'EGGS',         true,  false),
  ('20000000-0000-0000-0000-600000000010', 'WHEAT_GLUTEN', true,  false),
  ('20000000-0000-0000-0000-600000000010', 'NUTS',         false, true),
  ('20000000-0000-0000-0000-600000000010', 'SOY',          false, true)
) t(rev, allergen_code, contains, may_contain)
join master_allergen ma on ma.allergen_code = t.allergen_code
on conflict (catalog_bag_template_revision_fk, master_allergen_fk) do nothing;

-- =============================================================================
-- SECTION 24 — Past drops (10 completed drops)
-- =============================================================================
-- Pickup times: evening IST = UTC+5:30. Evening 18:00-21:00 IST = 12:30-15:30 UTC
-- Past dates: D01-D05 = 3 weeks ago (2026-05-09), D06-D08 = 2 weeks ago (2026-05-16),
--             D09-D10 = 1 week ago (2026-05-23)

insert into drop_drop
  (drop_drop_pk, restaurant_fk, catalog_bag_template_revision_fk,
   drop_title, drop_status_code, drop_type_code,
   geo_city_fk, geo_neighborhood_fk,
   quantity_total, quantity_reserved, quantity_sold, quantity_collected,
   price_paise, currency_code,
   pickup_start_at, pickup_end_at,
   hold_duration_minutes, visibility_code,
   created_by_profile_fk, published_by_profile_fk,
   published_at, COMPUTED_sell_through_bps)
select
  t.pk, t.rest, t.rev,
  t.title, t.dstatus, t.dtype,
  (select geo_city_pk from geo_city where city_code='HYD'),
  (select geo_neighborhood_pk from geo_neighborhood
   where neighborhood_code=t.nbr
     and geo_city_fk=(select geo_city_pk from geo_city where city_code='HYD')),
  t.qty_total, 0, t.qty_sold, t.qty_coll,
  t.price_paise, 'INR',
  t.pickup_start::timestamptz, t.pickup_end::timestamptz,
  10, 'PUBLIC',
  t.owner_iam, t.owner_iam,
  t.pickup_start::timestamptz - interval '2 hours',
  (t.qty_sold::float / t.qty_total * 10000)::integer
from (values
  -- D01: Bawarchi Biryani, 3 weeks ago, PICKUP_CLOSED
  ('20000000-0000-0000-0000-700000000001'::uuid,
   '20000000-0000-0000-0000-300000000001'::uuid,
   '20000000-0000-0000-0000-600000000001'::uuid,
   'Tonight''s Biryani BAM Bag', 'PICKUP_CLOSED', 'STANDARD',
   'SECUNDERABAD', 10, 8, 7,
   14900::bigint,
   (now()-interval '21 days')::date || ' 12:30:00',
   (now()-interval '21 days')::date || ' 15:30:00',
   '20000000-0000-0000-0000-210000000001'::uuid),

  -- D02: Bawarchi Mutton, 3 weeks ago, SOLD_OUT
  ('20000000-0000-0000-0000-700000000002'::uuid,
   '20000000-0000-0000-0000-300000000001'::uuid,
   '20000000-0000-0000-0000-600000000002'::uuid,
   'Double Mutton Night — Limited 8 Bags', 'SOLD_OUT', 'CHEF_SPECIAL',
   'SECUNDERABAD', 8, 8, 8,
   24900::bigint,
   (now()-interval '21 days')::date || ' 13:30:00',
   (now()-interval '21 days')::date || ' 16:30:00',
   '20000000-0000-0000-0000-210000000001'::uuid),

  -- D03: Sattvik Veg Thali, 3 weeks ago, PICKUP_CLOSED
  ('20000000-0000-0000-0000-700000000003'::uuid,
   '20000000-0000-0000-0000-300000000002'::uuid,
   '20000000-0000-0000-0000-600000000003'::uuid,
   'Friday Thali — Full Vegetarian Meal', 'PICKUP_CLOSED', 'STANDARD',
   'BANJARA_HILLS', 15, 10, 9,
   9900::bigint,
   (now()-interval '21 days')::date || ' 12:30:00',
   (now()-interval '21 days')::date || ' 15:30:00',
   '20000000-0000-0000-0000-210000000002'::uuid),

  -- D04: Sattvik Jain Special, 1 week ago, SOLD_OUT
  ('20000000-0000-0000-0000-700000000004'::uuid,
   '20000000-0000-0000-0000-300000000002'::uuid,
   '20000000-0000-0000-0000-600000000004'::uuid,
   'Jain Paryushana Special — 6 Bags Only', 'SOLD_OUT', 'STANDARD',
   'BANJARA_HILLS', 6, 6, 6,
   12900::bigint,
   (now()-interval '7 days')::date || ' 13:00:00',
   (now()-interval '7 days')::date || ' 16:00:00',
   '20000000-0000-0000-0000-210000000002'::uuid),

  -- D05: Smoky Tandoor, 3 weeks ago, PICKUP_CLOSED
  ('20000000-0000-0000-0000-700000000005'::uuid,
   '20000000-0000-0000-0000-300000000003'::uuid,
   '20000000-0000-0000-0000-600000000005'::uuid,
   'Saturday Tandoor Night', 'PICKUP_CLOSED', 'STANDARD',
   'GACHIBOWLI', 10, 7, 7,
   17900::bigint,
   (now()-interval '21 days')::date || ' 12:30:00',
   (now()-interval '21 days')::date || ' 15:30:00',
   '20000000-0000-0000-0000-210000000003'::uuid),

  -- D06: Smoky Spotlight Mix, 2 weeks ago, EMERGENCY_CLOSED
  ('20000000-0000-0000-0000-700000000006'::uuid,
   '20000000-0000-0000-0000-300000000003'::uuid,
   '20000000-0000-0000-0000-600000000006'::uuid,
   'Spotlight: Chef''s Premium Mix', 'EMERGENCY_CLOSED', 'SPOTLIGHT',
   'GACHIBOWLI', 10, 2, 0,
   19900::bigint,
   (now()-interval '14 days')::date || ' 13:30:00',
   (now()-interval '14 days')::date || ' 16:30:00',
   '20000000-0000-0000-0000-210000000003'::uuid),

  -- D07: Andhra Meals, 2 weeks ago, PICKUP_CLOSED
  ('20000000-0000-0000-0000-700000000007'::uuid,
   '20000000-0000-0000-0000-300000000004'::uuid,
   '20000000-0000-0000-0000-600000000007'::uuid,
   'Full Andhra Meals — Friday Drop', 'PICKUP_CLOSED', 'STANDARD',
   'JUBILEE_HILLS', 20, 14, 13,
   9900::bigint,
   (now()-interval '14 days')::date || ' 12:30:00',
   (now()-interval '14 days')::date || ' 15:30:00',
   '20000000-0000-0000-0000-210000000004'::uuid),

  -- D08: Andhra Coastal, 1 week ago, SOLD_OUT
  ('20000000-0000-0000-0000-700000000008'::uuid,
   '20000000-0000-0000-0000-300000000004'::uuid,
   '20000000-0000-0000-0000-600000000008'::uuid,
   'Chef''s Coastal Delight — Only 8 Bags', 'SOLD_OUT', 'CHEF_SPECIAL',
   'JUBILEE_HILLS', 8, 8, 8,
   19900::bigint,
   (now()-interval '7 days')::date || ' 13:00:00',
   (now()-interval '7 days')::date || ' 16:00:00',
   '20000000-0000-0000-0000-210000000004'::uuid),

  -- D09: Sweet Artisan Bakes, 3 weeks ago, PICKUP_CLOSED
  ('20000000-0000-0000-0000-700000000009'::uuid,
   '20000000-0000-0000-0000-300000000005'::uuid,
   '20000000-0000-0000-0000-600000000009'::uuid,
   'Weekend Bakes Surprise Box', 'PICKUP_CLOSED', 'BLIND_ADVENTURE',
   'HITECH_CITY', 10, 8, 7,
   14900::bigint,
   (now()-interval '21 days')::date || ' 12:30:00',
   (now()-interval '21 days')::date || ' 15:30:00',
   '20000000-0000-0000-0000-210000000005'::uuid),

  -- D10: Sweet Dessert Dreams, 1 week ago, PICKUP_CLOSED
  ('20000000-0000-0000-0000-700000000010'::uuid,
   '20000000-0000-0000-0000-300000000005'::uuid,
   '20000000-0000-0000-0000-600000000010'::uuid,
   'Friday Dessert Dreams — 12 Bags', 'PICKUP_CLOSED', 'STANDARD',
   'HITECH_CITY', 12, 9, 9,
   11900::bigint,
   (now()-interval '7 days')::date || ' 12:30:00',
   (now()-interval '7 days')::date || ' 15:30:00',
   '20000000-0000-0000-0000-210000000005'::uuid)
) t(pk, rest, rev, title, dstatus, dtype, nbr,
    qty_total, qty_sold, qty_coll, price_paise, pickup_start, pickup_end, owner_iam)
on conflict (drop_drop_pk) do nothing;

-- Emergency closure log for D06
insert into drop_closure_log
  (drop_fk, closure_type_code, reason_text, closed_by_profile_fk, closed_at)
values
  ('20000000-0000-0000-0000-700000000006',
   'EMERGENCY',
   'Power failure in kitchen. All paid orders to be refunded immediately.',
   '20000000-0000-0000-0000-210000000003',
   ((now()-interval '14 days')::date || ' 14:00:00')::timestamptz)
on conflict do nothing;

-- =============================================================================
-- SECTION 25 — Today's active drops (5 drops, pickup tonight)
-- =============================================================================
-- Pickup tonight: 18:00-21:00 IST = 12:30-15:30 UTC (today's date)
-- 3 of these have paid orders; 2 have active holds only

insert into drop_drop
  (drop_drop_pk, restaurant_fk, catalog_bag_template_revision_fk,
   drop_title, drop_status_code, drop_type_code,
   geo_city_fk, geo_neighborhood_fk,
   quantity_total, quantity_reserved, quantity_sold, quantity_collected,
   price_paise, currency_code,
   pickup_start_at, pickup_end_at,
   hold_duration_minutes, visibility_code,
   created_by_profile_fk, published_by_profile_fk,
   published_at, COMPUTED_sell_through_bps)
select
  t.pk, t.rest, t.rev,
  t.title, 'ACTIVE', t.dtype,
  (select geo_city_pk from geo_city where city_code='HYD'),
  (select geo_neighborhood_pk from geo_neighborhood
   where neighborhood_code=t.nbr
     and geo_city_fk=(select geo_city_pk from geo_city where city_code='HYD')),
  t.qty_total, t.qty_res, t.qty_sold, 0,
  t.price_paise, 'INR',
  (current_date || ' 12:30:00')::timestamptz,
  (current_date || ' 15:30:00')::timestamptz,
  10, 'PUBLIC',
  t.owner_iam, t.owner_iam,
  now() - interval '3 hours',
  (t.qty_sold::float / t.qty_total * 10000)::integer
from (values
  -- D11: Bawarchi Biryani, 12 bags, 1 sold (Priya confirmed), 2 reserved
  ('20000000-0000-0000-0000-700000000011'::uuid,
   '20000000-0000-0000-0000-300000000001'::uuid,
   '20000000-0000-0000-0000-600000000001'::uuid,
   'Today''s Biryani BAM Bag — 12 Bags', 'STANDARD',
   'SECUNDERABAD', 12, 2, 1, 14900::bigint,
   '20000000-0000-0000-0000-210000000001'::uuid),

  -- D12: Sattvik Veg Thali, 15 bags, 1 sold (Rahul confirmed), 1 reserved (Arjun hold)
  ('20000000-0000-0000-0000-700000000012'::uuid,
   '20000000-0000-0000-0000-300000000002'::uuid,
   '20000000-0000-0000-0000-600000000003'::uuid,
   'Evening Veg Thali — 15 Bags Ready', 'STANDARD',
   'BANJARA_HILLS', 15, 1, 1, 9900::bigint,
   '20000000-0000-0000-0000-210000000002'::uuid),

  -- D13: Smoky Spotlight, 10 bags, 1 sold (Karthik confirmed), 1 reserved (Deepa hold)
  ('20000000-0000-0000-0000-700000000013'::uuid,
   '20000000-0000-0000-0000-300000000003'::uuid,
   '20000000-0000-0000-0000-600000000006'::uuid,
   'SPOTLIGHT: Chef''s Saturday Pick', 'SPOTLIGHT',
   'GACHIBOWLI', 10, 1, 1, 19900::bigint,
   '20000000-0000-0000-0000-210000000003'::uuid),

  -- D14: Andhra Coastal, 8 bags, 0 sold, 1 reserved (Vikram hold)
  ('20000000-0000-0000-0000-700000000014'::uuid,
   '20000000-0000-0000-0000-300000000004'::uuid,
   '20000000-0000-0000-0000-600000000008'::uuid,
   'Chef''s Coastal Catch — Tonight Only', 'CHEF_SPECIAL',
   'JUBILEE_HILLS', 8, 1, 0, 19900::bigint,
   '20000000-0000-0000-0000-210000000004'::uuid),

  -- D15: Sweet Blind Adventure, 10 bags, no holds/orders yet
  ('20000000-0000-0000-0000-700000000015'::uuid,
   '20000000-0000-0000-0000-300000000005'::uuid,
   '20000000-0000-0000-0000-600000000009'::uuid,
   'Mystery Bakes Box — Open to Find Out', 'BLIND_ADVENTURE',
   'HITECH_CITY', 10, 0, 0, 14900::bigint,
   '20000000-0000-0000-0000-210000000005'::uuid)
) t(pk, rest, rev, title, dtype, nbr, qty_total, qty_res, qty_sold, price_paise, owner_iam)
on conflict (drop_drop_pk) do nothing;

-- =============================================================================
-- SECTION 26 — Future scheduled drops (2 drops for tomorrow)
-- =============================================================================

insert into drop_drop
  (drop_drop_pk, restaurant_fk, catalog_bag_template_revision_fk,
   drop_title, drop_status_code, drop_type_code,
   geo_city_fk, geo_neighborhood_fk,
   quantity_total, quantity_reserved, quantity_sold, quantity_collected,
   price_paise, currency_code,
   pickup_start_at, pickup_end_at, publish_at,
   hold_duration_minutes, visibility_code,
   created_by_profile_fk, COMPUTED_sell_through_bps)
select
  t.pk, t.rest, t.rev,
  t.title, 'SCHEDULED', t.dtype,
  (select geo_city_pk from geo_city where city_code='HYD'),
  (select geo_neighborhood_pk from geo_neighborhood
   where neighborhood_code=t.nbr
     and geo_city_fk=(select geo_city_pk from geo_city where city_code='HYD')),
  t.qty_total, 0, 0, 0,
  t.price_paise, 'INR',
  ((current_date + 1) || ' 13:30:00')::timestamptz,
  ((current_date + 1) || ' 16:30:00')::timestamptz,
  ((current_date + 1) || ' 11:00:00')::timestamptz,
  10, 'PUBLIC',
  t.owner_iam, 0
from (values
  ('20000000-0000-0000-0000-700000000016'::uuid,
   '20000000-0000-0000-0000-300000000001'::uuid,
   '20000000-0000-0000-0000-600000000002'::uuid,
   'Sunday Special — Double Mutton Night', 'CHEF_SPECIAL',
   'SECUNDERABAD', 8, 24900::bigint,
   '20000000-0000-0000-0000-210000000001'::uuid),

  ('20000000-0000-0000-0000-700000000017'::uuid,
   '20000000-0000-0000-0000-300000000004'::uuid,
   '20000000-0000-0000-0000-600000000007'::uuid,
   'Sunday Andhra Feast — 20 Bags Pre-Scheduled', 'STANDARD',
   'JUBILEE_HILLS', 20, 9900::bigint,
   '20000000-0000-0000-0000-210000000004'::uuid)
) t(pk, rest, rev, title, dtype, nbr, qty_total, price_paise, owner_iam)
on conflict (drop_drop_pk) do nothing;

commit;
