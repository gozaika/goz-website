-- Slice 8A: Pilot ROI Reports
-- Read-only reporting models for restaurant partner ROI and admin weekly review.

drop view if exists api_admin_roi_report_note;
drop view if exists api_restaurant_roi_report_note;
drop view if exists api_admin_roi_drop_detail;
drop view if exists api_restaurant_roi_drop_detail;

create or replace view api_restaurant_roi_drop_detail
with (security_barrier = true) as
select
  d.restaurant_fk,
  r.restaurant_name,
  d.drop_drop_pk as drop_pk,
  d.drop_title,
  rev.display_name as bag_display_name,
  d.drop_status_code,
  d.pickup_start_at,
  d.pickup_end_at,
  d.quantity_total as quantity_listed,
  coalesce(order_metrics.quantity_sold, 0)::integer as quantity_sold,
  coalesce(order_metrics.quantity_collected, 0)::integer as quantity_collected,
  coalesce(order_metrics.no_show_count, 0)::integer as no_show_count,
  coalesce(order_metrics.open_pickup_order_count, 0)::integer as open_pickup_order_count,
  case
    when d.quantity_total > 0 then round((coalesce(order_metrics.quantity_sold, 0)::numeric * 10000) / d.quantity_total)::integer
    else null
  end as sell_through_bps,
  coalesce(order_metrics.gmv_paise, 0)::bigint as gmv_paise,
  greatest(
    coalesce(order_metrics.gmv_paise, 0)
      - coalesce(order_metrics.refund_debit_paise, 0)
      - coalesce(order_metrics.payment_fee_paise, 0)
      - coalesce(order_metrics.payment_tax_paise, 0),
    0
  )::bigint as estimated_net_recovery_paise,
  coalesce(order_metrics.refund_debit_paise, 0)::bigint as refund_debit_paise,
  coalesce(order_metrics.payment_fee_paise, 0)::bigint as payment_fee_paise,
  coalesce(order_metrics.payment_tax_paise, 0)::bigint as payment_tax_paise,
  coalesce(order_metrics.incident_count, 0)::integer as incident_count,
  coalesce(order_metrics.first_time_buyer_count, 0)::integer as first_time_buyer_count,
  coalesce(order_metrics.repeat_buyer_count, 0)::integer as repeat_buyer_count,
  order_metrics.settlement_run_pk,
  order_metrics.settlement_status_code,
  order_metrics.latest_order_created_at,
  d.updated_at
from drop_drop d
join restaurant_restaurant r
  on r.restaurant_restaurant_pk = d.restaurant_fk
join catalog_bag_template_revision rev
  on rev.catalog_bag_template_revision_pk = d.catalog_bag_template_revision_fk
left join lateral (
  with paid_orders as (
    select
      o.order_order_pk,
      o.order_number,
      o.consumer_profile_fk,
      o.order_status_code,
      o.total_paise,
      o.created_at,
      coalesce(oi.quantity, 1)::integer as quantity,
      coalesce(tx.payment_fee_paise, 0)::bigint as payment_fee_paise,
      coalesce(tx.payment_tax_paise, 0)::bigint as payment_tax_paise,
      coalesce(refunds.refund_debit_paise, 0)::bigint as refund_debit_paise,
      coalesce(incidents.incident_count, 0)::integer as incident_count,
      exists (
        select 1
        from order_order prior
        where prior.restaurant_fk = o.restaurant_fk
          and prior.consumer_profile_fk = o.consumer_profile_fk
          and prior.payment_status_code = 'CAPTURED'
          and prior.created_at < o.created_at
      ) as is_repeat_buyer
    from order_order o
    left join order_item oi
      on oi.order_fk = o.order_order_pk
    left join lateral (
      select
        sum(coalesce(pt.fee_paise, 0))::bigint as payment_fee_paise,
        sum(coalesce(pt.tax_paise, 0))::bigint as payment_tax_paise
      from payment_order_intent pi
      join payment_transaction pt
        on pt.payment_order_intent_fk = pi.payment_order_intent_pk
       and pt.transaction_status_code = 'CAPTURED'
      where pi.order_fk = o.order_order_pk
    ) tx on true
    left join lateral (
      select sum(pr.amount_paise)::bigint as refund_debit_paise
      from payment_refund pr
      where pr.order_fk = o.order_order_pk
        and pr.refund_status_code in ('PROCESSING','SUCCEEDED')
    ) refunds on true
    left join lateral (
      select count(*)::integer as incident_count
      from incident_incident inc
      where inc.order_fk = o.order_order_pk
    ) incidents on true
    where o.drop_fk = d.drop_drop_pk
      and o.payment_status_code = 'CAPTURED'
  )
  select
    sum(po.quantity)::integer as quantity_sold,
    sum(po.quantity) filter (where po.order_status_code = 'COLLECTED')::integer as quantity_collected,
    count(*) filter (where po.order_status_code = 'NO_SHOW')::integer as no_show_count,
    count(*) filter (
      where po.order_status_code not in ('COLLECTED','NO_SHOW','CANCELLED','REFUNDED','PICKUP_EXPIRED')
        and d.pickup_end_at > now()
    )::integer as open_pickup_order_count,
    sum(po.total_paise)::bigint as gmv_paise,
    sum(po.refund_debit_paise)::bigint as refund_debit_paise,
    sum(po.payment_fee_paise)::bigint as payment_fee_paise,
    sum(po.payment_tax_paise)::bigint as payment_tax_paise,
    sum(po.incident_count)::integer as incident_count,
    count(distinct po.consumer_profile_fk) filter (where not po.is_repeat_buyer)::integer as first_time_buyer_count,
    count(distinct po.consumer_profile_fk) filter (where po.is_repeat_buyer)::integer as repeat_buyer_count,
    (array_agg(sr.finance_settlement_run_pk order by sr.locked_at desc nulls last, sr.updated_at desc)
      filter (where sr.finance_settlement_run_pk is not null))[1] as settlement_run_pk,
    (array_agg(sr.settlement_status_code order by sr.locked_at desc nulls last, sr.updated_at desc)
      filter (where sr.finance_settlement_run_pk is not null))[1] as settlement_status_code,
    max(po.created_at) as latest_order_created_at
  from paid_orders po
  left join finance_restaurant_payout_entry e
    on e.order_fk = po.order_order_pk
   and e.entry_type_code = 'ORDER_GROSS'
  left join finance_settlement_run sr
    on sr.finance_settlement_run_pk = e.finance_settlement_run_fk
   and sr.settlement_status_code <> 'CANCELLED'
) order_metrics on true
where public.rls_has_restaurant_access(d.restaurant_fk)
   or public.rls_is_platform_user();

create or replace view api_admin_roi_drop_detail
with (security_barrier = true) as
select *
from api_restaurant_roi_drop_detail
where public.rls_is_platform_user();

create or replace view api_restaurant_roi_report_note
with (security_barrier = true) as
select
  inc.incident_incident_pk as row_pk,
  inc.restaurant_fk,
  r.restaurant_name,
  inc.order_fk as order_pk,
  o.order_number,
  o.drop_fk,
  'INCIDENT'::text as note_type_code,
  mis.severity_code,
  mst.status_code,
  null::bigint as amount_paise,
  inc.title_text,
  inc.description_text,
  coalesce(inc.occurred_at, inc.created_at) as occurred_at
from incident_incident inc
join restaurant_restaurant r
  on r.restaurant_restaurant_pk = inc.restaurant_fk
left join order_order o
  on o.order_order_pk = inc.order_fk
join master_incident_severity mis
  on mis.master_incident_severity_pk = inc.master_incident_severity_fk
join master_incident_status mst
  on mst.master_incident_status_pk = inc.master_incident_status_fk
where inc.restaurant_fk is not null
  and (public.rls_has_restaurant_access(inc.restaurant_fk) or public.rls_is_platform_user())
union all
select
  pr.payment_refund_pk as row_pk,
  o.restaurant_fk,
  r.restaurant_name,
  o.order_order_pk as order_pk,
  o.order_number,
  o.drop_fk,
  'REFUND'::text as note_type_code,
  null::text as severity_code,
  pr.refund_status_code as status_code,
  pr.amount_paise,
  concat('Refund/debit: ', pr.refund_reason_code) as title_text,
  case
    when pr.refund_status_code = 'SUCCEEDED' then 'Refund/debit succeeded and is included in report deductions.'
    when pr.refund_status_code = 'PROCESSING' then 'Refund/debit is processing and shown for partner review.'
    else 'Refund/debit request is visible for support review.'
  end as description_text,
  coalesce(pr.processed_at, pr.requested_at, pr.created_at) as occurred_at
from payment_refund pr
join order_order o
  on o.order_order_pk = pr.order_fk
join restaurant_restaurant r
  on r.restaurant_restaurant_pk = o.restaurant_fk
where pr.refund_status_code in ('PROCESSING','SUCCEEDED')
  and (public.rls_has_restaurant_access(o.restaurant_fk) or public.rls_is_platform_user());

create or replace view api_admin_roi_report_note
with (security_barrier = true) as
select *
from api_restaurant_roi_report_note
where public.rls_is_platform_user();

comment on view api_restaurant_roi_drop_detail is
  'Slice 8A restaurant-safe ROI drop detail. Scoped to active restaurant membership and excludes consumer PII, provider payloads, pickup credentials, and private documents.';
comment on view api_admin_roi_drop_detail is
  'Slice 8A admin ROI drop detail. Platform-admin scoped, support-safe, and read-only.';
comment on view api_restaurant_roi_report_note is
  'Slice 8A restaurant-safe incident/refund note rows for partner ROI reports. Excludes internal notes, consumer contact data, provider payloads, and secrets.';
comment on view api_admin_roi_report_note is
  'Slice 8A admin incident/refund note rows for ROI review. Support-safe and read-only.';

grant select on api_restaurant_roi_drop_detail to authenticated;
grant select on api_admin_roi_drop_detail to authenticated;
grant select on api_restaurant_roi_report_note to authenticated;
grant select on api_admin_roi_report_note to authenticated;
