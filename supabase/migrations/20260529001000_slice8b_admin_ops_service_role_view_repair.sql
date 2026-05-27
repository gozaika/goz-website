begin;

create or replace view api_admin_ops_restaurant_summary
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

create or replace view api_admin_ops_drop_summary
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

create or replace view api_admin_ops_support_queue
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

create or replace view api_admin_ops_incident_queue
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

create or replace view api_admin_ops_refund_queue
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

create or replace view api_admin_ops_config_flag
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

create or replace view api_admin_ops_audit_log
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

grant select on api_admin_ops_restaurant_summary to authenticated, service_role;
grant select on api_admin_ops_drop_summary to authenticated, service_role;
grant select on api_admin_ops_support_queue to authenticated, service_role;
grant select on api_admin_ops_incident_queue to authenticated, service_role;
grant select on api_admin_ops_refund_queue to authenticated, service_role;
grant select on api_admin_ops_config_flag to authenticated, service_role;
grant select on api_admin_ops_audit_log to authenticated, service_role;

commit;
