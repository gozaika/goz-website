-- Phase 3 §20 (counter queue): surface an `is_reorder` flag on the restaurant pickup
-- queue so the counter can see which orders are full-price "Order Again" reorders.
-- Reorders already appear in the queue (they are normal orders); this just labels them.
-- create-or-replace of an existing view, append-only column at the end.

create or replace view api_restaurant_pickup_order_summary
with (security_barrier = true) as
select
  o.order_order_pk as order_pk,
  o.order_number,
  o.restaurant_fk,
  o.drop_fk,
  o.order_status_code,
  o.payment_status_code,
  o.snapshot_restaurant_name as restaurant_name,
  o.snapshot_drop_title as drop_title,
  o.snapshot_bag_display_name as bag_display_name,
  o.snapshot_dietary_category_code as dietary_category_code,
  o.snapshot_spice_level_code as spice_level_code,
  o.snapshot_allergen_summary_text as allergen_summary_text,
  coalesce(allergens.allergen_codes, array[]::text[]) as allergen_codes,
  oi.quantity,
  o.total_paise as paid_amount_paise,
  o.currency_code,
  o.pickup_window_start_at,
  o.pickup_window_end_at,
  i.payment_intent_status_code,
  captured.payment_captured_at,
  o.collected_at,
  coalesce(verifications.attempt_count, 0)::integer as pickup_verification_attempt_count,
  verifications.last_result_code as last_pickup_verification_result_code,
  verifications.last_recorded_at as last_pickup_verification_at,
  coalesce(incidents.incident_count, 0)::integer as incident_count,
  o.created_at,
  o.updated_at,
  coalesce(drop_meta.is_reorder, false) as is_reorder
from order_order o
left join order_item oi
  on oi.order_fk = o.order_order_pk
left join payment_order_intent i
  on i.order_fk = o.order_order_pk
left join lateral (
  select max(t.captured_at) as payment_captured_at
  from payment_transaction t
  where t.payment_order_intent_fk = i.payment_order_intent_pk
    and t.transaction_status_code = 'CAPTURED'
) captured on true
left join lateral (
  select array_agg(ma.allergen_code order by ma.sort_order) as allergen_codes
  from drop_drop d
  join catalog_bag_template_allergen bta
    on bta.catalog_bag_template_revision_fk = d.catalog_bag_template_revision_fk
    and (bta.contains_flag or bta.may_contain_flag)
  join master_allergen ma
    on ma.master_allergen_pk = bta.master_allergen_fk
  where d.drop_drop_pk = o.drop_fk
) allergens on true
left join lateral (
  select (d.drop_type_code = 'REORDER') as is_reorder
  from drop_drop d
  where d.drop_drop_pk = o.drop_fk
) drop_meta on true
left join lateral (
  select
    count(*) as attempt_count,
    (array_agg(v.verification_result_code order by v.recorded_at desc))[1] as last_result_code,
    max(v.recorded_at) as last_recorded_at
  from order_pickup_verification_event v
  where v.order_fk = o.order_order_pk
) verifications on true
left join lateral (
  select count(*) as incident_count
  from incident_incident inc
  where inc.order_fk = o.order_order_pk
) incidents on true
where public.rls_has_restaurant_access(o.restaurant_fk)
  and o.order_status_code in ('PAID','CONFIRMED','READY_FOR_PICKUP','COLLECTED','NO_SHOW','PICKUP_EXPIRED')
order by o.pickup_window_start_at desc;

comment on view api_restaurant_pickup_order_summary is
  'Slice 5 restaurant pickup queue and terminal-state summary. Excludes raw pickup '
  'credentials, hashes, provider payloads, private docs, and consumer PII. §20: '
  'is_reorder flags full-price "Order Again" reorders (drop_type=REORDER).';
