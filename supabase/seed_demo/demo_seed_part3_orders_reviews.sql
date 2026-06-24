-- =============================================================================
-- goZaika Demo Seed — Part 3: Orders, Pickup Verifications, Reviews
-- Run AFTER Parts 1 and 2.
-- =============================================================================
-- Order assignment (consumer → drop → status):
--   D01 Bawarchi Biryani  : Priya→COLLECTED, Vikram→COLLECTED, Anjali→COLLECTED, Karthik→PICKUP_EXPIRED
--   D02 Bawarchi Mutton   : Karthik→COLLECTED, Deepa→COLLECTED
--   D03 Sattvik Veg Thali : Rahul→COLLECTED, Arjun→COLLECTED, Priya→CANCELLED(before pickup)
--   D04 Sattvik Jain      : Arjun→COLLECTED, Anjali→COLLECTED
--   D05 Smoky Tandoor     : Priya→COLLECTED, Vikram→COLLECTED
--   D06 Smoky Emergency   : Deepa→CANCELLED(refunded), Anjali→CANCELLED(refunded)
--   D07 Andhra Meals      : Karthik→COLLECTED, Deepa→COLLECTED, Priya→COLLECTED
--   D08 Andhra Coastal    : Karthik→COLLECTED, Meera→COLLECTED
--   D09 Sweet Bakes       : Rahul→COLLECTED, Arjun→PICKUP_EXPIRED
--   D10 Sweet Desserts    : Meera→COLLECTED, Karthik→COLLECTED, Anjali→COLLECTED
--   D11 Today Bawarchi    : Priya→CONFIRMED(paid)
--   D12 Today Sattvik     : Rahul→CONFIRMED(paid)
--   D13 Today Smoky       : Karthik→CONFIRMED(paid)
-- =============================================================================

begin;

-- =============================================================================
-- SECTION 27 — Orders (28 total)
-- Snapshot columns preserve purchase-time state per schema contract.
-- =============================================================================


insert into order_order
  (order_order_pk, order_number,
   consumer_profile_fk, restaurant_fk, drop_fk,
   order_status_code, payment_status_code,
   pickup_qr_nonce_hash, pickup_otp_hash,
   pickup_window_start_at, pickup_window_end_at,
   collected_at, cancelled_at, cancellation_reason,
   subtotal_paise, discount_paise, tax_paise, total_paise,
   currency_code,
   snapshot_restaurant_name, snapshot_restaurant_slug,
   snapshot_drop_title, snapshot_bag_display_name,
   snapshot_dietary_category_code, snapshot_spice_level_code,
   snapshot_allergen_summary_text, snapshot_serves_text,
   snapshot_pickup_instructions,
   dietary_category_code)
values

-- ── D01: Bawarchi Biryani (past, 3 weeks ago) ──────────────────────────────

  -- O01: Priya → COLLECTED
  ('20000000-0000-0000-0000-800000000001', 'GZ-SEED-202605-000001',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-300000000001',
   '20000000-0000-0000-0000-700000000001',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O01', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O01',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 13:05:00')::timestamptz,
   null, null,
   14900, 0, 0, 14900, 'INR',
   'Bawarchi Biryani Palace', 'bawarchi-biryani-palace',
   'Tonight''s Biryani BAM Bag', 'Hyderabadi Biryani BAM Bag',
   'NON_VEG', 'HOT',
   'Contains WHEAT_GLUTEN, DAIRY. May contain NUTS.',
   'Serves 1-2',
   'Show QR at billing counter near entrance. Pickup from kitchen window on left.',
   'NON_VEG'),

  -- O02: Vikram → COLLECTED
  ('20000000-0000-0000-0000-800000000002', 'GZ-SEED-202605-000002',
   '20000000-0000-0000-0000-120000000004',
   '20000000-0000-0000-0000-300000000001',
   '20000000-0000-0000-0000-700000000001',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O02', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O02',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 13:45:00')::timestamptz,
   null, null,
   14900, 0, 0, 14900, 'INR',
   'Bawarchi Biryani Palace', 'bawarchi-biryani-palace',
   'Tonight''s Biryani BAM Bag', 'Hyderabadi Biryani BAM Bag',
   'NON_VEG', 'HOT',
   'Contains WHEAT_GLUTEN, DAIRY. May contain NUTS.',
   'Serves 1-2',
   'Show QR at billing counter near entrance. Pickup from kitchen window on left.',
   'NON_VEG'),

  -- O03: Anjali → COLLECTED
  ('20000000-0000-0000-0000-800000000003', 'GZ-SEED-202605-000003',
   '20000000-0000-0000-0000-120000000003',
   '20000000-0000-0000-0000-300000000001',
   '20000000-0000-0000-0000-700000000001',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O03', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O03',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 14:00:00')::timestamptz,
   null, null,
   14900, 0, 0, 14900, 'INR',
   'Bawarchi Biryani Palace', 'bawarchi-biryani-palace',
   'Tonight''s Biryani BAM Bag', 'Hyderabadi Biryani BAM Bag',
   'NON_VEG', 'HOT',
   'Contains WHEAT_GLUTEN, DAIRY. May contain NUTS.',
   'Serves 1-2',
   'Show QR at billing counter near entrance. Pickup from kitchen window on left.',
   'NON_VEG'),

  -- O04: Karthik → PICKUP_EXPIRED (arrived after window closed)
  ('20000000-0000-0000-0000-800000000004', 'GZ-SEED-202605-000004',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-300000000001',
   '20000000-0000-0000-0000-700000000001',
   'PICKUP_EXPIRED', 'REFUNDED',
   encode(extensions.digest('nonce:O04', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O04',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   null,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   'Pickup window expired. Consumer did not arrive.',
   14900, 0, 0, 14900, 'INR',
   'Bawarchi Biryani Palace', 'bawarchi-biryani-palace',
   'Tonight''s Biryani BAM Bag', 'Hyderabadi Biryani BAM Bag',
   'NON_VEG', 'HOT',
   'Contains WHEAT_GLUTEN, DAIRY. May contain NUTS.',
   'Serves 1-2',
   'Show QR at billing counter near entrance. Pickup from kitchen window on left.',
   'NON_VEG'),

-- ── D02: Bawarchi Mutton (past, 3 weeks ago) ────────────────────────────────

  -- O05: Karthik → COLLECTED
  ('20000000-0000-0000-0000-800000000005', 'GZ-SEED-202605-000005',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-300000000001',
   '20000000-0000-0000-0000-700000000002',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O05', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O05',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 13:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 16:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 14:10:00')::timestamptz,
   null, null,
   24900, 0, 0, 24900, 'INR',
   'Bawarchi Biryani Palace', 'bawarchi-biryani-palace',
   'Double Mutton Night — Limited 8 Bags', 'Double Mutton Delight',
   'NON_VEG', 'EXTRA_HOT',
   'Contains WHEAT_GLUTEN. May contain DAIRY, NUTS, SESAME.',
   'Serves 2-3',
   'Show QR at billing counter near entrance. Pickup from kitchen window on left.',
   'NON_VEG'),

  -- O06: Deepa → COLLECTED
  ('20000000-0000-0000-0000-800000000006', 'GZ-SEED-202605-000006',
   '20000000-0000-0000-0000-120000000005',
   '20000000-0000-0000-0000-300000000001',
   '20000000-0000-0000-0000-700000000002',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O06', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O06',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 13:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 16:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:00:00')::timestamptz,
   null, null,
   24900, 0, 0, 24900, 'INR',
   'Bawarchi Biryani Palace', 'bawarchi-biryani-palace',
   'Double Mutton Night — Limited 8 Bags', 'Double Mutton Delight',
   'NON_VEG', 'EXTRA_HOT',
   'Contains WHEAT_GLUTEN. May contain DAIRY, NUTS, SESAME.',
   'Serves 2-3',
   'Show QR at billing counter near entrance. Pickup from kitchen window on left.',
   'NON_VEG'),

-- ── D03: Sattvik Veg Thali (past, 3 weeks ago) ──────────────────────────────

  -- O07: Rahul → COLLECTED
  ('20000000-0000-0000-0000-800000000007', 'GZ-SEED-202605-000007',
   '20000000-0000-0000-0000-120000000002',
   '20000000-0000-0000-0000-300000000002',
   '20000000-0000-0000-0000-700000000003',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O07', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O07',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 13:20:00')::timestamptz,
   null, null,
   9900, 0, 0, 9900, 'INR',
   'Sattvik Kitchen', 'sattvik-kitchen',
   'Friday Thali — Full Vegetarian Meal', 'Full Veg Thali Bag',
   'VEG', 'MILD',
   'Contains DAIRY, WHEAT_GLUTEN. May contain SOY.',
   'Serves 1-2',
   'Present QR to cashier at the front desk. Bag will be handed from the counter.',
   'VEG'),

  -- O08: Arjun → COLLECTED
  ('20000000-0000-0000-0000-800000000008', 'GZ-SEED-202605-000008',
   '20000000-0000-0000-0000-120000000006',
   '20000000-0000-0000-0000-300000000002',
   '20000000-0000-0000-0000-700000000003',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O08', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O08',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 14:30:00')::timestamptz,
   null, null,
   9900, 0, 0, 9900, 'INR',
   'Sattvik Kitchen', 'sattvik-kitchen',
   'Friday Thali — Full Vegetarian Meal', 'Full Veg Thali Bag',
   'VEG', 'MILD',
   'Contains DAIRY, WHEAT_GLUTEN. May contain SOY.',
   'Serves 1-2',
   'Present QR to cashier at the front desk. Bag will be handed from the counter.',
   'VEG'),

  -- O09: Priya → CANCELLED (changed mind before arriving at restaurant)
  ('20000000-0000-0000-0000-800000000009', 'GZ-SEED-202605-000009',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-300000000002',
   '20000000-0000-0000-0000-700000000003',
   'CANCELLED', 'REFUNDED',
   null, null,
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   null,
   ((now()-interval '21 days')::date || ' 12:00:00')::timestamptz,
   'Consumer requested cancellation before pickup window.',
   9900, 0, 0, 9900, 'INR',
   'Sattvik Kitchen', 'sattvik-kitchen',
   'Friday Thali — Full Vegetarian Meal', 'Full Veg Thali Bag',
   'VEG', 'MILD',
   'Contains DAIRY, WHEAT_GLUTEN. May contain SOY.',
   'Serves 1-2',
   'Present QR to cashier at the front desk. Bag will be handed from the counter.',
   'VEG'),

-- ── D04: Sattvik Jain Special (past, 1 week ago) ───────────────────────────

  -- O10: Arjun → COLLECTED
  ('20000000-0000-0000-0000-800000000010', 'GZ-SEED-202605-000010',
   '20000000-0000-0000-0000-120000000006',
   '20000000-0000-0000-0000-300000000002',
   '20000000-0000-0000-0000-700000000004',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O10', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O10',   'sha256'), 'hex'),
   ((now()-interval '7 days')::date || ' 13:00:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 16:00:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 13:45:00')::timestamptz,
   null, null,
   12900, 0, 0, 12900, 'INR',
   'Sattvik Kitchen', 'sattvik-kitchen',
   'Jain Paryushana Special — 6 Bags Only', 'Jain Special Discovery',
   'JAIN', 'MILD',
   'Contains DAIRY, WHEAT_GLUTEN. No onion/garlic/root vegetables.',
   'Serves 1-2',
   'Present QR to cashier at the front desk. Bag will be handed from the counter.',
   'JAIN'),

  -- O11: Anjali → COLLECTED
  ('20000000-0000-0000-0000-800000000011', 'GZ-SEED-202605-000011',
   '20000000-0000-0000-0000-120000000003',
   '20000000-0000-0000-0000-300000000002',
   '20000000-0000-0000-0000-700000000004',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O11', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O11',   'sha256'), 'hex'),
   ((now()-interval '7 days')::date || ' 13:00:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 16:00:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 14:20:00')::timestamptz,
   null, null,
   12900, 0, 0, 12900, 'INR',
   'Sattvik Kitchen', 'sattvik-kitchen',
   'Jain Paryushana Special — 6 Bags Only', 'Jain Special Discovery',
   'JAIN', 'MILD',
   'Contains DAIRY, WHEAT_GLUTEN. No onion/garlic/root vegetables.',
   'Serves 1-2',
   'Present QR to cashier at the front desk. Bag will be handed from the counter.',
   'JAIN'),

-- ── D05: Smoky Tandoor (past, 3 weeks ago) ──────────────────────────────────

  -- O12: Priya → COLLECTED
  ('20000000-0000-0000-0000-800000000012', 'GZ-SEED-202605-000012',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-300000000003',
   '20000000-0000-0000-0000-700000000005',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O12', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O12',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 13:10:00')::timestamptz,
   null, null,
   17900, 0, 0, 17900, 'INR',
   'The Smoky Grill', 'the-smoky-grill',
   'Saturday Tandoor Night', 'Tandoor Surprise Bag',
   'NON_VEG', 'HOT',
   'Contains WHEAT_GLUTEN, DAIRY. May contain EGGS, SESAME.',
   'Serves 1-2',
   'Scan QR at the to-go counter. Ask for BAM Bag pickup. Side door preferred.',
   'NON_VEG'),

  -- O13: Vikram → COLLECTED
  ('20000000-0000-0000-0000-800000000013', 'GZ-SEED-202605-000013',
   '20000000-0000-0000-0000-120000000004',
   '20000000-0000-0000-0000-300000000003',
   '20000000-0000-0000-0000-700000000005',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O13', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O13',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 14:50:00')::timestamptz,
   null, null,
   17900, 0, 0, 17900, 'INR',
   'The Smoky Grill', 'the-smoky-grill',
   'Saturday Tandoor Night', 'Tandoor Surprise Bag',
   'NON_VEG', 'HOT',
   'Contains WHEAT_GLUTEN, DAIRY. May contain EGGS, SESAME.',
   'Serves 1-2',
   'Scan QR at the to-go counter. Ask for BAM Bag pickup. Side door preferred.',
   'NON_VEG'),

-- ── D06: Smoky Emergency (past, 2 weeks ago) — CANCELLED / REFUNDED ─────────

  -- O14: Deepa → CANCELLED (emergency closure refund)
  ('20000000-0000-0000-0000-800000000014', 'GZ-SEED-202605-000014',
   '20000000-0000-0000-0000-120000000005',
   '20000000-0000-0000-0000-300000000003',
   '20000000-0000-0000-0000-700000000006',
   'CANCELLED', 'REFUNDED',
   null, null,
   ((now()-interval '14 days')::date || ' 13:30:00')::timestamptz,
   ((now()-interval '14 days')::date || ' 16:30:00')::timestamptz,
   null,
   ((now()-interval '14 days')::date || ' 14:05:00')::timestamptz,
   'Drop emergency closed by restaurant due to power failure. Full refund issued.',
   19900, 0, 0, 19900, 'INR',
   'The Smoky Grill', 'the-smoky-grill',
   'SPOTLIGHT: Chef''s Premium Mix', 'Smoky Spotlight Selection',
   'NON_VEG', 'MEDIUM',
   'Contains WHEAT_GLUTEN, DAIRY. May contain NUTS, EGGS, SESAME.',
   'Serves 2-3',
   'Scan QR at the to-go counter. Ask for BAM Bag pickup. Side door preferred.',
   'NON_VEG'),

  -- O15: Anjali → CANCELLED (emergency closure refund)
  ('20000000-0000-0000-0000-800000000015', 'GZ-SEED-202605-000015',
   '20000000-0000-0000-0000-120000000003',
   '20000000-0000-0000-0000-300000000003',
   '20000000-0000-0000-0000-700000000006',
   'CANCELLED', 'REFUNDED',
   null, null,
   ((now()-interval '14 days')::date || ' 13:30:00')::timestamptz,
   ((now()-interval '14 days')::date || ' 16:30:00')::timestamptz,
   null,
   ((now()-interval '14 days')::date || ' 14:05:00')::timestamptz,
   'Drop emergency closed by restaurant due to power failure. Full refund issued.',
   19900, 0, 0, 19900, 'INR',
   'The Smoky Grill', 'the-smoky-grill',
   'SPOTLIGHT: Chef''s Premium Mix', 'Smoky Spotlight Selection',
   'NON_VEG', 'MEDIUM',
   'Contains WHEAT_GLUTEN, DAIRY. May contain NUTS, EGGS, SESAME.',
   'Serves 2-3',
   'Scan QR at the to-go counter. Ask for BAM Bag pickup. Side door preferred.',
   'NON_VEG'),

-- ── D07: Andhra Meals (past, 2 weeks ago) ───────────────────────────────────

  -- O16: Karthik → COLLECTED
  ('20000000-0000-0000-0000-800000000016', 'GZ-SEED-202605-000016',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-300000000004',
   '20000000-0000-0000-0000-700000000007',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O16', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O16',   'sha256'), 'hex'),
   ((now()-interval '14 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '14 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '14 days')::date || ' 13:00:00')::timestamptz,
   null, null,
   9900, 0, 0, 9900, 'INR',
   'Andhra Spice Trail', 'andhra-spice-trail',
   'Full Andhra Meals — Friday Drop', 'Andhra Meals BAM Bag',
   'NON_VEG', 'HOT',
   'Contains DAIRY, SOY. May contain MUSTARD, SESAME.',
   'Serves 1-2',
   'Walk to the parcel counter. Show QR on your phone. No need to wait in queue.',
   'NON_VEG'),

  -- O17: Deepa → COLLECTED
  ('20000000-0000-0000-0000-800000000017', 'GZ-SEED-202605-000017',
   '20000000-0000-0000-0000-120000000005',
   '20000000-0000-0000-0000-300000000004',
   '20000000-0000-0000-0000-700000000007',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O17', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O17',   'sha256'), 'hex'),
   ((now()-interval '14 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '14 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '14 days')::date || ' 13:50:00')::timestamptz,
   null, null,
   9900, 0, 0, 9900, 'INR',
   'Andhra Spice Trail', 'andhra-spice-trail',
   'Full Andhra Meals — Friday Drop', 'Andhra Meals BAM Bag',
   'NON_VEG', 'HOT',
   'Contains DAIRY, SOY. May contain MUSTARD, SESAME.',
   'Serves 1-2',
   'Walk to the parcel counter. Show QR on your phone. No need to wait in queue.',
   'NON_VEG'),

  -- O18: Priya → COLLECTED
  ('20000000-0000-0000-0000-800000000018', 'GZ-SEED-202605-000018',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-300000000004',
   '20000000-0000-0000-0000-700000000007',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O18', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O18',   'sha256'), 'hex'),
   ((now()-interval '14 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '14 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '14 days')::date || ' 14:30:00')::timestamptz,
   null, null,
   9900, 0, 0, 9900, 'INR',
   'Andhra Spice Trail', 'andhra-spice-trail',
   'Full Andhra Meals — Friday Drop', 'Andhra Meals BAM Bag',
   'NON_VEG', 'HOT',
   'Contains DAIRY, SOY. May contain MUSTARD, SESAME.',
   'Serves 1-2',
   'Walk to the parcel counter. Show QR on your phone. No need to wait in queue.',
   'NON_VEG'),

-- ── D08: Andhra Coastal (past, 1 week ago) ──────────────────────────────────

  -- O19: Karthik → COLLECTED
  ('20000000-0000-0000-0000-800000000019', 'GZ-SEED-202605-000019',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-300000000004',
   '20000000-0000-0000-0000-700000000008',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O19', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O19',   'sha256'), 'hex'),
   ((now()-interval '7 days')::date || ' 13:00:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 16:00:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 13:30:00')::timestamptz,
   null, null,
   19900, 0, 0, 19900, 'INR',
   'Andhra Spice Trail', 'andhra-spice-trail',
   'Chef''s Coastal Delight — Only 8 Bags', 'Coastal Delight Chef''s Bag',
   'NON_VEG', 'HOT',
   'Contains FISH, SHELLFISH. May contain MUSTARD, SESAME, SOY.',
   'Serves 1-2',
   'Walk to the parcel counter. Show QR on your phone. No need to wait in queue.',
   'NON_VEG'),

  -- O20: Meera → COLLECTED
  ('20000000-0000-0000-0000-800000000020', 'GZ-SEED-202605-000020',
   '20000000-0000-0000-0000-120000000007',
   '20000000-0000-0000-0000-300000000004',
   '20000000-0000-0000-0000-700000000008',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O20', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O20',   'sha256'), 'hex'),
   ((now()-interval '7 days')::date || ' 13:00:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 16:00:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 14:45:00')::timestamptz,
   null, null,
   19900, 0, 0, 19900, 'INR',
   'Andhra Spice Trail', 'andhra-spice-trail',
   'Chef''s Coastal Delight — Only 8 Bags', 'Coastal Delight Chef''s Bag',
   'NON_VEG', 'HOT',
   'Contains FISH, SHELLFISH. May contain MUSTARD, SESAME, SOY.',
   'Serves 1-2',
   'Walk to the parcel counter. Show QR on your phone. No need to wait in queue.',
   'NON_VEG'),

-- ── D09: Sweet Artisan Bakes (past, 3 weeks ago) ─────────────────────────────

  -- O21: Rahul → COLLECTED
  ('20000000-0000-0000-0000-800000000021', 'GZ-SEED-202605-000021',
   '20000000-0000-0000-0000-120000000002',
   '20000000-0000-0000-0000-300000000005',
   '20000000-0000-0000-0000-700000000009',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O21', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O21',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 13:00:00')::timestamptz,
   null, null,
   14900, 0, 0, 14900, 'INR',
   'Sweet Bytes Bakery', 'sweet-bytes-bakery',
   'Weekend Bakes Surprise Box', 'Artisan Bakes Surprise',
   'VEG', 'MILD',
   'Contains DAIRY, EGGS, WHEAT_GLUTEN. May contain NUTS, SOY.',
   'Serves 1-2',
   'Tap on QR reader at bakery entrance. Your bag will be ready on the shelf labelled goZaika.',
   'VEG'),

  -- O22: Arjun → PICKUP_EXPIRED
  ('20000000-0000-0000-0000-800000000022', 'GZ-SEED-202605-000022',
   '20000000-0000-0000-0000-120000000006',
   '20000000-0000-0000-0000-300000000005',
   '20000000-0000-0000-0000-700000000009',
   'PICKUP_EXPIRED', 'REFUNDED',
   encode(extensions.digest('nonce:O22', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O22',   'sha256'), 'hex'),
   ((now()-interval '21 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   null,
   ((now()-interval '21 days')::date || ' 15:30:00')::timestamptz,
   'Pickup window expired. Consumer did not arrive within the allowed window.',
   14900, 0, 0, 14900, 'INR',
   'Sweet Bytes Bakery', 'sweet-bytes-bakery',
   'Weekend Bakes Surprise Box', 'Artisan Bakes Surprise',
   'VEG', 'MILD',
   'Contains DAIRY, EGGS, WHEAT_GLUTEN. May contain NUTS, SOY.',
   'Serves 1-2',
   'Tap on QR reader at bakery entrance. Your bag will be ready on the shelf labelled goZaika.',
   'VEG'),

-- ── D10: Sweet Dessert Dreams (past, 1 week ago) ─────────────────────────────

  -- O23: Meera → COLLECTED
  ('20000000-0000-0000-0000-800000000023', 'GZ-SEED-202605-000023',
   '20000000-0000-0000-0000-120000000007',
   '20000000-0000-0000-0000-300000000005',
   '20000000-0000-0000-0000-700000000010',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O23', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O23',   'sha256'), 'hex'),
   ((now()-interval '7 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 13:15:00')::timestamptz,
   null, null,
   11900, 0, 0, 11900, 'INR',
   'Sweet Bytes Bakery', 'sweet-bytes-bakery',
   'Friday Dessert Dreams — 12 Bags', 'Dessert Dreams Bag',
   'VEG', 'MILD',
   'Contains DAIRY, EGGS, WHEAT_GLUTEN. May contain NUTS, SOY.',
   'Serves 1-2',
   'Tap on QR reader at bakery entrance. Your bag will be ready on the shelf labelled goZaika.',
   'VEG'),

  -- O24: Karthik → COLLECTED
  ('20000000-0000-0000-0000-800000000024', 'GZ-SEED-202605-000024',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-300000000005',
   '20000000-0000-0000-0000-700000000010',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O24', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O24',   'sha256'), 'hex'),
   ((now()-interval '7 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 14:00:00')::timestamptz,
   null, null,
   11900, 0, 0, 11900, 'INR',
   'Sweet Bytes Bakery', 'sweet-bytes-bakery',
   'Friday Dessert Dreams — 12 Bags', 'Dessert Dreams Bag',
   'VEG', 'MILD',
   'Contains DAIRY, EGGS, WHEAT_GLUTEN. May contain NUTS, SOY.',
   'Serves 1-2',
   'Tap on QR reader at bakery entrance. Your bag will be ready on the shelf labelled goZaika.',
   'VEG'),

  -- O25: Anjali → COLLECTED
  ('20000000-0000-0000-0000-800000000025', 'GZ-SEED-202605-000025',
   '20000000-0000-0000-0000-120000000003',
   '20000000-0000-0000-0000-300000000005',
   '20000000-0000-0000-0000-700000000010',
   'COLLECTED', 'CAPTURED',
   encode(extensions.digest('nonce:O25', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O25',   'sha256'), 'hex'),
   ((now()-interval '7 days')::date || ' 12:30:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 15:30:00')::timestamptz,
   ((now()-interval '7 days')::date || ' 14:50:00')::timestamptz,
   null, null,
   11900, 0, 0, 11900, 'INR',
   'Sweet Bytes Bakery', 'sweet-bytes-bakery',
   'Friday Dessert Dreams — 12 Bags', 'Dessert Dreams Bag',
   'VEG', 'MILD',
   'Contains DAIRY, EGGS, WHEAT_GLUTEN. May contain NUTS, SOY.',
   'Serves 1-2',
   'Tap on QR reader at bakery entrance. Your bag will be ready on the shelf labelled goZaika.',
   'VEG'),

-- ── Today's active/confirmed orders (D11, D12, D13) ─────────────────────────

  -- O26: Priya → CONFIRMED on D11 (Bawarchi today)
  ('20000000-0000-0000-0000-800000000026', 'GZ-SEED-202605-000026',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-300000000001',
   '20000000-0000-0000-0000-700000000011',
   'CONFIRMED', 'CAPTURED',
   encode(extensions.digest('nonce:O26', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O26',   'sha256'), 'hex'),
   (current_date || ' 12:30:00')::timestamptz,
   (current_date || ' 15:30:00')::timestamptz,
   null, null, null,
   14900, 0, 0, 14900, 'INR',
   'Bawarchi Biryani Palace', 'bawarchi-biryani-palace',
   'Today''s Biryani BAM Bag — 12 Bags', 'Hyderabadi Biryani BAM Bag',
   'NON_VEG', 'HOT',
   'Contains WHEAT_GLUTEN, DAIRY. May contain NUTS.',
   'Serves 1-2',
   'Show QR at billing counter near entrance. Pickup from kitchen window on left.',
   'NON_VEG'),

  -- O27: Rahul → CONFIRMED on D12 (Sattvik today)
  ('20000000-0000-0000-0000-800000000027', 'GZ-SEED-202605-000027',
   '20000000-0000-0000-0000-120000000002',
   '20000000-0000-0000-0000-300000000002',
   '20000000-0000-0000-0000-700000000012',
   'CONFIRMED', 'CAPTURED',
   encode(extensions.digest('nonce:O27', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O27',   'sha256'), 'hex'),
   (current_date || ' 12:30:00')::timestamptz,
   (current_date || ' 15:30:00')::timestamptz,
   null, null, null,
   9900, 0, 0, 9900, 'INR',
   'Sattvik Kitchen', 'sattvik-kitchen',
   'Evening Veg Thali — 15 Bags Ready', 'Full Veg Thali Bag',
   'VEG', 'MILD',
   'Contains DAIRY, WHEAT_GLUTEN. May contain SOY.',
   'Serves 1-2',
   'Present QR to cashier at the front desk. Bag will be handed from the counter.',
   'VEG'),

  -- O28: Karthik → CONFIRMED on D13 (Smoky Spotlight today)
  ('20000000-0000-0000-0000-800000000028', 'GZ-SEED-202605-000028',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-300000000003',
   '20000000-0000-0000-0000-700000000013',
   'CONFIRMED', 'CAPTURED',
   encode(extensions.digest('nonce:O28', 'sha256'), 'hex'),
   encode(extensions.digest('otp:O28',   'sha256'), 'hex'),
   (current_date || ' 12:30:00')::timestamptz,
   (current_date || ' 15:30:00')::timestamptz,
   null, null, null,
   19900, 0, 0, 19900, 'INR',
   'The Smoky Grill', 'the-smoky-grill',
   'SPOTLIGHT: Chef''s Saturday Pick', 'Smoky Spotlight Selection',
   'NON_VEG', 'MEDIUM',
   'Contains WHEAT_GLUTEN, DAIRY. May contain NUTS, EGGS, SESAME.',
   'Serves 2-3',
   'Scan QR at the to-go counter. Ask for BAM Bag pickup. Side door preferred.',
   'NON_VEG')

on conflict do nothing;

-- =============================================================================
-- SECTION 28 — Order items (1 per order, launch model)
-- =============================================================================

insert into order_item
  (order_fk, drop_fk, catalog_bag_template_revision_fk,
   quantity, unit_price_paise, line_total_paise,
   snapshot_bag_display_name, snapshot_dietary_category_code,
   snapshot_allergen_summary_text)
select
  o.order_order_pk,
  o.drop_fk,
  d.catalog_bag_template_revision_fk,
  1,
  o.subtotal_paise,
  o.subtotal_paise,
  o.snapshot_bag_display_name,
  o.snapshot_dietary_category_code,
  o.snapshot_allergen_summary_text
from order_order o
join drop_drop d on d.drop_drop_pk = o.drop_fk
where o.order_order_pk in (
  '20000000-0000-0000-0000-800000000001',
  '20000000-0000-0000-0000-800000000002',
  '20000000-0000-0000-0000-800000000003',
  '20000000-0000-0000-0000-800000000004',
  '20000000-0000-0000-0000-800000000005',
  '20000000-0000-0000-0000-800000000006',
  '20000000-0000-0000-0000-800000000007',
  '20000000-0000-0000-0000-800000000008',
  '20000000-0000-0000-0000-800000000009',
  '20000000-0000-0000-0000-800000000010',
  '20000000-0000-0000-0000-800000000011',
  '20000000-0000-0000-0000-800000000012',
  '20000000-0000-0000-0000-800000000013',
  '20000000-0000-0000-0000-800000000014',
  '20000000-0000-0000-0000-800000000015',
  '20000000-0000-0000-0000-800000000016',
  '20000000-0000-0000-0000-800000000017',
  '20000000-0000-0000-0000-800000000018',
  '20000000-0000-0000-0000-800000000019',
  '20000000-0000-0000-0000-800000000020',
  '20000000-0000-0000-0000-800000000021',
  '20000000-0000-0000-0000-800000000022',
  '20000000-0000-0000-0000-800000000023',
  '20000000-0000-0000-0000-800000000024',
  '20000000-0000-0000-0000-800000000025',
  '20000000-0000-0000-0000-800000000026',
  '20000000-0000-0000-0000-800000000027',
  '20000000-0000-0000-0000-800000000028'
)
on conflict do nothing;

-- =============================================================================
-- SECTION 29 — Order status transitions (append-only audit trail)
-- =============================================================================
-- Collected orders: CREATED → PAID → CONFIRMED → COLLECTED
-- Cancelled orders: CREATED → PAID → CONFIRMED → CANCELLED
-- Pickup expired:   CREATED → PAID → CONFIRMED → PICKUP_EXPIRED
-- Active/confirmed: CREATED → PAID → CONFIRMED

do $$
declare
  v_order record;
  v_base_ts timestamptz;
begin
  for v_order in
    select order_order_pk, order_status_code,
           pickup_window_start_at, pickup_window_end_at,
           collected_at, cancelled_at, created_at
    from order_order
    where order_order_pk::text like '20000000-0000-0000-0000-8%'
  loop
    v_base_ts := v_order.pickup_window_start_at - interval '30 minutes';

    -- CREATED transition
    insert into order_status_transition
      (order_fk, from_status_code, to_status_code,
       transition_reason_code, recorded_at, metadata_json)
    values
      (v_order.order_order_pk, null, 'CREATED',
       'HOLD_CONVERTED', v_base_ts - interval '25 minutes', '{}')
    on conflict do nothing;

    -- PAID transition
    insert into order_status_transition
      (order_fk, from_status_code, to_status_code,
       transition_reason_code, recorded_at, metadata_json)
    values
      (v_order.order_order_pk, 'CREATED', 'PAID',
       'PAYMENT_CAPTURED', v_base_ts - interval '24 minutes', '{}')
    on conflict do nothing;

    -- CONFIRMED transition
    insert into order_status_transition
      (order_fk, from_status_code, to_status_code,
       transition_reason_code, recorded_at, metadata_json)
    values
      (v_order.order_order_pk, 'PAID', 'CONFIRMED',
       'PAYMENT_CAPTURED', v_base_ts - interval '23 minutes', '{}')
    on conflict do nothing;

    -- Terminal transition for completed orders
    case v_order.order_status_code
      when 'COLLECTED' then
        insert into order_status_transition
          (order_fk, from_status_code, to_status_code,
           transition_reason_code, recorded_at, metadata_json)
        values
          (v_order.order_order_pk, 'CONFIRMED', 'COLLECTED',
           'STAFF_QR_VERIFIED', v_order.collected_at, '{"method":"QR_SCAN"}')
        on conflict do nothing;

      when 'CANCELLED' then
        insert into order_status_transition
          (order_fk, from_status_code, to_status_code,
           transition_reason_code, recorded_at, metadata_json)
        values
          (v_order.order_order_pk, 'CONFIRMED', 'CANCELLED',
           'EMERGENCY_CLOSED', v_order.cancelled_at, '{}')
        on conflict do nothing;

      when 'PICKUP_EXPIRED' then
        insert into order_status_transition
          (order_fk, from_status_code, to_status_code,
           transition_reason_code, recorded_at, metadata_json)
        values
          (v_order.order_order_pk, 'CONFIRMED', 'PICKUP_EXPIRED',
           'PICKUP_WINDOW_EXPIRED', v_order.pickup_window_end_at, '{}')
        on conflict do nothing;

      else null; -- CONFIRMED stays as-is for today's active orders
    end case;
  end loop;
end; $$;

-- =============================================================================
-- SECTION 30 — Pickup verification events (for COLLECTED orders)
-- =============================================================================

insert into order_pickup_verification_event
  (order_fk, restaurant_fk,
   verification_method_code, verification_result_code,
   recorded_at, idempotency_key)
select
  o.order_order_pk,
  o.restaurant_fk,
  'QR_SCAN',
  'SUCCESS',
  o.collected_at,
  'pve_' || substr(o.order_order_pk::text, 25, 12)
from order_order o
where o.order_status_code = 'COLLECTED'
  and o.order_order_pk::text like '20000000-0000-0000-0000-8%'
on conflict do nothing;

-- =============================================================================
-- SECTION 31 — Active inventory holds (3 consumers mid-checkout on today's drops)
-- =============================================================================
-- H01: Arjun holding on D12 (Sattvik today), expires soon
-- H02: Deepa holding on D13 (Smoky Spotlight today), expires soon
-- H03: Vikram holding on D14 (Andhra Coastal today), expires in 4 minutes


insert into drop_inventory_hold
  (drop_inventory_hold_pk, drop_fk, consumer_profile_fk,
   hold_status_code, quantity,
   idempotency_key, expires_at)
values
  ('20000000-0000-0000-0000-900000000001',
   '20000000-0000-0000-0000-700000000012',
   '20000000-0000-0000-0000-120000000006',
   'ACTIVE', 1,
   'hold_D12_Arjun', now() + interval '8 minutes'),

  ('20000000-0000-0000-0000-900000000002',
   '20000000-0000-0000-0000-700000000013',
   '20000000-0000-0000-0000-120000000005',
   'ACTIVE', 1,
   'hold_D13_Deepa', now() + interval '12 minutes'),

  ('20000000-0000-0000-0000-900000000003',
   '20000000-0000-0000-0000-700000000014',
   '20000000-0000-0000-0000-120000000004',
   'ACTIVE', 1,
   'hold_D14_Vikram', now() + interval '4 minutes')
on conflict (drop_inventory_hold_pk) do nothing;

-- Converted holds for today's confirmed orders (D11, D12, D13)
-- These link the confirmed orders back to their original holds
insert into drop_inventory_hold
  (drop_inventory_hold_pk, drop_fk, consumer_profile_fk,
   hold_status_code, quantity,
   idempotency_key, expires_at,
   converted_order_fk)
values
  ('20000000-0000-0000-0000-900000000004',
   '20000000-0000-0000-0000-700000000011',
   '20000000-0000-0000-0000-120000000001',
   'CONVERTED', 1,
   'hold_D11_Priya', now() - interval '20 minutes',
   '20000000-0000-0000-0000-800000000026'),

  ('20000000-0000-0000-0000-900000000005',
   '20000000-0000-0000-0000-700000000012',
   '20000000-0000-0000-0000-120000000002',
   'CONVERTED', 1,
   'hold_D12_Rahul', now() - interval '18 minutes',
   '20000000-0000-0000-0000-800000000027'),

  ('20000000-0000-0000-0000-900000000006',
   '20000000-0000-0000-0000-700000000013',
   '20000000-0000-0000-0000-120000000008',
   'CONVERTED', 1,
   'hold_D13_Karthik', now() - interval '15 minutes',
   '20000000-0000-0000-0000-800000000028')
on conflict (drop_inventory_hold_pk) do nothing;

-- =============================================================================
-- SECTION 32 — Reviews (12 reviews, mix of moderation states)
-- =============================================================================
-- categories JSONB (slice9): food_quality, value_for_price, pickup_experience, packaging (1-5)
-- uq_review_order: one review per order

insert into review_review
  (review_review_pk, order_fk, consumer_profile_fk, restaurant_fk,
   rating_value, review_text, is_public, moderation_status_code,
   categories, created_at, updated_at)
values

  -- R01: Priya on O01 (Bawarchi Biryani) — 4 stars, APPROVED
  ('20000000-0000-0000-0000-c00000000001',
   '20000000-0000-0000-0000-800000000001',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-300000000001',
   4,
   'The biryani was aromatic and properly spiced. Packaging was sealed well. Would have liked slightly more raita. Overall a great BAM Bag.',
   true, 'APPROVED',
   '{"food_quality":4,"value_for_price":5,"pickup_experience":4,"packaging":4}'::jsonb,
   (now()-interval '21 days') + interval '6 hours',
   (now()-interval '21 days') + interval '6 hours'),

  -- R02: Deepa on O06 (Bawarchi Mutton) — 5 stars, APPROVED
  ('20000000-0000-0000-0000-c00000000002',
   '20000000-0000-0000-0000-800000000006',
   '20000000-0000-0000-0000-120000000005',
   '20000000-0000-0000-0000-300000000001',
   5,
   'Best mutton I''ve had from any BAM Bag. Two different preparations — biryani and a seekh curry. Both were incredible. The surprise was absolutely worth it.',
   true, 'APPROVED',
   '{"food_quality":5,"value_for_price":5,"pickup_experience":5,"packaging":5}'::jsonb,
   (now()-interval '21 days') + interval '8 hours',
   (now()-interval '20 days')),

  -- R03: Rahul on O07 (Sattvik Veg Thali) — 5 stars, APPROVED
  ('20000000-0000-0000-0000-c00000000003',
   '20000000-0000-0000-0000-800000000007',
   '20000000-0000-0000-0000-120000000002',
   '20000000-0000-0000-0000-300000000002',
   5,
   'Everything was freshly made. The dal was perfectly seasoned and the sabzi had real depth. Great value. Sattvik is my go-to for VEG bags.',
   true, 'APPROVED',
   '{"food_quality":5,"value_for_price":5,"pickup_experience":5,"packaging":4}'::jsonb,
   (now()-interval '21 days') + interval '5 hours',
   (now()-interval '21 days') + interval '5 hours'),

  -- R04: Arjun on O08 (Sattvik Veg Thali) — 4 stars, APPROVED
  ('20000000-0000-0000-0000-c00000000004',
   '20000000-0000-0000-0000-800000000008',
   '20000000-0000-0000-0000-120000000006',
   '20000000-0000-0000-0000-300000000002',
   4,
   'Good thali, very filling. One of the sabzis was a bit too oily but flavours were authentic. Pickup was smooth and the staff knew exactly what the goZaika bag was.',
   true, 'APPROVED',
   '{"food_quality":4,"value_for_price":4,"pickup_experience":5,"packaging":4}'::jsonb,
   (now()-interval '21 days') + interval '7 hours',
   (now()-interval '21 days') + interval '7 hours'),

  -- R05: Arjun on O10 (Sattvik Jain Special) — 5 stars, APPROVED
  ('20000000-0000-0000-0000-c00000000005',
   '20000000-0000-0000-0000-800000000010',
   '20000000-0000-0000-0000-120000000006',
   '20000000-0000-0000-0000-300000000002',
   5,
   'Genuinely impressed. This is actual Jain preparation — no root vegetables, no garlic, no onion. The arhar dal was outstanding. Will order every time they release a Jain bag.',
   true, 'APPROVED',
   '{"food_quality":5,"value_for_price":5,"pickup_experience":5,"packaging":5}'::jsonb,
   (now()-interval '7 days') + interval '5 hours',
   (now()-interval '7 days') + interval '5 hours'),

  -- R06: Priya on O12 (Smoky Tandoor) — 4 stars, PENDING (under moderation)
  ('20000000-0000-0000-0000-c00000000006',
   '20000000-0000-0000-0000-800000000012',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-300000000003',
   4,
   'Kebabs were smoky and well-charred. The naan was a bit cold by the time I got home. The bag had a chicken tikka and a seekh. Both were honestly excellent.',
   true, 'PENDING',
   '{"food_quality":4,"value_for_price":4,"pickup_experience":4,"packaging":3}'::jsonb,
   (now()-interval '21 days') + interval '4 hours',
   (now()-interval '21 days') + interval '4 hours'),

  -- R07: Karthik on O16 (Andhra Meals) — 5 stars, APPROVED
  ('20000000-0000-0000-0000-c00000000007',
   '20000000-0000-0000-0000-800000000016',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-300000000004',
   5,
   'I''ve eaten at Andhra Spice Trail many times. This BAM Bag is exactly what regulars order. The rasam was piping hot and the rice was fresh. Exceptional for the price.',
   true, 'APPROVED',
   '{"food_quality":5,"value_for_price":5,"pickup_experience":5,"packaging":4}'::jsonb,
   (now()-interval '14 days') + interval '5 hours',
   (now()-interval '14 days') + interval '5 hours'),

  -- R08: Deepa on O17 (Andhra Meals) — 4 stars, PENDING
  ('20000000-0000-0000-0000-c00000000008',
   '20000000-0000-0000-0000-800000000017',
   '20000000-0000-0000-0000-120000000005',
   '20000000-0000-0000-0000-300000000004',
   4,
   'Really solid Andhra meal. Authentic spice profile. The gongura chutney was outstanding. Only minor issue: one container had a small leak. But the food more than made up for it.',
   true, 'PENDING',
   '{"food_quality":5,"value_for_price":5,"pickup_experience":4,"packaging":3}'::jsonb,
   (now()-interval '14 days') + interval '6 hours',
   (now()-interval '14 days') + interval '6 hours'),

  -- R09: Priya on O18 (Andhra Meals) — 3 stars, APPROVED (honest mixed review)
  ('20000000-0000-0000-0000-c00000000009',
   '20000000-0000-0000-0000-800000000018',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-300000000004',
   3,
   'The dal and rice were good. But the chicken curry was very oily and the spice level was more than what the bag claimed. Packaging was a bit basic. Not bad, but not a repeat for me.',
   true, 'APPROVED',
   '{"food_quality":3,"value_for_price":3,"pickup_experience":4,"packaging":2}'::jsonb,
   (now()-interval '14 days') + interval '7 hours',
   (now()-interval '14 days') + interval '7 hours'),

  -- R10: Rahul on O21 (Sweet Artisan Bakes) — 5 stars, APPROVED
  ('20000000-0000-0000-0000-c00000000010',
   '20000000-0000-0000-0000-800000000021',
   '20000000-0000-0000-0000-120000000002',
   '20000000-0000-0000-0000-300000000005',
   5,
   'The BLIND_ADVENTURE box was genuinely exciting. Got a croissant, two strawberry tarts and a slice of opera cake. Everything was bakery-fresh. The croissant was perfectly laminated.',
   true, 'APPROVED',
   '{"food_quality":5,"value_for_price":5,"pickup_experience":5,"packaging":5}'::jsonb,
   (now()-interval '21 days') + interval '4 hours',
   (now()-interval '21 days') + interval '4 hours'),

  -- R11: Meera on O23 (Sweet Desserts) — 4 stars, APPROVED
  ('20000000-0000-0000-0000-c00000000011',
   '20000000-0000-0000-0000-800000000023',
   '20000000-0000-0000-0000-120000000007',
   '20000000-0000-0000-0000-300000000005',
   4,
   'Loved the mousse and petit fours. One macaron was slightly stale but everything else was excellent. Great value for artisan bakes. Will try the blind adventure box next time.',
   true, 'APPROVED',
   '{"food_quality":4,"value_for_price":5,"pickup_experience":4,"packaging":4}'::jsonb,
   (now()-interval '7 days') + interval '5 hours',
   (now()-interval '7 days') + interval '5 hours'),

  -- R12: Karthik on O24 (Sweet Desserts) — 2 stars, REJECTED (inappropriate content)
  ('20000000-0000-0000-0000-c00000000012',
   '20000000-0000-0000-0000-800000000024',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-300000000005',
   2,
   'Overrated. The macaron tasted of nothing. Will not return.',
   true, 'REJECTED',
   null,
   (now()-interval '7 days') + interval '3 hours',
   (now()-interval '6 days'))

on conflict (order_fk) do nothing;

commit;
