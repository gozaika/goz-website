-- Phase 3 §20: "Order Again" — post-taste full-price reorder on the EXISTING
-- drops -> hold -> pay -> pickup rails (see docs/audits/2026-07-05-launch-readiness/business-model-strategy.md §20/§24).
--
-- Design (reuse rails, not a new ordering engine):
--   * The reorderable unit is the bag TEMPLATE (no dish-level SKUs exist) — a reorder
--     re-buys the same template revision the customer already tasted.
--   * A reorder is an on-demand PRIVATE (INTERNAL_ONLY), single-bag, FULL-PRICE drop of
--     that revision for the restaurant's next pickup window. It is hidden from public
--     discovery (api_public_drop_card filters visibility='PUBLIC') and never promises a
--     dish/serving count (§14) — it re-buys the same archetype at full menu value, which
--     is exactly what §24's anti-cannibalization needs (full price, no surprise gamble).
--   * It then flows through the UNCHANGED hold -> checkout(simulator) -> pickup-OTP rails,
--     so it lands in the same Orders/counter queue restaurants already use.
--   * The reorder->source link lives on drop_drop.reorder_source_order_fk (internal only).
--     That link IS the sample->reorder ROI instrumentation (§20).
--
-- Append-only + nullable; no existing column/row is mutated.

begin;

-- 1. New drop type for reorder drops (extends the existing enumerated check).
alter table drop_drop drop constraint ck_drop_type;
alter table drop_drop
  add constraint ck_drop_type
  check (drop_type_code in ('STANDARD','SPOTLIGHT','CHEF_SPECIAL','BLIND_ADVENTURE','REORDER'));

-- 2. Internal reorder->source link. Never surfaced in public/consumer drop views.
alter table drop_drop
  add column if not exists reorder_source_order_fk uuid
    references order_order (order_order_pk) on delete set null;
comment on column drop_drop.reorder_source_order_fk is
  'INTERNAL §20 ROI instrumentation. When set, this drop is a full-price "Order Again" '
  'reorder created from the referenced source (sample) order; always drop_type=REORDER + '
  'visibility=INTERNAL_ONLY. Never exposed in public/consumer drop views (guards §14/§24).';
create index if not exists idx_drop_reorder_source
  on drop_drop (reorder_source_order_fk) where reorder_source_order_fk is not null;

-- 3. Consumer RPC: create the private full-price reorder drop + reserve the hold atomically.
--    Returns the hold for the existing checkout rails. Idempotent by key.
create or replace function public.api_create_reorder_drop(
  p_source_order_pk uuid,
  p_idempotency_key text
) returns table (
  hold_pk           uuid,
  drop_pk           uuid,
  amount_paise      bigint,
  bag_display_name  text,
  restaurant_name   text,
  pickup_start_at   timestamptz,
  pickup_end_at     timestamptz,
  already_held      boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumer      uuid;
  v_order         order_order%rowtype;
  v_src_drop      drop_drop%rowtype;
  v_revision      catalog_bag_template_revision%rowtype;
  v_restaurant    restaurant_restaurant%rowtype;
  v_full_price    bigint;
  v_start         timestamptz;
  v_end           timestamptz;
  v_hold_minutes  integer;
  v_new_drop_pk   uuid;
  v_hold_pk       uuid;
  v_existing_hold drop_inventory_hold%rowtype;
  v_existing_drop drop_drop%rowtype;
begin
  v_consumer := public.rls_current_consumer_profile_pk();
  if v_consumer is null then
    raise exception 'authenticated consumer profile required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'idempotency key required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  -- Idempotency: an earlier tap with the same key already reserved a reorder — reuse it.
  select * into v_existing_hold
  from drop_inventory_hold
  where idempotency_key = p_idempotency_key
    and consumer_profile_fk = v_consumer
  limit 1;
  if found then
    select * into v_existing_drop from drop_drop
      where drop_drop_pk = v_existing_hold.drop_fk;
    select * into v_revision from catalog_bag_template_revision
      where catalog_bag_template_revision_pk = v_existing_drop.catalog_bag_template_revision_fk;
    select * into v_restaurant from restaurant_restaurant
      where restaurant_restaurant_pk = v_existing_drop.restaurant_fk;
    return query select
      v_existing_hold.drop_inventory_hold_pk, v_existing_drop.drop_drop_pk,
      v_existing_drop.price_paise, v_revision.display_name, v_restaurant.restaurant_name,
      v_existing_drop.pickup_start_at, v_existing_drop.pickup_end_at, true;
    return;
  end if;

  -- Load + authorize the source order (SECURITY DEFINER bypasses RLS -> check ownership).
  select * into v_order from order_order where order_order_pk = p_source_order_pk;
  if not found or v_order.consumer_profile_fk <> v_consumer then
    raise exception 'source order not found';
  end if;

  select * into v_src_drop from drop_drop where drop_drop_pk = v_order.drop_fk;
  select * into v_revision from catalog_bag_template_revision
    where catalog_bag_template_revision_pk = v_src_drop.catalog_bag_template_revision_fk;
  select * into v_restaurant from restaurant_restaurant
    where restaurant_restaurant_pk = v_src_drop.restaurant_fk;

  -- Full price = un-discounted listed menu value. Fallbacks keep a sane positive price.
  v_full_price := coalesce(
    nullif(v_revision.min_menu_value_paise, 0),
    nullif(v_revision.suggested_price_paise, 0),
    v_src_drop.price_paise
  );

  -- Next pickup window: the restaurant's next upcoming public window if one exists,
  -- else project the source window forward to the next future day.
  select d.pickup_start_at, d.pickup_end_at into v_start, v_end
  from drop_drop d
  where d.restaurant_fk = v_src_drop.restaurant_fk
    and d.visibility_code = 'PUBLIC'
    and d.drop_status_code in ('ACTIVE','SCHEDULED')
    and d.pickup_end_at > now()
  order by d.pickup_start_at asc
  limit 1;
  if not found then
    v_start := v_src_drop.pickup_start_at;
    v_end   := v_src_drop.pickup_end_at;
    while v_end <= now() loop
      v_start := v_start + interval '1 day';
      v_end   := v_end + interval '1 day';
    end loop;
  end if;

  v_hold_minutes := least(greatest(coalesce(v_src_drop.hold_duration_minutes, 10), 10), 60);

  -- Create the internal, full-price, single-bag reorder drop (hidden from discovery).
  insert into drop_drop (
    restaurant_fk, catalog_bag_template_revision_fk, drop_title,
    drop_status_code, drop_type_code, geo_city_fk, geo_neighborhood_fk,
    quantity_total, quantity_reserved, price_paise, currency_code,
    publish_at, pickup_start_at, pickup_end_at, hold_duration_minutes,
    visibility_code, reorder_source_order_fk, published_at
  ) values (
    v_src_drop.restaurant_fk, v_src_drop.catalog_bag_template_revision_fk, v_src_drop.drop_title,
    'ACTIVE', 'REORDER', v_src_drop.geo_city_fk, v_src_drop.geo_neighborhood_fk,
    1, 1, v_full_price, v_src_drop.currency_code,
    now(), v_start, v_end, v_hold_minutes,
    'INTERNAL_ONLY', p_source_order_pk, now()
  ) returning drop_drop_pk into v_new_drop_pk;

  -- Reserve the single bag (mirrors api_create_inventory_hold's ledger writes).
  insert into drop_inventory_hold (
    drop_fk, consumer_profile_fk, idempotency_key, hold_status_code, quantity, expires_at
  ) values (
    v_new_drop_pk, v_consumer, p_idempotency_key, 'ACTIVE', 1,
    now() + make_interval(mins => v_hold_minutes)
  ) returning drop_inventory_hold_pk into v_hold_pk;

  insert into drop_inventory_event (
    drop_fk, drop_inventory_hold_fk, event_type_code, quantity_delta, reason_text
  ) values (
    v_new_drop_pk, v_hold_pk, 'HOLD_CREATED', -1,
    concat('api_create_reorder_drop source_order=', p_source_order_pk)
  );

  return query select
    v_hold_pk, v_new_drop_pk, v_full_price, v_revision.display_name,
    v_restaurant.restaurant_name, v_start, v_end, false;
end;
$$;

comment on function public.api_create_reorder_drop(uuid,text) is
  'Authenticated consumer RPC (§20 "Order Again"). Creates a PRIVATE (INTERNAL_ONLY), '
  'full-price, single-bag REORDER drop for the same template revision as the source order, '
  'reserves a hold, and returns it for the existing checkout rails. Full price = revision '
  'min_menu_value_paise (fallbacks keep it positive). Idempotent by key. The reorder->source '
  'link lives on drop_drop.reorder_source_order_fk (internal; never in public views).';

revoke all on function public.api_create_reorder_drop(uuid,text) from public, anon;
grant execute on function public.api_create_reorder_drop(uuid,text) to authenticated;

-- 4. Sample -> reorder ROI instrumentation (§20), per restaurant. Self-filtering by
--    restaurant access, mirroring the other api_restaurant_roi_* views.
drop view if exists api_restaurant_reorder_roi;
create view api_restaurant_reorder_roi
with (security_barrier = true) as
with scoped as (
  select
    o.restaurant_fk,
    o.order_order_pk,
    o.total_paise,
    d.drop_type_code,
    d.reorder_source_order_fk
  from order_order o
  join drop_drop d on d.drop_drop_pk = o.drop_fk
  where o.payment_status_code = 'CAPTURED'
)
select
  s.restaurant_fk                                                                as restaurant_pk,
  count(*) filter (where s.drop_type_code <> 'REORDER')::integer                 as sample_orders,
  count(*) filter (where s.drop_type_code = 'REORDER')::integer                  as reorder_orders,
  count(distinct s.reorder_source_order_fk)::integer                             as converted_sample_orders,
  coalesce(sum(s.total_paise) filter (where s.drop_type_code = 'REORDER'), 0)::bigint as reorder_gmv_paise,
  case
    when count(*) filter (where s.drop_type_code <> 'REORDER') > 0
    then round(
      count(distinct s.reorder_source_order_fk)::numeric * 10000
      / count(*) filter (where s.drop_type_code <> 'REORDER')
    )::integer
    else null
  end                                                                            as reorder_conversion_bps
from scoped s
group by s.restaurant_fk
having public.rls_has_restaurant_access(s.restaurant_fk)
    or public.rls_is_platform_user();

comment on view api_restaurant_reorder_roi is
  '§20 sample->reorder ROI. Per restaurant: sample (non-reorder) paid orders, reorder paid '
  'orders, distinct samples that converted to a reorder, reorder GMV, and conversion (bps). '
  'A reorder is an order whose drop is drop_type=REORDER; converted samples are counted via '
  'drop_drop.reorder_source_order_fk. Self-filters on restaurant access (RM-1: read with a '
  'caller-scoped client so auth.uid() resolves).';

grant select on api_restaurant_reorder_roi to authenticated;

commit;
