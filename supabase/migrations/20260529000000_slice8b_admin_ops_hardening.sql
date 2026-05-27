-- Slice 8B: Admin Ops Hardening
-- Pilot-first admin ops controls for restaurant/drop pause, support/refund
-- tracking, allowlisted config flags, and support-safe queue read models.
-- This migration does not call Razorpay refund APIs, mutate payment captures,
-- recalculate settlements, initiate payouts, or send notifications.

begin;

alter table support_ticket
  add column if not exists incident_fk uuid,
  add column if not exists payment_refund_fk uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_support_ticket_incident'
      and conrelid = 'support_ticket'::regclass
  ) then
    alter table support_ticket
      add constraint fk_support_ticket_incident
      foreign key (incident_fk)
      references incident_incident (incident_incident_pk)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_support_ticket_payment_refund'
      and conrelid = 'support_ticket'::regclass
  ) then
    alter table support_ticket
      add constraint fk_support_ticket_payment_refund
      foreign key (payment_refund_fk)
      references payment_refund (payment_refund_pk)
      on delete set null;
  end if;
end $$;

alter table payment_refund
  add column if not exists support_ticket_fk uuid,
  add column if not exists incident_fk uuid,
  add column if not exists tracking_status_code text not null default 'REQUESTED',
  add column if not exists manual_tracking_note_text text,
  add column if not exists provider_refund_disabled boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_payment_refund_support_ticket'
      and conrelid = 'payment_refund'::regclass
  ) then
    alter table payment_refund
      add constraint fk_payment_refund_support_ticket
      foreign key (support_ticket_fk)
      references support_ticket (support_ticket_pk)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_payment_refund_incident'
      and conrelid = 'payment_refund'::regclass
  ) then
    alter table payment_refund
      add constraint fk_payment_refund_incident
      foreign key (incident_fk)
      references incident_incident (incident_incident_pk)
      on delete set null;
  end if;
end $$;

alter table payment_refund
  drop constraint if exists ck_payment_refund_tracking_status;

alter table payment_refund
  add constraint ck_payment_refund_tracking_status check (
    tracking_status_code in (
      'REQUESTED','OPS_REVIEW','FINANCE_REVIEW','APPROVED_MANUAL',
      'TRACKED_EXTERNALLY','REJECTED','CANCELLED'
    )
  );

create index if not exists idx_slice8b_support_ticket_rest_status
  on support_ticket (restaurant_fk, master_support_ticket_status_fk, updated_at desc)
  where restaurant_fk is not null;

create index if not exists idx_slice8b_payment_refund_tracking
  on payment_refund (tracking_status_code, updated_at desc);

create index if not exists idx_slice8b_config_flag_lookup
  on config_feature_flag (flag_code, scope_code, scope_entity_pk);

create or replace function public.api_admin_ops_has_role(
  p_actor_profile_pk uuid,
  p_allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from iam_platform_membership m
    join iam_platform_role r on r.iam_platform_role_pk = m.iam_platform_role_fk
    where m.iam_profile_fk = p_actor_profile_pk
      and m.is_active
      and r.role_code = any(p_allowed_roles)
  )
$$;

create or replace function public.api_ops_claims_enabled(p_restaurant_pk uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from config_feature_flag f
    where f.flag_code = 'CLAIMS_ENABLED'
      and f.scope_code = 'GLOBAL'
      and f.is_enabled = false
  )
  and not exists (
    select 1
    from config_feature_flag f
    where f.flag_code = 'CLAIMS_ENABLED'
      and f.scope_code = 'RESTAURANT'
      and f.scope_entity_pk = p_restaurant_pk
      and f.is_enabled = false
  )
$$;

create or replace function public.api_ops_publishing_enabled(p_restaurant_pk uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from config_feature_flag f
    where f.flag_code = 'PUBLISHING_ENABLED'
      and f.scope_code = 'GLOBAL'
      and f.is_enabled = false
  )
  and not exists (
    select 1
    from config_feature_flag f
    where f.flag_code = 'PUBLISHING_ENABLED'
      and f.scope_code = 'RESTAURANT'
      and f.scope_entity_pk = p_restaurant_pk
      and f.is_enabled = false
  )
$$;

create or replace function public.api_ops_max_bags_per_drop(p_restaurant_pk uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select nullif((f.config_json ->> 'max_bags_per_drop')::integer, 0)
      from config_feature_flag f
      where f.flag_code = 'MAX_BAGS_PER_DROP'
        and f.scope_code = 'RESTAURANT'
        and f.scope_entity_pk = p_restaurant_pk
      order by f.updated_at desc
      limit 1
    ),
    (
      select nullif((f.config_json ->> 'max_bags_per_drop')::integer, 0)
      from config_feature_flag f
      where f.flag_code = 'MAX_BAGS_PER_DROP'
        and f.scope_code = 'GLOBAL'
      order by f.updated_at desc
      limit 1
    ),
    50
  )
$$;

create or replace function public.rls_drop_is_public(p_drop_pk uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from drop_drop d
    join restaurant_restaurant r
      on r.restaurant_restaurant_pk = d.restaurant_fk
    where d.drop_drop_pk = p_drop_pk
      and d.visibility_code = 'PUBLIC'
      and d.drop_status_code in ('SCHEDULED','ACTIVE','SOLD_OUT','PICKUP_CLOSED')
      and (d.publish_at is null or d.publish_at <= now())
      and r.restaurant_status_code = 'ACTIVE'
      and public.api_ops_claims_enabled(r.restaurant_restaurant_pk)
  )
$$;

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
    concat('api_create_inventory_hold before_reserved=', v_before_reserved, ' after_reserved=', v_after_reserved)
  );

  return v_hold_pk;
end;
$$;

create or replace function public.api_admin_set_restaurant_operational_status(
  p_restaurant_pk uuid,
  p_actor_profile_pk uuid,
  p_next_status_code text,
  p_reason_text text,
  p_public_note_text text default null
)
returns table (
  restaurant_pk uuid,
  status_code text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant restaurant_restaurant%rowtype;
  v_reason text := left(trim(coalesce(p_reason_text, '')), 1000);
begin
  if not public.api_admin_ops_has_role(p_actor_profile_pk, array['SUPER_ADMIN','OPS_ADMIN']) then
    raise exception 'role not allowed';
  end if;
  if length(v_reason) < 8 then
    raise exception 'reason required';
  end if;
  if p_next_status_code not in ('ACTIVE','PAUSED','SUSPENDED') then
    raise exception 'invalid restaurant status';
  end if;

  select * into v_restaurant
  from restaurant_restaurant
  where restaurant_restaurant_pk = p_restaurant_pk
  for update;

  if not found then
    raise exception 'restaurant not found';
  end if;
  if v_restaurant.restaurant_status_code = 'OFFBOARDED' then
    raise exception 'offboarded restaurant cannot be changed';
  end if;

  if v_restaurant.restaurant_status_code <> p_next_status_code then
    update restaurant_restaurant
    set restaurant_status_code = p_next_status_code,
        updated_at = now()
    where restaurant_restaurant_pk = p_restaurant_pk;
  end if;

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'OPS_ADMIN',
    concat('RESTAURANT_', p_next_status_code),
    'RESTAURANT',
    p_restaurant_pk,
    jsonb_build_object(
      'before', jsonb_build_object('restaurant_status_code', v_restaurant.restaurant_status_code),
      'after', jsonb_build_object('restaurant_status_code', p_next_status_code),
      'reason', v_reason,
      'public_note', nullif(trim(coalesce(p_public_note_text, '')), '')
    )
  );

  return query
  select p_restaurant_pk, p_next_status_code, concat('Restaurant marked ', lower(p_next_status_code), '. New publishing and claims follow ops guardrails.')::text;
end;
$$;

create or replace function public.api_admin_set_drop_operational_status(
  p_drop_pk uuid,
  p_actor_profile_pk uuid,
  p_next_status_code text,
  p_reason_text text
)
returns table (
  drop_pk uuid,
  status_code text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drop drop_drop%rowtype;
  v_reason text := left(trim(coalesce(p_reason_text, '')), 1000);
begin
  if not public.api_admin_ops_has_role(p_actor_profile_pk, array['SUPER_ADMIN','OPS_ADMIN']) then
    raise exception 'role not allowed';
  end if;
  if length(v_reason) < 8 then
    raise exception 'reason required';
  end if;
  if p_next_status_code not in ('ACTIVE','SCHEDULED','PAUSED') then
    raise exception 'invalid drop status';
  end if;

  select * into v_drop
  from drop_drop
  where drop_drop_pk = p_drop_pk
  for update;

  if not found then
    raise exception 'drop not found';
  end if;
  if v_drop.drop_status_code in ('SOLD_OUT','PICKUP_CLOSED','EMERGENCY_CLOSED','CANCELLED') then
    raise exception 'closed drop cannot be mutated';
  end if;

  if v_drop.drop_status_code <> p_next_status_code then
    update drop_drop
    set drop_status_code = p_next_status_code,
        published_by_profile_fk = case when p_next_status_code in ('ACTIVE','SCHEDULED') then p_actor_profile_pk else published_by_profile_fk end,
        published_at = case when p_next_status_code = 'ACTIVE' then coalesce(published_at, now()) else published_at end,
        updated_at = now()
    where drop_drop_pk = p_drop_pk;
  end if;

  insert into drop_inventory_event (
    drop_fk,
    event_type_code,
    quantity_delta,
    reason_text,
    actor_profile_fk
  ) values (
    p_drop_pk,
    'MANUAL_ADJUSTMENT',
    0,
    concat('Admin ops status ', v_drop.drop_status_code, ' -> ', p_next_status_code, ': ', v_reason),
    p_actor_profile_pk
  );

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'OPS_ADMIN',
    concat('DROP_', p_next_status_code),
    'DROP',
    p_drop_pk,
    jsonb_build_object(
      'before', jsonb_build_object('drop_status_code', v_drop.drop_status_code),
      'after', jsonb_build_object('drop_status_code', p_next_status_code),
      'reason', v_reason,
      'historical_orders_untouched', true
    )
  );

  return query
  select p_drop_pk, p_next_status_code, concat('Drop marked ', lower(p_next_status_code), '. Paid orders were not changed.')::text;
end;
$$;

delete from config_feature_flag flag
using (
  select ctid
  from (
    select
      ctid,
      row_number() over (
        partition by flag_code, scope_code
        order by created_at nulls last, config_feature_flag_pk::text
      ) as duplicate_rank
    from config_feature_flag
    where flag_code in ('CLAIMS_ENABLED','PUBLISHING_ENABLED','MAX_BAGS_PER_DROP')
      and scope_code = 'GLOBAL'
      and scope_entity_pk is null
  ) ranked
  where duplicate_rank > 1
) duplicate
where flag.ctid = duplicate.ctid;

insert into config_feature_flag (flag_code, flag_name, description, is_enabled, scope_code, scope_entity_pk, config_json)
select seed.flag_code, seed.flag_name, seed.description, seed.is_enabled, seed.scope_code, seed.scope_entity_pk, seed.config_json
from (
  values
    ('CLAIMS_ENABLED', 'Claims enabled', 'Allow consumers to discover and claim BAM Bags globally unless a restaurant override disables claims.', true, 'GLOBAL', null::uuid, '{"consumed_by":"consumer discovery, claim hold RPC"}'::jsonb),
    ('PUBLISHING_ENABLED', 'Publishing enabled', 'Allow active restaurants to publish Limited Drops unless a restaurant override disables publishing.', true, 'GLOBAL', null::uuid, '{"consumed_by":"restaurant portal drop publishing"}'::jsonb),
    ('MAX_BAGS_PER_DROP', 'Max bags per drop', 'Pilot guidance cap enforced by restaurant portal drop publishing.', true, 'GLOBAL', null::uuid, '{"max_bags_per_drop":50,"consumed_by":"restaurant portal drop publishing"}'::jsonb)
) as seed(flag_code, flag_name, description, is_enabled, scope_code, scope_entity_pk, config_json)
where not exists (
  select 1
  from config_feature_flag existing
  where existing.flag_code = seed.flag_code
    and existing.scope_code = seed.scope_code
    and existing.scope_entity_pk is null
);

drop view if exists api_admin_ops_audit_log;
drop view if exists api_admin_ops_config_flag;
drop view if exists api_admin_ops_refund_queue;
drop view if exists api_admin_ops_incident_queue;
drop view if exists api_admin_ops_support_queue;
drop view if exists api_admin_ops_drop_summary;
drop view if exists api_admin_ops_restaurant_summary;

create view api_admin_ops_restaurant_summary
with (security_barrier = true) as
select
  r.restaurant_restaurant_pk as restaurant_pk,
  r.restaurant_name,
  r.restaurant_slug,
  r.restaurant_status_code as status_code,
  coalesce(inc.open_incident_count, 0)::integer as open_incident_count,
  coalesce(st.open_support_ticket_count, 0)::integer as open_support_ticket_count,
  coalesce(ref.open_refund_request_count, 0)::integer as open_refund_request_count,
  coalesce(dr.active_drop_count, 0)::integer as active_drop_count,
  coalesce(dr.paused_drop_count, 0)::integer as paused_drop_count,
  aud.latest_audit_at,
  r.updated_at
from restaurant_restaurant r
left join lateral (
  select count(*) as open_incident_count
  from incident_incident i
  join master_incident_status s on s.master_incident_status_pk = i.master_incident_status_fk
  where i.restaurant_fk = r.restaurant_restaurant_pk
    and s.status_code not in ('RESOLVED','CLOSED','REJECTED')
) inc on true
left join lateral (
  select count(*) as open_support_ticket_count
  from support_ticket t
  join master_support_ticket_status s on s.master_support_ticket_status_pk = t.master_support_ticket_status_fk
  where t.restaurant_fk = r.restaurant_restaurant_pk
    and s.status_code not in ('RESOLVED','CLOSED','REJECTED')
) st on true
left join lateral (
  select count(*) as open_refund_request_count
  from payment_refund pr
  join order_order o on o.order_order_pk = pr.order_fk
  where o.restaurant_fk = r.restaurant_restaurant_pk
    and coalesce(pr.tracking_status_code, 'REQUESTED') not in ('TRACKED_EXTERNALLY','REJECTED','CANCELLED')
) ref on true
left join lateral (
  select
    count(*) filter (where d.drop_status_code in ('ACTIVE','SCHEDULED')) as active_drop_count,
    count(*) filter (where d.drop_status_code = 'PAUSED') as paused_drop_count
  from drop_drop d
  where d.restaurant_fk = r.restaurant_restaurant_pk
) dr on true
left join lateral (
  select max(a.created_at) as latest_audit_at
  from audit_log a
  where a.target_entity_pk = r.restaurant_restaurant_pk
) aud on true
where public.rls_is_platform_user()
   or auth.role() = 'service_role';

create view api_admin_ops_drop_summary
with (security_barrier = true) as
select
  d.drop_drop_pk as drop_pk,
  d.restaurant_fk,
  r.restaurant_name,
  d.drop_title,
  d.drop_status_code as status_code,
  d.quantity_total,
  d.computed_quantity_available as quantity_available,
  coalesce(orders.paid_order_count, 0)::integer as paid_order_count,
  d.pickup_start_at,
  d.pickup_end_at,
  d.updated_at
from drop_drop d
join restaurant_restaurant r on r.restaurant_restaurant_pk = d.restaurant_fk
left join lateral (
  select count(*) as paid_order_count
  from order_order o
  where o.drop_fk = d.drop_drop_pk
    and o.payment_status_code = 'CAPTURED'
) orders on true
where (public.rls_is_platform_user()
   or auth.role() = 'service_role')
  and d.drop_status_code in ('ACTIVE','SCHEDULED','PAUSED')
order by d.pickup_start_at desc;

create view api_admin_ops_support_queue
with (security_barrier = true) as
select
  t.support_ticket_pk,
  t.restaurant_fk,
  r.restaurant_name,
  t.order_fk,
  o.order_number,
  t.incident_fk,
  t.payment_refund_fk as refund_pk,
  ty.type_code,
  st.status_code,
  pr.priority_code,
  t.subject_text,
  t.description_text,
  t.assigned_to_profile_fk,
  t.sla_due_at,
  t.resolved_at,
  latest.latest_event_at,
  t.created_at,
  t.updated_at
from support_ticket t
join master_support_ticket_type ty on ty.master_support_ticket_type_pk = t.master_support_ticket_type_fk
join master_support_ticket_status st on st.master_support_ticket_status_pk = t.master_support_ticket_status_fk
join master_support_ticket_priority pr on pr.master_support_ticket_priority_pk = t.master_support_ticket_priority_fk
left join restaurant_restaurant r on r.restaurant_restaurant_pk = t.restaurant_fk
left join order_order o on o.order_order_pk = t.order_fk
left join lateral (
  select max(e.recorded_at) as latest_event_at
  from support_ticket_event e
  where e.support_ticket_fk = t.support_ticket_pk
) latest on true
where public.rls_is_platform_user()
   or auth.role() = 'service_role';

create view api_admin_ops_incident_queue
with (security_barrier = true) as
select
  i.incident_incident_pk as incident_pk,
  i.restaurant_fk,
  r.restaurant_name,
  i.order_fk,
  o.order_number,
  i.support_ticket_fk,
  ty.type_code,
  sev.severity_code,
  st.status_code,
  i.title_text,
  i.description_text,
  i.assigned_to_profile_fk,
  latest.latest_event_at,
  i.occurred_at,
  i.created_at,
  i.updated_at
from incident_incident i
join master_incident_type ty on ty.master_incident_type_pk = i.master_incident_type_fk
join master_incident_severity sev on sev.master_incident_severity_pk = i.master_incident_severity_fk
join master_incident_status st on st.master_incident_status_pk = i.master_incident_status_fk
left join restaurant_restaurant r on r.restaurant_restaurant_pk = i.restaurant_fk
left join order_order o on o.order_order_pk = i.order_fk
left join lateral (
  select max(e.recorded_at) as latest_event_at
  from incident_event e
  where e.incident_fk = i.incident_incident_pk
) latest on true
where public.rls_is_platform_user()
   or auth.role() = 'service_role';

create view api_admin_ops_refund_queue
with (security_barrier = true) as
select
  pr.payment_refund_pk as refund_pk,
  o.restaurant_fk,
  r.restaurant_name,
  pr.order_fk,
  o.order_number,
  pr.support_ticket_fk,
  pr.incident_fk,
  pr.refund_status_code,
  coalesce(pr.tracking_status_code, 'REQUESTED') as tracking_status_code,
  pr.refund_reason_code,
  pr.amount_paise,
  pr.requested_at,
  pr.processed_at,
  pr.updated_at
from payment_refund pr
join order_order o on o.order_order_pk = pr.order_fk
join restaurant_restaurant r on r.restaurant_restaurant_pk = o.restaurant_fk
where public.rls_is_platform_user()
   or auth.role() = 'service_role';

create view api_admin_ops_config_flag
with (security_barrier = true) as
select
  f.config_feature_flag_pk as config_pk,
  f.flag_code,
  f.flag_name,
  f.description,
  f.scope_code,
  f.scope_entity_pk,
  coalesce(r.restaurant_name, f.scope_code) as scope_label,
  f.is_enabled,
  case
    when f.flag_code = 'MAX_BAGS_PER_DROP' then nullif((f.config_json ->> 'max_bags_per_drop')::integer, 0)
    else null
  end as numeric_value,
  coalesce(f.config_json ->> 'consumed_by',
    case f.flag_code
      when 'CLAIMS_ENABLED' then 'consumer discovery and claim hold RPC'
      when 'PUBLISHING_ENABLED' then 'restaurant portal drop publishing'
      when 'MAX_BAGS_PER_DROP' then 'restaurant portal drop publishing'
      else 'not allowlisted'
    end
  ) as consumed_by_text,
  f.updated_at
from config_feature_flag f
left join restaurant_restaurant r on r.restaurant_restaurant_pk = f.scope_entity_pk
where (public.rls_is_platform_user()
   or auth.role() = 'service_role')
  and f.flag_code in ('CLAIMS_ENABLED','PUBLISHING_ENABLED','MAX_BAGS_PER_DROP')
  and f.scope_code in ('GLOBAL','RESTAURANT');

create view api_admin_ops_audit_log
with (security_barrier = true) as
select
  a.audit_log_pk,
  a.actor_profile_fk,
  a.actor_role_code,
  a.action_code,
  a.target_entity_type_code,
  a.target_entity_pk,
  a.audit_payload_json ->> 'reason' as reason_text,
  a.created_at
from audit_log a
where (public.rls_is_platform_user()
   or auth.role() = 'service_role')
  and (
    a.action_code like 'RESTAURANT_%'
    or a.action_code like 'DROP_%'
    or a.action_code like 'SUPPORT_%'
    or a.action_code like 'INCIDENT_%'
    or a.action_code like 'REFUND_%'
    or a.action_code like 'CONFIG_%'
    or a.action_code like 'SETTLEMENT_%'
  )
order by a.created_at desc;

comment on view api_admin_ops_restaurant_summary is
  'Slice 8B admin ops restaurant control-center summary. Platform-admin scoped; no PII, private docs, provider payloads, pickup credentials, or internal note bodies.';
comment on view api_admin_ops_support_queue is
  'Slice 8B support-safe admin ticket queue. Includes linked entity IDs and status only, not consumer contact lists or internal event bodies.';
comment on view api_admin_ops_refund_queue is
  'Slice 8B manual refund/debit tracking queue. Read-only support artifact; no provider refund execution.';
comment on view api_admin_ops_config_flag is
  'Slice 8B allowlisted operational config flags consumed by claim and publishing guardrails.';

grant select on api_admin_ops_restaurant_summary to authenticated;
grant select on api_admin_ops_drop_summary to authenticated;
grant select on api_admin_ops_support_queue to authenticated;
grant select on api_admin_ops_incident_queue to authenticated;
grant select on api_admin_ops_refund_queue to authenticated;
grant select on api_admin_ops_config_flag to authenticated;
grant select on api_admin_ops_audit_log to authenticated;
grant select on api_admin_ops_restaurant_summary to service_role;
grant select on api_admin_ops_drop_summary to service_role;
grant select on api_admin_ops_support_queue to service_role;
grant select on api_admin_ops_incident_queue to service_role;
grant select on api_admin_ops_refund_queue to service_role;
grant select on api_admin_ops_config_flag to service_role;
grant select on api_admin_ops_audit_log to service_role;

revoke all on function public.api_admin_ops_has_role(uuid,text[]) from public;
revoke all on function public.api_ops_claims_enabled(uuid) from public;
revoke all on function public.api_ops_publishing_enabled(uuid) from public;
revoke all on function public.api_ops_max_bags_per_drop(uuid) from public;
revoke all on function public.api_admin_set_restaurant_operational_status(uuid,uuid,text,text,text) from public;
revoke all on function public.api_admin_set_drop_operational_status(uuid,uuid,text,text) from public;

grant execute on function public.api_ops_claims_enabled(uuid) to anon, authenticated, service_role;
grant execute on function public.api_ops_publishing_enabled(uuid) to authenticated, service_role;
grant execute on function public.api_ops_max_bags_per_drop(uuid) to authenticated, service_role;
grant execute on function public.api_admin_set_restaurant_operational_status(uuid,uuid,text,text,text) to service_role;
grant execute on function public.api_admin_set_drop_operational_status(uuid,uuid,text,text) to service_role;

commit;
