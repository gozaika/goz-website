-- Slice 7 counter smoke fixture: one verifiable READY_FOR_PICKUP order on Bawarchi
-- Biryani Palace (where the role-matrix staff live), plus the minimal catalog/drop
-- chain it needs. Idempotent (fixed UUIDs + ON CONFLICT). LOCAL/TEST ONLY.
--
-- The pickup OTP hash is digest(SECRET || ':' || OTP) — it must match the BFF's
-- PICKUP_CREDENTIAL_SECRET for a SUCCESS verify. Defaults below pair with:
--   SECRET = local-smoke-pickup-secret-0123456789-abcdef
--   OTP    = 246810
-- Start the BFF with that PICKUP_CREDENTIAL_SECRET to exercise the SUCCESS path.

begin;

create extension if not exists pgcrypto;

-- 1. Catalog template + revision (snapshot source for the order).
insert into catalog_bag_template (catalog_bag_template_pk, restaurant_fk, template_name)
values ('70000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-300000000001', 'Smoke Veg Thali Template')
on conflict (catalog_bag_template_pk) do nothing;

insert into catalog_bag_template_revision (
  catalog_bag_template_revision_pk, catalog_bag_template_fk, revision_number, display_name, dietary_category_code
) values (
  '70000000-0000-0000-0000-0000000000b1', '70000000-0000-0000-0000-0000000000a1', 1, 'BAM Bag · Veg Thali', 'VEG'
) on conflict (catalog_bag_template_revision_pk) do nothing;

-- 2. A drop to attach the order to. quantity_sold is set high so the verify RPC's
--    `quantity_collected += 1` stays within ck_drop_quantities_bounds across many
--    smoke collections (quantity_collected <= quantity_sold).
insert into drop_drop (
  drop_drop_pk, restaurant_fk, catalog_bag_template_revision_fk, drop_title, geo_city_fk,
  quantity_total, quantity_reserved, quantity_sold, quantity_collected, price_paise,
  pickup_start_at, pickup_end_at
) values (
  '70000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-300000000001',
  '70000000-0000-0000-0000-0000000000b1', 'Smoke Evening Thali Drop',
  '07e20e11-8e83-41fc-9393-16f192313bf0', 100, 0, 100, 0, 14900,
  now() - interval '10 minutes', now() + interval '2 hours'
) on conflict (drop_drop_pk) do update set
  quantity_total = 100, quantity_reserved = 0, quantity_sold = 100, quantity_collected = 0,
  pickup_end_at = now() + interval '2 hours';

-- 3. The verifiable order (READY_FOR_PICKUP, window open, OTP hash set).
insert into order_order (
  order_order_pk, order_number, consumer_profile_fk, restaurant_fk, drop_fk,
  order_status_code, pickup_window_start_at, pickup_window_end_at,
  subtotal_paise, total_paise, currency_code,
  snapshot_restaurant_name, snapshot_restaurant_slug, snapshot_drop_title,
  snapshot_bag_display_name, snapshot_dietary_category_code,
  pickup_otp_hash
) values (
  '70000000-0000-0000-0000-0000000000d1', 'GZ-SMOKE-0001',
  (select consumer_profile_pk from consumer_profile limit 1),
  '20000000-0000-0000-0000-300000000001', '70000000-0000-0000-0000-0000000000c1',
  'READY_FOR_PICKUP', now() - interval '10 minutes', now() + interval '2 hours',
  14900, 14900, 'INR',
  'Bawarchi Biryani Palace', 'bawarchi-biryani-palace', 'Smoke Evening Thali Drop',
  'BAM Bag · Veg Thali', 'VEG',
  encode(digest('local-smoke-pickup-secret-0123456789-abcdef' || ':' || '246810', 'sha256'), 'hex')
) on conflict (order_order_pk) do update set
  order_status_code = 'READY_FOR_PICKUP',
  pickup_window_end_at = now() + interval '2 hours',
  pickup_otp_hash = excluded.pickup_otp_hash;

commit;
