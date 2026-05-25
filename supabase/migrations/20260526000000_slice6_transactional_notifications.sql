-- Slice 6: Transactional Notifications & Delivery Logs
-- Additive outbox hardening, idempotent enqueue RPCs, worker claiming, delivery logs, and support-safe read models.

alter table notification_outbox
  add column if not exists idempotency_key text,
  add column if not exists template_code text,
  add column if not exists recipient_audience_code text not null default 'CONSUMER',
  add column if not exists provider_code text,
  add column if not exists purpose_code text,
  add column if not exists delivery_reason_code text,
  add column if not exists last_error_code text,
  add column if not exists last_error_text text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_token uuid,
  add column if not exists manual_fallback_text text,
  add column if not exists suppressed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists suppressed_by_profile_fk uuid,
  add column if not exists suppression_reason_text text;

alter table notification_delivery_attempt
  add column if not exists provider_status_code text,
  add column if not exists response_summary_json jsonb not null default '{}'::jsonb;

create unique index if not exists uq_notification_outbox_idempotency_key
  on notification_outbox (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_notification_outbox_worker_due
  on notification_outbox (send_status_code, coalesce(next_attempt_at, scheduled_at), created_at)
  where send_status_code = 'QUEUED';

create index if not exists idx_notification_outbox_template_context
  on notification_outbox (template_code, business_context_type_code, business_context_fk, channel_code);

create index if not exists idx_notification_attempt_outbox_number
  on notification_delivery_attempt (notification_outbox_fk, attempt_number desc);

comment on column notification_outbox.idempotency_key is
  'Slice 6 idempotency key. One notification per context/template/channel/audience/destination intent.';
comment on column notification_outbox.manual_fallback_text is
  'Support-safe manual fallback copy. Must not include raw pickup OTP, QR nonce, hashes, provider secrets, or raw provider payloads.';

create or replace function public.api_update_consumer_profile(
  p_full_name text default null,
  p_phone_e164 text default null,
  p_email_address citext default null,
  p_preferred_language_code text default null,
  p_default_city_code text default null
)
returns table (
  iam_profile_pk uuid,
  consumer_profile_pk uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_pk uuid := public.rls_current_profile_pk();
  v_consumer_profile_pk uuid := public.rls_current_consumer_profile_pk();
  v_city_pk uuid;
  v_first_name text;
  v_last_name text;
begin
  if v_profile_pk is null or v_consumer_profile_pk is null then
    raise exception 'PROFILE_REQUIRED' using errcode = '28000';
  end if;

  if p_default_city_code is not null then
    select geo_city_pk into v_city_pk
    from geo_city
    where city_code = p_default_city_code
    limit 1;
  end if;

  update iam_profile
  set display_name = coalesce(nullif(p_full_name, ''), display_name),
      phone_e164 = coalesce(nullif(p_phone_e164, ''), phone_e164),
      email_address = coalesce(nullif(p_email_address, ''), email_address),
      default_city_fk = coalesce(v_city_pk, default_city_fk),
      updated_at = now()
  where iam_profile.iam_profile_pk = v_profile_pk;

  v_first_name := nullif(split_part(coalesce(p_full_name, ''), ' ', 1), '');
  v_last_name := nullif(trim(both ' ' from regexp_replace(coalesce(p_full_name, ''), '^\S+\s*', '')), '');

  update consumer_profile
  set first_name = coalesce(v_first_name, first_name),
      last_name = coalesce(v_last_name, last_name),
      preferred_language_code = coalesce(nullif(p_preferred_language_code, ''), preferred_language_code),
      updated_at = now()
  where consumer_profile.consumer_profile_pk = v_consumer_profile_pk;

  return query select v_profile_pk, v_consumer_profile_pk;
end;
$$;

comment on function public.api_update_consumer_profile(text, text, citext, text, text) is
  'Updates safe consumer profile fields, including notification email, for the authenticated user. SECURITY DEFINER but scoped to rls_current_profile_pk().';

insert into notification_template
  (template_code, channel_code, locale_code, subject_template, body_template, provider_template_ref, is_active)
values
  (
    'ORDER_CONFIRMATION',
    'EMAIL',
    'en',
    'goZaika order confirmed: {{order_number}}',
    'Your goZaika BAM Bag order {{order_number}} is confirmed for pickup from {{restaurant_name}} during {{pickup_window}}. Open your order page for pickup proof and allergen details.',
    null,
    true
  ),
  (
    'ORDER_CONFIRMATION',
    'WHATSAPP',
    'en',
    null,
    'Order {{order_number}} is confirmed. Pickup {{bag_display_name}} from {{restaurant_name}} during {{pickup_window}}. Open your order page for pickup proof.',
    'gozaika_order_confirmation',
    true
  ),
  (
    'PICKUP_REMINDER',
    'EMAIL',
    'en',
    'Pickup reminder: {{order_number}}',
    'Reminder: your goZaika BAM Bag order {{order_number}} pickup window is {{pickup_window}} at {{restaurant_name}}. Open your order page for pickup proof.',
    null,
    true
  ),
  (
    'PICKUP_REMINDER',
    'WHATSAPP',
    'en',
    null,
    'Reminder for {{order_number}}: pickup {{bag_display_name}} from {{restaurant_name}} during {{pickup_window}}. Open your order page for pickup proof.',
    'gozaika_pickup_reminder',
    true
  ),
  (
    'RESTAURANT_NEW_ORDER_ALERT',
    'EMAIL',
    'en',
    'New goZaika paid order: {{order_number}}',
    'New paid pickup order {{order_number}} for {{bag_display_name}}. Quantity {{quantity}}. Pickup window {{pickup_window}}. Dietary {{dietary_category_code}}. Check allergens before handover.',
    null,
    true
  ),
  (
    'RESTAURANT_NEW_ORDER_ALERT',
    'WHATSAPP',
    'en',
    null,
    'New paid goZaika order {{order_number}}: {{bag_display_name}}, qty {{quantity}}, pickup {{pickup_window}}. Check allergens before handover.',
    'gozaika_restaurant_new_order',
    true
  ),
  (
    'RESTAURANT_PICKUP_ALERT',
    'EMAIL',
    'en',
    'Upcoming goZaika pickup load',
    'Upcoming pickup: order {{order_number}} for {{bag_display_name}}, quantity {{quantity}}, pickup window {{pickup_window}}.',
    null,
    true
  ),
  (
    'RESTAURANT_PICKUP_ALERT',
    'WHATSAPP',
    'en',
    null,
    'Upcoming goZaika pickup {{order_number}}: {{bag_display_name}}, qty {{quantity}}, {{pickup_window}}.',
    'gozaika_restaurant_pickup_alert',
    true
  ),
  (
    'INCIDENT_HIGH_SEVERITY_ALERT',
    'EMAIL',
    'en',
    'High severity goZaika incident: {{incident_code}}',
    'High severity incident {{incident_code}} for {{restaurant_name}} / {{order_number}}. Type {{incident_type}}. Severity {{severity_code}}. Review in admin.',
    null,
    true
  )
on conflict (template_code, channel_code, locale_code) do update
  set subject_template = excluded.subject_template,
      body_template = excluded.body_template,
      provider_template_ref = excluded.provider_template_ref,
      is_active = excluded.is_active,
      updated_at = now();

create or replace function public.api_notification_mask_destination(p_destination text)
returns text
language sql
stable
as $$
  select case
    when p_destination is null or length(trim(p_destination)) = 0 then 'Not available'
    when p_destination like '+91%' and length(p_destination) >= 8 then concat(left(p_destination, 5), '*****', right(p_destination, 3))
    when p_destination like '%@%' then concat(left(split_part(p_destination, '@', 1), 2), '***@', split_part(p_destination, '@', 2))
    when length(p_destination) > 8 then concat(left(p_destination, 4), '...', right(p_destination, 3))
    else 'Configured'
  end;
$$;

create or replace function public.api_notification_latest_consent_granted(
  p_iam_profile_pk uuid,
  p_purpose_code text
)
returns boolean
language sql
stable
as $$
  select coalesce((
    select e.consent_state_code = 'GRANTED'
    from privacy_consent_event e
    join privacy_consent_purpose p
      on p.privacy_consent_purpose_pk = e.privacy_consent_purpose_fk
    where e.iam_profile_fk = p_iam_profile_pk
      and p.purpose_code = p_purpose_code
    order by e.recorded_at desc, e.privacy_consent_event_pk desc
    limit 1
  ), false);
$$;

create or replace function public.api_notification_channel_enabled(
  p_consumer_profile_pk uuid,
  p_channel_code text
)
returns boolean
language sql
stable
as $$
  select coalesce((
    select pref.is_enabled
    from consumer_notification_preference pref
    where pref.consumer_profile_fk = p_consumer_profile_pk
      and pref.channel_code = p_channel_code
    limit 1
  ), true);
$$;

create or replace function public.api_notification_order_payload(p_order_pk uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'restaurant_name', o.snapshot_restaurant_name,
    'drop_title', o.snapshot_drop_title,
    'bag_display_name', o.snapshot_bag_display_name,
    'dietary_category_code', o.snapshot_dietary_category_code,
    'allergen_summary_text', o.snapshot_allergen_summary_text,
    'quantity', coalesce(oi.quantity, 1),
    'amount_paise', o.total_paise,
    'currency_code', o.currency_code,
    'pickup_window_start_at', o.pickup_window_start_at,
    'pickup_window_end_at', o.pickup_window_end_at,
    'pickup_window', concat(
      to_char(o.pickup_window_start_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM'),
      ' - ',
      to_char(o.pickup_window_end_at at time zone 'Asia/Kolkata', 'HH12:MI AM'),
      ' IST'
    ),
    'order_url', concat('https://customer.gozaika.in/orders/', o.order_order_pk)
  )
  from order_order o
  left join order_item oi
    on oi.order_fk = o.order_order_pk
  where o.order_order_pk = p_order_pk
  limit 1;
$$;

create or replace function public.api_notification_order_fallback_text(
  p_order_pk uuid,
  p_template_code text,
  p_audience_code text
)
returns text
language plpgsql
stable
as $$
declare
  v_order order_order%rowtype;
  v_quantity integer;
  v_pickup_window text;
begin
  select * into v_order
  from order_order
  where order_order_pk = p_order_pk;

  if not found then
    return 'goZaika notification fallback unavailable: order not found.';
  end if;

  select coalesce(max(quantity), 1)::integer into v_quantity
  from order_item
  where order_fk = p_order_pk;

  v_pickup_window := concat(
    to_char(v_order.pickup_window_start_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM'),
    ' - ',
    to_char(v_order.pickup_window_end_at at time zone 'Asia/Kolkata', 'HH12:MI AM'),
    ' IST'
  );

  if p_template_code = 'PICKUP_REMINDER' and p_audience_code = 'CONSUMER' then
    return concat(
      'goZaika pickup reminder', chr(10),
      'Order: ', v_order.order_number, chr(10),
      'Restaurant: ', v_order.snapshot_restaurant_name, chr(10),
      'BAM Bag: ', v_order.snapshot_bag_display_name, chr(10),
      'Pickup window: ', v_pickup_window, chr(10),
      'Open your order page for pickup proof. Do not share OTP or QR details in chat.'
    );
  elsif p_template_code = 'RESTAURANT_NEW_ORDER_ALERT' then
    return concat(
      'goZaika new paid order', chr(10),
      'Order: ', v_order.order_number, chr(10),
      'BAM Bag: ', v_order.snapshot_bag_display_name, chr(10),
      'Quantity: ', v_quantity, chr(10),
      'Pickup window: ', v_pickup_window, chr(10),
      'Dietary: ', v_order.snapshot_dietary_category_code, chr(10),
      'Allergens: ', coalesce(v_order.snapshot_allergen_summary_text, 'Check order detail before handover')
    );
  elsif p_template_code = 'RESTAURANT_PICKUP_ALERT' then
    return concat(
      'goZaika upcoming pickup', chr(10),
      'Order: ', v_order.order_number, chr(10),
      'BAM Bag: ', v_order.snapshot_bag_display_name, chr(10),
      'Quantity: ', v_quantity, chr(10),
      'Pickup window: ', v_pickup_window
    );
  else
    return concat(
      'goZaika order confirmed', chr(10),
      'Order: ', v_order.order_number, chr(10),
      'Restaurant: ', v_order.snapshot_restaurant_name, chr(10),
      'BAM Bag: ', v_order.snapshot_bag_display_name, chr(10),
      'Pickup window: ', v_pickup_window, chr(10),
      'Paid: INR ', to_char((v_order.total_paise::numeric / 100), 'FM999999990.00'), chr(10),
      'Open your order page for pickup proof and allergen details. Do not share OTP or QR details in chat.'
    );
  end if;
end;
$$;

create or replace function public.api_enqueue_notification_outbox_row(
  p_template_code text,
  p_channel_code text,
  p_audience_code text,
  p_business_context_type_code text,
  p_business_context_fk uuid,
  p_recipient_profile_fk uuid,
  p_resolved_destination_text text,
  p_payload_json jsonb,
  p_send_status_code text,
  p_delivery_reason_code text,
  p_purpose_code text,
  p_scheduled_at timestamptz,
  p_manual_fallback_text text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_pk uuid;
  v_provider_code text;
  v_outbox_pk uuid;
begin
  select notification_template_pk into v_template_pk
  from notification_template
  where template_code = p_template_code
    and channel_code = p_channel_code
    and locale_code = 'en'
    and is_active
  limit 1;

  v_provider_code := case
    when p_channel_code = 'WHATSAPP' then 'META_WHATSAPP'
    when p_channel_code = 'EMAIL' then 'RESEND'
    else 'SYSTEM'
  end;

  insert into notification_outbox (
    notification_template_fk,
    channel_code,
    recipient_profile_fk,
    resolved_destination_text,
    business_context_type_code,
    business_context_fk,
    payload_json,
    send_status_code,
    scheduled_at,
    idempotency_key,
    template_code,
    recipient_audience_code,
    provider_code,
    purpose_code,
    delivery_reason_code,
    manual_fallback_text,
    suppressed_at,
    updated_at
  ) values (
    v_template_pk,
    p_channel_code,
    p_recipient_profile_fk,
    coalesce(nullif(trim(p_resolved_destination_text), ''), 'MISSING_DESTINATION'),
    p_business_context_type_code,
    p_business_context_fk,
    coalesce(p_payload_json, '{}'::jsonb),
    p_send_status_code,
    coalesce(p_scheduled_at, now()),
    p_idempotency_key,
    p_template_code,
    p_audience_code,
    v_provider_code,
    p_purpose_code,
    p_delivery_reason_code,
    p_manual_fallback_text,
    case when p_send_status_code = 'SUPPRESSED' then now() else null end,
    now()
  )
  on conflict (idempotency_key) where idempotency_key is not null do update
    set updated_at = notification_outbox.updated_at
  returning notification_outbox_pk into v_outbox_pk;

  return v_outbox_pk;
end;
$$;

create or replace function public.api_enqueue_order_notifications(p_order_pk uuid)
returns table (
  notification_outbox_pk uuid,
  template_code text,
  channel_code text,
  send_status_code text,
  delivery_reason_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order order_order%rowtype;
  v_consumer consumer_profile%rowtype;
  v_iam iam_profile%rowtype;
  v_payload jsonb;
  v_channel text;
  v_destination text;
  v_status text;
  v_reason text;
  v_purpose text;
  v_outbox_pk uuid;
  v_contact record;
begin
  select * into v_order from order_order where order_order_pk = p_order_pk;
  if not found then
    raise exception 'order not found';
  end if;

  if v_order.payment_status_code <> 'CAPTURED' or v_order.order_status_code not in ('PAID','CONFIRMED','READY_FOR_PICKUP') then
    raise exception 'order is not webhook-confirmed paid';
  end if;

  select * into v_consumer from consumer_profile where consumer_profile_pk = v_order.consumer_profile_fk;
  select * into v_iam from iam_profile where iam_profile_pk = v_consumer.iam_profile_fk;
  v_payload := public.api_notification_order_payload(p_order_pk);

  foreach v_channel in array array['WHATSAPP','EMAIL'] loop
    v_purpose := case when v_channel = 'WHATSAPP' then 'WHATSAPP_TRANSACTIONAL' else 'OPERATIONAL' end;
    v_destination := case when v_channel = 'WHATSAPP' then v_iam.phone_e164 else v_iam.email_address::text end;
    v_status := 'QUEUED';
    v_reason := 'READY';

    if v_destination is null or length(trim(v_destination)) = 0 then
      v_status := 'SUPPRESSED';
      v_reason := 'DESTINATION_MISSING';
    elsif not public.api_notification_latest_consent_granted(v_iam.iam_profile_pk, v_purpose) then
      v_status := 'SUPPRESSED';
      v_reason := 'CONSENT_NOT_GRANTED';
    elsif not public.api_notification_channel_enabled(v_consumer.consumer_profile_pk, v_channel) then
      v_status := 'SUPPRESSED';
      v_reason := 'PREFERENCE_DISABLED';
    end if;

    v_outbox_pk := public.api_enqueue_notification_outbox_row(
      'ORDER_CONFIRMATION',
      v_channel,
      'CONSUMER',
      'ORDER',
      p_order_pk,
      v_iam.iam_profile_pk,
      v_destination,
      v_payload,
      v_status,
      v_reason,
      v_purpose,
      now(),
      public.api_notification_order_fallback_text(p_order_pk, 'ORDER_CONFIRMATION', 'CONSUMER'),
      concat('order-confirmation:', p_order_pk, ':', v_channel, ':consumer')
    );

    notification_outbox_pk := v_outbox_pk;
    template_code := 'ORDER_CONFIRMATION';
    channel_code := v_channel;
    send_status_code := v_status;
    delivery_reason_code := v_reason;
    return next;
  end loop;

  for v_contact in
    select email_address::text as email_address, phone_e164
    from restaurant_contact
    where restaurant_fk = v_order.restaurant_fk
      and contact_type_code in ('PICKUP','MANAGER','OWNER','SUPPORT')
    order by is_primary desc, created_at asc
    limit 1
  loop
    foreach v_channel in array array['WHATSAPP','EMAIL'] loop
      v_destination := case when v_channel = 'WHATSAPP' then v_contact.phone_e164 else v_contact.email_address end;
      v_status := case when v_destination is null or length(trim(v_destination)) = 0 then 'SUPPRESSED' else 'QUEUED' end;
      v_reason := case when v_status = 'SUPPRESSED' then 'DESTINATION_MISSING' else 'READY' end;

      v_outbox_pk := public.api_enqueue_notification_outbox_row(
        'RESTAURANT_NEW_ORDER_ALERT',
        v_channel,
        'RESTAURANT',
        'ORDER',
        p_order_pk,
        null,
        v_destination,
        v_payload,
        v_status,
        v_reason,
        'OPERATIONAL',
        now(),
        public.api_notification_order_fallback_text(p_order_pk, 'RESTAURANT_NEW_ORDER_ALERT', 'RESTAURANT'),
        concat('restaurant-new-order:', p_order_pk, ':', v_channel, ':', v_order.restaurant_fk)
      );

      notification_outbox_pk := v_outbox_pk;
      template_code := 'RESTAURANT_NEW_ORDER_ALERT';
      channel_code := v_channel;
      send_status_code := v_status;
      delivery_reason_code := v_reason;
      return next;
    end loop;
  end loop;
end;
$$;

create or replace function public.api_enqueue_pickup_reminders(
  p_window_minutes integer default 30,
  p_limit integer default 200
)
returns table (
  notification_outbox_pk uuid,
  order_pk uuid,
  template_code text,
  channel_code text,
  send_status_code text,
  delivery_reason_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_consumer consumer_profile%rowtype;
  v_iam iam_profile%rowtype;
  v_payload jsonb;
  v_channel text;
  v_destination text;
  v_status text;
  v_reason text;
  v_purpose text;
  v_outbox_pk uuid;
begin
  for v_order in
    select *
    from order_order o
    where o.payment_status_code = 'CAPTURED'
      and o.order_status_code in ('PAID','CONFIRMED','READY_FOR_PICKUP')
      and o.collected_at is null
      and o.pickup_window_end_at > now()
      and o.pickup_window_start_at <= now() + make_interval(mins => greatest(coalesce(p_window_minutes, 30), 1))
      and o.pickup_window_start_at >= now() - interval '5 minutes'
    order by o.pickup_window_start_at asc
    limit least(greatest(coalesce(p_limit, 200), 1), 500)
  loop
    select * into v_consumer from consumer_profile where consumer_profile_pk = v_order.consumer_profile_fk;
    select * into v_iam from iam_profile where iam_profile_pk = v_consumer.iam_profile_fk;
    v_payload := public.api_notification_order_payload(v_order.order_order_pk);

    foreach v_channel in array array['WHATSAPP','EMAIL'] loop
      v_purpose := case when v_channel = 'WHATSAPP' then 'WHATSAPP_TRANSACTIONAL' else 'OPERATIONAL' end;
      v_destination := case when v_channel = 'WHATSAPP' then v_iam.phone_e164 else v_iam.email_address::text end;
      v_status := 'QUEUED';
      v_reason := 'READY';

      if v_destination is null or length(trim(v_destination)) = 0 then
        v_status := 'SUPPRESSED';
        v_reason := 'DESTINATION_MISSING';
      elsif not public.api_notification_latest_consent_granted(v_iam.iam_profile_pk, v_purpose) then
        v_status := 'SUPPRESSED';
        v_reason := 'CONSENT_NOT_GRANTED';
      elsif not public.api_notification_channel_enabled(v_consumer.consumer_profile_pk, v_channel) then
        v_status := 'SUPPRESSED';
        v_reason := 'PREFERENCE_DISABLED';
      end if;

      v_outbox_pk := public.api_enqueue_notification_outbox_row(
        'PICKUP_REMINDER',
        v_channel,
        'CONSUMER',
        'ORDER',
        v_order.order_order_pk,
        v_iam.iam_profile_pk,
        v_destination,
        v_payload,
        v_status,
        v_reason,
        v_purpose,
        greatest(now(), v_order.pickup_window_start_at - interval '30 minutes'),
        public.api_notification_order_fallback_text(v_order.order_order_pk, 'PICKUP_REMINDER', 'CONSUMER'),
        concat('pickup-reminder:', v_order.order_order_pk, ':', v_channel, ':consumer')
      );

      notification_outbox_pk := v_outbox_pk;
      order_pk := v_order.order_order_pk;
      template_code := 'PICKUP_REMINDER';
      channel_code := v_channel;
      send_status_code := v_status;
      delivery_reason_code := v_reason;
      return next;
    end loop;
  end loop;
end;
$$;

create or replace function public.api_enqueue_incident_alerts(p_incident_pk uuid)
returns table (
  notification_outbox_pk uuid,
  template_code text,
  channel_code text,
  send_status_code text,
  delivery_reason_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident record;
  v_admin record;
  v_payload jsonb;
  v_text text;
  v_outbox_pk uuid;
begin
  select
    inc.incident_incident_pk,
    inc.restaurant_fk,
    inc.order_fk,
    coalesce(o.order_number, 'No order') as order_number,
    coalesce(r.restaurant_name, 'Platform') as restaurant_name,
    mit.type_code,
    mis.severity_code
  into v_incident
  from incident_incident inc
  join master_incident_type mit on mit.master_incident_type_pk = inc.master_incident_type_fk
  join master_incident_severity mis on mis.master_incident_severity_pk = inc.master_incident_severity_fk
  left join order_order o on o.order_order_pk = inc.order_fk
  left join restaurant_restaurant r on r.restaurant_restaurant_pk = inc.restaurant_fk
  where inc.incident_incident_pk = p_incident_pk;

  if not found then
    raise exception 'incident not found';
  end if;
  if v_incident.severity_code not in ('P1','P2') then
    return;
  end if;

  v_payload := jsonb_build_object(
    'incident_code', left(v_incident.incident_incident_pk::text, 8),
    'restaurant_name', v_incident.restaurant_name,
    'order_number', v_incident.order_number,
    'incident_type', v_incident.type_code,
    'severity_code', v_incident.severity_code
  );
  v_text := concat(
    'goZaika high severity incident', chr(10),
    'Incident: ', left(v_incident.incident_incident_pk::text, 8), chr(10),
    'Restaurant: ', v_incident.restaurant_name, chr(10),
    'Order: ', v_incident.order_number, chr(10),
    'Type: ', v_incident.type_code, chr(10),
    'Severity: ', v_incident.severity_code, chr(10),
    'Review in admin before customer or restaurant follow-up.'
  );

  for v_admin in
    select ip.iam_profile_pk, ip.email_address::text as email_address
    from iam_platform_membership m
    join iam_profile ip on ip.iam_profile_pk = m.iam_profile_fk
    where m.is_active
      and ip.email_address is not null
  loop
    v_outbox_pk := public.api_enqueue_notification_outbox_row(
      'INCIDENT_HIGH_SEVERITY_ALERT',
      'EMAIL',
      'ADMIN',
      'INCIDENT',
      p_incident_pk,
      v_admin.iam_profile_pk,
      v_admin.email_address,
      v_payload,
      'QUEUED',
      'READY',
      'OPERATIONAL',
      now(),
      v_text,
      concat('incident-high-severity:', p_incident_pk, ':email:', v_admin.iam_profile_pk)
    );

    notification_outbox_pk := v_outbox_pk;
    template_code := 'INCIDENT_HIGH_SEVERITY_ALERT';
    channel_code := 'EMAIL';
    send_status_code := 'QUEUED';
    delivery_reason_code := 'READY';
    return next;
  end loop;
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

  select * into v_order
  from order_order oo
  where oo.order_order_pk = p_order_pk;

  if not found then
    raise exception 'order not found';
  end if;
  if v_order.restaurant_fk <> p_restaurant_pk then
    raise exception 'wrong restaurant';
  end if;

  select * into v_type
  from master_incident_type mit
  where mit.type_code = p_type_code;

  select * into v_status
  from master_incident_status mis
  where mis.status_code = 'OPEN';

  select * into v_severity
  from master_incident_severity mse
  where mse.severity_code = coalesce(p_severity_code, 'P3');

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

create or replace function public.api_claim_notification_batch(p_batch_size integer default 25)
returns table (
  notification_outbox_pk uuid,
  template_code text,
  channel_code text,
  provider_code text,
  resolved_destination_text text,
  subject_template text,
  body_template text,
  provider_template_ref text,
  payload_json jsonb,
  manual_fallback_text text,
  retry_count integer
)
language sql
security definer
set search_path = public
as $$
  with due as (
    select o.notification_outbox_pk
    from notification_outbox o
    where o.send_status_code = 'QUEUED'
      and coalesce(o.next_attempt_at, o.scheduled_at) <= now()
    order by o.scheduled_at asc, o.created_at asc
    limit least(greatest(coalesce(p_batch_size, 25), 1), 100)
    for update skip locked
  ),
  claimed as (
    update notification_outbox o
    set send_status_code = 'SENDING',
        claimed_at = now(),
        claim_token = gen_random_uuid(),
        updated_at = now()
    from due
    where o.notification_outbox_pk = due.notification_outbox_pk
    returning o.*
  )
  select
    c.notification_outbox_pk,
    coalesce(c.template_code, t.template_code) as template_code,
    c.channel_code,
    coalesce(c.provider_code, case when c.channel_code = 'WHATSAPP' then 'META_WHATSAPP' when c.channel_code = 'EMAIL' then 'RESEND' else 'SYSTEM' end) as provider_code,
    c.resolved_destination_text,
    t.subject_template,
    t.body_template,
    t.provider_template_ref,
    c.payload_json,
    c.manual_fallback_text,
    c.retry_count
  from claimed c
  left join notification_template t
    on t.notification_template_pk = c.notification_template_fk;
$$;

create or replace function public.api_record_notification_delivery_attempt(
  p_notification_outbox_pk uuid,
  p_attempt_status_code text,
  p_provider_code text default null,
  p_provider_message_ref text default null,
  p_error_code text default null,
  p_error_text text default null,
  p_provider_status_code text default null,
  p_retry_after_seconds integer default null
)
returns table (
  notification_outbox_pk uuid,
  send_status_code text,
  attempt_number integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox notification_outbox%rowtype;
  v_attempt_number integer;
  v_next_status text;
  v_next_attempt_at timestamptz;
  v_retry_count integer;
begin
  select * into v_outbox
  from notification_outbox nox
  where nox.notification_outbox_pk = p_notification_outbox_pk
  for update;

  if not found then
    raise exception 'notification not found';
  end if;

  select coalesce(max(a.attempt_number), 0) + 1 into v_attempt_number
  from notification_delivery_attempt a
  where a.notification_outbox_fk = p_notification_outbox_pk;

  insert into notification_delivery_attempt (
    notification_outbox_fk,
    provider_code,
    provider_message_ref,
    attempt_status_code,
    attempt_number,
    error_code,
    error_text,
    provider_status_code,
    response_summary_json
  ) values (
    p_notification_outbox_pk,
    p_provider_code,
    p_provider_message_ref,
    p_attempt_status_code,
    v_attempt_number,
    p_error_code,
    left(p_error_text, 1000),
    p_provider_status_code,
    jsonb_build_object('provider_status_code', p_provider_status_code)
  );

  v_retry_count := v_outbox.retry_count + case when p_attempt_status_code = 'SENT' then 0 else 1 end;

  if p_attempt_status_code = 'SENT' then
    v_next_status := 'SENT';
    v_next_attempt_at := null;
  elsif p_error_code = 'PROVIDER_NOT_CONFIGURED' then
    v_next_status := 'FAILED';
    v_next_attempt_at := null;
  elsif v_retry_count < v_outbox.max_attempts and p_attempt_status_code in ('FAILED','RETRYING') then
    v_next_status := 'QUEUED';
    v_next_attempt_at := now() + make_interval(secs => greatest(coalesce(p_retry_after_seconds, 300), 60));
  else
    v_next_status := 'FAILED';
    v_next_attempt_at := null;
  end if;

  update notification_outbox
  set send_status_code = v_next_status,
      sent_at = case when v_next_status = 'SENT' then now() else sent_at end,
      retry_count = v_retry_count,
      next_attempt_at = v_next_attempt_at,
      claim_token = null,
      claimed_at = null,
      last_error_code = case when v_next_status = 'SENT' then null else p_error_code end,
      last_error_text = case when v_next_status = 'SENT' then null else left(p_error_text, 1000) end,
      delivery_reason_code = case when v_next_status = 'SENT' then 'DELIVERED' else coalesce(p_error_code, delivery_reason_code) end,
      updated_at = now()
  where notification_outbox.notification_outbox_pk = p_notification_outbox_pk;

  notification_outbox_pk := p_notification_outbox_pk;
  send_status_code := v_next_status;
  attempt_number := v_attempt_number;
  return next;
end;
$$;

create or replace function public.api_retry_notification(
  p_notification_outbox_pk uuid,
  p_actor_profile_pk uuid,
  p_reason_text text
)
returns table (
  notification_outbox_pk uuid,
  send_status_code text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox notification_outbox%rowtype;
begin
  if not exists (
    select 1
    from iam_platform_membership
    where iam_profile_fk = p_actor_profile_pk
      and is_active
  ) then
    raise exception 'admin access required';
  end if;
  if length(trim(coalesce(p_reason_text, ''))) < 8 then
    raise exception 'retry reason required';
  end if;

  select * into v_outbox
  from notification_outbox nox
  where nox.notification_outbox_pk = p_notification_outbox_pk
  for update;

  if not found then
    raise exception 'notification not found';
  end if;
  if v_outbox.send_status_code = 'SENT' then
    raise exception 'already sent';
  end if;
  if v_outbox.delivery_reason_code in ('CONSENT_NOT_GRANTED','PREFERENCE_DISABLED','DESTINATION_MISSING') then
    raise exception 'retry not allowed for suppressed notification';
  end if;

  update notification_outbox
  set send_status_code = 'QUEUED',
      scheduled_at = now(),
      next_attempt_at = null,
      retry_count = 0,
      delivery_reason_code = 'ADMIN_RETRY',
      last_error_code = null,
      last_error_text = null,
      claim_token = null,
      claimed_at = null,
      suppression_reason_text = p_reason_text,
      updated_at = now()
  where notification_outbox.notification_outbox_pk = p_notification_outbox_pk;

  notification_outbox_pk := p_notification_outbox_pk;
  send_status_code := 'QUEUED';
  message := 'Notification queued for retry.';
  return next;
end;
$$;

create or replace function public.api_suppress_notification(
  p_notification_outbox_pk uuid,
  p_actor_profile_pk uuid,
  p_reason_text text
)
returns table (
  notification_outbox_pk uuid,
  send_status_code text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox notification_outbox%rowtype;
begin
  if not exists (
    select 1
    from iam_platform_membership
    where iam_profile_fk = p_actor_profile_pk
      and is_active
  ) then
    raise exception 'admin access required';
  end if;
  if length(trim(coalesce(p_reason_text, ''))) < 8 then
    raise exception 'suppression reason required';
  end if;

  select * into v_outbox
  from notification_outbox nox
  where nox.notification_outbox_pk = p_notification_outbox_pk
  for update;

  if not found then
    raise exception 'notification not found';
  end if;
  if v_outbox.send_status_code = 'SENT' then
    raise exception 'already sent';
  end if;

  update notification_outbox
  set send_status_code = 'CANCELLED',
      cancelled_at = now(),
      suppressed_by_profile_fk = p_actor_profile_pk,
      suppression_reason_text = p_reason_text,
      delivery_reason_code = 'ADMIN_SUPPRESSED',
      claim_token = null,
      claimed_at = null,
      updated_at = now()
  where notification_outbox.notification_outbox_pk = p_notification_outbox_pk;

  insert into notification_delivery_attempt (
    notification_outbox_fk,
    provider_code,
    attempt_status_code,
    attempt_number,
    error_code,
    error_text
  )
  values (
    p_notification_outbox_pk,
    'MANUAL',
    'DROPPED',
    coalesce((select max(attempt_number) + 1 from notification_delivery_attempt where notification_delivery_attempt.notification_outbox_fk = p_notification_outbox_pk), 1),
    'ADMIN_SUPPRESSED',
    left(p_reason_text, 1000)
  );

  notification_outbox_pk := p_notification_outbox_pk;
  send_status_code := 'CANCELLED';
  message := 'Notification suppressed.';
  return next;
end;
$$;

create or replace view api_consumer_notification_summary
with (security_barrier = true) as
select
  n.notification_outbox_pk,
  n.business_context_fk as order_pk,
  o.order_number,
  o.restaurant_fk,
  o.snapshot_restaurant_name as restaurant_name,
  coalesce(n.template_code, t.template_code) as template_code,
  n.recipient_audience_code as audience_code,
  n.channel_code,
  n.send_status_code,
  n.provider_code,
  n.delivery_reason_code,
  n.scheduled_at,
  n.sent_at,
  n.next_attempt_at,
  n.retry_count,
  n.max_attempts,
  a.attempt_status_code as last_attempt_status_code,
  a.attempted_at as last_attempt_at,
  n.last_error_code,
  case when n.send_status_code in ('FAILED','SUPPRESSED','CANCELLED') then n.last_error_text else null end as last_error_text,
  null::text as manual_fallback_text,
  n.created_at,
  n.updated_at
from notification_outbox n
left join notification_template t on t.notification_template_pk = n.notification_template_fk
left join order_order o on o.order_order_pk = n.business_context_fk and n.business_context_type_code = 'ORDER'
left join lateral (
  select attempt_status_code, attempted_at
  from notification_delivery_attempt
  where notification_outbox_fk = n.notification_outbox_pk
  order by attempted_at desc, attempt_number desc
  limit 1
) a on true
where n.recipient_audience_code = 'CONSUMER'
  and n.business_context_type_code = 'ORDER'
  and public.rls_is_consumer_profile(o.consumer_profile_fk);

create or replace view api_restaurant_notification_summary
with (security_barrier = true) as
select
  n.notification_outbox_pk,
  n.business_context_fk as order_pk,
  o.order_number,
  o.restaurant_fk,
  o.snapshot_restaurant_name as restaurant_name,
  coalesce(n.template_code, t.template_code) as template_code,
  n.recipient_audience_code as audience_code,
  n.channel_code,
  n.send_status_code,
  n.provider_code,
  n.delivery_reason_code,
  n.scheduled_at,
  n.sent_at,
  n.next_attempt_at,
  n.retry_count,
  n.max_attempts,
  a.attempt_status_code as last_attempt_status_code,
  a.attempted_at as last_attempt_at,
  n.last_error_code,
  n.last_error_text,
  n.manual_fallback_text,
  n.created_at,
  n.updated_at
from notification_outbox n
left join notification_template t on t.notification_template_pk = n.notification_template_fk
left join order_order o on o.order_order_pk = n.business_context_fk and n.business_context_type_code = 'ORDER'
left join lateral (
  select attempt_status_code, attempted_at
  from notification_delivery_attempt
  where notification_outbox_fk = n.notification_outbox_pk
  order by attempted_at desc, attempt_number desc
  limit 1
) a on true
where n.business_context_type_code = 'ORDER'
  and public.rls_has_restaurant_access(o.restaurant_fk);

create or replace view api_admin_notification_delivery_summary
with (security_barrier = true) as
select
  n.notification_outbox_pk,
  case when n.business_context_type_code = 'ORDER' then n.business_context_fk else null end as order_pk,
  o.order_number,
  o.restaurant_fk,
  coalesce(o.snapshot_restaurant_name, r.restaurant_name) as restaurant_name,
  coalesce(n.template_code, t.template_code) as template_code,
  n.recipient_audience_code as audience_code,
  n.channel_code,
  n.send_status_code,
  n.provider_code,
  n.delivery_reason_code,
  n.business_context_type_code,
  a.provider_message_ref,
  public.api_notification_mask_destination(n.resolved_destination_text) as destination_masked_text,
  n.scheduled_at,
  n.sent_at,
  n.next_attempt_at,
  n.retry_count,
  n.max_attempts,
  a.attempt_status_code as last_attempt_status_code,
  a.attempted_at as last_attempt_at,
  coalesce(n.last_error_code, a.error_code) as last_error_code,
  coalesce(n.last_error_text, a.error_text) as last_error_text,
  n.manual_fallback_text,
  n.created_at,
  n.updated_at
from notification_outbox n
left join notification_template t on t.notification_template_pk = n.notification_template_fk
left join order_order o on o.order_order_pk = n.business_context_fk and n.business_context_type_code = 'ORDER'
left join incident_incident inc on inc.incident_incident_pk = n.business_context_fk and n.business_context_type_code = 'INCIDENT'
left join restaurant_restaurant r on r.restaurant_restaurant_pk = inc.restaurant_fk
left join lateral (
  select provider_message_ref, attempt_status_code, attempted_at, error_code, error_text
  from notification_delivery_attempt
  where notification_outbox_fk = n.notification_outbox_pk
  order by attempted_at desc, attempt_number desc
  limit 1
) a on true
where public.rls_is_platform_user();

create or replace view api_admin_notification_attempt_summary
with (security_barrier = true) as
select
  a.notification_delivery_attempt_pk,
  a.notification_outbox_fk,
  a.provider_code,
  a.provider_message_ref,
  a.attempt_status_code,
  a.attempt_number,
  a.error_code,
  a.error_text,
  a.attempted_at,
  a.created_at
from notification_delivery_attempt a
join notification_outbox n
  on n.notification_outbox_pk = a.notification_outbox_fk
where public.rls_is_platform_user();

grant select on api_consumer_notification_summary to authenticated;
grant select on api_restaurant_notification_summary to authenticated;
grant select on api_admin_notification_delivery_summary to authenticated;
grant select on api_admin_notification_attempt_summary to authenticated;

revoke all on function public.api_notification_mask_destination(text) from public;
revoke all on function public.api_notification_latest_consent_granted(uuid,text) from public;
revoke all on function public.api_notification_channel_enabled(uuid,text) from public;
revoke all on function public.api_notification_order_payload(uuid) from public;
revoke all on function public.api_notification_order_fallback_text(uuid,text,text) from public;
revoke all on function public.api_enqueue_notification_outbox_row(text,text,text,text,uuid,uuid,text,jsonb,text,text,text,timestamptz,text,text) from public;
revoke all on function public.api_enqueue_order_notifications(uuid) from public;
revoke all on function public.api_enqueue_pickup_reminders(integer,integer) from public;
revoke all on function public.api_enqueue_incident_alerts(uuid) from public;
revoke all on function public.api_claim_notification_batch(integer) from public;
revoke all on function public.api_record_notification_delivery_attempt(uuid,text,text,text,text,text,text,integer) from public;
revoke all on function public.api_retry_notification(uuid,uuid,text) from public;
revoke all on function public.api_suppress_notification(uuid,uuid,text) from public;

grant execute on function public.api_notification_mask_destination(text) to authenticated, service_role;
grant execute on function public.api_enqueue_order_notifications(uuid) to service_role;
grant execute on function public.api_enqueue_pickup_reminders(integer,integer) to service_role;
grant execute on function public.api_enqueue_incident_alerts(uuid) to service_role;
grant execute on function public.api_claim_notification_batch(integer) to service_role;
grant execute on function public.api_record_notification_delivery_attempt(uuid,text,text,text,text,text,text,integer) to service_role;
grant execute on function public.api_retry_notification(uuid,uuid,text) to service_role;
grant execute on function public.api_suppress_notification(uuid,uuid,text) to service_role;
