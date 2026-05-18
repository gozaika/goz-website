-- Slice 3: First Drop Publishing & Consumer Discovery
-- Expands the public drop contract so consumer discovery can render real,
-- safety-critical BAM Bag disclosures from published template revisions.

drop view if exists api_public_drop_card;

create or replace view api_public_drop_card
with (security_barrier = true) as
select
  d.drop_drop_pk,
  d.drop_title,
  d.drop_status_code,
  d.drop_type_code,
  d.quantity_total,
  d.computed_quantity_available,
  d.price_paise,
  d.pickup_start_at,
  d.pickup_end_at,
  d.geo_city_fk,
  gc.city_code,
  gc.city_name,
  gn.neighborhood_name,
  r.restaurant_restaurant_pk,
  r.restaurant_slug,
  r.restaurant_name,
  rp.headline as restaurant_headline,
  rp.hero_storage_object_fk,
  rev.catalog_bag_template_revision_pk,
  rev.display_name as bag_display_name,
  rev.short_description as bag_short_description,
  rev.dietary_category_code,
  rev.spice_level_code,
  rev.serves_min,
  rev.serves_max,
  rev.max_holding_minutes,
  rev.holding_guidance_text,
  rev.min_menu_value_paise,
  rev.allergen_summary_text,
  coalesce(
    array_remove(array_agg(ma.allergen_code order by ma.sort_order) filter (where ma.allergen_code is not null), null),
    array[]::text[]
  ) as allergen_codes
from drop_drop d
join restaurant_restaurant r
  on r.restaurant_restaurant_pk = d.restaurant_fk
join catalog_bag_template_revision rev
  on rev.catalog_bag_template_revision_pk = d.catalog_bag_template_revision_fk
join geo_city gc
  on gc.geo_city_pk = d.geo_city_fk
left join restaurant_public_profile rp
  on rp.restaurant_fk = r.restaurant_restaurant_pk
left join geo_neighborhood gn
  on gn.geo_neighborhood_pk = d.geo_neighborhood_fk
left join catalog_bag_template_allergen bta
  on bta.catalog_bag_template_revision_fk = rev.catalog_bag_template_revision_pk
  and (bta.contains_flag or bta.may_contain_flag)
left join master_allergen ma
  on ma.master_allergen_pk = bta.master_allergen_fk
where public.rls_drop_is_public(d.drop_drop_pk)
group by
  d.drop_drop_pk,
  d.drop_title,
  d.drop_status_code,
  d.drop_type_code,
  d.quantity_total,
  d.computed_quantity_available,
  d.price_paise,
  d.pickup_start_at,
  d.pickup_end_at,
  d.geo_city_fk,
  gc.city_code,
  gc.city_name,
  gn.neighborhood_name,
  r.restaurant_restaurant_pk,
  r.restaurant_slug,
  r.restaurant_name,
  rp.headline,
  rp.hero_storage_object_fk,
  rev.catalog_bag_template_revision_pk,
  rev.display_name,
  rev.short_description,
  rev.dietary_category_code,
  rev.spice_level_code,
  rev.serves_min,
  rev.serves_max,
  rev.max_holding_minutes,
  rev.holding_guidance_text,
  rev.min_menu_value_paise,
  rev.allergen_summary_text;

comment on view api_public_drop_card is
  'Safe public discovery card/detail shape for Slice 3. Includes template disclosure fields required before any claim/payment flow.';

grant select on api_public_drop_card to anon, authenticated;
