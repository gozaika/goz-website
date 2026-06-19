-- Slice 9: Restaurant Discovery, Ratings & Reviews, Gamification & Discovery
-- Adds BLIND_ADVENTURE drop type, categories JSONB on review_review,
-- public reviews read view, lat/lng in public restaurant profile view,
-- and per-restaurant BLIND_ADVENTURE_ENABLED config flag support.
-- No financial, payment, settlement, or notification side effects.

begin;

-- 1. Extend drop_type_code check to include BLIND_ADVENTURE

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'ck_drop_type'
      and conrelid = 'drop_drop'::regclass
  ) then
    alter table drop_drop drop constraint ck_drop_type;
  end if;
end $$;

alter table drop_drop
  add constraint ck_drop_type
  check (drop_type_code in ('STANDARD', 'SPOTLIGHT', 'CHEF_SPECIAL', 'BLIND_ADVENTURE'));

-- 2. Add categories JSONB to review_review (optional per-category ratings)
alter table review_review
  add column if not exists categories jsonb;

comment on column review_review.categories is
  'Optional per-category ratings. Keys: food_quality, value_for_price, pickup_experience, packaging. Values: 1–5 integer. Null when consumer did not submit category ratings.';

-- 2b. Add dietary_category_code to order_order (needed by review views below)
-- Denormalized from the template revision at claim time. Nullable; backfill not required.
alter table order_order
  add column if not exists dietary_category_code text;

-- 3. Update api_public_restaurant_profile view to include lat/lng from geo_address

drop view if exists api_public_restaurant_profile;

create or replace view api_public_restaurant_profile
  with (security_barrier = true)
as
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
  ga.longitude
from restaurant_restaurant r
  left join restaurant_public_profile rp on rp.restaurant_fk = r.restaurant_restaurant_pk
  left join geo_city gc on gc.geo_city_pk = r.geo_city_fk
  left join geo_neighborhood gn on gn.geo_neighborhood_pk = r.geo_neighborhood_fk
  left join geo_address ga on ga.geo_address_pk = r.geo_address_fk
where public.rls_restaurant_is_public(r.restaurant_restaurant_pk);

comment on view api_public_restaurant_profile is
  'Safe public restaurant profile for /restaurants/[slug]. Includes lat/lng from linked geo_address for map pins. Excludes private contact, legal, compliance, payout, and team data.';

grant select on api_public_restaurant_profile to anon, authenticated, service_role;

-- 4. Create api_public_restaurant_reviews view (approved, public reviews only)

create or replace view api_public_restaurant_reviews
  with (security_barrier = true)
as
select
  rr.review_review_pk,
  rr.restaurant_fk,
  rr.order_fk,
  rr.consumer_profile_fk,
  rr.rating_value,
  rr.review_text,
  rr.categories,
  rr.moderation_status_code,
  rr.is_public,
  rr.created_at,
  rr.updated_at,
  -- masked reviewer name: "Priya K." style, built from consumer_profile
  coalesce(
    case
      when cp.first_name is not null and length(cp.first_name) > 0 then
        initcap(cp.first_name)
        || case when cp.last_name is not null and length(cp.last_name) > 0
             then ' ' || upper(left(cp.last_name, 1)) || '.'
             else ''
           end
      else 'Anonymous'
    end,
    'Anonymous'
  ) as reviewer_display_name,
  -- bag display name from order → drop → template revision
  rev.display_name as bag_display_name,
  oo.dietary_category_code as order_dietary_code
from review_review rr
  left join consumer_profile cp on cp.consumer_profile_pk = rr.consumer_profile_fk
  left join order_order oo on oo.order_order_pk = rr.order_fk
  left join drop_drop d on d.drop_drop_pk = oo.drop_fk
  left join catalog_bag_template_revision rev on rev.catalog_bag_template_revision_pk = d.catalog_bag_template_revision_fk
where rr.moderation_status_code = 'APPROVED'
  and rr.is_public = true;

comment on view api_public_restaurant_reviews is
  'Approved public reviews for consumer-facing display. Reviewer name is masked to first name + last initial. No PII beyond display name.';

grant select on api_public_restaurant_reviews to anon, authenticated, service_role;

-- 5. Create api_restaurant_own_reviews view (portal — restaurant sees own reviews)

create or replace view api_restaurant_own_reviews
  with (security_barrier = true)
as
select
  rr.review_review_pk,
  rr.restaurant_fk,
  rr.order_fk,
  rr.rating_value,
  rr.review_text,
  rr.categories,
  rr.moderation_status_code,
  rr.is_public,
  rr.created_at,
  rr.updated_at,
  coalesce(
    case
      when cp.first_name is not null and length(cp.first_name) > 0 then
        initcap(cp.first_name)
        || case when cp.last_name is not null and length(cp.last_name) > 0
             then ' ' || upper(left(cp.last_name, 1)) || '.'
             else ''
           end
      else 'Anonymous'
    end,
    'Anonymous'
  ) as reviewer_display_name,
  rev.display_name as bag_display_name,
  oo.dietary_category_code as order_dietary_code
from review_review rr
  left join consumer_profile cp on cp.consumer_profile_pk = rr.consumer_profile_fk
  left join order_order oo on oo.order_order_pk = rr.order_fk
  left join drop_drop d on d.drop_drop_pk = oo.drop_fk
  left join catalog_bag_template_revision rev on rev.catalog_bag_template_revision_pk = d.catalog_bag_template_revision_fk;

comment on view api_restaurant_own_reviews is
  'Reviews visible to the restaurant portal. Includes PENDING, APPROVED, REJECTED, HIDDEN. No moderation actions from this view.';

grant select on api_restaurant_own_reviews to service_role;

-- 6. RLS policies for review_review

-- Allow authenticated consumers to insert their own review
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'review_review'
      and policyname = 'consumer_insert_own_review'
  ) then
    execute $pol$
      create policy consumer_insert_own_review on review_review
        for insert
        to authenticated
        with check (
          consumer_profile_fk in (
            select cp.consumer_profile_pk
            from consumer_profile cp
            join iam_profile ip on ip.iam_profile_pk = cp.iam_profile_fk
            where ip.auth_user_fk = auth.uid()
          )
        )
    $pol$;
  end if;
end $$;

-- Allow authenticated consumers to read their own reviews
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'review_review'
      and policyname = 'consumer_read_own_review'
  ) then
    execute $pol$
      create policy consumer_read_own_review on review_review
        for select
        to authenticated
        using (
          consumer_profile_fk in (
            select cp.consumer_profile_pk
            from consumer_profile cp
            join iam_profile ip on ip.iam_profile_pk = cp.iam_profile_fk
            where ip.auth_user_fk = auth.uid()
          )
        )
    $pol$;
  end if;
end $$;

-- Enable RLS on review_review if not already enabled
do $$
begin
  if not exists (
    select 1 from pg_tables
    where tablename = 'review_review'
      and rowsecurity = true
  ) then
    alter table review_review enable row level security;
  end if;
end $$;

commit;
