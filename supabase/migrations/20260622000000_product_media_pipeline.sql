-- Product media pipeline: private ingest, verified public renditions, and
-- public discovery read-model metadata. Upload sessions are service-only;
-- restaurant authorization remains in the BFF before service-role writes.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media-ingest',
  'media-ingest',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table storage_object
  add column if not exists width_px integer,
  add column if not exists height_px integer,
  add column if not exists alt_text text,
  add column if not exists media_status_code text not null default 'READY';

alter table storage_object
  drop constraint if exists ck_storage_object_dimensions;
alter table storage_object
  add constraint ck_storage_object_dimensions
  check (
    (width_px is null and height_px is null)
    or (width_px > 0 and height_px > 0)
  );

alter table storage_object
  drop constraint if exists ck_storage_object_alt_text;
alter table storage_object
  add constraint ck_storage_object_alt_text
  check (alt_text is null or char_length(trim(alt_text)) between 1 and 240);

alter table storage_object
  drop constraint if exists ck_storage_object_media_status;
alter table storage_object
  add constraint ck_storage_object_media_status
  check (media_status_code in ('READY', 'SUPERSEDED', 'DELETED'));

comment on column storage_object.width_px is 'Verified raster width for image objects; null for non-image storage.';
comment on column storage_object.height_px is 'Verified raster height for image objects; null for non-image storage.';
comment on column storage_object.alt_text is 'Human-authored concise description for accessible product-media rendering.';
comment on column storage_object.media_status_code is 'READY can be served; SUPERSEDED is retained for history; DELETED is detached and pending/complete binary removal.';

create table media_upload_session (
  media_upload_session_pk      uuid        not null default gen_random_uuid(),
  restaurant_fk               uuid        not null,
  drop_fk                     uuid,
  target_code                 text        not null,
  ingest_bucket_name          text        not null default 'media-ingest',
  ingest_object_path          text        not null,
  original_filename           text        not null,
  declared_mime_type          text        not null,
  declared_size_bytes         bigint      not null,
  alt_text                    text        not null,
  upload_status_code          text        not null default 'PENDING_UPLOAD',
  failure_reason_code         text,
  created_by_profile_fk       uuid        not null,
  completed_storage_object_fk uuid,
  expires_at                  timestamptz not null default (now() + interval '30 minutes'),
  completed_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint media_upload_session_pk primary key (media_upload_session_pk),
  constraint uq_media_upload_session_ingest unique (ingest_bucket_name, ingest_object_path),
  constraint fk_media_upload_session_restaurant foreign key (restaurant_fk)
    references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  constraint fk_media_upload_session_drop foreign key (drop_fk)
    references drop_drop (drop_drop_pk) on delete cascade,
  constraint fk_media_upload_session_creator foreign key (created_by_profile_fk)
    references iam_profile (iam_profile_pk) on delete restrict,
  constraint fk_media_upload_session_completed_object foreign key (completed_storage_object_fk)
    references storage_object (storage_object_pk) on delete set null,
  constraint ck_media_upload_session_target check (target_code in ('RESTAURANT_HERO', 'RESTAURANT_LOGO', 'DROP_PRIMARY')),
  constraint ck_media_upload_session_mime check (declared_mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint ck_media_upload_session_size check (declared_size_bytes between 1 and 8388608),
  constraint ck_media_upload_session_alt check (char_length(trim(alt_text)) between 1 and 240),
  constraint ck_media_upload_session_status check (upload_status_code in ('PENDING_UPLOAD', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED')),
  constraint ck_media_upload_session_target_entity check (
    (target_code in ('RESTAURANT_HERO', 'RESTAURANT_LOGO') and drop_fk is null)
    or (target_code = 'DROP_PRIMARY' and drop_fk is not null)
  )
);

comment on table media_upload_session is
  'Short-lived, service-only authorization record for product-media ingestion. '
  'The browser uploads to a private bucket; the BFF verifies bytes and creates a normalized public rendition before attachment.';

create index idx_media_upload_session_actor_status
  on media_upload_session (created_by_profile_fk, upload_status_code, expires_at);
create index idx_media_upload_session_restaurant
  on media_upload_session (restaurant_fk, created_at desc);

alter table media_upload_session enable row level security;
revoke all on media_upload_session from public, anon, authenticated;
grant select, insert, update, delete on media_upload_session to service_role;

create unique index if not exists uq_drop_media_primary
  on drop_media (drop_fk) where media_role_code = 'PRIMARY';
create unique index if not exists uq_catalog_bag_template_media_primary
  on catalog_bag_template_media (catalog_bag_template_revision_fk) where media_role_code = 'PRIMARY';

create or replace view api_public_drop_card
with (security_barrier = true) as
select
  d.drop_drop_pk,
  d.drop_drop_pk as drop_id,
  d.drop_title,
  d.drop_status_code,
  d.drop_type_code,
  d.quantity_total,
  d.computed_quantity_available,
  d.computed_quantity_available as available_quantity,
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
  ) as allergen_codes,
  media.bucket_name as image_bucket_name,
  media.object_path as image_object_path,
  media.width_px as image_width_px,
  media.height_px as image_height_px,
  media.alt_text as image_alt_text
from drop_drop d
join restaurant_restaurant r on r.restaurant_restaurant_pk = d.restaurant_fk
join catalog_bag_template_revision rev on rev.catalog_bag_template_revision_pk = d.catalog_bag_template_revision_fk
join geo_city gc on gc.geo_city_pk = d.geo_city_fk
left join restaurant_public_profile rp on rp.restaurant_fk = r.restaurant_restaurant_pk
left join geo_neighborhood gn on gn.geo_neighborhood_pk = d.geo_neighborhood_fk
left join catalog_bag_template_allergen bta
  on bta.catalog_bag_template_revision_fk = rev.catalog_bag_template_revision_pk
  and (bta.contains_flag or bta.may_contain_flag)
left join master_allergen ma on ma.master_allergen_pk = bta.master_allergen_fk
left join lateral (
  select candidate.bucket_name, candidate.object_path, candidate.width_px, candidate.height_px, candidate.alt_text
  from (
    select 1 as priority, so.bucket_name, so.object_path, so.width_px, so.height_px, so.alt_text
    from drop_media dm
    join storage_object so on so.storage_object_pk = dm.storage_object_fk
    where dm.drop_fk = d.drop_drop_pk
      and dm.media_role_code = 'PRIMARY'
      and so.media_status_code = 'READY'
      and so.bucket_name = 'public-media'
    union all
    select 2 as priority, so.bucket_name, so.object_path, so.width_px, so.height_px, so.alt_text
    from catalog_bag_template_media ctm
    join storage_object so on so.storage_object_pk = ctm.storage_object_fk
    where ctm.catalog_bag_template_revision_fk = rev.catalog_bag_template_revision_pk
      and ctm.media_role_code = 'PRIMARY'
      and so.media_status_code = 'READY'
      and so.bucket_name = 'public-media'
  ) candidate
  order by candidate.priority
  limit 1
) media on true
where public.rls_drop_is_public(d.drop_drop_pk)
group by
  d.drop_drop_pk, d.drop_title, d.drop_status_code, d.drop_type_code,
  d.quantity_total, d.computed_quantity_available, d.price_paise,
  d.pickup_start_at, d.pickup_end_at, d.geo_city_fk,
  gc.city_code, gc.city_name, gn.neighborhood_name,
  r.restaurant_restaurant_pk, r.restaurant_slug, r.restaurant_name,
  rp.headline, rp.hero_storage_object_fk,
  rev.catalog_bag_template_revision_pk, rev.display_name, rev.short_description,
  rev.dietary_category_code, rev.spice_level_code, rev.serves_min, rev.serves_max,
  rev.max_holding_minutes, rev.holding_guidance_text, rev.min_menu_value_paise,
  rev.allergen_summary_text,
  media.bucket_name, media.object_path, media.width_px, media.height_px, media.alt_text;

comment on view api_public_drop_card is
  'Safe public drop discovery model with one READY image: drop PRIMARY first, then immutable template-revision PRIMARY.';
grant select on api_public_drop_card to anon, authenticated, service_role;

create or replace view api_public_restaurant_profile
with (security_barrier = true) as
select
  r.restaurant_restaurant_pk,
  r.restaurant_slug,
  r.restaurant_name,
  r.average_rating,
  r.rating_count,
  r.geo_city_fk,
  gc.city_name,
  r.geo_neighborhood_fk,
  gn.neighborhood_name,
  r.pickup_instructions,
  rp.headline,
  rp.story_markdown,
  rp.hero_storage_object_fk,
  rp.logo_storage_object_fk,
  rp.is_featured,
  rp.published_at,
  ga.latitude,
  ga.longitude,
  hero.bucket_name as hero_bucket_name,
  hero.object_path as hero_object_path,
  hero.width_px as hero_width_px,
  hero.height_px as hero_height_px,
  hero.alt_text as hero_alt_text,
  logo.bucket_name as logo_bucket_name,
  logo.object_path as logo_object_path,
  logo.width_px as logo_width_px,
  logo.height_px as logo_height_px,
  logo.alt_text as logo_alt_text
from restaurant_restaurant r
left join restaurant_public_profile rp on rp.restaurant_fk = r.restaurant_restaurant_pk
left join geo_city gc on gc.geo_city_pk = r.geo_city_fk
left join geo_neighborhood gn on gn.geo_neighborhood_pk = r.geo_neighborhood_fk
left join geo_address ga on ga.geo_address_pk = r.geo_address_fk
left join storage_object hero
  on hero.storage_object_pk = rp.hero_storage_object_fk
  and hero.media_status_code = 'READY'
  and hero.bucket_name = 'public-media'
left join storage_object logo
  on logo.storage_object_pk = rp.logo_storage_object_fk
  and logo.media_status_code = 'READY'
  and logo.bucket_name = 'public-media'
where public.rls_restaurant_is_public(r.restaurant_restaurant_pk);

comment on view api_public_restaurant_profile is
  'Safe public restaurant profile with verified READY hero/logo rendition metadata and map coordinates.';
grant select on api_public_restaurant_profile to anon, authenticated, service_role;

commit;
