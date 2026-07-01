-- =============================================================================
-- goZaika Demo Seed — Part 4: Payment Data, Finance, Utility Functions
-- Run AFTER Parts 1, 2, and 3.  Requires postgres / service_role.
-- =============================================================================
-- Sections:
--   33  dev_demo_seed_registry — register all static seed entities
--   34  Historical sample holds — for 3 representative COLLECTED orders
--   35  Payment intents + transactions — 3 historical + 3 CONFIRMED today
--   36  Finance settlement run — Bawarchi Biryani Palace, past 3-week period
--   37  Finance payout entries — line-level ledger for settlement run
--   38  demo_create_live_drops() — generate a fresh random set of ACTIVE drops
--   39  demo_cleanup_data()     — parameterised cleanup with date-range + dry-run
-- =============================================================================

begin;

-- =============================================================================
-- SECTION 33 — dev_demo_seed_registry
-- Registers top-level static entities.  Child rows are reached via FK cascade
-- or explicit lookups in demo_cleanup_data().
-- =============================================================================

insert into dev_demo_seed_registry (seed_key, entity_table, entity_id, slice)
values
  -- Consumer auth.users
  ('demo_auth_con_01','auth.users','20000000-0000-0000-0000-100000000001','demo_seed_part1'),
  ('demo_auth_con_02','auth.users','20000000-0000-0000-0000-100000000002','demo_seed_part1'),
  ('demo_auth_con_03','auth.users','20000000-0000-0000-0000-100000000003','demo_seed_part1'),
  ('demo_auth_con_04','auth.users','20000000-0000-0000-0000-100000000004','demo_seed_part1'),
  ('demo_auth_con_05','auth.users','20000000-0000-0000-0000-100000000005','demo_seed_part1'),
  ('demo_auth_con_06','auth.users','20000000-0000-0000-0000-100000000006','demo_seed_part1'),
  ('demo_auth_con_07','auth.users','20000000-0000-0000-0000-100000000007','demo_seed_part1'),
  ('demo_auth_con_08','auth.users','20000000-0000-0000-0000-100000000008','demo_seed_part1'),
  -- Restaurant auth.users
  ('demo_auth_rst_01','auth.users','20000000-0000-0000-0000-200000000001','demo_seed_part1'),
  ('demo_auth_rst_02','auth.users','20000000-0000-0000-0000-200000000002','demo_seed_part1'),
  ('demo_auth_rst_03','auth.users','20000000-0000-0000-0000-200000000003','demo_seed_part1'),
  ('demo_auth_rst_04','auth.users','20000000-0000-0000-0000-200000000004','demo_seed_part1'),
  ('demo_auth_rst_05','auth.users','20000000-0000-0000-0000-200000000005','demo_seed_part1'),
  -- iam_profiles — consumers
  ('demo_iam_con_01','iam_profile','20000000-0000-0000-0000-110000000001','demo_seed_part1'),
  ('demo_iam_con_02','iam_profile','20000000-0000-0000-0000-110000000002','demo_seed_part1'),
  ('demo_iam_con_03','iam_profile','20000000-0000-0000-0000-110000000003','demo_seed_part1'),
  ('demo_iam_con_04','iam_profile','20000000-0000-0000-0000-110000000004','demo_seed_part1'),
  ('demo_iam_con_05','iam_profile','20000000-0000-0000-0000-110000000005','demo_seed_part1'),
  ('demo_iam_con_06','iam_profile','20000000-0000-0000-0000-110000000006','demo_seed_part1'),
  ('demo_iam_con_07','iam_profile','20000000-0000-0000-0000-110000000007','demo_seed_part1'),
  ('demo_iam_con_08','iam_profile','20000000-0000-0000-0000-110000000008','demo_seed_part1'),
  -- iam_profiles — restaurants
  ('demo_iam_rst_01','iam_profile','20000000-0000-0000-0000-210000000001','demo_seed_part1'),
  ('demo_iam_rst_02','iam_profile','20000000-0000-0000-0000-210000000002','demo_seed_part1'),
  ('demo_iam_rst_03','iam_profile','20000000-0000-0000-0000-210000000003','demo_seed_part1'),
  ('demo_iam_rst_04','iam_profile','20000000-0000-0000-0000-210000000004','demo_seed_part1'),
  ('demo_iam_rst_05','iam_profile','20000000-0000-0000-0000-210000000005','demo_seed_part1'),
  -- Restaurants
  ('demo_restaurant_01','restaurant_restaurant','20000000-0000-0000-0000-300000000001','demo_seed_part1'),
  ('demo_restaurant_02','restaurant_restaurant','20000000-0000-0000-0000-300000000002','demo_seed_part1'),
  ('demo_restaurant_03','restaurant_restaurant','20000000-0000-0000-0000-300000000003','demo_seed_part1'),
  ('demo_restaurant_04','restaurant_restaurant','20000000-0000-0000-0000-300000000004','demo_seed_part1'),
  ('demo_restaurant_05','restaurant_restaurant','20000000-0000-0000-0000-300000000005','demo_seed_part1'),
  -- Geo addresses
  ('demo_geo_addr_01','geo_address','20000000-0000-0000-0000-400000000001','demo_seed_part1'),
  ('demo_geo_addr_02','geo_address','20000000-0000-0000-0000-400000000002','demo_seed_part1'),
  ('demo_geo_addr_03','geo_address','20000000-0000-0000-0000-400000000003','demo_seed_part1'),
  ('demo_geo_addr_04','geo_address','20000000-0000-0000-0000-400000000004','demo_seed_part1'),
  ('demo_geo_addr_05','geo_address','20000000-0000-0000-0000-400000000005','demo_seed_part1'),
  -- Bag templates
  ('demo_template_01','catalog_bag_template','20000000-0000-0000-0000-500000000001','demo_seed_part2'),
  ('demo_template_02','catalog_bag_template','20000000-0000-0000-0000-500000000002','demo_seed_part2'),
  ('demo_template_03','catalog_bag_template','20000000-0000-0000-0000-500000000003','demo_seed_part2'),
  ('demo_template_04','catalog_bag_template','20000000-0000-0000-0000-500000000004','demo_seed_part2'),
  ('demo_template_05','catalog_bag_template','20000000-0000-0000-0000-500000000005','demo_seed_part2'),
  ('demo_template_06','catalog_bag_template','20000000-0000-0000-0000-500000000006','demo_seed_part2'),
  ('demo_template_07','catalog_bag_template','20000000-0000-0000-0000-500000000007','demo_seed_part2'),
  ('demo_template_08','catalog_bag_template','20000000-0000-0000-0000-500000000008','demo_seed_part2'),
  ('demo_template_09','catalog_bag_template','20000000-0000-0000-0000-500000000009','demo_seed_part2'),
  ('demo_template_10','catalog_bag_template','20000000-0000-0000-0000-500000000010','demo_seed_part2'),
  -- Drops — past
  ('demo_drop_d01','drop_drop','20000000-0000-0000-0000-700000000001','demo_seed_part2'),
  ('demo_drop_d02','drop_drop','20000000-0000-0000-0000-700000000002','demo_seed_part2'),
  ('demo_drop_d03','drop_drop','20000000-0000-0000-0000-700000000003','demo_seed_part2'),
  ('demo_drop_d04','drop_drop','20000000-0000-0000-0000-700000000004','demo_seed_part2'),
  ('demo_drop_d05','drop_drop','20000000-0000-0000-0000-700000000005','demo_seed_part2'),
  ('demo_drop_d06','drop_drop','20000000-0000-0000-0000-700000000006','demo_seed_part2'),
  ('demo_drop_d07','drop_drop','20000000-0000-0000-0000-700000000007','demo_seed_part2'),
  ('demo_drop_d08','drop_drop','20000000-0000-0000-0000-700000000008','demo_seed_part2'),
  ('demo_drop_d09','drop_drop','20000000-0000-0000-0000-700000000009','demo_seed_part2'),
  ('demo_drop_d10','drop_drop','20000000-0000-0000-0000-700000000010','demo_seed_part2'),
  -- Drops — today active + future
  ('demo_drop_d11','drop_drop','20000000-0000-0000-0000-700000000011','demo_seed_part2'),
  ('demo_drop_d12','drop_drop','20000000-0000-0000-0000-700000000012','demo_seed_part2'),
  ('demo_drop_d13','drop_drop','20000000-0000-0000-0000-700000000013','demo_seed_part2'),
  ('demo_drop_d14','drop_drop','20000000-0000-0000-0000-700000000014','demo_seed_part2'),
  ('demo_drop_d15','drop_drop','20000000-0000-0000-0000-700000000015','demo_seed_part2'),
  ('demo_drop_d16','drop_drop','20000000-0000-0000-0000-700000000016','demo_seed_part2'),
  ('demo_drop_d17','drop_drop','20000000-0000-0000-0000-700000000017','demo_seed_part2')
on conflict (seed_key) do nothing;

-- =============================================================================
-- SECTION 34 — Historical sample holds
-- Three CONVERTED holds backing representative COLLECTED orders.
-- Needed so Section 35 payment_order_intents satisfy the NOT NULL FK constraint.
-- =============================================================================
-- H07: Priya  → D01 (Bawarchi Biryani, 3 weeks ago) → O01
-- H08: Rahul  → D03 (Sattvik Veg Thali, 3 weeks ago) → O07
-- H09: Karthik → D07 (Andhra Meals, 2 weeks ago) → O16


insert into drop_inventory_hold
  (drop_inventory_hold_pk, drop_fk, consumer_profile_fk,
   hold_status_code, quantity, idempotency_key,
   expires_at, converted_order_fk)
values
  ('20000000-0000-0000-0000-900000000007',
   '20000000-0000-0000-0000-700000000001',
   '20000000-0000-0000-0000-120000000001',
   'CONVERTED', 1, 'hist_D01_Priya_O01',
   now() - interval '21 days' + interval '60 minutes',
   '20000000-0000-0000-0000-800000000001'),

  ('20000000-0000-0000-0000-900000000008',
   '20000000-0000-0000-0000-700000000003',
   '20000000-0000-0000-0000-120000000002',
   'CONVERTED', 1, 'hist_D03_Rahul_O07',
   now() - interval '21 days' + interval '60 minutes',
   '20000000-0000-0000-0000-800000000007'),

  ('20000000-0000-0000-0000-900000000009',
   '20000000-0000-0000-0000-700000000007',
   '20000000-0000-0000-0000-120000000008',
   'CONVERTED', 1, 'hist_D07_Karthik_O16',
   now() - interval '14 days' + interval '60 minutes',
   '20000000-0000-0000-0000-800000000016')
on conflict (drop_inventory_hold_pk) do nothing;

-- Back-link the three historical orders to their holds
update order_order
set drop_inventory_hold_fk = '20000000-0000-0000-0000-900000000007'
where order_order_pk = '20000000-0000-0000-0000-800000000001'
  and drop_inventory_hold_fk is null;

update order_order
set drop_inventory_hold_fk = '20000000-0000-0000-0000-900000000008'
where order_order_pk = '20000000-0000-0000-0000-800000000007'
  and drop_inventory_hold_fk is null;

update order_order
set drop_inventory_hold_fk = '20000000-0000-0000-0000-900000000009'
where order_order_pk = '20000000-0000-0000-0000-800000000016'
  and drop_inventory_hold_fk is null;

-- Back-link the three CONFIRMED orders (O26/O27/O28) to their holds (H04/H05/H06)
update order_order
set drop_inventory_hold_fk = '20000000-0000-0000-0000-900000000004'
where order_order_pk = '20000000-0000-0000-0000-800000000026'
  and drop_inventory_hold_fk is null;

update order_order
set drop_inventory_hold_fk = '20000000-0000-0000-0000-900000000005'
where order_order_pk = '20000000-0000-0000-0000-800000000027'
  and drop_inventory_hold_fk is null;

update order_order
set drop_inventory_hold_fk = '20000000-0000-0000-0000-900000000006'
where order_order_pk = '20000000-0000-0000-0000-800000000028'
  and drop_inventory_hold_fk is null;

-- =============================================================================
-- SECTION 35 — Payment intents + transactions
-- I01-I03: historical sample orders (O01, O07, O16)
-- I04-I06: today's CONFIRMED orders (O26, O27, O28)
-- provider_order_ref format: 'order_GZ_DEMO_XXX' (Razorpay-style placeholder)
-- provider_payment_ref format: 'pay_GZ_DEMO_XXX'
-- =============================================================================

-- Idempotency guard: delete stale payment transactions before intents
-- (transactions FK → intents; must delete child first to avoid restriction)
delete from payment_transaction
where provider_payment_ref in (
  'pay_GZ_DEMO_001','pay_GZ_DEMO_002','pay_GZ_DEMO_003',
  'pay_GZ_DEMO_004','pay_GZ_DEMO_005','pay_GZ_DEMO_006'
) and payment_transaction_pk not in (
  '20000000-0000-0000-0000-b00000000001','20000000-0000-0000-0000-b00000000002',
  '20000000-0000-0000-0000-b00000000003','20000000-0000-0000-0000-b00000000004',
  '20000000-0000-0000-0000-b00000000005','20000000-0000-0000-0000-b00000000006'
);

delete from payment_order_intent
where idempotency_key in (
  'idem_I01_O01','idem_I02_O07','idem_I03_O16',
  'idem_I04_O26','idem_I05_O27','idem_I06_O28'
) and payment_order_intent_pk not in (
  '20000000-0000-0000-0000-a00000000001','20000000-0000-0000-0000-a00000000002',
  '20000000-0000-0000-0000-a00000000003','20000000-0000-0000-0000-a00000000004',
  '20000000-0000-0000-0000-a00000000005','20000000-0000-0000-0000-a00000000006'
);

insert into payment_order_intent
  (payment_order_intent_pk,
   drop_inventory_hold_fk, consumer_profile_fk, order_fk,
   provider_code, provider_order_ref,
   payment_intent_status_code, amount_paise, currency_code,
   idempotency_key, created_at, updated_at)
values
  -- I01: Priya / D01 / O01 — ₹149 (CAPTURED, historical)
  ('20000000-0000-0000-0000-a00000000001',
   '20000000-0000-0000-0000-900000000007',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-800000000001',
   'RAZORPAY', 'order_GZ_DEMO_001',
   'CAPTURED', 14900, 'INR',
   'idem_I01_O01',
   now() - interval '21 days',
   now() - interval '21 days'),

  -- I02: Rahul / D03 / O07 — ₹99 (CAPTURED, historical)
  ('20000000-0000-0000-0000-a00000000002',
   '20000000-0000-0000-0000-900000000008',
   '20000000-0000-0000-0000-120000000002',
   '20000000-0000-0000-0000-800000000007',
   'RAZORPAY', 'order_GZ_DEMO_002',
   'CAPTURED', 9900, 'INR',
   'idem_I02_O07',
   now() - interval '21 days',
   now() - interval '21 days'),

  -- I03: Karthik / D07 / O16 — ₹99 (CAPTURED, historical)
  ('20000000-0000-0000-0000-a00000000003',
   '20000000-0000-0000-0000-900000000009',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-800000000016',
   'RAZORPAY', 'order_GZ_DEMO_003',
   'CAPTURED', 9900, 'INR',
   'idem_I03_O16',
   now() - interval '14 days',
   now() - interval '14 days'),

  -- I04: Priya / D11 (Bawarchi today) / O26 — ₹149 (CAPTURED, CONFIRMED)
  ('20000000-0000-0000-0000-a00000000004',
   '20000000-0000-0000-0000-900000000004',
   '20000000-0000-0000-0000-120000000001',
   '20000000-0000-0000-0000-800000000026',
   'RAZORPAY', 'order_GZ_DEMO_004',
   'CAPTURED', 14900, 'INR',
   'idem_I04_O26',
   now() - interval '20 minutes',
   now() - interval '18 minutes'),

  -- I05: Rahul / D12 (Sattvik today) / O27 — ₹99 (CAPTURED, CONFIRMED)
  ('20000000-0000-0000-0000-a00000000005',
   '20000000-0000-0000-0000-900000000005',
   '20000000-0000-0000-0000-120000000002',
   '20000000-0000-0000-0000-800000000027',
   'RAZORPAY', 'order_GZ_DEMO_005',
   'CAPTURED', 9900, 'INR',
   'idem_I05_O27',
   now() - interval '18 minutes',
   now() - interval '16 minutes'),

  -- I06: Karthik / D13 (Smoky Spotlight today) / O28 — ₹199 (CAPTURED, CONFIRMED)
  ('20000000-0000-0000-0000-a00000000006',
   '20000000-0000-0000-0000-900000000006',
   '20000000-0000-0000-0000-120000000008',
   '20000000-0000-0000-0000-800000000028',
   'RAZORPAY', 'order_GZ_DEMO_006',
   'CAPTURED', 19900, 'INR',
   'idem_I06_O28',
   now() - interval '15 minutes',
   now() - interval '13 minutes')

on conflict (payment_order_intent_pk) do nothing;

-- Payment transactions (one CAPTURED transaction per intent)
insert into payment_transaction
  (payment_transaction_pk, payment_order_intent_fk,
   provider_code, provider_payment_ref,
   transaction_status_code, amount_paise,
   fee_paise, tax_paise, payment_method_code,
   captured_at, provider_payload_json,
   created_at, updated_at)
values
  -- T01: I01 (Priya/O01/₹149 UPI)
  ('20000000-0000-0000-0000-b00000000001',
   '20000000-0000-0000-0000-a00000000001',
   'RAZORPAY', 'pay_GZ_DEMO_001',
   'CAPTURED', 14900, 204, 37, 'UPI',
   now() - interval '21 days',
   '{"method":"upi","vpa":"priya@okaxis","bank":"AXIS"}'::jsonb,
   now() - interval '21 days', now() - interval '21 days'),

  -- T02: I02 (Rahul/O07/₹99 UPI)
  ('20000000-0000-0000-0000-b00000000002',
   '20000000-0000-0000-0000-a00000000002',
   'RAZORPAY', 'pay_GZ_DEMO_002',
   'CAPTURED', 9900, 136, 24, 'UPI',
   now() - interval '21 days',
   '{"method":"upi","vpa":"rahul@okhdfc","bank":"HDFC"}'::jsonb,
   now() - interval '21 days', now() - interval '21 days'),

  -- T03: I03 (Karthik/O16/₹99 CARD)
  ('20000000-0000-0000-0000-b00000000003',
   '20000000-0000-0000-0000-a00000000003',
   'RAZORPAY', 'pay_GZ_DEMO_003',
   'CAPTURED', 9900, 200, 36, 'CARD',
   now() - interval '14 days',
   '{"method":"card","network":"VISA","issuer":"ICICI","last4":"4242"}'::jsonb,
   now() - interval '14 days', now() - interval '14 days'),

  -- T04: I04 (Priya/O26/₹149 UPI — today's confirmed)
  ('20000000-0000-0000-0000-b00000000004',
   '20000000-0000-0000-0000-a00000000004',
   'RAZORPAY', 'pay_GZ_DEMO_004',
   'CAPTURED', 14900, 204, 37, 'UPI',
   now() - interval '18 minutes',
   '{"method":"upi","vpa":"priya@okaxis","bank":"AXIS"}'::jsonb,
   now() - interval '18 minutes', now() - interval '18 minutes'),

  -- T05: I05 (Rahul/O27/₹99 UPI — today's confirmed)
  ('20000000-0000-0000-0000-b00000000005',
   '20000000-0000-0000-0000-a00000000005',
   'RAZORPAY', 'pay_GZ_DEMO_005',
   'CAPTURED', 9900, 136, 24, 'UPI',
   now() - interval '16 minutes',
   '{"method":"upi","vpa":"rahul@okhdfc","bank":"HDFC"}'::jsonb,
   now() - interval '16 minutes', now() - interval '16 minutes'),

  -- T06: I06 (Karthik/O28/₹199 NETBANKING — today's confirmed)
  ('20000000-0000-0000-0000-b00000000006',
   '20000000-0000-0000-0000-a00000000006',
   'RAZORPAY', 'pay_GZ_DEMO_006',
   'CAPTURED', 19900, 348, 63, 'NETBANKING',
   now() - interval '13 minutes',
   '{"method":"netbanking","bank":"SBI"}'::jsonb,
   now() - interval '13 minutes', now() - interval '13 minutes')

on conflict (provider_code, provider_payment_ref) do nothing;

-- =============================================================================
-- SECTION 36 — Finance settlement run
-- Bawarchi Biryani Palace — covers D01 (3 weeks ago) + D02 (3 weeks ago).
-- D01: 4 orders × ₹149 = ₹596  →  59600 paise
-- D02: 2 orders × ₹249 = ₹498  →  49800 paise
-- Gross: 109400 paise | Commission 15% (1500 bps): 16410 | Net: 92990
-- Status: PAID  (demo shows end-to-end finance flow)
-- =============================================================================

-- Insert as DRAFT so the payout-entry trigger (which blocks INSERT when status
-- is not DRAFT/OPEN) does not fire. Status is advanced to PAID below.
insert into finance_settlement_run
  (finance_settlement_run_pk, restaurant_fk,
   period_start_at, period_end_at,
   settlement_status_code,
   gross_sales_paise, refund_paise, commission_paise,
   tax_paise, net_payout_paise,
   paid_at, created_at, updated_at)
values
  ('20000000-0000-0000-0000-f00000000001',
   '20000000-0000-0000-0000-300000000001',
   now() - interval '25 days',
   now() - interval '18 days',
   'DRAFT',
   109400, 0, 16410, 0, 92990,
   now() - interval '16 days',
   now() - interval '25 days',
   now() - interval '16 days')
on conflict (finance_settlement_run_pk) do nothing;

-- =============================================================================
-- SECTION 37 — Finance payout entries (line-level ledger)
-- =============================================================================
-- ORDER_GROSS entries (positive = credit to restaurant)
-- COMMISSION entry   (negative = platform deduction)
-- Note: finance_restaurant_payout_entry.amount_paise <> 0 enforced by schema.
-- Wrapped in DO block: on re-run the settlement run is already PAID and the
-- trigger blocks any INSERT, so we skip entirely if entries already exist.

do $$
begin
  if not exists (
    select 1 from finance_restaurant_payout_entry
    where finance_settlement_run_fk = '20000000-0000-0000-0000-f00000000001'
  ) then
    insert into finance_restaurant_payout_entry
      (finance_settlement_run_fk, restaurant_fk, order_fk,
       entry_type_code, amount_paise, description_text,
       created_at, updated_at)
    values
      -- D01 orders gross (O01–O04, all captured regardless of COLLECTED/EXPIRED)
      ('20000000-0000-0000-0000-f00000000001',
       '20000000-0000-0000-0000-300000000001',
       '20000000-0000-0000-0000-800000000001',
       'ORDER_GROSS', 14900,
       'Hyderabadi Biryani BAM Bag — O01 (Priya)',
       now()-interval '25 days', now()-interval '25 days'),

      ('20000000-0000-0000-0000-f00000000001',
       '20000000-0000-0000-0000-300000000001',
       '20000000-0000-0000-0000-800000000002',
       'ORDER_GROSS', 14900,
       'Hyderabadi Biryani BAM Bag — O02 (Vikram)',
       now()-interval '25 days', now()-interval '25 days'),

      ('20000000-0000-0000-0000-f00000000001',
       '20000000-0000-0000-0000-300000000001',
       '20000000-0000-0000-0000-800000000003',
       'ORDER_GROSS', 14900,
       'Hyderabadi Biryani BAM Bag — O03 (Anjali)',
       now()-interval '25 days', now()-interval '25 days'),

      ('20000000-0000-0000-0000-f00000000001',
       '20000000-0000-0000-0000-300000000001',
       '20000000-0000-0000-0000-800000000004',
       'ORDER_GROSS', 14900,
       'Hyderabadi Biryani BAM Bag — O04 (Karthik, pickup expired)',
       now()-interval '25 days', now()-interval '25 days'),

      -- D02 orders gross (O05–O06)
      ('20000000-0000-0000-0000-f00000000001',
       '20000000-0000-0000-0000-300000000001',
       '20000000-0000-0000-0000-800000000005',
       'ORDER_GROSS', 24900,
       'Double Mutton Delight — O05 (Karthik)',
       now()-interval '25 days', now()-interval '25 days'),

      ('20000000-0000-0000-0000-f00000000001',
       '20000000-0000-0000-0000-300000000001',
       '20000000-0000-0000-0000-800000000006',
       'ORDER_GROSS', 24900,
       'Double Mutton Delight — O06 (Deepa)',
       now()-interval '25 days', now()-interval '25 days'),

      -- Commission deduction (15%: 109400 × 0.15 = 16410 paise)
      ('20000000-0000-0000-0000-f00000000001',
       '20000000-0000-0000-0000-300000000001',
       null,
       'COMMISSION', -16410,
       'Platform commission 15% (STANDARD_15PCT) on ₹1,094.00 gross',
       now()-interval '18 days', now()-interval '18 days');
  end if;
end $$;

-- Advance settlement run to PAID (WHERE guards against re-run: no-op if already PAID)
update finance_settlement_run
set settlement_status_code = 'PAID',
    updated_at = now() - interval '16 days'
where finance_settlement_run_pk = '20000000-0000-0000-0000-f00000000001'
  and settlement_status_code = 'DRAFT';

-- =============================================================================
-- SECTION 38 — demo_create_live_drops()
-- Creates a random set of ACTIVE drops across demo restaurants with realistic
-- holds and paid orders. Safe to call multiple times — each call creates a new
-- independent batch of drops registered as 'demo_live_drops'.
-- =============================================================================
-- Distribution per drop:
--   quantity_total   : 8–15 bags (random)
--   quantity_sold    : 2 (two converted holds → CONFIRMED orders)
--   quantity_reserved: 2–3 (active holds, expire in 10–20 minutes)
--   quantity_available: computed (GENERATED STORED)
--
-- Parameters:
--   p_restaurant_fks uuid[]  — specific restaurants (null = all 5 demo)
--   p_drop_type text         — override drop type (null = use template default)
-- =============================================================================

create or replace function public.demo_create_live_drops(
  p_restaurant_fks  uuid[]  default null,
  p_drop_type       text    default null
)
returns table (
  drop_pk           uuid,
  restaurant_name   text,
  drop_type         text,
  drop_title        text,
  quantity_total    integer,
  quantity_sold     integer,
  quantity_reserved integer,
  price_paise       bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Demo restaurant PKs (all five)
  v_restaurants uuid[] := array[
    '20000000-0000-0000-0000-300000000001'::uuid,
    '20000000-0000-0000-0000-300000000002'::uuid,
    '20000000-0000-0000-0000-300000000003'::uuid,
    '20000000-0000-0000-0000-300000000004'::uuid,
    '20000000-0000-0000-0000-300000000005'::uuid
  ];
  -- Demo consumer PKs (8 consumers, cycled for holds)
  v_consumers uuid[] := array[
    '20000000-0000-0000-0000-120000000001'::uuid,  -- Priya
    '20000000-0000-0000-0000-120000000002'::uuid,  -- Rahul
    '20000000-0000-0000-0000-120000000003'::uuid,  -- Anjali
    '20000000-0000-0000-0000-120000000004'::uuid,  -- Vikram
    '20000000-0000-0000-0000-120000000005'::uuid,  -- Deepa
    '20000000-0000-0000-0000-120000000006'::uuid,  -- Arjun
    '20000000-0000-0000-0000-120000000007'::uuid,  -- Meera
    '20000000-0000-0000-0000-120000000008'::uuid   -- Karthik
  ];

  v_rst_pk          uuid;
  v_rst             restaurant_restaurant%rowtype;
  v_rev             catalog_bag_template_revision%rowtype;
  v_drop_pk         uuid;
  v_drop_type_code  text;
  v_drop_title      text;
  v_qty_total       integer;
  v_qty_sold        integer    := 2;
  v_qty_reserved    integer;
  v_sell_through    integer;
  v_pickup_start    timestamptz;
  v_pickup_end      timestamptz;

  v_hold_a_pk       uuid;
  v_hold_b_pk       uuid;
  v_hold_c_pk       uuid;
  v_hold_d_pk       uuid;
  v_order_a_pk      uuid;
  v_order_b_pk      uuid;
  v_intent_a_pk     uuid;
  v_intent_b_pk     uuid;
  v_txn_a_pk        uuid;
  v_txn_b_pk        uuid;
  v_order_seq       bigint;
  v_order_number    text;
  v_idem_suffix     text;

  v_rst_idx         integer;
  v_con_offset      integer;   -- cycles consumers across restaurants

  v_target_rsts     uuid[];
begin
  -- Resolve target restaurant list
  v_target_rsts := coalesce(p_restaurant_fks, v_restaurants);

  -- Tonight's pickup window (18:30–21:00 IST = 13:00–15:30 UTC)
  v_pickup_start := (current_date || ' 13:00:00')::timestamptz;
  v_pickup_end   := (current_date || ' 15:30:00')::timestamptz;

  v_con_offset := 0;

  for v_rst_idx in 1 .. array_length(v_target_rsts, 1) loop
    v_rst_pk := v_target_rsts[v_rst_idx];

    -- Load restaurant
    select * into v_rst from restaurant_restaurant
    where restaurant_restaurant_pk = v_rst_pk;
    if not found then continue; end if;

    -- Pick the *first* active template revision for this restaurant
    -- (template whose drop_type_code matches p_drop_type, or any)
    select rev.* into v_rev
    from catalog_bag_template_revision rev
    join catalog_bag_template t
      on t.catalog_bag_template_pk = rev.catalog_bag_template_fk
    where t.restaurant_fk = v_rst_pk
      and t.template_status_code = 'ACTIVE'
      and rev.revision_status_code = 'PUBLISHED'
    order by rev.created_at
    limit 1;

    if not found then continue; end if;

    -- Randomised quantities
    v_qty_total    := (floor(random() * 8) + 8)::integer;   -- 8–15
    v_qty_reserved := (floor(random() * 2) + 2)::integer;   -- 2–3
    if v_qty_reserved + v_qty_sold > v_qty_total then
      v_qty_total := v_qty_reserved + v_qty_sold + 2;
    end if;
    v_sell_through := (v_qty_sold::numeric / v_qty_total::numeric * 10000)::integer;

    v_drop_type_code := coalesce(p_drop_type, 'STANDARD');
    v_drop_title := case v_drop_type_code
      when 'SPOTLIGHT'      then 'SPOTLIGHT: ' || v_rev.display_name
      when 'CHEF_SPECIAL'   then 'Chef''s Selection: ' || v_rev.display_name
      when 'BLIND_ADVENTURE'then 'Mystery Drop — ' || v_rst.restaurant_name
      else 'Tonight''s ' || v_rev.display_name
    end;

    -- Generate unique suffix for this batch (epoch + rst index)
    v_idem_suffix := extract(epoch from now())::bigint::text || '_' || v_rst_idx::text;

    -- New drop PK
    v_drop_pk := gen_random_uuid();

    -- ── Insert ACTIVE drop ────────────────────────────────────────────────────
    insert into drop_drop (
      drop_drop_pk, restaurant_fk, catalog_bag_template_revision_fk,
      geo_city_fk, geo_neighborhood_fk,
      drop_title, drop_type_code, drop_status_code,
      quantity_total, quantity_reserved, quantity_sold, quantity_collected,
      COMPUTED_sell_through_bps,
      price_paise, currency_code,
      pickup_start_at, pickup_end_at,
      hold_duration_minutes
    ) values (
      v_drop_pk, v_rst_pk, v_rev.catalog_bag_template_revision_pk,
      v_rst.geo_city_fk, v_rst.geo_neighborhood_fk,
      v_drop_title, v_drop_type_code, 'ACTIVE',
      v_qty_total, v_qty_reserved + v_qty_sold, v_qty_sold, 0,
      v_sell_through,
      v_rev.suggested_price_paise, 'INR',
      v_pickup_start, v_pickup_end,
      15
    );

    -- ── Register drop in seed registry ───────────────────────────────────────
    insert into dev_demo_seed_registry (seed_key, entity_table, entity_id, slice)
    values ('live_drop_' || v_idem_suffix, 'drop_drop', v_drop_pk, 'demo_live_drops')
    on conflict (seed_key) do nothing;

    -- ── Inventory event: drop published ──────────────────────────────────────
    insert into drop_inventory_event
      (drop_fk, event_type_code, quantity_delta, reason_text)
    values
      (v_drop_pk, 'MANUAL_ADJUSTMENT', v_qty_total, 'demo_create_live_drops batch');

    -- ── CONVERTED holds → CONFIRMED orders (2 per drop) ──────────────────────
    -- Consumer A: position (con_offset + 0) mod 8
    -- Consumer B: position (con_offset + 1) mod 8

    v_hold_a_pk := gen_random_uuid();
    v_hold_b_pk := gen_random_uuid();
    v_order_a_pk := gen_random_uuid();
    v_order_b_pk := gen_random_uuid();
    v_intent_a_pk := gen_random_uuid();
    v_intent_b_pk := gen_random_uuid();
    v_txn_a_pk := gen_random_uuid();
    v_txn_b_pk := gen_random_uuid();

    -- Hold A (CONVERTED, 30 min ago)
    insert into drop_inventory_hold
      (drop_inventory_hold_pk, drop_fk, consumer_profile_fk,
       hold_status_code, quantity, idempotency_key,
       expires_at)
    values
      (v_hold_a_pk, v_drop_pk,
       v_consumers[((v_con_offset + 0) % 8) + 1],
       'CONVERTED', 1,
       'live_hA_' || v_idem_suffix,
       now() + interval '15 minutes');

    -- Hold B (CONVERTED, 25 min ago)
    insert into drop_inventory_hold
      (drop_inventory_hold_pk, drop_fk, consumer_profile_fk,
       hold_status_code, quantity, idempotency_key,
       expires_at)
    values
      (v_hold_b_pk, v_drop_pk,
       v_consumers[((v_con_offset + 1) % 8) + 1],
       'CONVERTED', 1,
       'live_hB_' || v_idem_suffix,
       now() + interval '15 minutes');

    -- Order A
    v_order_seq := nextval('public.order_order_number_seq');
    v_order_number := 'GZ-HYD-' || to_char(now() at time zone 'Asia/Kolkata','YYYYMM')
                      || '-' || lpad(v_order_seq::text, 6, '0');
    insert into order_order (
      order_order_pk, order_number,
      consumer_profile_fk, restaurant_fk, drop_fk, drop_inventory_hold_fk,
      order_status_code, payment_status_code,
      pickup_qr_nonce_hash, pickup_otp_hash,
      pickup_window_start_at, pickup_window_end_at,
      subtotal_paise, discount_paise, tax_paise, total_paise, currency_code,
      snapshot_restaurant_name, snapshot_restaurant_slug,
      snapshot_drop_title, snapshot_bag_display_name,
      snapshot_dietary_category_code, snapshot_spice_level_code,
      snapshot_allergen_summary_text, snapshot_serves_text,
      snapshot_pickup_instructions,
      dietary_category_code
    ) values (
      v_order_a_pk, v_order_number,
      v_consumers[((v_con_offset + 0) % 8) + 1],
      v_rst_pk, v_drop_pk, v_hold_a_pk,
      'CONFIRMED', 'CAPTURED',
      encode(extensions.digest('nonce:live:' || v_order_a_pk::text, 'sha256'), 'hex'),
      encode(extensions.digest('otp:live:'   || v_order_a_pk::text, 'sha256'), 'hex'),
      v_pickup_start, v_pickup_end,
      v_rev.suggested_price_paise, 0, 0, v_rev.suggested_price_paise, 'INR',
      v_rst.restaurant_name, v_rst.restaurant_slug,
      v_drop_title, v_rev.display_name,
      v_rev.dietary_category_code, v_rev.spice_level_code,
      v_rev.allergen_summary_text,
      case
        when v_rev.serves_min = v_rev.serves_max then 'Serves ' || v_rev.serves_min
        else 'Serves ' || v_rev.serves_min || '–' || v_rev.serves_max
      end,
      v_rst.pickup_instructions,
      v_rev.dietary_category_code
    );

    -- Order B
    v_order_seq := nextval('public.order_order_number_seq');
    v_order_number := 'GZ-HYD-' || to_char(now() at time zone 'Asia/Kolkata','YYYYMM')
                      || '-' || lpad(v_order_seq::text, 6, '0');
    insert into order_order (
      order_order_pk, order_number,
      consumer_profile_fk, restaurant_fk, drop_fk, drop_inventory_hold_fk,
      order_status_code, payment_status_code,
      pickup_qr_nonce_hash, pickup_otp_hash,
      pickup_window_start_at, pickup_window_end_at,
      subtotal_paise, discount_paise, tax_paise, total_paise, currency_code,
      snapshot_restaurant_name, snapshot_restaurant_slug,
      snapshot_drop_title, snapshot_bag_display_name,
      snapshot_dietary_category_code, snapshot_spice_level_code,
      snapshot_allergen_summary_text, snapshot_serves_text,
      snapshot_pickup_instructions,
      dietary_category_code
    ) values (
      v_order_b_pk, v_order_number,
      v_consumers[((v_con_offset + 1) % 8) + 1],
      v_rst_pk, v_drop_pk, v_hold_b_pk,
      'CONFIRMED', 'CAPTURED',
      encode(extensions.digest('nonce:live:' || v_order_b_pk::text, 'sha256'), 'hex'),
      encode(extensions.digest('otp:live:'   || v_order_b_pk::text, 'sha256'), 'hex'),
      v_pickup_start, v_pickup_end,
      v_rev.suggested_price_paise, 0, 0, v_rev.suggested_price_paise, 'INR',
      v_rst.restaurant_name, v_rst.restaurant_slug,
      v_drop_title, v_rev.display_name,
      v_rev.dietary_category_code, v_rev.spice_level_code,
      v_rev.allergen_summary_text,
      case
        when v_rev.serves_min = v_rev.serves_max then 'Serves ' || v_rev.serves_min
        else 'Serves ' || v_rev.serves_min || '–' || v_rev.serves_max
      end,
      v_rst.pickup_instructions,
      v_rev.dietary_category_code
    );

    update drop_inventory_hold
    set converted_order_fk = case
          when drop_inventory_hold_pk = v_hold_a_pk then v_order_a_pk
          when drop_inventory_hold_pk = v_hold_b_pk then v_order_b_pk
          else converted_order_fk
        end
    where drop_inventory_hold_pk in (v_hold_a_pk, v_hold_b_pk);

    -- Inventory events for converted holds
    insert into drop_inventory_event
      (drop_fk, drop_inventory_hold_fk, order_fk,
       event_type_code, quantity_delta, reason_text)
    values
      (v_drop_pk, v_hold_a_pk, v_order_a_pk, 'HOLD_CONVERTED', 0, 'live drop demo order A'),
      (v_drop_pk, v_hold_b_pk, v_order_b_pk, 'HOLD_CONVERTED', 0, 'live drop demo order B');

    -- Order items
    insert into order_item
      (order_fk, drop_fk, catalog_bag_template_revision_fk,
       quantity, unit_price_paise, line_total_paise,
       snapshot_bag_display_name, snapshot_dietary_category_code,
       snapshot_allergen_summary_text)
    values
      (v_order_a_pk, v_drop_pk, v_rev.catalog_bag_template_revision_pk,
       1, v_rev.suggested_price_paise, v_rev.suggested_price_paise,
       v_rev.display_name, v_rev.dietary_category_code, v_rev.allergen_summary_text),
      (v_order_b_pk, v_drop_pk, v_rev.catalog_bag_template_revision_pk,
       1, v_rev.suggested_price_paise, v_rev.suggested_price_paise,
       v_rev.display_name, v_rev.dietary_category_code, v_rev.allergen_summary_text);

    -- Status transitions for both orders (CREATED → PAID → CONFIRMED)
    insert into order_status_transition
      (order_fk, from_status_code, to_status_code, transition_reason_code, recorded_at, metadata_json)
    values
      (v_order_a_pk, null,      'CREATED',   'HOLD_CONVERTED',   now()-interval '32 min', '{}'),
      (v_order_a_pk, 'CREATED', 'PAID',      'PAYMENT_CAPTURED', now()-interval '30 min', '{}'),
      (v_order_a_pk, 'PAID',    'CONFIRMED', 'PAYMENT_CAPTURED', now()-interval '30 min', '{}'),
      (v_order_b_pk, null,      'CREATED',   'HOLD_CONVERTED',   now()-interval '27 min', '{}'),
      (v_order_b_pk, 'CREATED', 'PAID',      'PAYMENT_CAPTURED', now()-interval '25 min', '{}'),
      (v_order_b_pk, 'PAID',    'CONFIRMED', 'PAYMENT_CAPTURED', now()-interval '25 min', '{}');

    -- Payment intents
    insert into payment_order_intent
      (payment_order_intent_pk,
       drop_inventory_hold_fk, consumer_profile_fk, order_fk,
       provider_code, provider_order_ref,
       payment_intent_status_code, amount_paise, currency_code,
       idempotency_key)
    values
      (v_intent_a_pk,
       v_hold_a_pk, v_consumers[((v_con_offset + 0) % 8) + 1], v_order_a_pk,
       'RAZORPAY', 'order_live_' || v_idem_suffix || '_A',
       'CAPTURED', v_rev.suggested_price_paise, 'INR',
       'idem_live_' || v_idem_suffix || '_A'),
      (v_intent_b_pk,
       v_hold_b_pk, v_consumers[((v_con_offset + 1) % 8) + 1], v_order_b_pk,
       'RAZORPAY', 'order_live_' || v_idem_suffix || '_B',
       'CAPTURED', v_rev.suggested_price_paise, 'INR',
       'idem_live_' || v_idem_suffix || '_B');

    -- Payment transactions (UPI for demo simplicity)
    insert into payment_transaction
      (payment_transaction_pk, payment_order_intent_fk,
       provider_code, provider_payment_ref,
       transaction_status_code, amount_paise,
       fee_paise, tax_paise, payment_method_code, captured_at,
       provider_payload_json)
    values
      (v_txn_a_pk, v_intent_a_pk,
       'RAZORPAY', 'pay_live_' || v_idem_suffix || '_A',
       'CAPTURED', v_rev.suggested_price_paise,
       (v_rev.suggested_price_paise * 0.014)::bigint, (v_rev.suggested_price_paise * 0.0025)::bigint,
       'UPI', now()-interval '28 min',
       '{"method":"upi","vpa":"consumer@okaxis","bank":"AXIS"}'::jsonb),
      (v_txn_b_pk, v_intent_b_pk,
       'RAZORPAY', 'pay_live_' || v_idem_suffix || '_B',
       'CAPTURED', v_rev.suggested_price_paise,
       (v_rev.suggested_price_paise * 0.014)::bigint, (v_rev.suggested_price_paise * 0.0025)::bigint,
       'UPI', now()-interval '23 min',
       '{"method":"upi","vpa":"consumer@okhdfcbank","bank":"HDFC"}'::jsonb);

    -- ── ACTIVE holds (2–3 per drop, consumers mid-checkout) ──────────────────
    v_hold_c_pk := gen_random_uuid();
    v_hold_d_pk := gen_random_uuid();

    insert into drop_inventory_hold
      (drop_inventory_hold_pk, drop_fk, consumer_profile_fk,
       hold_status_code, quantity, idempotency_key,
       expires_at)
    values
      (v_hold_c_pk, v_drop_pk,
       v_consumers[((v_con_offset + 2) % 8) + 1],
       'ACTIVE', 1,
       'live_hC_' || v_idem_suffix,
       now() + interval '12 minutes'),
      (v_hold_d_pk, v_drop_pk,
       v_consumers[((v_con_offset + 3) % 8) + 1],
       'ACTIVE', 1,
       'live_hD_' || v_idem_suffix,
       now() + interval '7 minutes');

    insert into drop_inventory_event
      (drop_fk, drop_inventory_hold_fk, event_type_code, quantity_delta, reason_text)
    values
      (v_drop_pk, v_hold_c_pk, 'HOLD_CREATED', 1, 'live drop demo active hold C'),
      (v_drop_pk, v_hold_d_pk, 'HOLD_CREATED', 1, 'live drop demo active hold D');

    -- Register orders and holds in seed registry (enables targeted cleanup)
    insert into dev_demo_seed_registry (seed_key, entity_table, entity_id, slice)
    values
      ('live_order_A_' || v_idem_suffix, 'order_order', v_order_a_pk, 'demo_live_drops'),
      ('live_order_B_' || v_idem_suffix, 'order_order', v_order_b_pk, 'demo_live_drops'),
      ('live_hold_A_'  || v_idem_suffix, 'drop_inventory_hold', v_hold_a_pk, 'demo_live_drops'),
      ('live_hold_B_'  || v_idem_suffix, 'drop_inventory_hold', v_hold_b_pk, 'demo_live_drops'),
      ('live_hold_C_'  || v_idem_suffix, 'drop_inventory_hold', v_hold_c_pk, 'demo_live_drops'),
      ('live_hold_D_'  || v_idem_suffix, 'drop_inventory_hold', v_hold_d_pk, 'demo_live_drops')
    on conflict (seed_key) do nothing;

    -- Advance consumer offset for next restaurant
    v_con_offset := v_con_offset + 2;

    -- Return summary row
    drop_pk        := v_drop_pk;
    restaurant_name := v_rst.restaurant_name;
    drop_type      := v_drop_type_code;
    drop_title     := v_drop_title;
    quantity_total := v_qty_total;
    quantity_sold  := v_qty_sold;
    quantity_reserved := v_qty_reserved;
    price_paise    := v_rev.suggested_price_paise;
    return next;
  end loop;
end;
$$;

comment on function public.demo_create_live_drops(uuid[], text) is
  'DEMO ONLY. Creates a fresh set of ACTIVE drops across demo restaurants '
  'with realistic holds (2 converted → CONFIRMED orders, 2–3 active holds). '
  'Each call is additive — call demo_cleanup_data(p_slice=>''demo_live_drops'') '
  'to remove all dynamically created batches. Requires service_role or postgres.';

revoke all on function public.demo_create_live_drops(uuid[], text) from public;
grant execute on function public.demo_create_live_drops(uuid[], text) to service_role;

-- =============================================================================
-- SECTION 39 — demo_cleanup_data()
-- Deletes demo entities in safe dependency order.
-- =============================================================================
-- Parameters:
--   p_before_at timestamptz  — only delete entities with created_at < this value
--   p_after_at  timestamptz  — only delete entities with created_at > this value
--   p_slice     text         — 'demo_live_drops' | 'demo_seed_part1' |
--                              'demo_seed_part2' | 'demo_seed_part3' |
--                              'demo_seed_part4' | 'ALL' | null (= ALL)
--   p_dry_run   boolean      — true (default): count only; false: actually delete
--
-- Returns rows: (entity_table text, deleted_count bigint)
-- =============================================================================

create or replace function public.demo_cleanup_data(
  p_before_at timestamptz default null,
  p_after_at  timestamptz default null,
  p_slice     text        default null,
  p_dry_run   boolean     default true
)
returns table (entity_table text, deleted_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Deterministic UUID prefix used by all static seed entities (Parts 1–4)
  c_demo_prefix text := '20000000-0000-0000-0000-';

  -- Convenience: should we also delete static seed (20000000-… prefix) entities?
  v_include_static boolean;

  v_del_count   bigint;
  v_drop_pks    uuid[];
  v_order_pks   uuid[];
  v_consumer_pks uuid[];
  v_rst_pks      uuid[];
  v_auth_pks     uuid[];
  v_iam_pks      uuid[];
begin
  -- Resolve whether static seed is in scope
  v_include_static := (p_slice is null or upper(p_slice) = 'ALL'
                       or p_slice not like 'demo_live%');

  -- ── Step 1: Collect dynamic live-drop entity IDs from registry ──────────────
  -- drop_drop PKs from registry (live drops)
  select array_agg(r.entity_id) into v_drop_pks
  from dev_demo_seed_registry r
  where r.entity_table = 'drop_drop'
    and (p_slice is null or upper(p_slice) = 'ALL' or r.slice = p_slice)
    and (p_before_at is null or r.created_at < p_before_at)
    and (p_after_at  is null or r.created_at > p_after_at);

  -- Static seed drop PKs (if in scope)
  if v_include_static then
    select array_agg(dd.drop_drop_pk) into v_drop_pks
    from drop_drop dd
    where dd.drop_drop_pk::text like c_demo_prefix || '%'
      and (p_before_at is null or dd.created_at < p_before_at)
      and (p_after_at  is null or dd.created_at > p_after_at)
      and (v_drop_pks is null or dd.drop_drop_pk = any(v_drop_pks) or true);

    -- Merge both sets
    v_drop_pks := array(select distinct unnest(
      coalesce(v_drop_pks, array[]::uuid[])
    ));
  end if;

  if v_drop_pks is null then v_drop_pks := array[]::uuid[]; end if;

  -- ── Step 2: Collect order PKs reachable from those drops + static prefix ───
  select array_agg(distinct o.order_order_pk) into v_order_pks
  from order_order o
  where (o.drop_fk = any(v_drop_pks)
         or (v_include_static and o.order_order_pk::text like c_demo_prefix || '%'))
    and (p_before_at is null or o.created_at < p_before_at)
    and (p_after_at  is null or o.created_at > p_after_at);

  if v_order_pks is null then v_order_pks := array[]::uuid[]; end if;

  -- ── Step 3: Finance payout entries ─────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count
    from finance_restaurant_payout_entry fpe
    join finance_settlement_run fsr
      on fsr.finance_settlement_run_pk = fpe.finance_settlement_run_fk
    where (v_include_static and fsr.finance_settlement_run_pk::text like c_demo_prefix || '%');
    entity_table := 'finance_restaurant_payout_entry';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from finance_restaurant_payout_entry
    using finance_settlement_run fsr
    where fsr.finance_settlement_run_pk = finance_restaurant_payout_entry.finance_settlement_run_fk
      and (v_include_static and fsr.finance_settlement_run_pk::text like c_demo_prefix || '%');
    get diagnostics v_del_count = row_count;
    entity_table := 'finance_restaurant_payout_entry';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 4: Finance settlement runs ────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from finance_settlement_run
    where v_include_static and finance_settlement_run_pk::text like c_demo_prefix || '%';
    entity_table := 'finance_settlement_run';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from finance_settlement_run
    where v_include_static and finance_settlement_run_pk::text like c_demo_prefix || '%';
    get diagnostics v_del_count = row_count;
    entity_table := 'finance_settlement_run';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 5: Payment transactions ────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from payment_transaction pt
    join payment_order_intent poi on poi.payment_order_intent_pk = pt.payment_order_intent_fk
    where (poi.order_fk = any(v_order_pks)
           or (v_include_static and poi.payment_order_intent_pk::text like c_demo_prefix || '%'));
    entity_table := 'payment_transaction';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from payment_transaction
    using payment_order_intent poi
    where poi.payment_order_intent_pk = payment_transaction.payment_order_intent_fk
      and (poi.order_fk = any(v_order_pks)
           or (v_include_static and poi.payment_order_intent_pk::text like c_demo_prefix || '%'));
    get diagnostics v_del_count = row_count;
    entity_table := 'payment_transaction';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 6: Payment intents ──────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from payment_order_intent poi
    where (poi.order_fk = any(v_order_pks)
           or (v_include_static and poi.payment_order_intent_pk::text like c_demo_prefix || '%'));
    entity_table := 'payment_order_intent';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from payment_order_intent
    where (order_fk = any(v_order_pks)
           or (v_include_static and payment_order_intent_pk::text like c_demo_prefix || '%'));
    get diagnostics v_del_count = row_count;
    entity_table := 'payment_order_intent';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 7: Reviews ──────────────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from review_review rr
    where (rr.order_fk = any(v_order_pks)
           or (v_include_static and rr.review_review_pk::text like c_demo_prefix || '%'));
    entity_table := 'review_review';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from review_review
    where (order_fk = any(v_order_pks)
           or (v_include_static and review_review_pk::text like c_demo_prefix || '%'));
    get diagnostics v_del_count = row_count;
    entity_table := 'review_review';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 8: Pickup verification events (cascade from order, but be explicit) ─
  if p_dry_run then
    select count(*) into v_del_count from order_pickup_verification_event
    where order_fk = any(v_order_pks);
    entity_table := 'order_pickup_verification_event';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from order_pickup_verification_event where order_fk = any(v_order_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'order_pickup_verification_event';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 9: Order status transitions ─────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from order_status_transition
    where order_fk = any(v_order_pks);
    entity_table := 'order_status_transition';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from order_status_transition where order_fk = any(v_order_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'order_status_transition';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 10: Order items ──────────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from order_item where order_fk = any(v_order_pks);
    entity_table := 'order_item';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from order_item where order_fk = any(v_order_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'order_item';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 11: Orders ───────────────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from order_order where order_order_pk = any(v_order_pks);
    entity_table := 'order_order';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from order_order where order_order_pk = any(v_order_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'order_order';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 12: Inventory holds ───────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from drop_inventory_hold dih
    where (dih.drop_fk = any(v_drop_pks)
           or (v_include_static and dih.drop_inventory_hold_pk::text like c_demo_prefix || '%'));
    entity_table := 'drop_inventory_hold';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from drop_inventory_hold
    where (drop_fk = any(v_drop_pks)
           or (v_include_static and drop_inventory_hold_pk::text like c_demo_prefix || '%'));
    get diagnostics v_del_count = row_count;
    entity_table := 'drop_inventory_hold';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 13: Inventory events ─────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from drop_inventory_event
    where drop_fk = any(v_drop_pks);
    entity_table := 'drop_inventory_event';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from drop_inventory_event where drop_fk = any(v_drop_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'drop_inventory_event';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 14: Drops ───────────────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from drop_drop where drop_drop_pk = any(v_drop_pks);
    entity_table := 'drop_drop';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from drop_drop where drop_drop_pk = any(v_drop_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'drop_drop';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Steps 15+ only execute when static seed is in scope ──────────────────────
  if not v_include_static then
    -- Clean up only the live-drop registry entries
    if not p_dry_run then
      delete from dev_demo_seed_registry
      where (p_slice is null or upper(p_slice) = 'ALL' or slice = p_slice)
        and (p_before_at is null or created_at < p_before_at)
        and (p_after_at  is null or created_at > p_after_at);
    end if;
    return;
  end if;

  -- Collect consumer and restaurant auth user PKs for static cleanup
  select array_agg(consumer_profile_pk) into v_consumer_pks
  from consumer_profile
  where consumer_profile_pk::text like c_demo_prefix || '12%';

  select array_agg(restaurant_restaurant_pk) into v_rst_pks
  from restaurant_restaurant
  where restaurant_restaurant_pk::text like c_demo_prefix || '3%';

  -- ── Step 15: Bag templates (revisions cascade via FK) ─────────────────────
  if p_dry_run then
    select count(*) into v_del_count from catalog_bag_template
    where catalog_bag_template_pk::text like c_demo_prefix || '5%';
    entity_table := 'catalog_bag_template';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from catalog_bag_template
    where catalog_bag_template_pk::text like c_demo_prefix || '5%';
    get diagnostics v_del_count = row_count;
    entity_table := 'catalog_bag_template';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 16: Consumer subscriptions and billing ───────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from consumer_subscription
    where consumer_profile_fk = any(v_consumer_pks);
    entity_table := 'consumer_subscription';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from consumer_subscription where consumer_profile_fk = any(v_consumer_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'consumer_subscription';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 17: Consumer preferences and saved restaurants ──────────────────
  if not p_dry_run then
    delete from consumer_dietary_preference  where consumer_profile_fk = any(v_consumer_pks);
    delete from consumer_allergen_preference where consumer_profile_fk = any(v_consumer_pks);
    delete from consumer_city_preference     where consumer_profile_fk = any(v_consumer_pks);
    delete from consumer_saved_restaurant    where consumer_profile_fk = any(v_consumer_pks);
    delete from consumer_referral
      where referrer_profile_fk = any(v_consumer_pks)
         or referee_profile_fk  = any(v_consumer_pks);
    delete from consumer_passport_stat       where consumer_profile_fk = any(v_consumer_pks);
  end if;
  entity_table := 'consumer_preferences_and_referrals';
  if p_dry_run then
    select count(*) into v_del_count
    from consumer_dietary_preference where consumer_profile_fk = any(v_consumer_pks);
    deleted_count := coalesce(v_del_count, 0);
  else
    deleted_count := 0; -- already deleted above
  end if;
  return next;

  -- ── Step 18: Consumer profiles ────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from consumer_profile
    where consumer_profile_pk = any(v_consumer_pks);
    entity_table := 'consumer_profile';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from consumer_profile where consumer_profile_pk = any(v_consumer_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'consumer_profile';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 19: Restaurant sub-tables ───────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from restaurant_restaurant
    where restaurant_restaurant_pk = any(v_rst_pks);
    entity_table := 'restaurant_restaurant';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    -- Cuisine maps, profiles, payout accounts, team members cascade
    delete from restaurant_cuisine_map where restaurant_fk = any(v_rst_pks);
    delete from restaurant_restaurant  where restaurant_restaurant_pk = any(v_rst_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'restaurant_restaurant';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 20: Geo addresses ────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from geo_address
    where geo_address_pk::text like c_demo_prefix || '4%';
    entity_table := 'geo_address';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from geo_address where geo_address_pk::text like c_demo_prefix || '4%';
    get diagnostics v_del_count = row_count;
    entity_table := 'geo_address';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 21: IAM profiles ─────────────────────────────────────────────────
  select array_agg(iam_profile_pk) into v_iam_pks
  from iam_profile
  where iam_profile_pk::text like c_demo_prefix || '1%' -- 110000000001-008, 210000000001-005
     or iam_profile_pk::text like c_demo_prefix || '2%';

  if p_dry_run then
    select count(*) into v_del_count from iam_profile
    where iam_profile_pk = any(v_iam_pks);
    entity_table := 'iam_profile';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from iam_profile where iam_profile_pk = any(v_iam_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'iam_profile';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 22: auth.users ───────────────────────────────────────────────────
  -- Consumer users: 100000000001–008  |  Restaurant users: 200000000001–005
  select array_agg(id) into v_auth_pks
  from auth.users
  where id::text like c_demo_prefix || '1000000000%'
     or id::text like c_demo_prefix || '2000000000%';

  if p_dry_run then
    select count(*) into v_del_count from auth.users where id = any(v_auth_pks);
    entity_table := 'auth.users';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from auth.users where id = any(v_auth_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'auth.users';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 23: Seed registry ────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from dev_demo_seed_registry
    where (p_slice is null or upper(p_slice) = 'ALL' or slice = p_slice)
      and (p_before_at is null or created_at < p_before_at)
      and (p_after_at  is null or created_at > p_after_at);
    entity_table := 'dev_demo_seed_registry';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from dev_demo_seed_registry
    where (p_slice is null or upper(p_slice) = 'ALL' or slice = p_slice)
      and (p_before_at is null or created_at < p_before_at)
      and (p_after_at  is null or created_at > p_after_at);
    get diagnostics v_del_count = row_count;
    entity_table := 'dev_demo_seed_registry';
    deleted_count := v_del_count;
    return next;
  end if;

end;
$$;

comment on function public.demo_cleanup_data(timestamptz, timestamptz, text, boolean) is
  'DEMO ONLY. Deletes demo seed entities in safe FK dependency order. '
  'Default p_dry_run=true — inspect the count table before setting p_dry_run=>false. '
  '
  Examples:
    -- Preview what would be deleted for all demo data:
    select * from demo_cleanup_data();

    -- Delete only live drops created today, without touching static seed:
    select * from demo_cleanup_data(p_slice=>''demo_live_drops'',
                                     p_after_at=>current_date::timestamptz,
                                     p_dry_run=>false);

    -- Delete everything (wipe demo database):
    select * from demo_cleanup_data(p_slice=>''ALL'', p_dry_run=>false);

  Requires service_role or postgres.';

revoke all on function public.demo_cleanup_data(timestamptz, timestamptz, text, boolean) from public;
grant execute on function public.demo_cleanup_data(timestamptz, timestamptz, text, boolean) to service_role;

-- =============================================================================
-- SECTION 40 — demo_refresh_static_drops()
-- Rolls forward date-sensitive static seed rows (D11–D17, today's orders, holds).
-- Use before each demo — re-running parts 2–3 does NOT update dates (on conflict).
-- =============================================================================

create or replace function public.demo_refresh_static_drops()
returns table (entity text, updated_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
  v_today_start timestamptz := (current_date || ' 12:30:00')::timestamptz;
  v_today_end   timestamptz := (current_date || ' 15:30:00')::timestamptz;
  v_tmrw_start  timestamptz := ((current_date + 1) || ' 13:30:00')::timestamptz;
  v_tmrw_end    timestamptz := ((current_date + 1) || ' 16:30:00')::timestamptz;
  v_tmrw_pub    timestamptz := ((current_date + 1) || ' 11:00:00')::timestamptz;
begin
  -- Today's active drops (D11–D15): pickup tonight, status ACTIVE
  update drop_drop
  set drop_status_code = 'ACTIVE',
      pickup_start_at  = v_today_start,
      pickup_end_at    = v_today_end,
      published_at     = now() - interval '3 hours',
      updated_at       = now()
  where drop_drop_pk in (
    '20000000-0000-0000-0000-700000000011',
    '20000000-0000-0000-0000-700000000012',
    '20000000-0000-0000-0000-700000000013',
    '20000000-0000-0000-0000-700000000014',
    '20000000-0000-0000-0000-700000000015'
  );
  get diagnostics v_count = row_count;
  entity := 'drop_drop (today D11–D15)';
  updated_count := v_count;
  return next;

  -- Tomorrow's scheduled drops (D16–D17)
  update drop_drop
  set drop_status_code = 'SCHEDULED',
      pickup_start_at  = v_tmrw_start,
      pickup_end_at    = v_tmrw_end,
      publish_at       = v_tmrw_pub,
      updated_at       = now()
  where drop_drop_pk in (
    '20000000-0000-0000-0000-700000000016',
    '20000000-0000-0000-0000-700000000017'
  );
  get diagnostics v_count = row_count;
  entity := 'drop_drop (tomorrow D16–D17)';
  updated_count := v_count;
  return next;

  -- Confirmed orders on today's drops (O26–O28)
  update order_order
  set pickup_window_start_at = v_today_start,
      pickup_window_end_at   = v_today_end,
      updated_at             = now()
  where order_order_pk in (
    '20000000-0000-0000-0000-800000000026',
    '20000000-0000-0000-0000-800000000027',
    '20000000-0000-0000-0000-800000000028'
  );
  get diagnostics v_count = row_count;
  entity := 'order_order (today O26–O28)';
  updated_count := v_count;
  return next;

  -- Active checkout holds (Arjun, Deepa, Vikram)
  update drop_inventory_hold
  set expires_at = now() + interval '8 minutes',
      updated_at = now()
  where drop_inventory_hold_pk = '20000000-0000-0000-0000-900000000001';

  update drop_inventory_hold
  set expires_at = now() + interval '12 minutes',
      updated_at = now()
  where drop_inventory_hold_pk = '20000000-0000-0000-0000-900000000002';

  update drop_inventory_hold
  set expires_at = now() + interval '4 minutes',
      updated_at = now()
  where drop_inventory_hold_pk = '20000000-0000-0000-0000-900000000003';

  get diagnostics v_count = row_count;
  select count(*) into v_count
  from drop_inventory_hold
  where drop_inventory_hold_pk in (
    '20000000-0000-0000-0000-900000000001',
    '20000000-0000-0000-0000-900000000002',
    '20000000-0000-0000-0000-900000000003'
  );
  entity := 'drop_inventory_hold (active H01–H03)';
  updated_count := v_count;
  return next;
end;
$$;

comment on function public.demo_refresh_static_drops() is
  'DEMO ONLY. Rolls pickup windows on static seed drops D11–D17, orders O26–O28, '
  'and active holds H01–H03 to today/tomorrow. Call before each demo session. '
  'Re-running seed parts 2–3 will NOT refresh dates (ON CONFLICT DO NOTHING).';

revoke all on function public.demo_refresh_static_drops() from public;
grant execute on function public.demo_refresh_static_drops() to service_role;

-- =============================================================================
-- SECTION 41 — demo_prepare_for_demo()
-- One-call pre-demo orchestrator: optional live-drop cleanup + static refresh.
-- =============================================================================

create or replace function public.demo_prepare_for_demo(
  p_cleanup_live_drops boolean default true,
  p_create_live_drops  boolean default false
)
returns table (step text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if p_cleanup_live_drops then
    for v_row in
      select * from demo_cleanup_data(
        p_slice    => 'demo_live_drops',
        p_dry_run  => false
      )
      where deleted_count > 0
    loop
      step := 'cleanup';
      detail := v_row.entity_table || ': ' || v_row.deleted_count::text || ' deleted';
      return next;
    end loop;

    if not found then
      step := 'cleanup';
      detail := 'no live-drop batches to remove';
      return next;
    end if;
  else
    step := 'cleanup';
    detail := 'skipped (p_cleanup_live_drops=false)';
    return next;
  end if;

  for v_row in select * from demo_refresh_static_drops() loop
    step := 'refresh_static';
    detail := v_row.entity || ': ' || v_row.updated_count::text || ' updated';
    return next;
  end loop;

  if p_create_live_drops then
    for v_row in select * from demo_create_live_drops() loop
      step := 'create_live';
      detail := v_row.restaurant_name || ' — ' || v_row.drop_title;
      return next;
    end loop;
  else
    step := 'create_live';
    detail := 'skipped (p_create_live_drops=false)';
    return next;
  end if;
end;
$$;

comment on function public.demo_prepare_for_demo(boolean, boolean) is
  'DEMO ONLY. Run before each demo: optionally remove prior demo_create_live_drops '
  'batches, refresh static D11–D17 dates, optionally add a fresh live-drop batch.';

revoke all on function public.demo_prepare_for_demo(boolean, boolean) from public;
grant execute on function public.demo_prepare_for_demo(boolean, boolean) to service_role;

commit;
