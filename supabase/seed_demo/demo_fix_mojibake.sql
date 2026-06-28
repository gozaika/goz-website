-- =============================================================================
-- goZaika Demo Mojibake Repair  |  seed_demo/demo_fix_mojibake.sql
-- =============================================================================
-- Repairs em-dash mojibake in the demo copy.
--
-- Root cause: when seed parts 1-2 are applied through a non-UTF-8 psql client
-- (the Windows default code page), the em-dash characters ('—', U+2014, a
-- 3-byte UTF-8 sequence) in the demo copy are mangled into the literal three
-- characters '???'. The seed SOURCE is correct UTF-8 (e.g.
-- demo_seed.sql:643) — only the applied rows are wrong.
--
-- Why a blanket replace('???','—') is safe HERE (and only here): every
-- non-ASCII character used in the prose copy of these three columns in the demo
-- seed is an em-dash (audited 2026-06-27 — no en-dashes, ellipses, or accents
-- appear in story_markdown / headline / short_description / included_item_hint_text
-- / drop_title). Each '???' run therefore maps 1:1 back to a single '—'.
-- Do NOT generalise this to other columns without re-auditing.
--
-- Idempotent + guarded: only rows still containing '???' are touched, so it is
-- safe to run repeatedly (e.g. after every full seed apply on a fresh DB).
--
-- Usage (service role):
--   psql "$DATABASE_URL" -f supabase/seed_demo/demo_fix_mojibake.sql
-- Or apply via PostgREST PATCH per row (see scripts in the D1 record).
-- =============================================================================

update restaurant_public_profile
   set headline = replace(headline, '???', '—')
 where headline like '%???%';

update restaurant_public_profile
   set story_markdown = replace(story_markdown, '???', '—')
 where story_markdown like '%???%';

update catalog_bag_template_revision
   set short_description = replace(short_description, '???', '—')
 where short_description like '%???%';

update catalog_bag_template_revision
   set included_item_hint_text = replace(included_item_hint_text, '???', '—')
 where included_item_hint_text like '%???%';

update drop_drop
   set drop_title = replace(drop_title, '???', '—')
 where drop_title like '%???%';
