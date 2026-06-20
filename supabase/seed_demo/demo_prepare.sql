-- =============================================================================
-- goZaika Demo Prepare  |  seed_demo/demo_prepare.sql
-- =============================================================================
-- Run this BEFORE each demo session (not the full seed parts 1–4).
--
-- Prerequisites: parts 1–4 must have been run at least once so functions exist.
--
-- What it does:
--   1. Removes prior demo_create_live_drops() batches (keeps static seed)
--   2. Rolls D11–D17 pickup windows, O26–O28 orders, H01–H03 holds to today
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/seed_demo/demo_prepare.sql
--
-- Or from Supabase SQL editor (service role):
--   select * from demo_prepare_for_demo();
-- =============================================================================

select * from demo_prepare_for_demo(
  p_cleanup_live_drops => true,
  p_create_live_drops  => false
);
