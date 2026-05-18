-- Deterministic Slice 3 drop publishing demo rows.
-- Run after Slice 2 demo rows so the approved Biryani Baithak restaurant exists.

with restaurant as (
  select restaurant_restaurant_pk, owner_profile_fk
  from restaurant_restaurant
  where restaurant_restaurant_pk = '20000000-0000-0000-0000-000000000001'::uuid
),
template_insert as (
  insert into catalog_bag_template (
    catalog_bag_template_pk,
    restaurant_fk,
    template_name,
    template_status_code,
    created_by_profile_fk,
    created_at,
    updated_at
  )
  select
    '31000000-0000-0000-0000-000000000001'::uuid,
    restaurant_restaurant_pk,
    'Hyderabadi Chef Selection',
    'ACTIVE',
    owner_profile_fk,
    '2026-05-13T00:00:00Z',
    '2026-05-13T00:00:00Z'
  from restaurant
  on conflict (catalog_bag_template_pk) do update
  set template_name = excluded.template_name,
      template_status_code = excluded.template_status_code,
      updated_at = excluded.updated_at
  returning catalog_bag_template_pk, created_by_profile_fk
),
revision_insert as (
  insert into catalog_bag_template_revision (
    catalog_bag_template_revision_pk,
    catalog_bag_template_fk,
    revision_number,
    display_name,
    short_description,
    dietary_category_code,
    spice_level_code,
    serves_min,
    serves_max,
    max_holding_minutes,
    holding_guidance_text,
    min_menu_value_paise,
    suggested_price_paise,
    allergen_summary_text,
    included_item_hint_text,
    revision_status_code,
    published_at,
    created_by_profile_fk,
    created_at,
    updated_at
  )
  select
    '32000000-0000-0000-0000-000000000001'::uuid,
    catalog_bag_template_pk,
    1,
    'Hyderabadi BAM Bag',
    'Chef-curated same-day selection from the Biryani Baithak kitchen.',
    'NON_VEG',
    'MEDIUM',
    1,
    1,
    120,
    'Pickup during the window and consume within 2 hours.',
    64900,
    34900,
    'Contains dairy and may contain wheat/gluten.',
    'Includes a rice-led chef selection and a kitchen-picked side.',
    'PUBLISHED',
    '2026-05-13T00:00:00Z',
    created_by_profile_fk,
    '2026-05-13T00:00:00Z',
    '2026-05-13T00:00:00Z'
  from template_insert
  on conflict (catalog_bag_template_revision_pk) do update
  set display_name = excluded.display_name,
      short_description = excluded.short_description,
      dietary_category_code = excluded.dietary_category_code,
      spice_level_code = excluded.spice_level_code,
      serves_min = excluded.serves_min,
      serves_max = excluded.serves_max,
      max_holding_minutes = excluded.max_holding_minutes,
      holding_guidance_text = excluded.holding_guidance_text,
      min_menu_value_paise = excluded.min_menu_value_paise,
      suggested_price_paise = excluded.suggested_price_paise,
      allergen_summary_text = excluded.allergen_summary_text,
      included_item_hint_text = excluded.included_item_hint_text,
      revision_status_code = excluded.revision_status_code,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at
  returning catalog_bag_template_revision_pk, catalog_bag_template_fk
)
update catalog_bag_template t
set active_revision_fk = r.catalog_bag_template_revision_pk,
    updated_at = '2026-05-13T00:00:00Z'
from revision_insert r
where t.catalog_bag_template_pk = r.catalog_bag_template_fk;

insert into catalog_bag_template_allergen (
  catalog_bag_template_revision_fk,
  master_allergen_fk,
  contains_flag,
  may_contain_flag,
  created_at,
  updated_at
)
select
  '32000000-0000-0000-0000-000000000001'::uuid,
  master_allergen_pk,
  allergen_code = 'DAIRY',
  allergen_code = 'WHEAT_GLUTEN',
  '2026-05-13T00:00:00Z',
  '2026-05-13T00:00:00Z'
from master_allergen
where allergen_code in ('DAIRY', 'WHEAT_GLUTEN')
on conflict (catalog_bag_template_revision_fk, master_allergen_fk) do update
set contains_flag = excluded.contains_flag,
    may_contain_flag = excluded.may_contain_flag,
    updated_at = excluded.updated_at;

insert into drop_drop (
  drop_drop_pk,
  restaurant_fk,
  catalog_bag_template_revision_fk,
  drop_title,
  drop_status_code,
  drop_type_code,
  geo_city_fk,
  geo_neighborhood_fk,
  quantity_total,
  quantity_reserved,
  quantity_sold,
  quantity_collected,
  price_paise,
  publish_at,
  pickup_start_at,
  pickup_end_at,
  visibility_code,
  created_by_profile_fk,
  published_by_profile_fk,
  published_at,
  created_at,
  updated_at
)
select
  '33000000-0000-0000-0000-000000000001'::uuid,
  restaurant_restaurant_pk,
  '32000000-0000-0000-0000-000000000001'::uuid,
  'Hyderabadi BAM Bag',
  'ACTIVE',
  'STANDARD',
  geo_city_fk,
  geo_neighborhood_fk,
  10,
  0,
  2,
  0,
  34900,
  '2026-05-13T12:30:00Z',
  '2026-05-13T13:30:00Z',
  '2026-05-13T15:00:00Z',
  'PUBLIC',
  owner_profile_fk,
  owner_profile_fk,
  '2026-05-13T12:30:00Z',
  '2026-05-13T00:00:00Z',
  '2026-05-13T00:00:00Z'
from restaurant_restaurant
where restaurant_restaurant_pk = '20000000-0000-0000-0000-000000000001'::uuid
on conflict (drop_drop_pk) do update
set drop_status_code = excluded.drop_status_code,
    quantity_total = excluded.quantity_total,
    quantity_reserved = excluded.quantity_reserved,
    quantity_sold = excluded.quantity_sold,
    price_paise = excluded.price_paise,
    pickup_start_at = excluded.pickup_start_at,
    pickup_end_at = excluded.pickup_end_at,
    updated_at = excluded.updated_at;

insert into dev_demo_seed_registry (seed_key, entity_table, entity_id, slice, created_at)
values
  ('slice3-template:31000000-0000-0000-0000-000000000001', 'catalog_bag_template', '31000000-0000-0000-0000-000000000001'::uuid, 'slice3_drop_publishing', '2026-05-13T00:00:00Z'),
  ('slice3-revision:32000000-0000-0000-0000-000000000001', 'catalog_bag_template_revision', '32000000-0000-0000-0000-000000000001'::uuid, 'slice3_drop_publishing', '2026-05-13T00:00:00Z'),
  ('slice3-drop:33000000-0000-0000-0000-000000000001', 'drop_drop', '33000000-0000-0000-0000-000000000001'::uuid, 'slice3_drop_publishing', '2026-05-13T00:00:00Z')
on conflict (seed_key) do update set created_at = excluded.created_at;
