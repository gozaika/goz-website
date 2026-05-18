-- Slice 4A: Claim Hold / Order Intent
-- Adds claim-safe hold read models and widens the existing atomic hold RPC
-- to cover public scheduled drops as well as active drops. Razorpay/payment
-- capture remains out of scope.

drop policy if exists p_drop_inventory_hold_restaurant_select on drop_inventory_hold;

create policy p_drop_inventory_hold_restaurant_select on drop_inventory_hold
  for select to authenticated
  using (
    exists (
      select 1
      from drop_drop d
      where d.drop_drop_pk = drop_inventory_hold.drop_fk
        and public.rls_has_restaurant_access(d.restaurant_fk)
    )
    or public.rls_is_platform_user()
  );

create or replace function public.api_create_inventory_hold(
  p_drop_pk uuid,
  p_idempotency_key text,
  p_quantity integer default 1,
  p_hold_minutes integer default 10
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumer_profile_pk uuid;
  v_existing_hold_pk uuid;
  v_hold_pk uuid;
  v_before_reserved integer;
  v_after_reserved integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  if p_hold_minutes is null or p_hold_minutes < 1 or p_hold_minutes > 60 then
    raise exception 'hold minutes must be between 1 and 60';
  end if;

  v_consumer_profile_pk := public.rls_current_consumer_profile_pk();
  if v_consumer_profile_pk is null then
    raise exception 'authenticated consumer profile required';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
    select drop_inventory_hold_pk into v_existing_hold_pk
    from drop_inventory_hold
    where idempotency_key = p_idempotency_key
      and consumer_profile_fk = v_consumer_profile_pk
    limit 1;

    if v_existing_hold_pk is not null then
      return v_existing_hold_pk;
    end if;
  end if;

  select quantity_reserved into v_before_reserved
  from drop_drop
  where drop_drop_pk = p_drop_pk
  for update;

  if not found then
    raise exception 'drop not found';
  end if;

  update drop_drop
  set quantity_reserved = quantity_reserved + p_quantity
  where drop_drop_pk = p_drop_pk
    and drop_status_code in ('ACTIVE','SCHEDULED')
    and visibility_code = 'PUBLIC'
    and (publish_at is null or publish_at <= now())
    and pickup_end_at > now()
    and public.rls_drop_is_public(drop_drop_pk)
    and COMPUTED_quantity_available >= p_quantity
  returning quantity_reserved into v_after_reserved;

  if not found then
    raise exception 'drop is unavailable or insufficient quantity';
  end if;

  insert into drop_inventory_hold (
    drop_fk,
    consumer_profile_fk,
    idempotency_key,
    hold_status_code,
    quantity,
    expires_at
  ) values (
    p_drop_pk,
    v_consumer_profile_pk,
    p_idempotency_key,
    'ACTIVE',
    p_quantity,
    now() + make_interval(mins => p_hold_minutes)
  ) returning drop_inventory_hold_pk into v_hold_pk;

  insert into drop_inventory_event (
    drop_fk,
    drop_inventory_hold_fk,
    event_type_code,
    quantity_delta,
    reason_text
  ) values (
    p_drop_pk,
    v_hold_pk,
    'HOLD_CREATED',
    -p_quantity,
    concat(
      'api_create_inventory_hold before_reserved=',
      v_before_reserved,
      ' after_reserved=',
      v_after_reserved
    )
  );

  return v_hold_pk;
end;
$$;

comment on function public.api_create_inventory_hold(uuid,text,integer,integer) is
  'Authenticated consumer RPC. Atomically reserves public active/scheduled drop inventory, creates a hold, and appends an inventory event. Uses idempotency key and row lock for retry/concurrency safety.';

drop view if exists api_claim_hold_summary;

create view api_claim_hold_summary
with (security_barrier = true) as
select
  h.drop_inventory_hold_pk as hold_pk,
  h.drop_fk as drop_pk,
  h.consumer_profile_fk,
  h.hold_status_code,
  h.quantity as quantity_held,
  h.expires_at,
  h.created_at as hold_created_at,
  h.updated_at as hold_updated_at,
  d.drop_title,
  d.drop_status_code,
  d.drop_type_code,
  d.quantity_total,
  d.computed_quantity_available as quantity_available,
  d.price_paise,
  d.pickup_start_at,
  d.pickup_end_at,
  r.restaurant_restaurant_pk as restaurant_pk,
  r.restaurant_slug,
  r.restaurant_name,
  gn.neighborhood_name,
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
from drop_inventory_hold h
join drop_drop d
  on d.drop_drop_pk = h.drop_fk
join restaurant_restaurant r
  on r.restaurant_restaurant_pk = d.restaurant_fk
join catalog_bag_template_revision rev
  on rev.catalog_bag_template_revision_pk = d.catalog_bag_template_revision_fk
left join geo_neighborhood gn
  on gn.geo_neighborhood_pk = d.geo_neighborhood_fk
left join catalog_bag_template_allergen bta
  on bta.catalog_bag_template_revision_fk = rev.catalog_bag_template_revision_pk
  and (bta.contains_flag or bta.may_contain_flag)
left join master_allergen ma
  on ma.master_allergen_pk = bta.master_allergen_fk
where
  public.rls_is_consumer_profile(h.consumer_profile_fk)
  or public.rls_has_restaurant_access(d.restaurant_fk)
  or public.rls_is_platform_user()
group by
  h.drop_inventory_hold_pk,
  h.drop_fk,
  h.consumer_profile_fk,
  h.hold_status_code,
  h.quantity,
  h.expires_at,
  h.created_at,
  h.updated_at,
  d.drop_title,
  d.drop_status_code,
  d.drop_type_code,
  d.quantity_total,
  d.computed_quantity_available,
  d.price_paise,
  d.pickup_start_at,
  d.pickup_end_at,
  r.restaurant_restaurant_pk,
  r.restaurant_slug,
  r.restaurant_name,
  gn.neighborhood_name,
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

comment on view api_claim_hold_summary is
  'Slice 4A safe hold/order-intent read model. Consumers see their own holds, restaurant users see holds for their restaurant, and platform admins see launch support metadata. No payment, pickup QR, private compliance, or provider data is exposed.';

grant select on api_claim_hold_summary to authenticated;
