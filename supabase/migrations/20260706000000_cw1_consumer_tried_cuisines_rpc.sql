-- CW-1: Flavour Passport "cuisines explored" always 0.
--
-- `buildDiscoveryProfile` calls `get_consumer_tried_cuisines`, which was never
-- defined, so it always fell back to a PostgREST embed. That embed can never
-- succeed for a consumer: (a) there is no direct FK between order_order and
-- restaurant_cuisine_map (both relate via restaurant_restaurant), and (b)
-- restaurant_cuisine_map RLS only grants the restaurant team / platform admins,
-- so a consumer-scoped client reads zero rows regardless of the join path.
--
-- Fix: a SECURITY DEFINER RPC that performs the correct two-hop join
-- (order_order.restaurant_fk -> restaurant_restaurant <- restaurant_cuisine_map
-- -> master_cuisine) over the caller's own COLLECTED orders. Authorization is
-- enforced inside the function: the caller must be the consumer themselves
-- (resolved from auth via rls_current_consumer_profile_pk) or a platform user,
-- so the definer rights cannot be used to enumerate another consumer's history.

create or replace function public.get_consumer_tried_cuisines(p_consumer_pk uuid)
returns table (
  cuisine_code text,
  cuisine_name text,
  bag_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller uuid;
begin
  v_caller := public.rls_current_consumer_profile_pk();

  -- Only the consumer themselves, or a platform user, may read tried cuisines.
  if v_caller is null or (v_caller <> p_consumer_pk and not public.rls_is_platform_user()) then
    raise exception 'not authorized to read this consumer''s cuisines';
  end if;

  return query
    select
      mc.cuisine_code,
      mc.cuisine_name,
      count(distinct o.order_order_pk)::bigint as bag_count
    from order_order o
    join restaurant_cuisine_map rcm on rcm.restaurant_fk = o.restaurant_fk
    join master_cuisine mc on mc.master_cuisine_pk = rcm.master_cuisine_fk
    where o.consumer_profile_fk = p_consumer_pk
      and o.order_status_code = 'COLLECTED'
      and mc.is_active = true
    group by mc.cuisine_code, mc.cuisine_name;
end;
$$;

grant execute on function public.get_consumer_tried_cuisines(uuid) to authenticated;
