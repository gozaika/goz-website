-- =============================================================================
-- marketing_video_overlay.sql  —  Deterministic guarantees for the marketing
-- video capture package (.codex-artifacts/gozaika-marketing-videos).
-- -----------------------------------------------------------------------------
-- LOCAL / TEST ONLY. Idempotent. Run AFTER the canonical demo seeds
-- (demo_seed.sql parts 1-4 + demo_test_otp_linkage.sql) and the functional seeds
-- (slice13_active_template.sql + slice7_counter_pickup_order.sql).
--
-- It pins exactly the two stateful screens the capture flows depend on so a run is
-- reproducible regardless of wall-clock time or prior capture runs:
--   1. A premium HERO drop that is ACTIVE, PUBLIC, claimable, with an OPEN pickup
--      window — for the customer claim journey (Video A).
--   2. The counter pickup order (GZ-SMOKE-0001) reset to READY_FOR_PICKUP with an
--      OPEN window and a known OTP — for the counter verification journey (Video B).
--
-- It owns no new rows — it only re-pins the state of existing demo rows (the hero
-- drop and the counter order), and never deletes shared demo data. Re-running it is
-- always safe.
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 0. Keep every ACTIVE drop discoverable through the capture window, so the
--    consumer "browse" scene reliably shows a full list regardless of wall-clock
--    time (the static seed pins windows to a fixed UTC slot that may already be past).
-- -----------------------------------------------------------------------------
update drop_drop set
  pickup_start_at = now() - interval '1 hour',
  pickup_end_at   = now() + interval '4 hours',
  updated_at      = now()
where drop_status_code = 'ACTIVE';

-- -----------------------------------------------------------------------------
-- 1. HERO drop — Sattvik Kitchen "Full Veg Thali Bag" (D12), Banjara Hills.
--    Chosen so the marketing consumer (Asha → Karthik slot, PLATINUM Passport) has
--    NO prior order of this bag — keeping the post-claim orders list collision-free
--    (the only active bag that slot has never ordered). VEG with a clean allergen card
--    (DAIRY / WHEAT_GLUTEN / SOY) suits the allergy-aware persona. High quantity so
--    repeated capture runs always leave a claimable bag; window forced open around now().
-- -----------------------------------------------------------------------------
update drop_drop set
  drop_status_code  = 'ACTIVE',
  visibility_code   = 'PUBLIC',
  quantity_total    = 50,
  quantity_reserved = 0,
  quantity_sold     = 0,
  quantity_collected = 0,
  pickup_start_at   = now() - interval '1 hour',
  pickup_end_at     = now() + interval '4 hours',
  updated_at        = now()
where drop_drop_pk = '20000000-0000-0000-0000-700000000012';

-- -----------------------------------------------------------------------------
-- 2. COUNTER order — GZ-SMOKE-0001 on Bawarchi Biryani Palace. Reset to a
--    verifiable state: READY_FOR_PICKUP, open window, OTP hash = sha256(secret:OTP)
--    with secret = local-smoke-pickup-secret-0123456789-abcdef and OTP = 246810.
--    The restaurant BFF must run with PICKUP_CREDENTIAL_SECRET set to that secret.
-- -----------------------------------------------------------------------------
update order_order set
  order_status_code      = 'READY_FOR_PICKUP',
  collected_at           = null,
  pickup_window_start_at = now() - interval '10 minutes',
  pickup_window_end_at   = now() + interval '3 hours',
  pickup_otp_hash        = encode(
    extensions.digest('local-smoke-pickup-secret-0123456789-abcdef' || ':' || '246810', 'sha256'), 'hex')
where order_number = 'GZ-SMOKE-0001';

-- -----------------------------------------------------------------------------
-- 3. De-brand the slice7 counter fixture's drop title so it reads on-brand if it
--    surfaces in the management ROI table (it is otherwise a fine real DRAFT row).
--    The counter screen shows the order number + bag name, not this title, so the
--    counter capture (Video B) is unaffected.
-- -----------------------------------------------------------------------------
--    Also right-size its quantities: the fixture seeds 100 listed bags purely to keep the
--    counter's quantity_collected within bounds across many smoke runs, but 100 listed/0 sold
--    badly distorts the management ROI sell-through. 12 listed keeps the counter happy
--    (collected only ever increments by 1 per run) and reads honestly in the report.
--    Status → PICKUP_CLOSED so "12 sold / 100%" reads as a clean closed, sold-out historical
--    row (a DRAFT drop showing sales looks inconsistent). PICKUP_CLOSED hides it from consumer
--    discovery and does not affect the counter, which keys off the order, not the drop status.
update drop_drop set
  drop_title = 'Evening Thali Chef''s Selection',
  drop_status_code = 'PICKUP_CLOSED',
  quantity_total = 12, quantity_reserved = 0, quantity_sold = 12, quantity_collected = 0,
  updated_at = now()
where drop_drop_pk = '70000000-0000-0000-0000-0000000000c1';
update order_order set snapshot_drop_title = 'Evening Thali Chef''s Selection'
where order_number = 'GZ-SMOKE-0001';

commit;

-- -----------------------------------------------------------------------------
-- Verification (the orchestrator runs these; safe to run manually):
--   select drop_status_code, quantity_total - quantity_reserved - quantity_sold as claimable,
--          pickup_end_at > now() as window_open
--   from drop_drop where drop_drop_pk = '20000000-0000-0000-0000-700000000014';
--   select order_status_code, pickup_window_end_at > now() as window_open
--   from order_order where order_number = 'GZ-SMOKE-0001';
-- -----------------------------------------------------------------------------
