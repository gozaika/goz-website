-- Slice 4B repair: qualify payment_transaction returning columns inside webhook RPCs.
-- PostgreSQL treats output parameter names as PL/pgSQL variables, so an
-- unqualified RETURNING payment_transaction_pk is ambiguous in
-- api_convert_paid_hold_to_order because the function also returns a column
-- named payment_transaction_pk.

create or replace function public.api_record_razorpay_payment_failed(
  p_provider_order_ref text,
  p_provider_payment_ref text,
  p_amount_paise bigint,
  p_currency_code text default 'INR',
  p_payment_method_code text default null,
  p_webhook_event_pk uuid default null,
  p_provider_payload_json jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent payment_order_intent%rowtype;
  v_transaction_pk uuid;
begin
  if p_provider_order_ref is null or length(trim(p_provider_order_ref)) = 0 then
    raise exception 'provider order reference is required';
  end if;

  select * into v_intent
  from payment_order_intent
  where provider_code = 'RAZORPAY'
    and provider_order_ref = p_provider_order_ref
  for update;

  if not found then
    raise exception 'payment intent not found for provider order';
  end if;

  if p_provider_payment_ref is not null and length(trim(p_provider_payment_ref)) > 0 then
    insert into payment_transaction (
      payment_order_intent_fk,
      provider_code,
      provider_payment_ref,
      transaction_status_code,
      amount_paise,
      payment_method_code,
      provider_payload_json
    ) values (
      v_intent.payment_order_intent_pk,
      'RAZORPAY',
      p_provider_payment_ref,
      'FAILED',
      coalesce(p_amount_paise, v_intent.amount_paise),
      p_payment_method_code,
      coalesce(p_provider_payload_json, '{}'::jsonb)
    )
    on conflict (provider_code, provider_payment_ref) do update
      set transaction_status_code = 'FAILED',
          updated_at = now()
    returning payment_transaction.payment_transaction_pk into v_transaction_pk;
  end if;

  update payment_order_intent
  set payment_intent_status_code = 'FAILED',
      updated_at = now()
  where payment_order_intent_pk = v_intent.payment_order_intent_pk
    and order_fk is null;

  return v_intent.payment_order_intent_pk;
end;
$$;

comment on function public.api_record_razorpay_payment_failed(text,text,bigint,text,text,uuid,jsonb) is
  'Service-role webhook RPC. Records a failed Razorpay payment against an intent without releasing the hold or creating an order.';

create or replace function public.api_convert_paid_hold_to_order(
  p_provider_order_ref text,
  p_provider_payment_ref text,
  p_amount_paise bigint,
  p_currency_code text default 'INR',
  p_payment_method_code text default null,
  p_fee_paise bigint default 0,
  p_tax_paise bigint default 0,
  p_captured_at timestamptz default now(),
  p_webhook_event_pk uuid default null,
  p_provider_payload_json jsonb default '{}'::jsonb
)
returns table (
  payment_order_intent_pk uuid,
  payment_transaction_pk uuid,
  order_pk uuid,
  already_converted boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent payment_order_intent%rowtype;
  v_hold drop_inventory_hold%rowtype;
  v_drop drop_drop%rowtype;
  v_restaurant restaurant_restaurant%rowtype;
  v_revision catalog_bag_template_revision%rowtype;
  v_order_pk uuid;
  v_transaction_pk uuid;
  v_expected_amount bigint;
  v_order_number text;
  v_allergen_summary text;
  v_serves_text text;
  v_sequence bigint;
begin
  if p_provider_order_ref is null or length(trim(p_provider_order_ref)) = 0 then
    raise exception 'provider order reference is required';
  end if;
  if p_provider_payment_ref is null or length(trim(p_provider_payment_ref)) = 0 then
    raise exception 'provider payment reference is required';
  end if;

  select * into v_intent
  from payment_order_intent
  where provider_code = 'RAZORPAY'
    and provider_order_ref = p_provider_order_ref
  for update;

  if not found then
    raise exception 'payment intent not found for provider order';
  end if;

  if upper(coalesce(p_currency_code, 'INR')) <> v_intent.currency_code then
    raise exception 'payment currency mismatch';
  end if;
  if p_amount_paise <> v_intent.amount_paise then
    raise exception 'payment amount mismatch';
  end if;

  insert into payment_transaction (
    payment_order_intent_fk,
    provider_code,
    provider_payment_ref,
    transaction_status_code,
    amount_paise,
    fee_paise,
    tax_paise,
    payment_method_code,
    captured_at,
    provider_payload_json
  ) values (
    v_intent.payment_order_intent_pk,
    'RAZORPAY',
    p_provider_payment_ref,
    'CAPTURED',
    p_amount_paise,
    coalesce(p_fee_paise, 0),
    coalesce(p_tax_paise, 0),
    p_payment_method_code,
    coalesce(p_captured_at, now()),
    coalesce(p_provider_payload_json, '{}'::jsonb)
  )
  on conflict (provider_code, provider_payment_ref) do update
    set transaction_status_code = 'CAPTURED',
        captured_at = coalesce(payment_transaction.captured_at, excluded.captured_at),
        updated_at = now()
  returning payment_transaction.payment_transaction_pk into v_transaction_pk;

  if v_intent.order_fk is not null then
    update payment_order_intent
    set payment_intent_status_code = 'CAPTURED',
        updated_at = now()
    where payment_order_intent_pk = v_intent.payment_order_intent_pk;

    payment_order_intent_pk := v_intent.payment_order_intent_pk;
    payment_transaction_pk := v_transaction_pk;
    order_pk := v_intent.order_fk;
    already_converted := true;
    return next;
    return;
  end if;

  select * into v_hold
  from drop_inventory_hold
  where drop_inventory_hold_pk = v_intent.drop_inventory_hold_fk
  for update;

  if not found then
    raise exception 'inventory hold not found';
  end if;

  if v_hold.hold_status_code = 'CONVERTED' and v_hold.converted_order_fk is not null then
    update payment_order_intent
    set order_fk = v_hold.converted_order_fk,
        payment_intent_status_code = 'CAPTURED',
        updated_at = now()
    where payment_order_intent_pk = v_intent.payment_order_intent_pk;

    payment_order_intent_pk := v_intent.payment_order_intent_pk;
    payment_transaction_pk := v_transaction_pk;
    order_pk := v_hold.converted_order_fk;
    already_converted := true;
    return next;
    return;
  end if;

  if v_hold.hold_status_code <> 'ACTIVE' then
    raise exception 'hold is not active';
  end if;
  if v_hold.expires_at <= now() then
    raise exception 'hold has expired';
  end if;
  if v_hold.consumer_profile_fk <> v_intent.consumer_profile_fk then
    raise exception 'hold owner mismatch';
  end if;

  select * into v_drop
  from drop_drop
  where drop_drop_pk = v_hold.drop_fk
  for update;

  if not found then
    raise exception 'drop not found';
  end if;
  if v_drop.drop_drop_pk <> v_hold.drop_fk then
    raise exception 'drop mismatch';
  end if;
  if v_drop.quantity_reserved < v_hold.quantity then
    raise exception 'reserved quantity mismatch';
  end if;

  v_expected_amount := (v_drop.price_paise::bigint * v_hold.quantity::bigint);
  if v_expected_amount <> v_intent.amount_paise or v_expected_amount <> p_amount_paise then
    raise exception 'hold amount mismatch';
  end if;

  select * into v_restaurant
  from restaurant_restaurant
  where restaurant_restaurant_pk = v_drop.restaurant_fk;

  select * into v_revision
  from catalog_bag_template_revision
  where catalog_bag_template_revision_pk = v_drop.catalog_bag_template_revision_fk;

  if v_restaurant.restaurant_restaurant_pk is null or v_revision.catalog_bag_template_revision_pk is null then
    raise exception 'order snapshot source missing';
  end if;

  v_sequence := nextval('public.order_order_number_seq');
  v_order_number := concat('GZ-HYD-', to_char(now() at time zone 'Asia/Kolkata', 'YYYYMM'), '-', lpad(v_sequence::text, 6, '0'));
  v_serves_text := case
    when v_revision.serves_min is null or v_revision.serves_max is null then null
    when v_revision.serves_min = v_revision.serves_max then concat('Serves ', v_revision.serves_min)
    else concat('Serves ', v_revision.serves_min, '-', v_revision.serves_max)
  end;
  v_allergen_summary := v_revision.allergen_summary_text;

  insert into order_order (
    order_number,
    consumer_profile_fk,
    restaurant_fk,
    drop_fk,
    drop_inventory_hold_fk,
    order_status_code,
    payment_status_code,
    pickup_window_start_at,
    pickup_window_end_at,
    subtotal_paise,
    total_paise,
    currency_code,
    snapshot_restaurant_name,
    snapshot_restaurant_slug,
    snapshot_drop_title,
    snapshot_bag_display_name,
    snapshot_dietary_category_code,
    snapshot_spice_level_code,
    snapshot_allergen_summary_text,
    snapshot_serves_text,
    snapshot_pickup_instructions
  ) values (
    v_order_number,
    v_hold.consumer_profile_fk,
    v_drop.restaurant_fk,
    v_drop.drop_drop_pk,
    v_hold.drop_inventory_hold_pk,
    'PAID',
    'CAPTURED',
    v_drop.pickup_start_at,
    v_drop.pickup_end_at,
    v_expected_amount,
    v_expected_amount,
    v_intent.currency_code,
    v_restaurant.restaurant_name,
    v_restaurant.restaurant_slug,
    v_drop.drop_title,
    v_revision.display_name,
    v_revision.dietary_category_code,
    v_revision.spice_level_code,
    v_allergen_summary,
    v_serves_text,
    v_restaurant.pickup_instructions
  )
  returning order_order.order_order_pk into v_order_pk;

  insert into order_item (
    order_fk,
    drop_fk,
    catalog_bag_template_revision_fk,
    quantity,
    unit_price_paise,
    line_total_paise,
    snapshot_bag_display_name,
    snapshot_dietary_category_code,
    snapshot_allergen_summary_text
  ) values (
    v_order_pk,
    v_drop.drop_drop_pk,
    v_revision.catalog_bag_template_revision_pk,
    v_hold.quantity,
    v_drop.price_paise,
    v_expected_amount,
    v_revision.display_name,
    v_revision.dietary_category_code,
    v_allergen_summary
  );

  insert into order_status_transition (
    order_fk,
    from_status_code,
    to_status_code,
    transition_reason_code,
    metadata_json
  ) values (
    v_order_pk,
    null,
    'PAID',
    'PAYMENT_CAPTURED',
    jsonb_build_object(
      'payment_order_intent_fk', v_intent.payment_order_intent_pk,
      'payment_transaction_fk', v_transaction_pk,
      'webhook_event_fk', p_webhook_event_pk
    )
  );

  update order_order
  set order_status_code = 'CONFIRMED',
      updated_at = now()
  where order_order_pk = v_order_pk;

  insert into order_status_transition (
    order_fk,
    from_status_code,
    to_status_code,
    transition_reason_code,
    metadata_json
  ) values (
    v_order_pk,
    'PAID',
    'CONFIRMED',
    'PAYMENT_CAPTURED',
    jsonb_build_object(
      'payment_order_intent_fk', v_intent.payment_order_intent_pk,
      'payment_transaction_fk', v_transaction_pk,
      'webhook_event_fk', p_webhook_event_pk
    )
  );

  update drop_inventory_hold
  set hold_status_code = 'CONVERTED',
      converted_order_fk = v_order_pk,
      updated_at = now()
  where drop_inventory_hold_pk = v_hold.drop_inventory_hold_pk;

  update drop_drop
  set quantity_reserved = quantity_reserved - v_hold.quantity,
      quantity_sold = quantity_sold + v_hold.quantity,
      drop_status_code = case
        when quantity_total <= (quantity_sold + v_hold.quantity) then 'SOLD_OUT'
        else drop_status_code
      end,
      updated_at = now()
  where drop_drop_pk = v_drop.drop_drop_pk;

  insert into drop_inventory_event (
    drop_fk,
    drop_inventory_hold_fk,
    order_fk,
    event_type_code,
    quantity_delta,
    reason_text
  ) values (
    v_drop.drop_drop_pk,
    v_hold.drop_inventory_hold_pk,
    v_order_pk,
    'HOLD_CONVERTED',
    0,
    'api_convert_paid_hold_to_order captured Razorpay payment'
  );

  update payment_order_intent
  set order_fk = v_order_pk,
      payment_intent_status_code = 'CAPTURED',
      updated_at = now()
  where payment_order_intent_pk = v_intent.payment_order_intent_pk;

  payment_order_intent_pk := v_intent.payment_order_intent_pk;
  payment_transaction_pk := v_transaction_pk;
  order_pk := v_order_pk;
  already_converted := false;
  return next;
end;
$$;

comment on function public.api_convert_paid_hold_to_order(text,text,bigint,text,text,bigint,bigint,timestamptz,uuid,jsonb) is
  'Service-role webhook RPC. Atomically records a captured Razorpay transaction, converts an active hold to a confirmed paid order, moves reserved inventory to sold inventory, and appends audit ledgers idempotently.';
