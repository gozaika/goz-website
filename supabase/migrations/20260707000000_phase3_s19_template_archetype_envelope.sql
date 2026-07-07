-- Phase 3 §19 — template archetype + allergen envelope (the one non-cosmetic change).
-- Append-only, additive columns only (nullable) so this is safe to apply to a live DB and
-- does not touch existing rows. See docs/audit/business-model-audit.md §19/§16/§14/§24.
--
-- Two internal-only fields:
--   1. catalog_bag_template_revision.archetype_item_count — the reusable archetype's target
--      number of distinct items (e.g. a "3-item flight"). This is a RESTAURANT/OPS composition
--      guide only. It MUST NEVER surface to consumers as a promised dish/serving count (§14) and
--      templates must stay loose archetypes, not rigid recipes (§24). It lives on the immutable
--      revision so it versions with the rest of the archetype shape (dietary/portion/envelope) and
--      travels with the exact revision a drop pins.
--   2. drop_drop.internal_fill_note — an internal ops record of how today's actual surplus filled
--      the archetype. Never surfaced to consumers. The template's allergen rows are the declared
--      "envelope" (union of anything that could ever be in the archetype); a per-drop fill is meant
--      to stay bounded within it so a same-envelope swap can never violate a customer's disclosed
--      allergens (§16). This note records the fill for guidance/audit; structured slots are deferred.

alter table catalog_bag_template_revision
  add column if not exists archetype_item_count integer;

alter table catalog_bag_template_revision
  drop constraint if exists ck_catalog_bag_revision_archetype_item_count;

alter table catalog_bag_template_revision
  add constraint ck_catalog_bag_revision_archetype_item_count
    check (archetype_item_count is null or archetype_item_count between 1 and 20);

comment on column catalog_bag_template_revision.archetype_item_count is
  'INTERNAL composition guide: the archetype''s target number of distinct items (e.g. a 3-item flight). '
  'Restaurant/ops-only — NEVER shown to consumers as a promised dish/serving count (business-model-audit §14) '
  'and never a rigid recipe (§24). Guides drop-time fill; nullable for archetypes that do not fix a count.';

alter table drop_drop
  add column if not exists internal_fill_note text;

alter table drop_drop
  drop constraint if exists ck_drop_internal_fill_note_len;

alter table drop_drop
  add constraint ck_drop_internal_fill_note_len
    check (internal_fill_note is null or char_length(internal_fill_note) <= 500);

comment on column drop_drop.internal_fill_note is
  'INTERNAL ops note: how today''s actual surplus filled the archetype for this drop (business-model-audit §19). '
  'Never surfaced to consumers. The pinned template revision''s allergen rows are the declared allergen envelope; '
  'a fill should stay bounded within it (§16). Free-text for now; structured fill slots are deferred.';
