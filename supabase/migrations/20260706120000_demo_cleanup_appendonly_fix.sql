-- =============================================================================
-- Migration: demo cleanup vs. append-only immutability triggers
-- =============================================================================
-- Bug: public.demo_prepare_for_demo(p_create_live_drops => true) — and any full
-- demo refresh via public.demo_cleanup_data(p_dry_run => false) — failed because
-- demo_cleanup_data deletes rows from append-only event tables:
--   * order_pickup_verification_event  (Step 8; also ON DELETE CASCADE from order)
--   * order_status_transition          (Step 9)
--   * drop_inventory_event             (Step 13)
-- Each carries the BEFORE UPDATE OR DELETE trigger raise_immutable_error, which
-- raises "Table ... is append-only. UPDATE and DELETE are not permitted." So the
-- documented one-call demo refresh could not run.
--
-- A full teardown also fires two referential actions the guard must allow: the
-- order FK ON DELETE SET NULL nulls drop_inventory_event.order_fk (an UPDATE on an
-- append-only table), and a separate pre-existing bug — payment_order_intent.
-- drop_inventory_hold_fk is ON DELETE RESTRICT and Steps 5/6 only matched intents by
-- order_fk, so order_fk-null (abandoned/pending) checkout intents blocked Step 12's
-- hold delete. Both are fixed here.
--
-- Fix (guarded carve-out — does NOT weaken the append-only guarantee on real paths):
--   1. raise_immutable_error() permits DELETE and referential UPDATE only when the
--      transaction-local flag app.demo_cleanup_active = 'on' is set. The flag is never
--      set by any application path, so real writers still cannot mutate these tables.
--   2. demo_cleanup_data() sets that flag via set_config(..., is_local => true) at the
--      top of its body (see supabase/seed_demo/demo_seed_part4_functions.sql, kept in
--      sync). The demo_* functions are service_role-only (revoke from public), so only
--      the demo cleanup path can trip the carve-out. It also collects in-scope hold PKs
--      (Step 2b) and removes intents referencing them (Steps 5/6) before Step 12.
--
-- Idempotent: both functions use CREATE OR REPLACE. Safe to re-apply.
-- =============================================================================

-- ── 1. Immutability guard with an UPDATE/DELETE carve-out for the demo path ──
create or replace function public.raise_immutable_error()
returns trigger language plpgsql as $$
begin
  -- Guarded carve-out: the DEMO-ONLY, service_role-only cleanup path
  -- (public.demo_cleanup_data) sets the transaction-local flag
  -- app.demo_cleanup_active = 'on' so the demo dataset can be fully rebuilt.
  -- This permits both the explicit DELETEs and the referential UPDATEs that
  -- teardown triggers (e.g. an FK ON DELETE SET NULL nulling drop_inventory_event.
  -- order_fk when its order row is deleted). It applies only when the flag is set;
  -- real application paths never set it, so the historical record on these
  -- append-only event/ledger/audit tables remains immutable everywhere else.
  if current_setting('app.demo_cleanup_active', true) = 'on' then
    if tg_op = 'DELETE' then
      return old;
    else
      return new;  -- UPDATE (referential SET NULL during demo teardown)
    end if;
  end if;

  raise exception
    'Table "%" is append-only. UPDATE and DELETE are not permitted. '
    'Insert a new row to record a state change.',
    TG_TABLE_NAME;
end;
$$;
comment on function public.raise_immutable_error() is
  'Immutability guard for append-only event, ledger, and audit tables. '
  'Applied as BEFORE UPDATE/DELETE trigger on: '
  'privacy_consent_event, drop_inventory_event, order_status_transition, '
  'order_pickup_verification_event, payment_webhook_event, '
  'billing_subscription_event, support_ticket_event, incident_event, '
  'analytics_event, audit_log. '
  'Prevents mutation of the historical record even by service-role clients. '
  'Exception: permits DELETE and referential UPDATE when the transaction-local flag '
  'app.demo_cleanup_active = ''on'' is set — used solely by the service_role-only '
  'demo cleanup path (public.demo_cleanup_data) to rebuild the demo dataset.';

-- ── 2. demo_cleanup_data — sets app.demo_cleanup_active + removes hold-referencing ──
-- ──    intents (kept in sync with seed_demo/demo_seed_part4_functions.sql §39). ────
create or replace function public.demo_cleanup_data(
  p_before_at timestamptz default null,
  p_after_at  timestamptz default null,
  p_slice     text        default null,
  p_dry_run   boolean     default true
)
returns table (entity_table text, deleted_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Deterministic UUID prefix used by all static seed entities (Parts 1–4)
  c_demo_prefix text := '20000000-0000-0000-0000-';

  -- Convenience: should we also delete static seed (20000000-… prefix) entities?
  v_include_static boolean;

  v_del_count   bigint;
  v_drop_pks    uuid[];
  v_order_pks   uuid[];
  v_hold_pks    uuid[];
  v_consumer_pks uuid[];
  v_rst_pks      uuid[];
  v_auth_pks     uuid[];
  v_iam_pks      uuid[];
begin
  -- Guarded carve-out for the append-only immutability triggers. This DEMO-ONLY,
  -- service_role-only cleanup path must be able to DELETE historical event rows
  -- (order_pickup_verification_event, order_status_transition, drop_inventory_event —
  -- plus any that cascade from order/drop/profile deletes) so the demo dataset can be
  -- fully rebuilt. The flag is transaction-local (is_local => true) and is read by
  -- public.raise_immutable_error(). Real application paths never set it, so the
  -- append-only guarantee on these tables is unchanged outside this function.
  perform set_config('app.demo_cleanup_active', 'on', true);

  -- Resolve whether static seed is in scope
  v_include_static := (p_slice is null or upper(p_slice) = 'ALL'
                       or p_slice not like 'demo_live%');

  -- ── Step 1: Collect dynamic live-drop entity IDs from registry ──────────────
  -- drop_drop PKs from registry (live drops)
  select array_agg(r.entity_id) into v_drop_pks
  from dev_demo_seed_registry r
  where r.entity_table = 'drop_drop'
    and (p_slice is null or upper(p_slice) = 'ALL' or r.slice = p_slice)
    and (p_before_at is null or r.created_at < p_before_at)
    and (p_after_at  is null or r.created_at > p_after_at);

  -- Static seed drop PKs (if in scope)
  if v_include_static then
    select array_agg(dd.drop_drop_pk) into v_drop_pks
    from drop_drop dd
    where dd.drop_drop_pk::text like c_demo_prefix || '%'
      and (p_before_at is null or dd.created_at < p_before_at)
      and (p_after_at  is null or dd.created_at > p_after_at)
      and (v_drop_pks is null or dd.drop_drop_pk = any(v_drop_pks) or true);

    -- Merge both sets
    v_drop_pks := array(select distinct unnest(
      coalesce(v_drop_pks, array[]::uuid[])
    ));
  end if;

  if v_drop_pks is null then v_drop_pks := array[]::uuid[]; end if;

  -- ── Step 2: Collect order PKs reachable from those drops + static prefix ───
  select array_agg(distinct o.order_order_pk) into v_order_pks
  from order_order o
  where (o.drop_fk = any(v_drop_pks)
         or (v_include_static and o.order_order_pk::text like c_demo_prefix || '%'))
    and (p_before_at is null or o.created_at < p_before_at)
    and (p_after_at  is null or o.created_at > p_after_at);

  if v_order_pks is null then v_order_pks := array[]::uuid[]; end if;

  -- ── Step 2b: Collect hold PKs reachable from those drops + static prefix ────
  -- payment_order_intent.drop_inventory_hold_fk is ON DELETE RESTRICT, so any
  -- intent on an in-scope hold — including order_fk-null abandoned/pending
  -- checkouts that Steps 5/6 would otherwise miss — must be removed before
  -- Step 12 deletes the hold. (drop_inventory_event / order_order references are
  -- ON DELETE SET NULL and handled by the referential-update carve-out.)
  select array_agg(distinct dih.drop_inventory_hold_pk) into v_hold_pks
  from drop_inventory_hold dih
  where (dih.drop_fk = any(v_drop_pks)
         or (v_include_static and dih.drop_inventory_hold_pk::text like c_demo_prefix || '%'));
  if v_hold_pks is null then v_hold_pks := array[]::uuid[]; end if;

  -- ── Step 3: Finance payout entries ─────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count
    from finance_restaurant_payout_entry fpe
    join finance_settlement_run fsr
      on fsr.finance_settlement_run_pk = fpe.finance_settlement_run_fk
    where (v_include_static and fsr.finance_settlement_run_pk::text like c_demo_prefix || '%');
    entity_table := 'finance_restaurant_payout_entry';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from finance_restaurant_payout_entry
    using finance_settlement_run fsr
    where fsr.finance_settlement_run_pk = finance_restaurant_payout_entry.finance_settlement_run_fk
      and (v_include_static and fsr.finance_settlement_run_pk::text like c_demo_prefix || '%');
    get diagnostics v_del_count = row_count;
    entity_table := 'finance_restaurant_payout_entry';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 4: Finance settlement runs ────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from finance_settlement_run
    where v_include_static and finance_settlement_run_pk::text like c_demo_prefix || '%';
    entity_table := 'finance_settlement_run';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from finance_settlement_run
    where v_include_static and finance_settlement_run_pk::text like c_demo_prefix || '%';
    get diagnostics v_del_count = row_count;
    entity_table := 'finance_settlement_run';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 5: Payment transactions ────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from payment_transaction pt
    join payment_order_intent poi on poi.payment_order_intent_pk = pt.payment_order_intent_fk
    where (poi.order_fk = any(v_order_pks)
           or poi.drop_inventory_hold_fk = any(v_hold_pks)
           or (v_include_static and poi.payment_order_intent_pk::text like c_demo_prefix || '%'));
    entity_table := 'payment_transaction';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from payment_transaction
    using payment_order_intent poi
    where poi.payment_order_intent_pk = payment_transaction.payment_order_intent_fk
      and (poi.order_fk = any(v_order_pks)
           or poi.drop_inventory_hold_fk = any(v_hold_pks)
           or (v_include_static and poi.payment_order_intent_pk::text like c_demo_prefix || '%'));
    get diagnostics v_del_count = row_count;
    entity_table := 'payment_transaction';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 6: Payment intents ──────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from payment_order_intent poi
    where (poi.order_fk = any(v_order_pks)
           or poi.drop_inventory_hold_fk = any(v_hold_pks)
           or (v_include_static and poi.payment_order_intent_pk::text like c_demo_prefix || '%'));
    entity_table := 'payment_order_intent';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from payment_order_intent
    where (order_fk = any(v_order_pks)
           or drop_inventory_hold_fk = any(v_hold_pks)
           or (v_include_static and payment_order_intent_pk::text like c_demo_prefix || '%'));
    get diagnostics v_del_count = row_count;
    entity_table := 'payment_order_intent';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 7: Reviews ──────────────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from review_review rr
    where (rr.order_fk = any(v_order_pks)
           or (v_include_static and rr.review_review_pk::text like c_demo_prefix || '%'));
    entity_table := 'review_review';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from review_review
    where (order_fk = any(v_order_pks)
           or (v_include_static and review_review_pk::text like c_demo_prefix || '%'));
    get diagnostics v_del_count = row_count;
    entity_table := 'review_review';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 8: Pickup verification events (cascade from order, but be explicit) ─
  if p_dry_run then
    select count(*) into v_del_count from order_pickup_verification_event
    where order_fk = any(v_order_pks);
    entity_table := 'order_pickup_verification_event';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from order_pickup_verification_event where order_fk = any(v_order_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'order_pickup_verification_event';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 9: Order status transitions ─────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from order_status_transition
    where order_fk = any(v_order_pks);
    entity_table := 'order_status_transition';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from order_status_transition where order_fk = any(v_order_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'order_status_transition';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 10: Order items ──────────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from order_item where order_fk = any(v_order_pks);
    entity_table := 'order_item';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from order_item where order_fk = any(v_order_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'order_item';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 11: Orders ───────────────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from order_order where order_order_pk = any(v_order_pks);
    entity_table := 'order_order';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from order_order where order_order_pk = any(v_order_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'order_order';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 12: Inventory holds ───────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from drop_inventory_hold dih
    where (dih.drop_fk = any(v_drop_pks)
           or (v_include_static and dih.drop_inventory_hold_pk::text like c_demo_prefix || '%'));
    entity_table := 'drop_inventory_hold';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from drop_inventory_hold
    where (drop_fk = any(v_drop_pks)
           or (v_include_static and drop_inventory_hold_pk::text like c_demo_prefix || '%'));
    get diagnostics v_del_count = row_count;
    entity_table := 'drop_inventory_hold';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 13: Inventory events ─────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from drop_inventory_event
    where drop_fk = any(v_drop_pks);
    entity_table := 'drop_inventory_event';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from drop_inventory_event where drop_fk = any(v_drop_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'drop_inventory_event';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 14: Drops ───────────────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from drop_drop where drop_drop_pk = any(v_drop_pks);
    entity_table := 'drop_drop';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from drop_drop where drop_drop_pk = any(v_drop_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'drop_drop';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Steps 15+ only execute when static seed is in scope ──────────────────────
  if not v_include_static then
    -- Clean up only the live-drop registry entries
    if not p_dry_run then
      delete from dev_demo_seed_registry
      where (p_slice is null or upper(p_slice) = 'ALL' or slice = p_slice)
        and (p_before_at is null or created_at < p_before_at)
        and (p_after_at  is null or created_at > p_after_at);
    end if;
    return;
  end if;

  -- Collect consumer and restaurant auth user PKs for static cleanup
  select array_agg(consumer_profile_pk) into v_consumer_pks
  from consumer_profile
  where consumer_profile_pk::text like c_demo_prefix || '12%';

  select array_agg(restaurant_restaurant_pk) into v_rst_pks
  from restaurant_restaurant
  where restaurant_restaurant_pk::text like c_demo_prefix || '3%';

  -- ── Step 15: Bag templates (revisions cascade via FK) ─────────────────────
  if p_dry_run then
    select count(*) into v_del_count from catalog_bag_template
    where catalog_bag_template_pk::text like c_demo_prefix || '5%';
    entity_table := 'catalog_bag_template';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from catalog_bag_template
    where catalog_bag_template_pk::text like c_demo_prefix || '5%';
    get diagnostics v_del_count = row_count;
    entity_table := 'catalog_bag_template';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 16: Consumer subscriptions and billing ───────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from consumer_subscription
    where consumer_profile_fk = any(v_consumer_pks);
    entity_table := 'consumer_subscription';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from consumer_subscription where consumer_profile_fk = any(v_consumer_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'consumer_subscription';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 17: Consumer preferences and saved restaurants ──────────────────
  if not p_dry_run then
    delete from consumer_dietary_preference  where consumer_profile_fk = any(v_consumer_pks);
    delete from consumer_allergen_preference where consumer_profile_fk = any(v_consumer_pks);
    delete from consumer_city_preference     where consumer_profile_fk = any(v_consumer_pks);
    delete from consumer_saved_restaurant    where consumer_profile_fk = any(v_consumer_pks);
    delete from consumer_referral
      where referrer_profile_fk = any(v_consumer_pks)
         or referee_profile_fk  = any(v_consumer_pks);
    delete from consumer_passport_stat       where consumer_profile_fk = any(v_consumer_pks);
  end if;
  entity_table := 'consumer_preferences_and_referrals';
  if p_dry_run then
    select count(*) into v_del_count
    from consumer_dietary_preference where consumer_profile_fk = any(v_consumer_pks);
    deleted_count := coalesce(v_del_count, 0);
  else
    deleted_count := 0; -- already deleted above
  end if;
  return next;

  -- ── Step 18: Consumer profiles ────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from consumer_profile
    where consumer_profile_pk = any(v_consumer_pks);
    entity_table := 'consumer_profile';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from consumer_profile where consumer_profile_pk = any(v_consumer_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'consumer_profile';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 19: Restaurant sub-tables ───────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from restaurant_restaurant
    where restaurant_restaurant_pk = any(v_rst_pks);
    entity_table := 'restaurant_restaurant';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    -- Cuisine maps, profiles, payout accounts, team members cascade
    delete from restaurant_cuisine_map where restaurant_fk = any(v_rst_pks);
    delete from restaurant_restaurant  where restaurant_restaurant_pk = any(v_rst_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'restaurant_restaurant';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 20: Geo addresses ────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from geo_address
    where geo_address_pk::text like c_demo_prefix || '4%';
    entity_table := 'geo_address';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from geo_address where geo_address_pk::text like c_demo_prefix || '4%';
    get diagnostics v_del_count = row_count;
    entity_table := 'geo_address';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 21: IAM profiles ─────────────────────────────────────────────────
  select array_agg(iam_profile_pk) into v_iam_pks
  from iam_profile
  where iam_profile_pk::text like c_demo_prefix || '1%' -- 110000000001-008, 210000000001-005
     or iam_profile_pk::text like c_demo_prefix || '2%';

  if p_dry_run then
    select count(*) into v_del_count from iam_profile
    where iam_profile_pk = any(v_iam_pks);
    entity_table := 'iam_profile';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from iam_profile where iam_profile_pk = any(v_iam_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'iam_profile';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 22: auth.users ───────────────────────────────────────────────────
  -- Consumer users: 100000000001–008  |  Restaurant users: 200000000001–005
  select array_agg(id) into v_auth_pks
  from auth.users
  where id::text like c_demo_prefix || '1000000000%'
     or id::text like c_demo_prefix || '2000000000%';

  if p_dry_run then
    select count(*) into v_del_count from auth.users where id = any(v_auth_pks);
    entity_table := 'auth.users';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from auth.users where id = any(v_auth_pks);
    get diagnostics v_del_count = row_count;
    entity_table := 'auth.users';
    deleted_count := v_del_count;
    return next;
  end if;

  -- ── Step 23: Seed registry ────────────────────────────────────────────────
  if p_dry_run then
    select count(*) into v_del_count from dev_demo_seed_registry
    where (p_slice is null or upper(p_slice) = 'ALL' or slice = p_slice)
      and (p_before_at is null or created_at < p_before_at)
      and (p_after_at  is null or created_at > p_after_at);
    entity_table := 'dev_demo_seed_registry';
    deleted_count := coalesce(v_del_count, 0);
    return next;
  else
    delete from dev_demo_seed_registry
    where (p_slice is null or upper(p_slice) = 'ALL' or slice = p_slice)
      and (p_before_at is null or created_at < p_before_at)
      and (p_after_at  is null or created_at > p_after_at);
    get diagnostics v_del_count = row_count;
    entity_table := 'dev_demo_seed_registry';
    deleted_count := v_del_count;
    return next;
  end if;

end;
$$;

comment on function public.demo_cleanup_data(timestamptz, timestamptz, text, boolean) is
  'DEMO ONLY. Deletes demo seed entities in safe FK dependency order. '
  'Default p_dry_run=true — inspect the count table before setting p_dry_run=>false. '
  '
  Examples:
    -- Preview what would be deleted for all demo data:
    select * from demo_cleanup_data();

    -- Delete only live drops created today, without touching static seed:
    select * from demo_cleanup_data(p_slice=>''demo_live_drops'',
                                     p_after_at=>current_date::timestamptz,
                                     p_dry_run=>false);

    -- Delete everything (wipe demo database):
    select * from demo_cleanup_data(p_slice=>''ALL'', p_dry_run=>false);

  Requires service_role or postgres.';

revoke all on function public.demo_cleanup_data(timestamptz, timestamptz, text, boolean) from public, anon, authenticated;
grant execute on function public.demo_cleanup_data(timestamptz, timestamptz, text, boolean) to service_role;

-- ── 3. Harden ALL demo_* orchestration functions to service_role-only ─────────
-- These are DEMO-ONLY and several are destructive (SECURITY DEFINER, run as owner).
-- Supabase's default privileges grant EXECUTE to anon + authenticated on every
-- public function, and "revoke ... from public" does not remove those role grants —
-- so the intended service_role-only lockdown was never in effect. Revoke explicitly.
revoke all on function public.demo_create_live_drops(uuid[], text)                      from anon, authenticated;
revoke all on function public.demo_refresh_static_drops()                               from anon, authenticated;
revoke all on function public.demo_prepare_for_demo(boolean, boolean)                   from anon, authenticated;
revoke all on function public.demo_cleanup_data(timestamptz, timestamptz, text, boolean) from anon, authenticated;

