-- Slice 5: Pickup Verification, Incident Basics & Pilot UX Polish
-- Adds service-role pickup/no-show/incident RPCs and support-safe read models.
-- Raw QR nonce, OTP, credential hashes, provider payloads, private docs, and
-- consumer PII stay out of browser-safe views.

create index if not exists idx_order_pickup_terminal
  on order_order (restaurant_fk, pickup_window_end_at, order_status_code);

create index if not exists idx_incident_order_created
  on incident_incident (order_fk, created_at desc)
  where order_fk is not null;

create or replace function public.api_pickup_result_message(p_result_code text)
returns text
language sql
immutable
as $$
  select case p_result_code
    when 'SUCCESS' then 'Pickup verified. Order marked collected.'
    when 'INVALID_CODE' then 'That pickup proof does not match this order.'
    when 'WRONG_RESTAURANT' then 'This pickup proof belongs to another restaurant.'
    when 'ALREADY_COLLECTED' then 'This order was already collected.'
    when 'EXPIRED_WINDOW' then 'The pickup window has closed. Use no-show if the customer did not collect.'
    when 'ORDER_NOT_READY' then 'This order is not ready for pickup verification.'
    else 'Pickup verification could not be completed.'
  end
$$;

create or replace function public.api_verify_order_pickup(
  p_order_pk uuid,
  p_restaurant_pk uuid,
  p_actor_profile_pk uuid,
  p_credential_method text,
  p_credential_hash text,
  p_idempotency_key text default null,
  p_device_label text default 'Restaurant portal'
)
returns table (
  order_pk uuid,
  order_number text,
  result_code text,
  order_status_code text,
  collected_at timestamptz,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order order_order%rowtype;
  v_existing_event order_pickup_verification_event%rowtype;
  v_method text;
  v_result text;
  v_event_pk uuid;
  v_quantity integer;
  v_collected_at timestamptz;
begin
  if p_order_pk is null or p_restaurant_pk is null or p_actor_profile_pk is null then
    raise exception 'order, restaurant, and actor are required';
  end if;
  if p_credential_hash is null or length(trim(p_credential_hash)) = 0 then
    raise exception 'pickup credential is required';
  end if;
  if p_credential_method not in ('OTP_ENTRY','QR_SCAN') then
    raise exception 'invalid pickup credential method';
  end if;

  v_method := p_credential_method;

  select *
    into v_order
  from order_order
  where order_order_pk = p_order_pk
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if p_idempotency_key is not null then
    select *
      into v_existing_event
    from order_pickup_verification_event
    where order_fk = p_order_pk
      and idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return query
      select
        v_order.order_order_pk,
        v_order.order_number,
        v_existing_event.verification_result_code,
        v_order.order_status_code,
        v_order.collected_at,
        public.api_pickup_result_message(v_existing_event.verification_result_code);
      return;
    end if;
  end if;

  if v_order.restaurant_fk <> p_restaurant_pk then
    v_result := 'WRONG_RESTAURANT';
  elsif v_order.order_status_code = 'COLLECTED' then
    v_result := 'ALREADY_COLLECTED';
  elsif v_order.pickup_window_end_at <= now() then
    v_result := 'EXPIRED_WINDOW';
  elsif v_order.order_status_code not in ('PAID','CONFIRMED','READY_FOR_PICKUP') then
    v_result := 'ORDER_NOT_READY';
  elsif v_method = 'OTP_ENTRY' and coalesce(v_order.pickup_otp_hash, '') <> p_credential_hash then
    v_result := 'INVALID_CODE';
  elsif v_method = 'QR_SCAN' and coalesce(v_order.pickup_qr_nonce_hash, '') <> p_credential_hash then
    v_result := 'INVALID_CODE';
  else
    v_result := 'SUCCESS';
  end if;

  insert into order_pickup_verification_event (
    order_fk,
    restaurant_fk,
    verifying_profile_fk,
    verification_method_code,
    verification_result_code,
    idempotency_key,
    device_label,
    failure_reason_text
  ) values (
    v_order.order_order_pk,
    p_restaurant_pk,
    p_actor_profile_pk,
    v_method,
    v_result,
    p_idempotency_key,
    left(coalesce(p_device_label, 'Restaurant portal'), 80),
    case when v_result = 'SUCCESS' then null else public.api_pickup_result_message(v_result) end
  )
  returning order_pickup_verification_event_pk into v_event_pk;

  if v_result = 'SUCCESS' then
    v_collected_at := now();

    update order_order
    set order_status_code = 'COLLECTED',
        collected_at = v_collected_at,
        updated_at = v_collected_at
    where order_order_pk = v_order.order_order_pk;

    insert into order_status_transition (
      order_fk,
      from_status_code,
      to_status_code,
      transition_reason_code,
      actor_profile_fk,
      metadata_json
    ) values (
      v_order.order_order_pk,
      v_order.order_status_code,
      'COLLECTED',
      case when v_method = 'OTP_ENTRY' then 'STAFF_OTP_VERIFIED' else 'STAFF_QR_VERIFIED' end,
      p_actor_profile_pk,
      jsonb_build_object('pickup_verification_event_fk', v_event_pk)
    );

    select coalesce(sum(quantity), 1)::integer
      into v_quantity
    from order_item
    where order_fk = v_order.order_order_pk;

    update drop_drop
    set quantity_collected = quantity_collected + coalesce(v_quantity, 1),
        updated_at = now()
    where drop_drop_pk = v_order.drop_fk;

    insert into drop_inventory_event (
      drop_fk,
      drop_inventory_hold_fk,
      order_fk,
      event_type_code,
      quantity_delta,
      reason_text,
      actor_profile_fk
    ) values (
      v_order.drop_fk,
      v_order.drop_inventory_hold_fk,
      v_order.order_order_pk,
      'PICKUP_COLLECTED',
      0,
      'api_verify_order_pickup marked order collected',
      p_actor_profile_pk
    );

    v_order.order_status_code := 'COLLECTED';
    v_order.collected_at := v_collected_at;
  end if;

  return query
  select
    v_order.order_order_pk,
    v_order.order_number,
    v_result,
    v_order.order_status_code,
    v_order.collected_at,
    public.api_pickup_result_message(v_result);
end;
$$;

create or replace function public.api_mark_order_no_show(
  p_order_pk uuid,
  p_restaurant_pk uuid,
  p_actor_profile_pk uuid,
  p_reason_text text,
  p_idempotency_key text default null
)
returns table (
  order_pk uuid,
  order_number text,
  order_status_code text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order order_order%rowtype;
begin
  if p_reason_text is null or length(trim(p_reason_text)) < 8 then
    raise exception 'no-show reason is required';
  end if;

  select *
    into v_order
  from order_order
  where order_order_pk = p_order_pk
  for update;

  if not found then
    raise exception 'order not found';
  end if;
  if v_order.restaurant_fk <> p_restaurant_pk then
    raise exception 'wrong restaurant';
  end if;
  if v_order.order_status_code = 'COLLECTED' then
    raise exception 'already collected';
  end if;
  if v_order.order_status_code = 'NO_SHOW' then
    return query
    select v_order.order_order_pk, v_order.order_number, v_order.order_status_code, 'Order is already marked no-show.';
    return;
  end if;
  if v_order.pickup_window_end_at > now() then
    raise exception 'no-show not allowed yet';
  end if;
  if v_order.order_status_code not in ('PAID','CONFIRMED','READY_FOR_PICKUP','PICKUP_EXPIRED') then
    raise exception 'order not eligible for no-show';
  end if;

  update order_order
  set order_status_code = 'NO_SHOW',
      updated_at = now()
  where order_order_pk = v_order.order_order_pk;

  insert into order_status_transition (
    order_fk,
    from_status_code,
    to_status_code,
    transition_reason_code,
    actor_profile_fk,
    metadata_json
  ) values (
    v_order.order_order_pk,
    v_order.order_status_code,
    'NO_SHOW',
    'PICKUP_WINDOW_NO_SHOW',
    p_actor_profile_pk,
    jsonb_build_object(
      'reason_text', left(trim(p_reason_text), 600),
      'idempotency_key', p_idempotency_key
    )
  );

  return query
  select v_order.order_order_pk, v_order.order_number, 'NO_SHOW'::text, 'Order marked no-show. No refund was created.';
end;
$$;

create or replace function public.api_create_order_incident(
  p_order_pk uuid,
  p_restaurant_pk uuid,
  p_actor_profile_pk uuid,
  p_type_code text,
  p_severity_code text default 'P3',
  p_description_text text default null,
  p_internal_note_text text default null,
  p_source_code text default 'RESTAURANT_PORTAL'
)
returns table (
  incident_pk uuid,
  order_pk uuid,
  order_number text,
  type_code text,
  severity_code text,
  status_code text,
  title_text text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order order_order%rowtype;
  v_type master_incident_type%rowtype;
  v_status master_incident_status%rowtype;
  v_severity master_incident_severity%rowtype;
  v_incident_pk uuid;
  v_title text;
begin
  if p_type_code not in ('DIETARY_MISMATCH','FOOD_SAFETY','PACKAGING_BREACH','PICKUP_NOT_HONORED','MISSING_ORDER','QUALITY_ISSUE','PLATFORM_ERROR') then
    raise exception 'incident type invalid';
  end if;
  if p_description_text is null or length(trim(p_description_text)) < 10 then
    raise exception 'incident description is required';
  end if;

  select *
    into v_order
  from order_order
  where order_order_pk = p_order_pk;

  if not found then
    raise exception 'order not found';
  end if;
  if v_order.restaurant_fk <> p_restaurant_pk then
    raise exception 'wrong restaurant';
  end if;

  select * into v_type from master_incident_type where type_code = p_type_code;
  select * into v_status from master_incident_status where status_code = 'OPEN';
  select * into v_severity from master_incident_severity where severity_code = coalesce(p_severity_code, 'P3');

  if v_type.master_incident_type_pk is null or v_status.master_incident_status_pk is null or v_severity.master_incident_severity_pk is null then
    raise exception 'incident reference data missing';
  end if;

  v_title := concat(v_type.type_name, ' - ', v_order.order_number);

  insert into incident_incident (
    restaurant_fk,
    order_fk,
    master_incident_type_fk,
    master_incident_status_fk,
    master_incident_severity_fk,
    title_text,
    description_text,
    reported_by_profile_fk,
    occurred_at
  ) values (
    v_order.restaurant_fk,
    v_order.order_order_pk,
    v_type.master_incident_type_pk,
    v_status.master_incident_status_pk,
    v_severity.master_incident_severity_pk,
    v_title,
    left(trim(p_description_text), 1200),
    p_actor_profile_pk,
    now()
  )
  returning incident_incident_pk into v_incident_pk;

  insert into incident_event (
    incident_fk,
    event_type_code,
    to_status_fk,
    comment_text,
    actor_profile_fk
  ) values (
    v_incident_pk,
    'CREATED',
    v_status.master_incident_status_pk,
    left(
      concat(
        'Source: ', coalesce(p_source_code, 'UNKNOWN'),
        E'\nDescription: ', trim(p_description_text),
        case when p_internal_note_text is not null then concat(E'\nInternal note: ', trim(p_internal_note_text)) else '' end
      ),
      2000
    ),
    p_actor_profile_pk
  );

  return query
  select
    v_incident_pk,
    v_order.order_order_pk,
    v_order.order_number,
    v_type.type_code,
    v_severity.severity_code,
    v_status.status_code,
    v_title,
    now();
end;
$$;

create or replace view api_consumer_order_summary
with (security_barrier = true) as
select
  o.order_order_pk as order_pk,
  o.order_number,
  o.consumer_profile_fk,
  o.restaurant_fk,
  o.drop_fk,
  o.drop_inventory_hold_fk as hold_pk,
  o.order_status_code,
  o.payment_status_code,
  o.snapshot_restaurant_name as restaurant_name,
  o.snapshot_restaurant_slug as restaurant_slug,
  o.snapshot_drop_title as drop_title,
  o.snapshot_bag_display_name as bag_display_name,
  o.snapshot_dietary_category_code as dietary_category_code,
  o.snapshot_spice_level_code as spice_level_code,
  o.snapshot_allergen_summary_text as allergen_summary_text,
  coalesce(
    array_remove(array_agg(ma.allergen_code order by ma.sort_order) filter (where ma.allergen_code is not null), null),
    array[]::text[]
  ) as allergen_codes,
  o.snapshot_serves_text as serves_text,
  o.snapshot_pickup_instructions as pickup_instructions,
  oi.quantity,
  oi.unit_price_paise,
  o.total_paise as paid_amount_paise,
  o.currency_code,
  o.pickup_window_start_at,
  o.pickup_window_end_at,
  o.pickup_qr_nonce_hash is not null as has_pickup_qr,
  o.pickup_otp_hash is not null as has_pickup_otp,
  i.payment_order_intent_pk,
  i.provider_order_ref,
  i.payment_intent_status_code,
  max(t.captured_at) as payment_captured_at,
  o.created_at,
  o.updated_at,
  o.collected_at
from order_order o
left join order_item oi
  on oi.order_fk = o.order_order_pk
left join drop_drop d
  on d.drop_drop_pk = o.drop_fk
left join catalog_bag_template_allergen bta
  on bta.catalog_bag_template_revision_fk = d.catalog_bag_template_revision_fk
  and (bta.contains_flag or bta.may_contain_flag)
left join master_allergen ma
  on ma.master_allergen_pk = bta.master_allergen_fk
left join payment_order_intent i
  on i.order_fk = o.order_order_pk
left join payment_transaction t
  on t.payment_order_intent_fk = i.payment_order_intent_pk
  and t.transaction_status_code = 'CAPTURED'
where public.rls_is_consumer_profile(o.consumer_profile_fk)
group by
  o.order_order_pk,
  oi.quantity,
  oi.unit_price_paise,
  i.payment_order_intent_pk,
  i.provider_order_ref,
  i.payment_intent_status_code;

create or replace view api_restaurant_order_summary
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
  coalesce(
    array_remove(array_agg(ma.allergen_code order by ma.sort_order) filter (where ma.allergen_code is not null), null),
    array[]::text[]
  ) as allergen_codes,
  oi.quantity,
  o.total_paise as paid_amount_paise,
  o.currency_code,
  o.pickup_window_start_at,
  o.pickup_window_end_at,
  i.payment_intent_status_code,
  max(t.captured_at) as payment_captured_at,
  o.created_at,
  o.updated_at,
  o.collected_at
from order_order o
left join order_item oi
  on oi.order_fk = o.order_order_pk
left join drop_drop d
  on d.drop_drop_pk = o.drop_fk
left join catalog_bag_template_allergen bta
  on bta.catalog_bag_template_revision_fk = d.catalog_bag_template_revision_fk
  and (bta.contains_flag or bta.may_contain_flag)
left join master_allergen ma
  on ma.master_allergen_pk = bta.master_allergen_fk
left join payment_order_intent i
  on i.order_fk = o.order_order_pk
left join payment_transaction t
  on t.payment_order_intent_fk = i.payment_order_intent_pk
  and t.transaction_status_code = 'CAPTURED'
where o.order_status_code in ('PAID','CONFIRMED','READY_FOR_PICKUP','COLLECTED','NO_SHOW')
  and public.rls_has_restaurant_access(o.restaurant_fk)
group by
  o.order_order_pk,
  oi.quantity,
  i.payment_intent_status_code;

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
  o.updated_at
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
  'Slice 5 restaurant pickup queue and terminal-state summary. Excludes raw pickup credentials, hashes, provider payloads, private docs, and consumer PII.';

create or replace view api_admin_pickup_order_summary
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
  o.consumer_profile_fk,
  o.drop_inventory_hold_fk as hold_pk,
  i.provider_order_ref,
  null::timestamptz as webhook_processed_at,
  null::text as webhook_processing_status_code
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
where public.rls_is_platform_user()
  and o.order_status_code in ('PAID','CONFIRMED','READY_FOR_PICKUP','COLLECTED','NO_SHOW','PICKUP_EXPIRED');

comment on view api_admin_pickup_order_summary is
  'Slice 5 admin support-safe pickup/order summary. Uses truncated app-side display for IDs and omits raw credentials, hashes, payment payloads, private docs, and direct consumer contact fields.';

create or replace view api_restaurant_incident_summary
with (security_barrier = true) as
select
  inc.incident_incident_pk as incident_pk,
  inc.order_fk as order_pk,
  o.order_number,
  inc.restaurant_fk,
  r.restaurant_name,
  mit.type_code,
  mit.type_name,
  mis.severity_code,
  mst.status_code,
  inc.title_text,
  inc.description_text,
  inc.reported_by_profile_fk,
  inc.occurred_at,
  inc.created_at,
  inc.updated_at
from incident_incident inc
left join order_order o
  on o.order_order_pk = inc.order_fk
left join restaurant_restaurant r
  on r.restaurant_restaurant_pk = inc.restaurant_fk
join master_incident_type mit
  on mit.master_incident_type_pk = inc.master_incident_type_fk
join master_incident_severity mis
  on mis.master_incident_severity_pk = inc.master_incident_severity_fk
join master_incident_status mst
  on mst.master_incident_status_pk = inc.master_incident_status_fk
where inc.restaurant_fk is not null
  and public.rls_has_restaurant_access(inc.restaurant_fk);

create or replace view api_admin_incident_summary
with (security_barrier = true) as
select *
from api_restaurant_incident_summary
where public.rls_is_platform_user()
union all
select
  inc.incident_incident_pk as incident_pk,
  inc.order_fk as order_pk,
  o.order_number,
  inc.restaurant_fk,
  r.restaurant_name,
  mit.type_code,
  mit.type_name,
  mis.severity_code,
  mst.status_code,
  inc.title_text,
  inc.description_text,
  inc.reported_by_profile_fk,
  inc.occurred_at,
  inc.created_at,
  inc.updated_at
from incident_incident inc
left join order_order o
  on o.order_order_pk = inc.order_fk
left join restaurant_restaurant r
  on r.restaurant_restaurant_pk = inc.restaurant_fk
join master_incident_type mit
  on mit.master_incident_type_pk = inc.master_incident_type_fk
join master_incident_severity mis
  on mis.master_incident_severity_pk = inc.master_incident_severity_fk
join master_incident_status mst
  on mst.master_incident_status_pk = inc.master_incident_status_fk
where public.rls_is_platform_user()
  and not exists (
    select 1
    from api_restaurant_incident_summary visible
    where visible.incident_pk = inc.incident_incident_pk
  );

comment on view api_restaurant_incident_summary is
  'Slice 5 restaurant-visible incident summary scoped to own restaurant orders. No private docs, payment payloads, or consumer contact fields.';
comment on view api_admin_incident_summary is
  'Slice 5 admin-visible incident summary for launch support. No private docs, payment payloads, or pickup credentials.';

grant select on api_restaurant_pickup_order_summary to authenticated;
grant select on api_admin_pickup_order_summary to authenticated;
grant select on api_restaurant_incident_summary to authenticated;
grant select on api_admin_incident_summary to authenticated;

revoke all on function public.api_verify_order_pickup(uuid,uuid,uuid,text,text,text,text) from public;
revoke all on function public.api_mark_order_no_show(uuid,uuid,uuid,text,text) from public;
revoke all on function public.api_create_order_incident(uuid,uuid,uuid,text,text,text,text,text) from public;
grant execute on function public.api_verify_order_pickup(uuid,uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.api_mark_order_no_show(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.api_create_order_incident(uuid,uuid,uuid,text,text,text,text,text) to service_role;
