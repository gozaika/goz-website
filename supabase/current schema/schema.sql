


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."api_admin_ops_has_role"("p_actor_profile_pk" "uuid", "p_allowed_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from iam_platform_membership m
    join iam_platform_role r on r.iam_platform_role_pk = m.iam_platform_role_fk
    where m.iam_profile_fk = p_actor_profile_pk
      and m.is_active
      and r.role_code = any(p_allowed_roles)
  )
$$;


ALTER FUNCTION "public"."api_admin_ops_has_role"("p_actor_profile_pk" "uuid", "p_allowed_roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_admin_set_drop_operational_status"("p_drop_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text") RETURNS TABLE("drop_pk" "uuid", "status_code" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_admin_set_drop_operational_status"("p_drop_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_admin_set_restaurant_operational_status"("p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text", "p_public_note_text" "text" DEFAULT NULL::"text") RETURNS TABLE("restaurant_pk" "uuid", "status_code" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_admin_set_restaurant_operational_status"("p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text", "p_public_note_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_bootstrap_consumer_profile"("p_full_name" "text" DEFAULT NULL::"text", "p_phone_e164" "text" DEFAULT NULL::"text", "p_email_address" "public"."citext" DEFAULT NULL::"public"."citext", "p_default_city_code" "text" DEFAULT 'HYD'::"text", "p_preferred_language_code" "text" DEFAULT 'en'::"text") RETURNS TABLE("iam_profile_pk" "uuid", "consumer_profile_pk" "uuid", "needs_operational_consent" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_auth_user_fk uuid := auth.uid();
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'consumer');
  v_city_pk uuid;
  v_profile_pk uuid;
  v_consumer_profile_pk uuid;
  v_first_name text;
  v_last_name text;
  v_operational_purpose_pk uuid;
begin
  if v_auth_user_fk is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select geo_city_pk
    into v_city_pk
  from geo_city
  where city_code = coalesce(nullif(p_default_city_code, ''), 'HYD')
  limit 1;

  insert into iam_profile (
    auth_user_fk,
    phone_e164,
    email_address,
    display_name,
    default_city_fk,
    is_consumer,
    is_restaurant_user,
    is_platform_user,
    last_seen_at
  )
  values (
    v_auth_user_fk,
    nullif(p_phone_e164, ''),
    nullif(p_email_address, ''),
    nullif(p_full_name, ''),
    v_city_pk,
    v_role <> 'restaurant',
    v_role = 'restaurant',
    false,
    now()
  )
  on conflict (auth_user_fk) do update
  set phone_e164 = coalesce(nullif(excluded.phone_e164, ''), iam_profile.phone_e164),
      email_address = coalesce(nullif(excluded.email_address, ''), iam_profile.email_address),
      display_name = coalesce(nullif(excluded.display_name, ''), iam_profile.display_name),
      default_city_fk = coalesce(excluded.default_city_fk, iam_profile.default_city_fk),
      is_consumer = case when v_role = 'restaurant' then iam_profile.is_consumer else true end,
      is_restaurant_user = case when v_role = 'restaurant' then true else iam_profile.is_restaurant_user end,
      last_seen_at = now(),
      updated_at = now()
  returning iam_profile.iam_profile_pk into v_profile_pk;

  if v_role <> 'restaurant' then
    v_first_name := nullif(split_part(coalesce(p_full_name, ''), ' ', 1), '');
    v_last_name := nullif(trim(both ' ' from regexp_replace(coalesce(p_full_name, ''), '^\S+\s*', '')), '');

    insert into consumer_profile (
      iam_profile_fk,
      first_name,
      last_name,
      preferred_language_code
    )
    values (
      v_profile_pk,
      v_first_name,
      v_last_name,
      coalesce(nullif(p_preferred_language_code, ''), 'en')
    )
    on conflict (iam_profile_fk) do update
    set first_name = coalesce(excluded.first_name, consumer_profile.first_name),
        last_name = coalesce(excluded.last_name, consumer_profile.last_name),
        preferred_language_code = coalesce(excluded.preferred_language_code, consumer_profile.preferred_language_code),
        updated_at = now()
    returning consumer_profile.consumer_profile_pk into v_consumer_profile_pk;

    insert into consumer_referral_code (consumer_profile_fk, referral_code)
    values (
      v_consumer_profile_pk,
      'GZ-' || upper(substr(replace(v_profile_pk::text, '-', ''), 1, 8))
    )
    on conflict (consumer_profile_fk) do nothing;
  end if;

  select privacy_consent_purpose_pk
    into v_operational_purpose_pk
  from privacy_consent_purpose
  where purpose_code = 'OPERATIONAL';

  return query
  select
    v_profile_pk,
    v_consumer_profile_pk,
    coalesce((
      select e.consent_state_code <> 'GRANTED'
      from privacy_consent_event e
      where e.iam_profile_fk = v_profile_pk
        and e.privacy_consent_purpose_fk = v_operational_purpose_pk
      order by e.recorded_at desc, e.privacy_consent_event_pk desc
      limit 1
    ), true);
end;
$$;


ALTER FUNCTION "public"."api_bootstrap_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_default_city_code" "text", "p_preferred_language_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_bootstrap_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_default_city_code" "text", "p_preferred_language_code" "text") IS 'Idempotently creates/updates iam_profile and consumer_profile for the authenticated consumer-web user. SECURITY DEFINER but scoped to auth.uid().';



CREATE OR REPLACE FUNCTION "public"."api_capture_consents"("p_events" "jsonb") RETURNS TABLE("privacy_consent_event_pk" "uuid", "purpose_code" "text", "consent_state_code" "text", "recorded_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_profile_pk uuid := public.rls_current_profile_pk();
  v_invalid_count integer;
  v_required_revokes integer;
begin
  if v_profile_pk is null then
    raise exception 'PROFILE_REQUIRED' using errcode = '28000';
  end if;

  if jsonb_typeof(p_events) <> 'array' then
    raise exception 'CONSENT_EVENTS_ARRAY_REQUIRED' using errcode = '22023';
  end if;

  with incoming as (
    select *
    from jsonb_to_recordset(p_events) as x(
      purpose_code text,
      consent_state_code text,
      policy_version text,
      capture_source_code text,
      proof_json jsonb
    )
  )
  select count(*)
    into v_invalid_count
  from incoming i
  left join privacy_consent_purpose p on p.purpose_code = i.purpose_code
  where p.privacy_consent_purpose_pk is null
     or i.consent_state_code not in ('GRANTED', 'REVOKED')
     or nullif(i.policy_version, '') is null
     or nullif(i.capture_source_code, '') is null;

  if v_invalid_count > 0 then
    raise exception 'INVALID_CONSENT_EVENT' using errcode = '22023';
  end if;

  with incoming as (
    select *
    from jsonb_to_recordset(p_events) as x(
      purpose_code text,
      consent_state_code text,
      policy_version text,
      capture_source_code text,
      proof_json jsonb
    )
  )
  select count(*)
    into v_required_revokes
  from incoming i
  join privacy_consent_purpose p on p.purpose_code = i.purpose_code
  where p.is_required_for_service = true
    and i.consent_state_code = 'REVOKED';

  if v_required_revokes > 0 then
    raise exception 'REQUIRED_CONSENT_CANNOT_BE_REVOKED' using errcode = '22023';
  end if;

  return query
  with incoming as (
    select *
    from jsonb_to_recordset(p_events) as x(
      purpose_code text,
      consent_state_code text,
      policy_version text,
      capture_source_code text,
      proof_json jsonb
    )
  ),
  inserted as (
    insert into privacy_consent_event (
      iam_profile_fk,
      privacy_consent_purpose_fk,
      consent_state_code,
      policy_version,
      capture_source_code,
      proof_json,
      recorded_by_profile_fk
    )
    select
      v_profile_pk,
      p.privacy_consent_purpose_pk,
      i.consent_state_code,
      i.policy_version,
      i.capture_source_code,
      coalesce(i.proof_json, '{}'::jsonb),
      v_profile_pk
    from incoming i
    join privacy_consent_purpose p on p.purpose_code = i.purpose_code
    returning
      privacy_consent_event.privacy_consent_event_pk,
      privacy_consent_event.privacy_consent_purpose_fk,
      privacy_consent_event.consent_state_code,
      privacy_consent_event.recorded_at
  )
  select
    inserted.privacy_consent_event_pk,
    p.purpose_code,
    inserted.consent_state_code,
    inserted.recorded_at
  from inserted
  join privacy_consent_purpose p
    on p.privacy_consent_purpose_pk = inserted.privacy_consent_purpose_fk;
end;
$$;


ALTER FUNCTION "public"."api_capture_consents"("p_events" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_capture_consents"("p_events" "jsonb") IS 'Appends DPDP consent events for the current authenticated profile. Never updates prior consent rows.';



CREATE OR REPLACE FUNCTION "public"."api_claim_notification_batch"("p_batch_size" integer DEFAULT 25) RETURNS TABLE("notification_outbox_pk" "uuid", "template_code" "text", "channel_code" "text", "provider_code" "text", "resolved_destination_text" "text", "subject_template" "text", "body_template" "text", "provider_template_ref" "text", "payload_json" "jsonb", "manual_fallback_text" "text", "retry_count" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_claim_notification_batch"("p_batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_convert_paid_hold_to_order"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text" DEFAULT 'INR'::"text", "p_payment_method_code" "text" DEFAULT NULL::"text", "p_fee_paise" bigint DEFAULT 0, "p_tax_paise" bigint DEFAULT 0, "p_captured_at" timestamp with time zone DEFAULT "now"(), "p_webhook_event_pk" "uuid" DEFAULT NULL::"uuid", "p_provider_payload_json" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("payment_order_intent_pk" "uuid", "payment_transaction_pk" "uuid", "order_pk" "uuid", "already_converted" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
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
    where payment_order_intent.payment_order_intent_pk = v_intent.payment_order_intent_pk;

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
    where payment_order_intent.payment_order_intent_pk = v_intent.payment_order_intent_pk;

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
  where order_order.order_order_pk = v_order_pk;

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
  where drop_inventory_hold.drop_inventory_hold_pk = v_hold.drop_inventory_hold_pk;

  update drop_drop
  set quantity_reserved = quantity_reserved - v_hold.quantity,
      quantity_sold = quantity_sold + v_hold.quantity,
      drop_status_code = case
        when quantity_total <= (quantity_sold + v_hold.quantity) then 'SOLD_OUT'
        else drop_status_code
      end,
      updated_at = now()
  where drop_drop.drop_drop_pk = v_drop.drop_drop_pk;

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
  where payment_order_intent.payment_order_intent_pk = v_intent.payment_order_intent_pk;

  payment_order_intent_pk := v_intent.payment_order_intent_pk;
  payment_transaction_pk := v_transaction_pk;
  order_pk := v_order_pk;
  already_converted := false;
  return next;
end;
$$;


ALTER FUNCTION "public"."api_convert_paid_hold_to_order"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_fee_paise" bigint, "p_tax_paise" bigint, "p_captured_at" timestamp with time zone, "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_convert_paid_hold_to_order"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_fee_paise" bigint, "p_tax_paise" bigint, "p_captured_at" timestamp with time zone, "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") IS 'Service-role webhook RPC. Atomically records a captured Razorpay transaction, converts an active hold to a confirmed paid order, moves reserved inventory to sold inventory, and appends audit ledgers idempotently.';



CREATE OR REPLACE FUNCTION "public"."api_create_inventory_hold"("p_drop_pk" "uuid", "p_idempotency_key" "text", "p_quantity" integer DEFAULT 1, "p_hold_minutes" integer DEFAULT 10) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_create_inventory_hold"("p_drop_pk" "uuid", "p_idempotency_key" "text", "p_quantity" integer, "p_hold_minutes" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_create_inventory_hold"("p_drop_pk" "uuid", "p_idempotency_key" "text", "p_quantity" integer, "p_hold_minutes" integer) IS 'Authenticated consumer RPC. Atomically reserves public active/scheduled drop inventory, creates a hold, and appends an inventory event. Uses idempotency key and row lock for retry/concurrency safety.';



CREATE OR REPLACE FUNCTION "public"."api_create_or_get_restaurant_onboarding"("p_restaurant_name" "text" DEFAULT NULL::"text", "p_restaurant_slug" "text" DEFAULT NULL::"text", "p_legal_entity_name" "text" DEFAULT NULL::"text", "p_primary_contact_email" "text" DEFAULT NULL::"text", "p_primary_contact_phone_e164" "text" DEFAULT NULL::"text") RETURNS TABLE("restaurant_pk" "uuid", "restaurant_status_code" "text", "compliance_status_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_auth_user uuid := auth.uid();
  v_profile_pk uuid;
  v_restaurant_pk uuid;
  v_owner_role_pk uuid;
  v_city_pk uuid;
  v_slug text;
  v_name text;
begin
  if v_auth_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select iam_profile_pk
    into v_profile_pk
  from iam_profile
  where auth_user_fk = v_auth_user;

  if v_profile_pk is null then
    insert into iam_profile (
      auth_user_fk,
      phone_e164,
      email_address,
      display_name,
      is_consumer,
      is_restaurant_user
    )
    values (
      v_auth_user,
      nullif(auth.jwt() ->> 'phone', ''),
      nullif(auth.jwt() ->> 'email', '')::citext,
      coalesce(nullif(auth.jwt() #>> '{user_metadata,full_name}', ''), nullif(auth.jwt() #>> '{user_metadata,name}', ''), 'Restaurant Owner'),
      false,
      true
    )
    returning iam_profile_pk into v_profile_pk;
  else
    update iam_profile
    set is_restaurant_user = true,
        is_consumer = false,
        updated_at = now()
    where iam_profile_pk = v_profile_pk;
  end if;

  select rr.restaurant_restaurant_pk
    into v_restaurant_pk
  from restaurant_restaurant rr
  where rr.owner_profile_fk = v_profile_pk
    and rr.restaurant_status_code <> 'OFFBOARDED'
  order by rr.created_at asc
  limit 1;

  if v_restaurant_pk is null then
    select geo_city_pk into v_city_pk
    from geo_city
    where city_code = 'HYD'
    limit 1;

    v_name := coalesce(nullif(trim(p_restaurant_name), ''), coalesce(nullif(auth.jwt() #>> '{user_metadata,full_name}', ''), 'New goZaika Restaurant'));
    v_slug := lower(regexp_replace(coalesce(nullif(trim(p_restaurant_slug), ''), v_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    if v_slug = '' then
      v_slug := 'gozaika-restaurant';
    end if;

    while exists (select 1 from restaurant_restaurant where restaurant_slug = v_slug) loop
      v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
    end loop;

    insert into restaurant_restaurant (
      restaurant_name,
      restaurant_slug,
      legal_entity_name,
      restaurant_status_code,
      geo_city_fk,
      owner_profile_fk,
      primary_contact_email,
      primary_contact_phone_e164
    )
    values (
      v_name,
      v_slug,
      nullif(trim(p_legal_entity_name), ''),
      'ONBOARDING',
      v_city_pk,
      v_profile_pk,
      nullif(trim(p_primary_contact_email), ''),
      nullif(trim(p_primary_contact_phone_e164), '')
    )
    returning restaurant_restaurant_pk into v_restaurant_pk;
  end if;

  insert into restaurant_compliance (restaurant_fk, compliance_status_code)
  values (v_restaurant_pk, 'PENDING')
  on conflict (restaurant_fk) do nothing;

  insert into restaurant_public_profile (restaurant_fk, headline, story_markdown)
  values (v_restaurant_pk, 'Chef-curated BAM Bags, pickup only.', 'Premium without pretence. Restaurant dignity first.')
  on conflict (restaurant_fk) do nothing;

  select restaurant_team_role_pk into v_owner_role_pk
  from restaurant_team_role
  where role_code = 'OWNER';

  insert into restaurant_team_membership (restaurant_fk, iam_profile_fk, restaurant_team_role_fk, is_active, is_default, joined_at)
  values (v_restaurant_pk, v_profile_pk, v_owner_role_pk, true, true, now())
  on conflict (restaurant_fk, iam_profile_fk, restaurant_team_role_fk) do update
  set is_active = true,
      is_default = true,
      updated_at = now();

  if not exists (
    select 1
    from restaurant_contact
    where restaurant_fk = v_restaurant_pk
      and contact_type_code = 'OWNER'
      and is_primary = true
  ) then
    insert into restaurant_contact (restaurant_fk, contact_type_code, contact_name, email_address, phone_e164, is_primary)
    values (
      v_restaurant_pk,
      'OWNER',
      coalesce(nullif(auth.jwt() #>> '{user_metadata,full_name}', ''), 'Restaurant Owner'),
      nullif(trim(p_primary_contact_email), '')::citext,
      nullif(trim(p_primary_contact_phone_e164), ''),
      true
    );
  end if;

  insert into restaurant_onboarding_task (restaurant_fk, task_code, task_name, task_status_code)
  values
    (v_restaurant_pk, 'PROFILE', 'Restaurant basics', 'PENDING'),
    (v_restaurant_pk, 'LOCATION_PICKUP', 'Location and pickup instructions', 'PENDING'),
    (v_restaurant_pk, 'COMPLIANCE_DETAILS', 'Compliance details', 'PENDING'),
    (v_restaurant_pk, 'DOCUMENT_UPLOAD', 'FSSAI/KYC document upload', 'PENDING'),
    (v_restaurant_pk, 'CONTACTS', 'Primary contacts', 'PENDING'),
    (v_restaurant_pk, 'REVIEW_SUBMISSION', 'Submit for admin review', 'PENDING')
  on conflict (restaurant_fk, task_code) do nothing;

  return query
  select rr.restaurant_restaurant_pk, rr.restaurant_status_code, rc.compliance_status_code
  from restaurant_restaurant rr
  join restaurant_compliance rc on rc.restaurant_fk = rr.restaurant_restaurant_pk
  where rr.restaurant_restaurant_pk = v_restaurant_pk;
end;
$$;


ALTER FUNCTION "public"."api_create_or_get_restaurant_onboarding"("p_restaurant_name" "text", "p_restaurant_slug" "text", "p_legal_entity_name" "text", "p_primary_contact_email" "text", "p_primary_contact_phone_e164" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_create_or_recalculate_settlement_run"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid", "p_note_text" "text" DEFAULT NULL::"text") RETURNS TABLE("settlement_run_pk" "uuid", "settlement_status_code" "text", "order_count" integer, "gross_sales_paise" bigint, "refund_paise" bigint, "commission_paise" bigint, "payment_fee_paise" bigint, "tax_paise" bigint, "adjustment_paise" bigint, "net_payout_paise" bigint, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_run finance_settlement_run%rowtype;
  v_preview record;
  v_eligible_count integer := 0;
  v_excluded_count integer := 0;
  v_existing_adjustment_total bigint := 0;
  v_metadata jsonb;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;
  if p_period_start_at is null or p_period_end_at is null or p_period_end_at <= p_period_start_at then
    raise exception 'invalid period';
  end if;
  if p_period_end_at > now() then
    raise exception 'period must end before now';
  end if;
  if not exists (select 1 from restaurant_restaurant where restaurant_restaurant_pk = p_restaurant_pk) then
    raise exception 'restaurant not found';
  end if;

  select * into v_run
  from finance_settlement_run sr
  where sr.restaurant_fk = p_restaurant_pk
    and sr.period_start_at = p_period_start_at
    and sr.period_end_at = p_period_end_at
    and sr.settlement_status_code <> 'CANCELLED'
  for update;

  if found and v_run.settlement_status_code not in ('DRAFT','OPEN') then
    raise exception 'recalculation not allowed';
  end if;

  if not found then
    insert into finance_settlement_run (
      restaurant_fk,
      period_start_at,
      period_end_at,
      settlement_status_code,
      calculation_metadata_json,
      status_note_text
    ) values (
      p_restaurant_pk,
      p_period_start_at,
      p_period_end_at,
      'DRAFT',
      jsonb_build_object('created_by_profile_fk', p_actor_profile_pk, 'manual_payout_only', true),
      nullif(trim(coalesce(p_note_text, '')), '')
    )
    returning * into v_run;
  end if;

  delete from finance_restaurant_payout_entry
  where finance_settlement_run_fk = v_run.finance_settlement_run_pk
    and is_system_generated = true;

  select coalesce(sum(amount_paise), 0) into v_existing_adjustment_total
  from finance_restaurant_payout_entry
  where finance_settlement_run_fk = v_run.finance_settlement_run_pk
    and entry_type_code = 'ADJUSTMENT';

  for v_preview in
    select *
    from public.api_preview_restaurant_settlement(p_restaurant_pk, p_period_start_at, p_period_end_at, p_actor_profile_pk)
  loop
    if v_preview.eligibility_status_code = 'ELIGIBLE' then
      v_eligible_count := v_eligible_count + 1;
      v_metadata := jsonb_build_object(
        'commission_bps', v_preview.commission_bps,
        'commission_plan_code', v_preview.commission_plan_code,
        'pilot_estimate', true,
        'manual_payout_only', true
      );

      insert into finance_restaurant_payout_entry (
        finance_settlement_run_fk, restaurant_fk, order_fk, order_number, payment_transaction_fk,
        entry_type_code, amount_paise, line_key, description_text, commission_bps, commission_plan_code,
        source_status_code, calculation_metadata_json, created_by_profile_fk, is_system_generated
      )
      select
        v_run.finance_settlement_run_pk,
        p_restaurant_pk,
        v_preview.order_pk,
        v_preview.order_number,
        pt.payment_transaction_pk,
        'ORDER_GROSS',
        v_preview.paid_amount_paise,
        concat('order:', v_preview.order_pk, ':gross'),
        concat('Gross sale for ', v_preview.order_number),
        v_preview.commission_bps,
        v_preview.commission_plan_code,
        v_preview.order_status_code,
        v_metadata,
        p_actor_profile_pk,
        true
      from payment_order_intent i
      left join payment_transaction pt
        on pt.payment_order_intent_fk = i.payment_order_intent_pk
        and pt.transaction_status_code = 'CAPTURED'
      where i.order_fk = v_preview.order_pk
      order by pt.captured_at desc nulls last
      limit 1;

      if v_preview.commission_paise > 0 then
        insert into finance_restaurant_payout_entry (
          finance_settlement_run_fk, restaurant_fk, order_fk, order_number,
          entry_type_code, amount_paise, line_key, description_text, commission_bps, commission_plan_code,
          source_status_code, calculation_metadata_json, created_by_profile_fk, is_system_generated
        ) values (
          v_run.finance_settlement_run_pk, p_restaurant_pk, v_preview.order_pk, v_preview.order_number,
          'COMMISSION', -v_preview.commission_paise, concat('order:', v_preview.order_pk, ':commission'),
          concat('Commission estimate for ', v_preview.order_number),
          v_preview.commission_bps, v_preview.commission_plan_code, v_preview.order_status_code,
          v_metadata, p_actor_profile_pk, true
        );
      end if;

      if v_preview.payment_fee_paise > 0 then
        insert into finance_restaurant_payout_entry (
          finance_settlement_run_fk, restaurant_fk, order_fk, order_number,
          entry_type_code, amount_paise, line_key, description_text, source_status_code,
          calculation_metadata_json, created_by_profile_fk, is_system_generated
        ) values (
          v_run.finance_settlement_run_pk, p_restaurant_pk, v_preview.order_pk, v_preview.order_number,
          'PAYMENT_FEE', -v_preview.payment_fee_paise, concat('order:', v_preview.order_pk, ':payment-fee'),
          concat('Razorpay fee deduction for ', v_preview.order_number), v_preview.order_status_code,
          v_metadata, p_actor_profile_pk, true
        );
      end if;

      if v_preview.payment_tax_paise > 0 then
        insert into finance_restaurant_payout_entry (
          finance_settlement_run_fk, restaurant_fk, order_fk, order_number,
          entry_type_code, amount_paise, line_key, description_text, source_status_code,
          calculation_metadata_json, created_by_profile_fk, is_system_generated
        ) values (
          v_run.finance_settlement_run_pk, p_restaurant_pk, v_preview.order_pk, v_preview.order_number,
          'TAX', -v_preview.payment_tax_paise, concat('order:', v_preview.order_pk, ':payment-tax'),
          concat('Payment tax deduction for ', v_preview.order_number), v_preview.order_status_code,
          v_metadata, p_actor_profile_pk, true
        );
      end if;

      insert into finance_restaurant_payout_entry (
        finance_settlement_run_fk, restaurant_fk, order_fk, payment_refund_fk, order_number,
        entry_type_code, amount_paise, line_key, description_text, source_status_code,
        calculation_metadata_json, created_by_profile_fk, is_system_generated
      )
      select
        v_run.finance_settlement_run_pk,
        p_restaurant_pk,
        v_preview.order_pk,
        pr.payment_refund_pk,
        v_preview.order_number,
        'REFUND',
        -pr.amount_paise,
        concat('refund:', pr.payment_refund_pk),
        concat('Refund/debit visibility: ', pr.refund_reason_code),
        pr.refund_status_code,
        v_metadata || jsonb_build_object('refund_status_code', pr.refund_status_code),
        p_actor_profile_pk,
        true
      from payment_refund pr
      where pr.order_fk = v_preview.order_pk
        and pr.refund_status_code in ('SUCCEEDED','PROCESSING');
    else
      v_excluded_count := v_excluded_count + 1;
    end if;
  end loop;

  if v_eligible_count = 0 and v_existing_adjustment_total = 0 then
    raise exception 'no eligible orders';
  end if;

  perform public.api_finance_recalculate_run_totals(v_run.finance_settlement_run_pk);

  update finance_settlement_run
  set excluded_order_count = v_excluded_count,
      calculation_metadata_json = calculation_metadata_json || jsonb_build_object(
        'last_recalculated_by_profile_fk', p_actor_profile_pk,
        'last_recalculated_at', now(),
        'manual_payout_only', true,
        'tax_assumption', 'Payment provider fee tax only; GST/legal invoice wording requires human review before lock.'
      ),
      status_note_text = coalesce(nullif(trim(coalesce(p_note_text, '')), ''), status_note_text),
      updated_at = now()
  where finance_settlement_run_pk = v_run.finance_settlement_run_pk
  returning * into v_run;

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    'SETTLEMENT_RECALCULATED',
    'FINANCE_SETTLEMENT_RUN',
    v_run.finance_settlement_run_pk,
    jsonb_build_object('restaurant_fk', p_restaurant_pk, 'period_start_at', p_period_start_at, 'period_end_at', p_period_end_at, 'order_count', v_run.order_count)
  );

  return query
  select
    v_run.finance_settlement_run_pk,
    v_run.settlement_status_code,
    v_run.order_count,
    v_run.gross_sales_paise,
    v_run.refund_paise,
    v_run.commission_paise,
    v_run.payment_fee_paise,
    v_run.tax_paise,
    v_run.adjustment_paise,
    v_run.net_payout_paise,
    'Draft settlement calculated. Manual finance review is required before lock.'::text;
end;
$$;


ALTER FUNCTION "public"."api_create_or_recalculate_settlement_run"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid", "p_note_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_create_order_incident"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_type_code" "text", "p_severity_code" "text" DEFAULT 'P3'::"text", "p_description_text" "text" DEFAULT NULL::"text", "p_internal_note_text" "text" DEFAULT NULL::"text", "p_source_code" "text" DEFAULT 'RESTAURANT_PORTAL'::"text") RETURNS TABLE("incident_pk" "uuid", "order_pk" "uuid", "order_number" "text", "type_code" "text", "severity_code" "text", "status_code" "text", "title_text" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_create_order_incident"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_type_code" "text", "p_severity_code" "text", "p_description_text" "text", "p_internal_note_text" "text", "p_source_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_create_settlement_adjustment"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_amount_paise" bigint, "p_description_text" "text") RETURNS TABLE("payout_entry_pk" "uuid", "settlement_run_pk" "uuid", "amount_paise" bigint, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_run finance_settlement_run%rowtype;
  v_entry_pk uuid;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;
  if coalesce(p_amount_paise, 0) = 0 then
    raise exception 'adjustment amount required';
  end if;
  if length(trim(coalesce(p_description_text, ''))) < 8 then
    raise exception 'adjustment note required';
  end if;

  select * into v_run
  from finance_settlement_run
  where finance_settlement_run_pk = p_settlement_run_pk
  for update;

  if not found then
    raise exception 'settlement not found';
  end if;
  if v_run.settlement_status_code not in ('DRAFT','OPEN') then
    raise exception 'adjustment not allowed after lock';
  end if;

  insert into finance_restaurant_payout_entry (
    finance_settlement_run_fk,
    restaurant_fk,
    entry_type_code,
    amount_paise,
    line_key,
    description_text,
    calculation_metadata_json,
    created_by_profile_fk,
    is_system_generated
  ) values (
    v_run.finance_settlement_run_pk,
    v_run.restaurant_fk,
    'ADJUSTMENT',
    p_amount_paise,
    concat('adjustment:', gen_random_uuid()),
    left(trim(p_description_text), 1000),
    jsonb_build_object('manual_adjustment', true, 'manual_payout_only', true),
    p_actor_profile_pk,
    false
  )
  returning finance_restaurant_payout_entry_pk into v_entry_pk;

  perform public.api_finance_recalculate_run_totals(v_run.finance_settlement_run_pk);

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    'SETTLEMENT_ADJUSTMENT_CREATED',
    'FINANCE_RESTAURANT_PAYOUT_ENTRY',
    v_entry_pk,
    jsonb_build_object('settlement_run_fk', v_run.finance_settlement_run_pk, 'amount_paise', p_amount_paise, 'note', left(trim(p_description_text), 500))
  );

  return query select v_entry_pk, v_run.finance_settlement_run_pk, p_amount_paise, 'Manual adjustment added to draft settlement.'::text;
end;
$$;


ALTER FUNCTION "public"."api_create_settlement_adjustment"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_amount_paise" bigint, "p_description_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_enqueue_incident_alerts"("p_incident_pk" "uuid") RETURNS TABLE("notification_outbox_pk" "uuid", "template_code" "text", "channel_code" "text", "send_status_code" "text", "delivery_reason_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_enqueue_incident_alerts"("p_incident_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_enqueue_notification_outbox_row"("p_template_code" "text", "p_channel_code" "text", "p_audience_code" "text", "p_business_context_type_code" "text", "p_business_context_fk" "uuid", "p_recipient_profile_fk" "uuid", "p_resolved_destination_text" "text", "p_payload_json" "jsonb", "p_send_status_code" "text", "p_delivery_reason_code" "text", "p_purpose_code" "text", "p_scheduled_at" timestamp with time zone, "p_manual_fallback_text" "text", "p_idempotency_key" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_enqueue_notification_outbox_row"("p_template_code" "text", "p_channel_code" "text", "p_audience_code" "text", "p_business_context_type_code" "text", "p_business_context_fk" "uuid", "p_recipient_profile_fk" "uuid", "p_resolved_destination_text" "text", "p_payload_json" "jsonb", "p_send_status_code" "text", "p_delivery_reason_code" "text", "p_purpose_code" "text", "p_scheduled_at" timestamp with time zone, "p_manual_fallback_text" "text", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_enqueue_order_notifications"("p_order_pk" "uuid") RETURNS TABLE("notification_outbox_pk" "uuid", "template_code" "text", "channel_code" "text", "send_status_code" "text", "delivery_reason_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_enqueue_order_notifications"("p_order_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_enqueue_pickup_reminders"("p_window_minutes" integer DEFAULT 30, "p_limit" integer DEFAULT 200) RETURNS TABLE("notification_outbox_pk" "uuid", "order_pk" "uuid", "template_code" "text", "channel_code" "text", "send_status_code" "text", "delivery_reason_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_enqueue_pickup_reminders"("p_window_minutes" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_finance_assert_mutable_run"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_status text;
begin
  if TG_TABLE_NAME = 'finance_settlement_run' then
    if TG_OP = 'UPDATE'
      and old.settlement_status_code in ('LOCKED','SENT','PAID','RECONCILED')
      and (
        new.restaurant_fk is distinct from old.restaurant_fk
        or new.period_start_at is distinct from old.period_start_at
        or new.period_end_at is distinct from old.period_end_at
        or new.gross_sales_paise is distinct from old.gross_sales_paise
        or new.refund_paise is distinct from old.refund_paise
        or new.commission_paise is distinct from old.commission_paise
        or new.tax_paise is distinct from old.tax_paise
        or new.payment_fee_paise is distinct from old.payment_fee_paise
        or new.adjustment_paise is distinct from old.adjustment_paise
        or new.net_payout_paise is distinct from old.net_payout_paise
        or new.order_count is distinct from old.order_count
      )
    then
      raise exception 'settlement locked: recalculation not allowed';
    end if;
    return new;
  end if;

  if TG_OP = 'INSERT' then
    select settlement_status_code into v_status
    from finance_settlement_run
    where finance_settlement_run_pk = new.finance_settlement_run_fk;
  else
    select settlement_status_code into v_status
    from finance_settlement_run
    where finance_settlement_run_pk = old.finance_settlement_run_fk;
  end if;

  if v_status not in ('DRAFT','OPEN') then
    raise exception 'settlement entry mutation not allowed after lock';
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."api_finance_assert_mutable_run"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_finance_has_platform_access"("p_actor_profile_pk" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from iam_platform_membership m
    where m.iam_profile_fk = p_actor_profile_pk
      and m.is_active
  )
$$;


ALTER FUNCTION "public"."api_finance_has_platform_access"("p_actor_profile_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_finance_is_admin"("p_actor_profile_pk" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from iam_platform_membership m
    join iam_platform_role r on r.iam_platform_role_pk = m.iam_platform_role_fk
    where m.iam_profile_fk = p_actor_profile_pk
      and m.is_active
      and r.role_code in ('SUPER_ADMIN','FINANCE_ADMIN')
  )
$$;


ALTER FUNCTION "public"."api_finance_is_admin"("p_actor_profile_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_finance_money_round_bps"("p_amount_paise" bigint, "p_bps" integer) RETURNS bigint
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select ((greatest(coalesce(p_amount_paise, 0), 0) * greatest(coalesce(p_bps, 0), 0)::bigint) + 5000) / 10000
$$;


ALTER FUNCTION "public"."api_finance_money_round_bps"("p_amount_paise" bigint, "p_bps" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_finance_payout_account_mask"("p_masked_account_number" "text", "p_status_code" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select case
    when p_masked_account_number is null or length(trim(p_masked_account_number)) = 0 then concat('Not configured', case when p_status_code is not null then concat(' (', p_status_code, ')') else '' end)
    when length(p_masked_account_number) <= 8 then p_masked_account_number
    else concat(left(p_masked_account_number, 4), repeat('*', greatest(length(p_masked_account_number) - 8, 0)), right(p_masked_account_number, 4))
  end
$$;


ALTER FUNCTION "public"."api_finance_payout_account_mask"("p_masked_account_number" "text", "p_status_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_finance_recalculate_run_totals"("p_settlement_run_pk" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_totals record;
begin
  select
    coalesce(sum(amount_paise) filter (where entry_type_code = 'ORDER_GROSS'), 0) as gross_sales_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'REFUND'), 0)) as refund_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'COMMISSION'), 0)) as commission_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'PAYMENT_FEE'), 0)) as payment_fee_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'TAX'), 0)) as tax_paise,
    coalesce(sum(amount_paise) filter (where entry_type_code = 'ADJUSTMENT'), 0) as adjustment_paise,
    greatest(coalesce(sum(amount_paise), 0), 0) as net_payout_paise,
    count(distinct order_fk) filter (where order_fk is not null and entry_type_code = 'ORDER_GROSS') as order_count
  into v_totals
  from finance_restaurant_payout_entry
  where finance_settlement_run_fk = p_settlement_run_pk;

  update finance_settlement_run
  set gross_sales_paise = v_totals.gross_sales_paise,
      refund_paise = v_totals.refund_paise,
      commission_paise = v_totals.commission_paise,
      payment_fee_paise = v_totals.payment_fee_paise,
      tax_paise = v_totals.tax_paise,
      adjustment_paise = v_totals.adjustment_paise,
      net_payout_paise = v_totals.net_payout_paise,
      order_count = coalesce(v_totals.order_count, 0),
      updated_at = now()
  where finance_settlement_run_pk = p_settlement_run_pk;
end;
$$;


ALTER FUNCTION "public"."api_finance_recalculate_run_totals"("p_settlement_run_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_issue_settlement_invoice"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_invoice_number" "text", "p_metadata_json" "jsonb" DEFAULT '{}'::"jsonb", "p_external_document_ref" "text" DEFAULT NULL::"text") RETURNS TABLE("invoice_pk" "uuid", "settlement_run_pk" "uuid", "invoice_number" "text", "invoice_status_code" "text", "invoice_amount_paise" bigint, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_run finance_settlement_run%rowtype;
  v_invoice finance_invoice%rowtype;
  v_number text;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;

  v_number := upper(trim(coalesce(p_invoice_number, '')));
  if length(v_number) < 4 then
    raise exception 'invoice number required';
  end if;

  select * into v_run
  from finance_settlement_run
  where finance_settlement_run_pk = p_settlement_run_pk
  for update;

  if not found then
    raise exception 'settlement not found';
  end if;
  if v_run.settlement_status_code not in ('LOCKED','SENT','PAID','RECONCILED') then
    raise exception 'invoice not available until settlement is locked';
  end if;

  insert into finance_invoice (
    finance_settlement_run_fk,
    restaurant_fk,
    invoice_number,
    invoice_status_code,
    invoice_amount_paise,
    issued_at,
    issued_by_profile_fk,
    invoice_metadata_json,
    external_document_ref,
    download_safe_filename
  ) values (
    v_run.finance_settlement_run_pk,
    v_run.restaurant_fk,
    v_number,
    'ISSUED',
    v_run.net_payout_paise,
    now(),
    p_actor_profile_pk,
    coalesce(p_metadata_json, '{}'::jsonb) || jsonb_build_object('manual_metadata_only', true, 'legal_tax_review_required', true),
    nullif(trim(coalesce(p_external_document_ref, '')), ''),
    concat(regexp_replace(lower(v_number), '[^a-z0-9_-]+', '-', 'g'), '.pdf')
  )
  on conflict (finance_settlement_run_fk) do update
    set invoice_number = excluded.invoice_number,
        invoice_status_code = 'ISSUED',
        invoice_amount_paise = excluded.invoice_amount_paise,
        issued_at = coalesce(finance_invoice.issued_at, excluded.issued_at),
        issued_by_profile_fk = excluded.issued_by_profile_fk,
        invoice_metadata_json = finance_invoice.invoice_metadata_json || excluded.invoice_metadata_json,
        external_document_ref = excluded.external_document_ref,
        download_safe_filename = excluded.download_safe_filename,
        updated_at = now()
  returning * into v_invoice;

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    'SETTLEMENT_INVOICE_ISSUED',
    'FINANCE_INVOICE',
    v_invoice.finance_invoice_pk,
    jsonb_build_object('settlement_run_fk', v_run.finance_settlement_run_pk, 'invoice_number', v_invoice.invoice_number, 'manual_metadata_only', true)
  );

  return query
  select
    v_invoice.finance_invoice_pk,
    v_run.finance_settlement_run_pk,
    v_invoice.invoice_number,
    v_invoice.invoice_status_code,
    v_invoice.invoice_amount_paise,
    'Invoice metadata issued. Attach/download files only through authorized signed URLs when a document is added.'::text;
end;
$$;


ALTER FUNCTION "public"."api_issue_settlement_invoice"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_invoice_number" "text", "p_metadata_json" "jsonb", "p_external_document_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_latest_consents"() RETURNS TABLE("purpose_code" "text", "purpose_name" "text", "is_required_for_service" boolean, "consent_state_code" "text", "recorded_at" timestamp with time zone, "policy_version" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with latest as (
    select distinct on (e.privacy_consent_purpose_fk)
      e.privacy_consent_purpose_fk,
      e.consent_state_code,
      e.recorded_at,
      e.policy_version
    from privacy_consent_event e
    where e.iam_profile_fk = public.rls_current_profile_pk()
    order by e.privacy_consent_purpose_fk, e.recorded_at desc, e.privacy_consent_event_pk desc
  )
  select
    p.purpose_code,
    p.purpose_name,
    p.is_required_for_service,
    latest.consent_state_code,
    latest.recorded_at,
    latest.policy_version
  from privacy_consent_purpose p
  left join latest on latest.privacy_consent_purpose_fk = p.privacy_consent_purpose_pk
  where p.purpose_code in (
    'OPERATIONAL',
    'MARKETING',
    'ANALYTICS',
    'REFERRAL_COMMS',
    'WHATSAPP_TRANSACTIONAL',
    'WHATSAPP_MARKETING'
  )
  order by coalesce(p.display_order, 999), p.purpose_code
$$;


ALTER FUNCTION "public"."api_latest_consents"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_lock_settlement_run"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") RETURNS TABLE("settlement_run_pk" "uuid", "settlement_status_code" "text", "locked_at" timestamp with time zone, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_run finance_settlement_run%rowtype;
  v_totals record;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;
  if length(trim(coalesce(p_reason_text, ''))) < 8 then
    raise exception 'lock reason required';
  end if;

  select * into v_run
  from finance_settlement_run
  where finance_settlement_run_pk = p_settlement_run_pk
  for update;

  if not found then
    raise exception 'settlement not found';
  end if;
  if v_run.settlement_status_code not in ('DRAFT','OPEN') then
    raise exception 'lock not allowed';
  end if;
  if v_run.order_count <= 0 then
    raise exception 'no eligible orders';
  end if;

  select
    coalesce(sum(amount_paise) filter (where entry_type_code = 'ORDER_GROSS'), 0) as gross_sales_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'REFUND'), 0)) as refund_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'COMMISSION'), 0)) as commission_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'PAYMENT_FEE'), 0)) as payment_fee_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'TAX'), 0)) as tax_paise,
    coalesce(sum(amount_paise) filter (where entry_type_code = 'ADJUSTMENT'), 0) as adjustment_paise,
    greatest(coalesce(sum(amount_paise), 0), 0) as net_payout_paise,
    count(distinct order_fk) filter (where order_fk is not null and entry_type_code = 'ORDER_GROSS') as order_count
  into v_totals
  from finance_restaurant_payout_entry
  where finance_settlement_run_fk = v_run.finance_settlement_run_pk;

  if v_totals.gross_sales_paise <> v_run.gross_sales_paise
     or v_totals.refund_paise <> v_run.refund_paise
     or v_totals.commission_paise <> v_run.commission_paise
     or v_totals.payment_fee_paise <> v_run.payment_fee_paise
     or v_totals.tax_paise <> v_run.tax_paise
     or v_totals.adjustment_paise <> v_run.adjustment_paise
     or v_totals.net_payout_paise <> v_run.net_payout_paise
     or v_totals.order_count <> v_run.order_count then
    raise exception 'settlement totals changed; recalculate before lock';
  end if;

  update finance_settlement_run
  set settlement_status_code = 'LOCKED',
      locked_by_profile_fk = p_actor_profile_pk,
      locked_at = now(),
      lock_reason_text = left(trim(p_reason_text), 1000),
      calculation_metadata_json = calculation_metadata_json || jsonb_build_object('locked_manual_review_required', true, 'manual_payout_only', true),
      updated_at = now()
  where finance_settlement_run_pk = v_run.finance_settlement_run_pk
  returning * into v_run;

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    'SETTLEMENT_LOCKED',
    'FINANCE_SETTLEMENT_RUN',
    v_run.finance_settlement_run_pk,
    jsonb_build_object('reason', left(trim(p_reason_text), 500), 'net_payout_paise', v_run.net_payout_paise, 'manual_payout_only', true)
  );

  return query select v_run.finance_settlement_run_pk, v_run.settlement_status_code, v_run.locked_at, 'Settlement locked. Entries are now read-only; payouts remain manual.'::text;
end;
$$;


ALTER FUNCTION "public"."api_lock_settlement_run"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_mark_order_no_show"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text", "p_idempotency_key" "text" DEFAULT NULL::"text") RETURNS TABLE("order_pk" "uuid", "order_number" "text", "order_status_code" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_mark_order_no_show"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_mark_settlement_status"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_note_text" "text", "p_provider_reference_text" "text" DEFAULT NULL::"text") RETURNS TABLE("settlement_run_pk" "uuid", "settlement_status_code" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_run finance_settlement_run%rowtype;
  v_allowed boolean := false;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;
  if length(trim(coalesce(p_note_text, ''))) < 8 then
    raise exception 'status note required';
  end if;

  select * into v_run
  from finance_settlement_run
  where finance_settlement_run_pk = p_settlement_run_pk
  for update;

  if not found then
    raise exception 'settlement not found';
  end if;

  v_allowed := (v_run.settlement_status_code = 'LOCKED' and p_next_status_code in ('SENT','CANCELLED'))
    or (v_run.settlement_status_code = 'SENT' and p_next_status_code in ('PAID','CANCELLED'))
    or (v_run.settlement_status_code = 'PAID' and p_next_status_code = 'RECONCILED')
    or (v_run.settlement_status_code in ('DRAFT','OPEN') and p_next_status_code = 'CANCELLED');

  if not v_allowed then
    raise exception 'status transition not allowed';
  end if;

  update finance_settlement_run
  set settlement_status_code = p_next_status_code,
      status_note_text = left(trim(p_note_text), 1000),
      payout_provider_reference_text = coalesce(nullif(trim(coalesce(p_provider_reference_text, '')), ''), payout_provider_reference_text),
      paid_at = case when p_next_status_code = 'PAID' then now() else paid_at end,
      reconciled_at = case when p_next_status_code = 'RECONCILED' then now() else reconciled_at end,
      cancelled_at = case when p_next_status_code = 'CANCELLED' then now() else cancelled_at end,
      cancelled_by_profile_fk = case when p_next_status_code = 'CANCELLED' then p_actor_profile_pk else cancelled_by_profile_fk end,
      cancelled_reason_text = case when p_next_status_code = 'CANCELLED' then left(trim(p_note_text), 1000) else cancelled_reason_text end,
      updated_at = now()
  where finance_settlement_run_pk = v_run.finance_settlement_run_pk
  returning * into v_run;

  update finance_invoice
  set invoice_status_code = case
      when p_next_status_code = 'PAID' and invoice_status_code = 'ISSUED' then 'PAID'
      when p_next_status_code = 'CANCELLED' and invoice_status_code in ('DRAFT','ISSUED') then 'VOID'
      else invoice_status_code
    end,
    paid_at = case when p_next_status_code = 'PAID' then coalesce(paid_at, now()) else paid_at end,
    updated_at = now()
  where finance_settlement_run_fk = v_run.finance_settlement_run_pk;

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    concat('SETTLEMENT_', p_next_status_code),
    'FINANCE_SETTLEMENT_RUN',
    v_run.finance_settlement_run_pk,
    jsonb_build_object('note', left(trim(p_note_text), 500), 'provider_reference_present', p_provider_reference_text is not null, 'manual_payout_only', true)
  );

  return query select v_run.finance_settlement_run_pk, v_run.settlement_status_code, concat('Settlement marked ', lower(p_next_status_code), '. No live payout was initiated.')::text;
end;
$$;


ALTER FUNCTION "public"."api_mark_settlement_status"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_note_text" "text", "p_provider_reference_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_notification_channel_enabled"("p_consumer_profile_pk" "uuid", "p_channel_code" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce((
    select pref.is_enabled
    from consumer_notification_preference pref
    where pref.consumer_profile_fk = p_consumer_profile_pk
      and pref.channel_code = p_channel_code
    limit 1
  ), true);
$$;


ALTER FUNCTION "public"."api_notification_channel_enabled"("p_consumer_profile_pk" "uuid", "p_channel_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_notification_latest_consent_granted"("p_iam_profile_pk" "uuid", "p_purpose_code" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
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


ALTER FUNCTION "public"."api_notification_latest_consent_granted"("p_iam_profile_pk" "uuid", "p_purpose_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_notification_mask_destination"("p_destination" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select case
    when p_destination is null or length(trim(p_destination)) = 0 then 'Not available'
    when p_destination like '+91%' and length(p_destination) >= 8 then concat(left(p_destination, 5), '*****', right(p_destination, 3))
    when p_destination like '%@%' then concat(left(split_part(p_destination, '@', 1), 2), '***@', split_part(p_destination, '@', 2))
    when length(p_destination) > 8 then concat(left(p_destination, 4), '...', right(p_destination, 3))
    else 'Configured'
  end;
$$;


ALTER FUNCTION "public"."api_notification_mask_destination"("p_destination" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_notification_order_fallback_text"("p_order_pk" "uuid", "p_template_code" "text", "p_audience_code" "text") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
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


ALTER FUNCTION "public"."api_notification_order_fallback_text"("p_order_pk" "uuid", "p_template_code" "text", "p_audience_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_notification_order_payload"("p_order_pk" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
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


ALTER FUNCTION "public"."api_notification_order_payload"("p_order_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_ops_claims_enabled"("p_restaurant_pk" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_ops_claims_enabled"("p_restaurant_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_ops_max_bags_per_drop"("p_restaurant_pk" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_ops_max_bags_per_drop"("p_restaurant_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_ops_publishing_enabled"("p_restaurant_pk" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_ops_publishing_enabled"("p_restaurant_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_pickup_result_message"("p_result_code" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
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


ALTER FUNCTION "public"."api_pickup_result_message"("p_result_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_preview_restaurant_settlement"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("order_pk" "uuid", "order_number" "text", "pickup_window_end_at" timestamp with time zone, "order_status_code" "text", "payment_status_code" "text", "paid_amount_paise" bigint, "payment_fee_paise" bigint, "payment_tax_paise" bigint, "refund_paise" bigint, "commission_bps" integer, "commission_plan_code" "text", "commission_paise" bigint, "net_payout_paise" bigint, "eligibility_status_code" "text", "exclusion_reason_code" "text", "exclusion_reason_text" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with default_plan as (
    select plan_code, commission_bps, platform_fee_paise
    from restaurant_commission_plan
    where is_active
    order by is_default desc, case when plan_code = 'PILOT_0PCT_30D' then 0 else 1 end, created_at asc
    limit 1
  ),
  candidate as (
    select
      o.order_order_pk,
      o.order_number,
      o.pickup_window_end_at,
      o.order_status_code,
      o.payment_status_code,
      o.total_paise::bigint as paid_amount_paise,
      coalesce(t.fee_paise, 0)::bigint as payment_fee_paise,
      coalesce(t.tax_paise, 0)::bigint as payment_tax_paise,
      coalesce(refunds.refund_paise, 0)::bigint as refund_paise,
      coalesce(override_plan.plan_code, direct_plan.plan_code, default_plan.plan_code) as commission_plan_code,
      coalesce(ov.override_commission_bps, override_plan.commission_bps, direct_plan.commission_bps, default_plan.commission_bps, 0)::integer as commission_bps,
      coalesce(ov.override_platform_fee_paise, override_plan.platform_fee_paise, direct_plan.platform_fee_paise, default_plan.platform_fee_paise, 0)::bigint as platform_fee_paise,
      exists (
        select 1
        from finance_restaurant_payout_entry e
        join finance_settlement_run sr on sr.finance_settlement_run_pk = e.finance_settlement_run_fk
        where e.order_fk = o.order_order_pk
          and e.entry_type_code = 'ORDER_GROSS'
          and sr.settlement_status_code <> 'CANCELLED'
      ) as already_settled
    from order_order o
    left join payment_order_intent i on i.order_fk = o.order_order_pk
    left join lateral (
      select
        sum(coalesce(pt.fee_paise, 0))::bigint as fee_paise,
        sum(coalesce(pt.tax_paise, 0))::bigint as tax_paise
      from payment_transaction pt
      where pt.payment_order_intent_fk = i.payment_order_intent_pk
        and pt.transaction_status_code = 'CAPTURED'
    ) t on true
    left join lateral (
      select sum(pr.amount_paise)::bigint as refund_paise
      from payment_refund pr
      where pr.order_fk = o.order_order_pk
        and pr.refund_status_code in ('SUCCEEDED','PROCESSING')
    ) refunds on true
    left join lateral (
      select *
      from restaurant_commission_override ro
      where ro.restaurant_fk = o.restaurant_fk
        and ro.effective_from_at <= o.created_at
        and (ro.effective_until_at is null or ro.effective_until_at > o.created_at)
      order by ro.effective_from_at desc
      limit 1
    ) ov on true
    left join restaurant_commission_plan direct_plan on direct_plan.restaurant_commission_plan_pk = ov.restaurant_commission_plan_fk
    left join restaurant_commission_plan override_plan on override_plan.restaurant_commission_plan_pk = ov.restaurant_commission_plan_fk
    cross join default_plan
    where o.restaurant_fk = p_restaurant_pk
      and o.pickup_window_end_at >= p_period_start_at
      and o.pickup_window_end_at < p_period_end_at
  ),
  calculated as (
    select
      c.*,
      public.api_finance_money_round_bps(c.paid_amount_paise, c.commission_bps) + coalesce(c.platform_fee_paise, 0) as commission_paise
    from candidate c
  )
  select
    c.order_order_pk,
    c.order_number,
    c.pickup_window_end_at,
    c.order_status_code,
    c.payment_status_code,
    c.paid_amount_paise,
    c.payment_fee_paise,
    c.payment_tax_paise,
    c.refund_paise,
    c.commission_bps,
    c.commission_plan_code,
    c.commission_paise,
    greatest(c.paid_amount_paise - c.refund_paise - c.commission_paise - c.payment_fee_paise - c.payment_tax_paise, 0)::bigint as net_payout_paise,
    case
      when p_actor_profile_pk is not null and not public.api_finance_has_platform_access(p_actor_profile_pk) then 'EXCLUDED'
      when c.payment_status_code <> 'CAPTURED' then 'EXCLUDED'
      when c.order_status_code not in ('COLLECTED','NO_SHOW') then 'EXCLUDED'
      when c.pickup_window_end_at > now() then 'EXCLUDED'
      when c.already_settled then 'EXCLUDED'
      else 'ELIGIBLE'
    end as eligibility_status_code,
    case
      when p_actor_profile_pk is not null and not public.api_finance_has_platform_access(p_actor_profile_pk) then 'ADMIN_ACCESS_REQUIRED'
      when c.payment_status_code <> 'CAPTURED' then 'NOT_CAPTURED'
      when c.order_status_code not in ('COLLECTED','NO_SHOW') then 'NOT_PAYOUT_ELIGIBLE'
      when c.pickup_window_end_at > now() then 'PICKUP_WINDOW_OPEN'
      when c.already_settled then 'ALREADY_SETTLED'
      else null
    end as exclusion_reason_code,
    case
      when p_actor_profile_pk is not null and not public.api_finance_has_platform_access(p_actor_profile_pk) then 'Platform admin access is required.'
      when c.payment_status_code <> 'CAPTURED' then 'Payment is not webhook-confirmed captured.'
      when c.order_status_code not in ('COLLECTED','NO_SHOW') then 'Order is not collected or no-show.'
      when c.pickup_window_end_at > now() then 'Pickup window has not closed.'
      when c.already_settled then 'Order already belongs to an active settlement.'
      else null
    end as exclusion_reason_text
  from calculated c
  order by c.pickup_window_end_at asc, c.order_number asc
$$;


ALTER FUNCTION "public"."api_preview_restaurant_settlement"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_record_notification_delivery_attempt"("p_notification_outbox_pk" "uuid", "p_attempt_status_code" "text", "p_provider_code" "text" DEFAULT NULL::"text", "p_provider_message_ref" "text" DEFAULT NULL::"text", "p_error_code" "text" DEFAULT NULL::"text", "p_error_text" "text" DEFAULT NULL::"text", "p_provider_status_code" "text" DEFAULT NULL::"text", "p_retry_after_seconds" integer DEFAULT NULL::integer) RETURNS TABLE("notification_outbox_pk" "uuid", "send_status_code" "text", "attempt_number" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_record_notification_delivery_attempt"("p_notification_outbox_pk" "uuid", "p_attempt_status_code" "text", "p_provider_code" "text", "p_provider_message_ref" "text", "p_error_code" "text", "p_error_text" "text", "p_provider_status_code" "text", "p_retry_after_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_record_razorpay_payment_failed"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text" DEFAULT 'INR'::"text", "p_payment_method_code" "text" DEFAULT NULL::"text", "p_webhook_event_pk" "uuid" DEFAULT NULL::"uuid", "p_provider_payload_json" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_record_razorpay_payment_failed"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_record_razorpay_payment_failed"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") IS 'Service-role webhook RPC. Records a failed Razorpay payment against an intent without releasing the hold or creating an order.';



CREATE OR REPLACE FUNCTION "public"."api_release_expired_inventory_holds"("p_limit" integer DEFAULT 500) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select h.drop_inventory_hold_pk, h.drop_fk, h.quantity
    from drop_inventory_hold h
    where h.hold_status_code = 'ACTIVE'
      and h.expires_at <= now()
    order by h.expires_at
    limit greatest(1, least(coalesce(p_limit, 500), 5000))
    for update skip locked
  loop
    update drop_inventory_hold
    set hold_status_code = 'EXPIRED', updated_at = now()
    where drop_inventory_hold_pk = r.drop_inventory_hold_pk;

    update drop_drop
    set quantity_reserved = greatest(quantity_reserved - r.quantity, 0)
    where drop_drop_pk = r.drop_fk;

    insert into drop_inventory_event (
      drop_fk,
      drop_inventory_hold_fk,
      event_type_code,
      quantity_delta,
      reason_text
    ) values (
      r.drop_fk,
      r.drop_inventory_hold_pk,
      'HOLD_EXPIRED',
      r.quantity,
      'api_release_expired_inventory_holds'
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;


ALTER FUNCTION "public"."api_release_expired_inventory_holds"("p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_release_expired_inventory_holds"("p_limit" integer) IS 'Cron/service RPC. Releases expired ACTIVE holds, decrements reserved quantity, and appends inventory events using SKIP LOCKED for safe concurrent workers.';



CREATE OR REPLACE FUNCTION "public"."api_retry_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") RETURNS TABLE("notification_outbox_pk" "uuid", "send_status_code" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_retry_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_suppress_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") RETURNS TABLE("notification_outbox_pk" "uuid", "send_status_code" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_suppress_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text" DEFAULT NULL::"text", "p_phone_e164" "text" DEFAULT NULL::"text", "p_preferred_language_code" "text" DEFAULT NULL::"text", "p_default_city_code" "text" DEFAULT NULL::"text") RETURNS TABLE("iam_profile_pk" "uuid", "consumer_profile_pk" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_preferred_language_code" "text", "p_default_city_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_preferred_language_code" "text", "p_default_city_code" "text") IS 'Updates only safe consumer profile fields for the authenticated user. SECURITY DEFINER but scoped to rls_current_profile_pk().';



CREATE OR REPLACE FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text" DEFAULT NULL::"text", "p_phone_e164" "text" DEFAULT NULL::"text", "p_email_address" "public"."citext" DEFAULT NULL::"public"."citext", "p_preferred_language_code" "text" DEFAULT NULL::"text", "p_default_city_code" "text" DEFAULT NULL::"text") RETURNS TABLE("iam_profile_pk" "uuid", "consumer_profile_pk" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_preferred_language_code" "text", "p_default_city_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_preferred_language_code" "text", "p_default_city_code" "text") IS 'Updates safe consumer profile fields, including notification email, for the authenticated user. SECURITY DEFINER but scoped to rls_current_profile_pk().';



CREATE OR REPLACE FUNCTION "public"."api_verify_order_pickup"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_credential_method" "text", "p_credential_hash" "text", "p_idempotency_key" "text" DEFAULT NULL::"text", "p_device_label" "text" DEFAULT 'Restaurant portal'::"text") RETURNS TABLE("order_pk" "uuid", "order_number" "text", "result_code" "text", "order_status_code" "text", "collected_at" timestamp with time zone, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."api_verify_order_pickup"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_credential_method" "text", "p_credential_hash" "text", "p_idempotency_key" "text", "p_device_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."computed_refresh_drop_sell_through"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.COMPUTED_sell_through_bps :=
    case
      when new.quantity_total <= 0 then 0
      else floor((new.quantity_sold::numeric / new.quantity_total::numeric) * 10000)::integer
    end;
  return new;
end; $$;


ALTER FUNCTION "public"."computed_refresh_drop_sell_through"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."computed_refresh_drop_sell_through"() IS 'BEFORE INSERT/UPDATE trigger on drop_drop. Maintains COMPUTED_sell_through_bps as (quantity_sold/quantity_total) * 10000 basis points. Prefixed COMPUTED_ per style guide.';



CREATE OR REPLACE FUNCTION "public"."computed_refresh_order_pickup_flag"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.COMPUTED_pickup_ready_flag :=
    new.order_status_code in ('CONFIRMED','READY_FOR_PICKUP');
  return new;
end; $$;


ALTER FUNCTION "public"."computed_refresh_order_pickup_flag"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."computed_refresh_order_pickup_flag"() IS 'BEFORE INSERT/UPDATE trigger on order_order. Maintains COMPUTED_pickup_ready_flag for fast indexed staff-app pickup queue reads. Prefixed COMPUTED_ per style guide.';



CREATE OR REPLACE FUNCTION "public"."computed_refresh_restaurant_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_restaurant_pk uuid;
begin
  -- DELETE triggers do not have a usable NEW record. Resolve the restaurant_fk
  -- from OLD/NEW based on TG_OP to avoid runtime errors on delete.
  if TG_TABLE_NAME = 'drop_drop' then
    v_restaurant_pk := case when TG_OP = 'DELETE' then old.restaurant_fk else new.restaurant_fk end;
  elsif TG_TABLE_NAME = 'order_order' then
    v_restaurant_pk := case when TG_OP = 'DELETE' then old.restaurant_fk else new.restaurant_fk end;
  end if;

  if v_restaurant_pk is null then
    return null;
  end if;

  update restaurant_restaurant r
  set
    COMPUTED_active_drop_count = (
      select count(*) from drop_drop d
      where d.restaurant_fk = r.restaurant_restaurant_pk
        and d.drop_status_code in ('SCHEDULED','ACTIVE')
    ),
    COMPUTED_orders_pending_pickup_count = (
      select count(*) from order_order o
      where o.restaurant_fk = r.restaurant_restaurant_pk
        and o.order_status_code in ('PAID','CONFIRMED','READY_FOR_PICKUP')
    )
  where r.restaurant_restaurant_pk = v_restaurant_pk;
  return null;
end; $$;


ALTER FUNCTION "public"."computed_refresh_restaurant_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."computed_refresh_restaurant_counts"() IS 'AFTER INSERT/UPDATE/DELETE trigger on drop_drop and order_order. Maintains restaurant_restaurant.COMPUTED_active_drop_count and COMPUTED_orders_pending_pickup_count for O(1) dashboard and staff app reads. Prefixed COMPUTED_.';



CREATE OR REPLACE FUNCTION "public"."computed_refresh_restaurant_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_restaurant_pk uuid;
begin
  v_restaurant_pk := coalesce(new.restaurant_fk, old.restaurant_fk);

  update restaurant_restaurant
  set
    average_rating = (
      select round(avg(rating_value)::numeric, 2)
      from review_review
      where restaurant_fk = v_restaurant_pk
        and moderation_status_code = 'APPROVED'
        and is_public = true
    ),
    rating_count = (
      select count(*)
      from review_review
      where restaurant_fk = v_restaurant_pk
        and moderation_status_code = 'APPROVED'
        and is_public = true
    )
  where restaurant_restaurant_pk = v_restaurant_pk;

  return null;
end; $$;


ALTER FUNCTION "public"."computed_refresh_restaurant_rating"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."computed_refresh_restaurant_rating"() IS 'AFTER INSERT/UPDATE on review_review. Maintains restaurant_restaurant.average_rating and rating_count. Prefixed COMPUTED_.';



CREATE OR REPLACE FUNCTION "public"."raise_immutable_error"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception
    'Table "%" is append-only. UPDATE and DELETE are not permitted. '
    'Insert a new row to record a state change.',
    TG_TABLE_NAME;
end;
$$;


ALTER FUNCTION "public"."raise_immutable_error"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."raise_immutable_error"() IS 'Immutability guard for append-only event, ledger, and audit tables. Applied as BEFORE UPDATE/DELETE trigger on: privacy_consent_event, drop_inventory_event, order_status_transition, order_pickup_verification_event, payment_webhook_event, billing_subscription_event, support_ticket_event, incident_event, analytics_event, audit_log. Prevents mutation of the historical record even by service-role clients.';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_current_consumer_profile_pk"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select c.consumer_profile_pk
  from consumer_profile c
  join iam_profile p on p.iam_profile_pk = c.iam_profile_fk
  where p.auth_user_fk = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."rls_current_consumer_profile_pk"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rls_current_consumer_profile_pk"() IS 'RLS helper. Resolves current Supabase auth.uid() to the owning consumer_profile_pk, or null when the user is not a consumer.';



CREATE OR REPLACE FUNCTION "public"."rls_current_profile_pk"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select iam_profile_pk
  from iam_profile
  where auth_user_fk = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."rls_current_profile_pk"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rls_current_profile_pk"() IS 'RLS helper. Resolves current Supabase auth.uid() to iam_profile. SECURITY DEFINER so policies can evaluate even when caller cannot directly scan iam_profile.';



CREATE OR REPLACE FUNCTION "public"."rls_drop_is_public"("p_drop_pk" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."rls_drop_is_public"("p_drop_pk" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rls_drop_is_public"("p_drop_pk" "uuid") IS 'RLS helper. True for public, published, consumer-visible drops owned by ACTIVE restaurants.';



CREATE OR REPLACE FUNCTION "public"."rls_has_restaurant_access"("p_restaurant_pk" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from restaurant_team_membership m
    join iam_profile p on p.iam_profile_pk = m.iam_profile_fk
    where p.auth_user_fk = auth.uid()
      and m.restaurant_fk = p_restaurant_pk
      and m.is_active = true
  )
$$;


ALTER FUNCTION "public"."rls_has_restaurant_access"("p_restaurant_pk" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rls_has_restaurant_access"("p_restaurant_pk" "uuid") IS 'RLS helper. True when current profile has active membership on the restaurant. Role/scope granularity is checked in API middleware.';



CREATE OR REPLACE FUNCTION "public"."rls_is_consumer_profile"("p_consumer_profile_pk" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from consumer_profile c
    join iam_profile p on p.iam_profile_pk = c.iam_profile_fk
    where p.auth_user_fk = auth.uid()
      and c.consumer_profile_pk = p_consumer_profile_pk
  )
$$;


ALTER FUNCTION "public"."rls_is_consumer_profile"("p_consumer_profile_pk" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rls_is_consumer_profile"("p_consumer_profile_pk" "uuid") IS 'RLS helper. True when the consumer_profile belongs to the authenticated Supabase user.';



CREATE OR REPLACE FUNCTION "public"."rls_is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.rls_is_platform_user()
$$;


ALTER FUNCTION "public"."rls_is_platform_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rls_is_platform_admin"() IS 'RLS helper alias used by the platform-admin policy loop. Scope-specific authorization remains in API middleware.';



CREATE OR REPLACE FUNCTION "public"."rls_is_platform_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from iam_profile p
    where p.auth_user_fk = auth.uid()
      and p.is_platform_user = true
  )
$$;


ALTER FUNCTION "public"."rls_is_platform_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rls_is_platform_user"() IS 'RLS helper. True when current profile is a platform admin/support/ops/finance user. Detailed scope checks remain in middleware; RLS provides coarse DB guard.';



CREATE OR REPLACE FUNCTION "public"."rls_restaurant_is_public"("p_restaurant_pk" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from restaurant_restaurant r
    left join restaurant_public_profile rp
      on rp.restaurant_fk = r.restaurant_restaurant_pk
    where r.restaurant_restaurant_pk = p_restaurant_pk
      and r.restaurant_status_code = 'ACTIVE'
      and (
        rp.restaurant_public_profile_pk is null
        or rp.published_at is not null
      )
  )
$$;


ALTER FUNCTION "public"."rls_restaurant_is_public"("p_restaurant_pk" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rls_restaurant_is_public"("p_restaurant_pk" "uuid") IS 'RLS helper. True for ACTIVE restaurants with no profile row yet or a published public profile.';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_updated_at"() IS 'Reusable BEFORE UPDATE trigger function. Automatically maintains updated_at = now() on every mutable business table. Applied via the bulk trigger loop at the end of this file. Never call directly from application code.';



CREATE OR REPLACE FUNCTION "public"."set_updated_on"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_on = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_on"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_data_correction" (
    "admin_data_correction_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "correction_type_code" "text" NOT NULL,
    "correction_status_code" "text" DEFAULT 'REQUESTED'::"text" NOT NULL,
    "target_entity_type_code" "text" NOT NULL,
    "target_entity_pk" "uuid" NOT NULL,
    "requested_by_profile_fk" "uuid",
    "approved_by_profile_fk" "uuid",
    "executed_by_profile_fk" "uuid",
    "reason_text" "text" NOT NULL,
    "before_snapshot_json" "jsonb",
    "after_snapshot_json" "jsonb",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "executed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_admin_data_correction_status" CHECK (("correction_status_code" = ANY (ARRAY['REQUESTED'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'EXECUTING'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."admin_data_correction" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_data_correction" IS 'SERVICE-ROLE ONLY. 4-eyes data correction workflow for sensitive manual fixes. requested_by and approved_by MUST be different profiles (enforced at API layer). before_snapshot_json / after_snapshot_json provide audit trail for corrections. All sensitive admin operations MUST go through this table — never silent direct edits.';



COMMENT ON COLUMN "public"."admin_data_correction"."correction_type_code" IS 'ORDER_STATUS_CORRECTION, INVENTORY_RESYNC, FINANCIAL_ADJUSTMENT, PROFILE_ANONYMISATION, REFERRAL_STATUS_FIX.';



CREATE TABLE IF NOT EXISTS "public"."admin_export_job" (
    "admin_export_job_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "export_type_code" "text" NOT NULL,
    "export_status_code" "text" DEFAULT 'QUEUED'::"text" NOT NULL,
    "requested_by_profile_fk" "uuid",
    "idempotency_key" "text",
    "filters_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result_storage_object_fk" "uuid",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "error_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_admin_export_status" CHECK (("export_status_code" = ANY (ARRAY['QUEUED'::"text", 'PROCESSING'::"text", 'COMPLETED'::"text", 'FAILED'::"text"])))
);


ALTER TABLE "public"."admin_export_job" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_export_job" IS 'SERVICE-ROLE ONLY. Async export job tracker for large data exports. Processing runs as background Edge Function. result_storage_object_fk points to the output file in private-exports bucket. export_type_code: ORDERS_CSV, SETTLEMENTS_CSV, CONSUMER_LIST, RESTAURANT_COMPLIANCE, ANALYTICS_REPORT, WAITLIST_EXPORT.';



COMMENT ON COLUMN "public"."admin_export_job"."filters_json" IS 'Filter parameters for the export. Example: {"restaurant_fk": "uuid", "date_from": "2026-01-01", "date_to": "2026-03-31"}.';



CREATE TABLE IF NOT EXISTS "public"."analytics_event" (
    "analytics_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "actor_profile_fk" "uuid",
    "session_ref" "text",
    "entity_type_code" "text",
    "entity_pk" "uuid",
    "event_payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
)
PARTITION BY RANGE ("created_at");


ALTER TABLE "public"."analytics_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_event" IS 'SERVICE-ROLE ONLY. APPEND-ONLY. High-volume product and operational analytics. Never UPDATE or DELETE. Immutability enforced by trigger. Range-partitioned by created_at (monthly). ALWAYS include created_at in WHERE clauses. Retention per privacy_retention_policy: anonymise_after_days=730, purge_after_days=1825. event_name examples: drop_viewed, drop_claimed, order_created, pickup_completed, search_performed, swaad_club_subscribed.';



COMMENT ON COLUMN "public"."analytics_event"."event_name" IS 'Business event identifier. dot.case naming. Examples: drop.viewed, order.created, pickup.completed.';



COMMENT ON COLUMN "public"."analytics_event"."entity_type_code" IS 'Entity the event relates to: DROP, ORDER, RESTAURANT, CONSUMER. Used with entity_pk for event attribution.';



COMMENT ON COLUMN "public"."analytics_event"."event_payload_json" IS 'Freeform event properties. Keep lean — avoid PII. Example: {"city_code":"HYD","drop_type":"SPOTLIGHT","price_paise":14900}.';



CREATE TABLE IF NOT EXISTS "public"."analytics_event_2026_q2" (
    "analytics_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "actor_profile_fk" "uuid",
    "session_ref" "text",
    "entity_type_code" "text",
    "entity_pk" "uuid",
    "event_payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analytics_event_2026_q2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_event_2026_q3" (
    "analytics_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "actor_profile_fk" "uuid",
    "session_ref" "text",
    "entity_type_code" "text",
    "entity_pk" "uuid",
    "event_payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analytics_event_2026_q3" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_event_default" (
    "analytics_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "actor_profile_fk" "uuid",
    "session_ref" "text",
    "entity_type_code" "text",
    "entity_pk" "uuid",
    "event_payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analytics_event_default" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_event_default" IS 'Catch-all partition for analytics_event rows outside defined range partitions. Monitor and add quarterly partitions before this fills up.';



CREATE TABLE IF NOT EXISTS "public"."finance_restaurant_payout_entry" (
    "finance_restaurant_payout_entry_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "finance_settlement_run_fk" "uuid" NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "order_fk" "uuid",
    "payment_refund_fk" "uuid",
    "entry_type_code" "text" NOT NULL,
    "amount_paise" bigint NOT NULL,
    "description_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "line_key" "text",
    "order_number" "text",
    "payment_transaction_fk" "uuid",
    "commission_bps" integer,
    "commission_plan_code" "text",
    "source_status_code" "text",
    "calculation_metadata_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by_profile_fk" "uuid",
    "is_system_generated" boolean DEFAULT true NOT NULL,
    CONSTRAINT "ck_finance_payout_entry_amount" CHECK (("amount_paise" <> 0)),
    CONSTRAINT "ck_finance_payout_entry_type" CHECK (("entry_type_code" = ANY (ARRAY['ORDER_GROSS'::"text", 'COMMISSION'::"text", 'PAYMENT_FEE'::"text", 'TAX'::"text", 'REFUND'::"text", 'ADJUSTMENT'::"text", 'PAYOUT'::"text"])))
);


ALTER TABLE "public"."finance_restaurant_payout_entry" OWNER TO "postgres";


COMMENT ON TABLE "public"."finance_restaurant_payout_entry" IS 'Line-level settlement ledger. Each order/refund/commission/tax/adjustment creates entries. Amounts are signed: positive increases restaurant payout; negative decreases payout. Used for restaurant finance detail screen and CSV export.';



COMMENT ON COLUMN "public"."finance_restaurant_payout_entry"."entry_type_code" IS 'ORDER_GROSS, COMMISSION, TAX, REFUND, ADJUSTMENT, PAYOUT.';



CREATE TABLE IF NOT EXISTS "public"."finance_settlement_run" (
    "finance_settlement_run_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "period_start_at" timestamp with time zone NOT NULL,
    "period_end_at" timestamp with time zone NOT NULL,
    "settlement_status_code" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "gross_sales_paise" bigint DEFAULT 0 NOT NULL,
    "refund_paise" bigint DEFAULT 0 NOT NULL,
    "commission_paise" bigint DEFAULT 0 NOT NULL,
    "tax_paise" bigint DEFAULT 0 NOT NULL,
    "net_payout_paise" bigint DEFAULT 0 NOT NULL,
    "locked_by_profile_fk" "uuid",
    "locked_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "reconciled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_count" integer DEFAULT 0 NOT NULL,
    "excluded_order_count" integer DEFAULT 0 NOT NULL,
    "payment_fee_paise" bigint DEFAULT 0 NOT NULL,
    "adjustment_paise" bigint DEFAULT 0 NOT NULL,
    "calculation_version" "text" DEFAULT 'slice7_pilot_v1'::"text" NOT NULL,
    "calculation_metadata_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "lock_reason_text" "text",
    "status_note_text" "text",
    "payout_provider_reference_text" "text",
    "cancelled_at" timestamp with time zone,
    "cancelled_by_profile_fk" "uuid",
    "cancelled_reason_text" "text",
    CONSTRAINT "ck_finance_settlement_amounts" CHECK ((("gross_sales_paise" >= 0) AND ("refund_paise" >= 0) AND ("commission_paise" >= 0) AND ("tax_paise" >= 0) AND ("payment_fee_paise" >= 0) AND ("net_payout_paise" >= 0))),
    CONSTRAINT "ck_finance_settlement_period" CHECK (("period_end_at" > "period_start_at")),
    CONSTRAINT "ck_finance_settlement_status" CHECK (("settlement_status_code" = ANY (ARRAY['DRAFT'::"text", 'OPEN'::"text", 'LOCKED'::"text", 'SENT'::"text", 'PAID'::"text", 'RECONCILED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."finance_settlement_run" OWNER TO "postgres";


COMMENT ON TABLE "public"."finance_settlement_run" IS 'Restaurant settlement batch for a time period. DRAFT calculated → OPEN reviewed → LOCKED immutable → SENT payout initiated → PAID → RECONCILED. LOCKED rows must not be recalculated; corrections are represented by adjustment payout entries in a later run. Restaurant portal can read own settlement runs; finance admin/service writes.';



COMMENT ON COLUMN "public"."finance_settlement_run"."net_payout_paise" IS 'Gross sales minus refunds, commission, tax, and adjustments. Money stored in paise.';



CREATE TABLE IF NOT EXISTS "public"."order_order" (
    "order_order_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "drop_fk" "uuid" NOT NULL,
    "drop_inventory_hold_fk" "uuid",
    "order_status_code" "text" DEFAULT 'CREATED'::"text" NOT NULL,
    "payment_status_code" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "pickup_qr_nonce_hash" "text",
    "pickup_otp_hash" "text",
    "pickup_window_start_at" timestamp with time zone NOT NULL,
    "pickup_window_end_at" timestamp with time zone NOT NULL,
    "collected_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "subtotal_paise" bigint NOT NULL,
    "discount_paise" bigint DEFAULT 0 NOT NULL,
    "tax_paise" bigint DEFAULT 0 NOT NULL,
    "total_paise" bigint NOT NULL,
    "currency_code" "text" DEFAULT 'INR'::"text" NOT NULL,
    "snapshot_restaurant_name" "text" NOT NULL,
    "snapshot_restaurant_slug" "text" NOT NULL,
    "snapshot_drop_title" "text" NOT NULL,
    "snapshot_bag_display_name" "text" NOT NULL,
    "snapshot_dietary_category_code" "text" NOT NULL,
    "snapshot_spice_level_code" "text",
    "snapshot_allergen_summary_text" "text",
    "snapshot_serves_text" "text",
    "snapshot_pickup_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "computed_pickup_ready_flag" boolean DEFAULT false NOT NULL,
    CONSTRAINT "ck_order_amounts_nonneg" CHECK ((("subtotal_paise" >= 0) AND ("discount_paise" >= 0) AND ("tax_paise" >= 0) AND ("total_paise" >= 0))),
    CONSTRAINT "ck_order_payment_status" CHECK (("payment_status_code" = ANY (ARRAY['PENDING'::"text", 'AUTHORIZED'::"text", 'CAPTURED'::"text", 'FAILED'::"text", 'REFUNDED'::"text", 'PARTIALLY_REFUNDED'::"text"]))),
    CONSTRAINT "ck_order_pickup_window" CHECK (("pickup_window_end_at" > "pickup_window_start_at")),
    CONSTRAINT "ck_order_status" CHECK (("order_status_code" = ANY (ARRAY['CREATED'::"text", 'PAYMENT_PENDING'::"text", 'PAID'::"text", 'CONFIRMED'::"text", 'READY_FOR_PICKUP'::"text", 'COLLECTED'::"text", 'PICKUP_EXPIRED'::"text", 'CANCELLED'::"text", 'REFUND_PENDING'::"text", 'REFUNDED'::"text", 'NO_SHOW'::"text"])))
);


ALTER TABLE "public"."order_order" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_order" IS 'Customer order created after successful payment confirmation. Order history reads from snapshot_* columns, NOT mutable restaurant/drop/catalog joins. Status machine: CREATED → PAID → CONFIRMED → READY_FOR_PICKUP → COLLECTED. Alternate terminal states: PICKUP_EXPIRED, CANCELLED, REFUNDED. pickup_qr_nonce_hash and pickup_otp_hash are used by staff app verification; raw QR/OTP values are never stored.';



COMMENT ON COLUMN "public"."order_order"."order_number" IS 'Human-friendly unique order ID shown to consumers and staff. Example: GZ-HYD-202604-000123.';



COMMENT ON COLUMN "public"."order_order"."pickup_qr_nonce_hash" IS 'Hash of nonce embedded in QR. Raw nonce is generated once and shown/cached to consumer; never stored in plaintext.';



COMMENT ON COLUMN "public"."order_order"."pickup_otp_hash" IS 'Hash of 6-digit OTP fallback. Raw OTP shown to consumer; never stored plaintext.';



COMMENT ON COLUMN "public"."order_order"."snapshot_allergen_summary_text" IS 'Purchase-time allergen disclosure. Never overwritten if template changes later.';



COMMENT ON COLUMN "public"."order_order"."snapshot_pickup_instructions" IS 'Purchase-time pickup instruction text shown on QR/order screen.';



COMMENT ON COLUMN "public"."order_order"."computed_pickup_ready_flag" IS 'COMPUTED: true when order_status_code in (CONFIRMED, READY_FOR_PICKUP). Used by restaurant pickup queue view.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_restaurant" (
    "restaurant_restaurant_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_name" "text" NOT NULL,
    "restaurant_slug" "text" NOT NULL,
    "legal_entity_name" "text",
    "restaurant_status_code" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "geo_city_fk" "uuid" NOT NULL,
    "geo_neighborhood_fk" "uuid",
    "geo_address_fk" "uuid",
    "owner_profile_fk" "uuid",
    "primary_contact_email" "public"."citext",
    "primary_contact_phone_e164" "text",
    "pickup_instructions" "text",
    "computed_active_drop_count" integer DEFAULT 0 NOT NULL,
    "computed_total_collected_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "computed_orders_pending_pickup_count" integer DEFAULT 0 NOT NULL,
    "average_rating" numeric(3,2),
    "rating_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "ck_restaurant_status" CHECK (("restaurant_status_code" = ANY (ARRAY['PENDING'::"text", 'ONBOARDING'::"text", 'ACTIVE'::"text", 'PAUSED'::"text", 'SUSPENDED'::"text", 'OFFBOARDED'::"text"])))
);


ALTER TABLE "public"."restaurant_restaurant" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_restaurant" IS 'Core restaurant partner record. One row per physical restaurant location. restaurant_status_code controls operational access: PENDING = partner lead converted but not onboarded; ONBOARDING = docs/tasks in progress; ACTIVE = can publish drops; PAUSED = restaurant temporarily inactive by choice/ops; SUSPENDED = platform block, cannot publish/collect; OFFBOARDED = relationship ended. pickup-only: no delivery zone, courier, or shipping fields exist by design.';



COMMENT ON COLUMN "public"."restaurant_restaurant"."restaurant_slug" IS 'URL slug for public profile (/restaurants/[slug]). Stable once public. Must be lowercase-kebab-case, enforced by API.';



COMMENT ON COLUMN "public"."restaurant_restaurant"."pickup_instructions" IS 'Displayed to consumers on drop detail and order QR screen. Example: "Show QR at billing counter. Pickup from side window."';



COMMENT ON COLUMN "public"."restaurant_restaurant"."computed_active_drop_count" IS 'Denormalized count of ACTIVE/SCHEDULED drops. Maintained by COMPUTED_refresh_restaurant_counts trigger. Used for discovery cards.';



COMMENT ON COLUMN "public"."restaurant_restaurant"."computed_total_collected_count" IS 'Denormalized lifetime collected order count. Maintained by order status transition job/trigger. Used on public profile.';



COMMENT ON COLUMN "public"."restaurant_restaurant"."computed_orders_pending_pickup_count" IS 'COMPUTED: count of PAID/CONFIRMED/READY_FOR_PICKUP orders for this restaurant. Maintained by COMPUTED_refresh_restaurant_counts.';



COMMENT ON COLUMN "public"."restaurant_restaurant"."average_rating" IS 'COMPUTED: public average of moderation-approved public review ratings. Maintained by COMPUTED_refresh_restaurant_rating.';



COMMENT ON COLUMN "public"."restaurant_restaurant"."rating_count" IS 'COMPUTED: count of public approved reviews contributing to average_rating. Maintained by COMPUTED_refresh_restaurant_rating.';



CREATE OR REPLACE VIEW "public"."api_admin_finance_eligible_order_summary" WITH ("security_barrier"='true') AS
 SELECT "o"."order_order_pk" AS "order_pk",
    "o"."order_number",
    "o"."restaurant_fk",
    "r"."restaurant_name",
    "o"."order_status_code",
    "o"."payment_status_code",
    "o"."total_paise" AS "paid_amount_paise",
    "o"."pickup_window_end_at",
        CASE
            WHEN ("o"."payment_status_code" <> 'CAPTURED'::"text") THEN 'NOT_CAPTURED'::"text"
            WHEN ("o"."pickup_window_end_at" > "now"()) THEN 'PICKUP_WINDOW_OPEN'::"text"
            WHEN ("o"."order_status_code" <> ALL (ARRAY['COLLECTED'::"text", 'NO_SHOW'::"text"])) THEN 'NOT_PAYOUT_ELIGIBLE'::"text"
            WHEN (EXISTS ( SELECT 1
               FROM ("public"."finance_restaurant_payout_entry" "e"
                 JOIN "public"."finance_settlement_run" "sr" ON (("sr"."finance_settlement_run_pk" = "e"."finance_settlement_run_fk")))
              WHERE (("e"."order_fk" = "o"."order_order_pk") AND ("e"."entry_type_code" = 'ORDER_GROSS'::"text") AND ("sr"."settlement_status_code" <> 'CANCELLED'::"text")))) THEN 'ALREADY_SETTLED'::"text"
            ELSE 'ELIGIBLE'::"text"
        END AS "eligibility_status_code"
   FROM ("public"."order_order" "o"
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "o"."restaurant_fk")))
  WHERE "public"."rls_is_platform_user"();


ALTER VIEW "public"."api_admin_finance_eligible_order_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_finance_eligible_order_summary" IS 'Admin finance support scan for order settlement eligibility and exclusion reasons.';



CREATE OR REPLACE VIEW "public"."api_admin_finance_settlement_detail" WITH ("security_barrier"='true') AS
 SELECT "e"."finance_restaurant_payout_entry_pk" AS "payout_entry_pk",
    "e"."finance_settlement_run_fk" AS "settlement_run_pk",
    "e"."restaurant_fk",
    "e"."order_fk",
    "e"."order_number",
    "e"."payment_refund_fk",
    "e"."entry_type_code",
    "e"."amount_paise",
    "e"."description_text",
    "e"."commission_bps",
    "e"."commission_plan_code",
    "e"."source_status_code",
    "o"."pickup_window_end_at",
    "o"."snapshot_bag_display_name" AS "bag_display_name",
    "o"."total_paise" AS "order_total_paise",
    "e"."created_at",
    "e"."line_key",
    "e"."calculation_metadata_json",
    "e"."is_system_generated",
    "e"."created_by_profile_fk"
   FROM ("public"."finance_restaurant_payout_entry" "e"
     LEFT JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "e"."order_fk")))
  WHERE "public"."rls_is_platform_user"();


ALTER VIEW "public"."api_admin_finance_settlement_detail" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finance_invoice" (
    "finance_invoice_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "finance_settlement_run_fk" "uuid" NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "invoice_status_code" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "invoice_amount_paise" bigint NOT NULL,
    "storage_object_fk" "uuid",
    "issued_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "issued_by_profile_fk" "uuid",
    "due_at" timestamp with time zone,
    "invoice_metadata_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "external_document_ref" "text",
    "download_safe_filename" "text",
    CONSTRAINT "ck_finance_invoice_amount" CHECK (("invoice_amount_paise" >= 0)),
    CONSTRAINT "ck_finance_invoice_status" CHECK (("invoice_status_code" = ANY (ARRAY['DRAFT'::"text", 'ISSUED'::"text", 'PAID'::"text", 'VOID'::"text"])))
);


ALTER TABLE "public"."finance_invoice" OWNER TO "postgres";


COMMENT ON TABLE "public"."finance_invoice" IS 'Invoice document for a settlement run. PDF stored in Supabase Storage via storage_object_fk. Restaurant portal can download own issued invoices. Finance admin/service creates and marks paid.';



COMMENT ON COLUMN "public"."finance_invoice"."invoice_number" IS 'GST-compliant invoice number generated by finance service. Unique.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_payout_account" (
    "restaurant_payout_account_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "account_holder_name" "text" NOT NULL,
    "bank_name" "text",
    "masked_account_number" "text" NOT NULL,
    "ifsc_code" "text" NOT NULL,
    "razorpay_fund_account_ref" "text",
    "payout_account_status_code" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_restaurant_payout_account_status" CHECK (("payout_account_status_code" = ANY (ARRAY['PENDING'::"text", 'VERIFIED'::"text", 'REJECTED'::"text", 'DISABLED'::"text"])))
);


ALTER TABLE "public"."restaurant_payout_account" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_payout_account" IS 'Payout destination for restaurant settlements. Full account number is NOT stored; only masked_account_number and provider fund-account ref. SERVICE-ROLE/finance-admin only. Restaurant portal can read masked details, not modify directly after verification.';



COMMENT ON COLUMN "public"."restaurant_payout_account"."masked_account_number" IS 'Display-safe masked account number only, e.g. XXXX1234. Never store full bank account number in database.';



COMMENT ON COLUMN "public"."restaurant_payout_account"."razorpay_fund_account_ref" IS 'Razorpay fund account identifier used for payouts. Unique when present.';



CREATE OR REPLACE VIEW "public"."api_admin_finance_settlement_summary" WITH ("security_barrier"='true') AS
 SELECT "sr"."finance_settlement_run_pk" AS "settlement_run_pk",
    "sr"."restaurant_fk",
    "r"."restaurant_name",
    "sr"."period_start_at",
    "sr"."period_end_at",
    "sr"."settlement_status_code",
    "sr"."order_count",
    "sr"."excluded_order_count",
    "sr"."gross_sales_paise",
    "sr"."refund_paise",
    "sr"."commission_paise",
    "sr"."payment_fee_paise",
    "sr"."tax_paise",
    "sr"."adjustment_paise",
    "sr"."net_payout_paise",
    "sr"."locked_at",
    "sr"."paid_at",
    "sr"."reconciled_at",
    "sr"."cancelled_at",
    "sr"."lock_reason_text",
    "sr"."status_note_text",
    "sr"."payout_provider_reference_text",
    "pa"."payout_account_status_code",
    "public"."api_finance_payout_account_mask"("pa"."masked_account_number", "pa"."payout_account_status_code") AS "masked_payout_account",
    "inv"."finance_invoice_pk" AS "invoice_pk",
    "inv"."invoice_number",
    "inv"."invoice_status_code",
    "inv"."invoice_amount_paise",
    "inv"."issued_at" AS "invoice_issued_at",
    "inv"."external_document_ref",
    "inv"."download_safe_filename",
    "sr"."created_at",
    "sr"."updated_at"
   FROM ((("public"."finance_settlement_run" "sr"
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "sr"."restaurant_fk")))
     LEFT JOIN "public"."restaurant_payout_account" "pa" ON (("pa"."restaurant_fk" = "sr"."restaurant_fk")))
     LEFT JOIN "public"."finance_invoice" "inv" ON (("inv"."finance_settlement_run_fk" = "sr"."finance_settlement_run_pk")))
  WHERE "public"."rls_is_platform_user"();


ALTER VIEW "public"."api_admin_finance_settlement_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_finance_settlement_summary" IS 'Admin-safe finance settlement summary. Does not expose full bank account numbers, private documents, raw Razorpay payloads, or consumer PII.';



CREATE TABLE IF NOT EXISTS "public"."incident_incident" (
    "incident_incident_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid",
    "order_fk" "uuid",
    "support_ticket_fk" "uuid",
    "master_incident_type_fk" "uuid" NOT NULL,
    "master_incident_status_fk" "uuid" NOT NULL,
    "master_incident_severity_fk" "uuid" NOT NULL,
    "title_text" "text" NOT NULL,
    "description_text" "text",
    "assigned_to_profile_fk" "uuid",
    "reported_by_profile_fk" "uuid",
    "occurred_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."incident_incident" OWNER TO "postgres";


COMMENT ON TABLE "public"."incident_incident" IS 'Food safety and operational incident case. Incidents are distinct from support tickets: support handles communication; incident tracks root cause, severity, mitigation, and compliance. Any FOOD_SAFETY or DIETARY_MISMATCH support ticket should create/link an incident.';



COMMENT ON COLUMN "public"."incident_incident"."master_incident_severity_fk" IS 'P1/P2/P3/P4 severity via master_incident_severity. P1 triggers immediate admin escalation.';



CREATE TABLE IF NOT EXISTS "public"."master_incident_severity" (
    "master_incident_severity_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "severity_code" "text" NOT NULL,
    "severity_name" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_incident_severity" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_incident_severity" IS 'Incident severity for escalation and SLA. Seed: P1 (food safety risk, immediate escalation), P2 (payment or dietary issue, urgent), P3 (quality complaint, standard handling), P4 (minor, informational).';



CREATE TABLE IF NOT EXISTS "public"."master_incident_status" (
    "master_incident_status_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status_code" "text" NOT NULL,
    "status_name" "text" NOT NULL,
    "description" "text",
    "is_terminal" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_incident_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_incident_status" IS 'Incident lifecycle states. Seed: OPEN (newly filed), TRIAGED (severity assessed), INVESTIGATING (active), MERCHANT_ACTION_REQUIRED (waiting on restaurant), RESOLVED (terminal, root cause identified), CLOSED (terminal, post-resolution review complete), REJECTED (terminal, invalid incident).';



CREATE TABLE IF NOT EXISTS "public"."master_incident_type" (
    "master_incident_type_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type_code" "text" NOT NULL,
    "type_name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_incident_type" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_incident_type" IS 'Food safety and operational incident classification. Seed: DIETARY_MISMATCH (wrong dietary category served), FOOD_SAFETY (contamination/illness risk), PACKAGING_BREACH (damaged packaging), PICKUP_NOT_HONORED (restaurant refused pickup), MISSING_ORDER (no record at restaurant), QUALITY_ISSUE (below stated standard), PLATFORM_ERROR (system caused issue).';



CREATE OR REPLACE VIEW "public"."api_restaurant_incident_summary" WITH ("security_barrier"='true') AS
 SELECT "inc"."incident_incident_pk" AS "incident_pk",
    "inc"."order_fk" AS "order_pk",
    "o"."order_number",
    "inc"."restaurant_fk",
    "r"."restaurant_name",
    "mit"."type_code",
    "mit"."type_name",
    "mis"."severity_code",
    "mst"."status_code",
    "inc"."title_text",
    "inc"."description_text",
    "inc"."reported_by_profile_fk",
    "inc"."occurred_at",
    "inc"."created_at",
    "inc"."updated_at"
   FROM ((((("public"."incident_incident" "inc"
     LEFT JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "inc"."order_fk")))
     LEFT JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "inc"."restaurant_fk")))
     JOIN "public"."master_incident_type" "mit" ON (("mit"."master_incident_type_pk" = "inc"."master_incident_type_fk")))
     JOIN "public"."master_incident_severity" "mis" ON (("mis"."master_incident_severity_pk" = "inc"."master_incident_severity_fk")))
     JOIN "public"."master_incident_status" "mst" ON (("mst"."master_incident_status_pk" = "inc"."master_incident_status_fk")))
  WHERE (("inc"."restaurant_fk" IS NOT NULL) AND "public"."rls_has_restaurant_access"("inc"."restaurant_fk"));


ALTER VIEW "public"."api_restaurant_incident_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_restaurant_incident_summary" IS 'Slice 5 restaurant-visible incident summary scoped to own restaurant orders. No private docs, payment payloads, or consumer contact fields.';



CREATE OR REPLACE VIEW "public"."api_admin_incident_summary" WITH ("security_barrier"='true') AS
 SELECT "api_restaurant_incident_summary"."incident_pk",
    "api_restaurant_incident_summary"."order_pk",
    "api_restaurant_incident_summary"."order_number",
    "api_restaurant_incident_summary"."restaurant_fk",
    "api_restaurant_incident_summary"."restaurant_name",
    "api_restaurant_incident_summary"."type_code",
    "api_restaurant_incident_summary"."type_name",
    "api_restaurant_incident_summary"."severity_code",
    "api_restaurant_incident_summary"."status_code",
    "api_restaurant_incident_summary"."title_text",
    "api_restaurant_incident_summary"."description_text",
    "api_restaurant_incident_summary"."reported_by_profile_fk",
    "api_restaurant_incident_summary"."occurred_at",
    "api_restaurant_incident_summary"."created_at",
    "api_restaurant_incident_summary"."updated_at"
   FROM "public"."api_restaurant_incident_summary"
  WHERE "public"."rls_is_platform_user"()
UNION ALL
 SELECT "inc"."incident_incident_pk" AS "incident_pk",
    "inc"."order_fk" AS "order_pk",
    "o"."order_number",
    "inc"."restaurant_fk",
    "r"."restaurant_name",
    "mit"."type_code",
    "mit"."type_name",
    "mis"."severity_code",
    "mst"."status_code",
    "inc"."title_text",
    "inc"."description_text",
    "inc"."reported_by_profile_fk",
    "inc"."occurred_at",
    "inc"."created_at",
    "inc"."updated_at"
   FROM ((((("public"."incident_incident" "inc"
     LEFT JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "inc"."order_fk")))
     LEFT JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "inc"."restaurant_fk")))
     JOIN "public"."master_incident_type" "mit" ON (("mit"."master_incident_type_pk" = "inc"."master_incident_type_fk")))
     JOIN "public"."master_incident_severity" "mis" ON (("mis"."master_incident_severity_pk" = "inc"."master_incident_severity_fk")))
     JOIN "public"."master_incident_status" "mst" ON (("mst"."master_incident_status_pk" = "inc"."master_incident_status_fk")))
  WHERE ("public"."rls_is_platform_user"() AND (NOT (EXISTS ( SELECT 1
           FROM "public"."api_restaurant_incident_summary" "visible"
          WHERE ("visible"."incident_pk" = "inc"."incident_incident_pk")))));


ALTER VIEW "public"."api_admin_incident_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_incident_summary" IS 'Slice 5 admin-visible incident summary for launch support. No private docs, payment payloads, or pickup credentials.';



CREATE TABLE IF NOT EXISTS "public"."notification_delivery_attempt" (
    "notification_delivery_attempt_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_outbox_fk" "uuid" NOT NULL,
    "provider_code" "text",
    "provider_message_ref" "text",
    "attempt_status_code" "text" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "error_code" "text",
    "error_text" "text",
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider_status_code" "text",
    "response_summary_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "ck_notification_attempt_status" CHECK (("attempt_status_code" = ANY (ARRAY['SENT'::"text", 'FAILED'::"text", 'RETRYING'::"text", 'DROPPED'::"text"])))
);


ALTER TABLE "public"."notification_delivery_attempt" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_delivery_attempt" IS 'Delivery attempt log for notification_outbox. One outbox row may have multiple attempts. Retain for 90 days per privacy_retention_policy. provider_message_ref supports provider reconciliation/debugging.';



COMMENT ON COLUMN "public"."notification_delivery_attempt"."attempt_number" IS '1-based attempt counter. Worker increments per retry.';



CREATE TABLE IF NOT EXISTS "public"."notification_outbox" (
    "notification_outbox_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_template_fk" "uuid",
    "channel_code" "text" NOT NULL,
    "recipient_profile_fk" "uuid",
    "resolved_destination_text" "text" NOT NULL,
    "business_context_type_code" "text",
    "business_context_fk" "uuid",
    "payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "send_status_code" "text" DEFAULT 'QUEUED'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "idempotency_key" "text",
    "template_code" "text",
    "recipient_audience_code" "text" DEFAULT 'CONSUMER'::"text" NOT NULL,
    "provider_code" "text",
    "purpose_code" "text",
    "delivery_reason_code" "text",
    "last_error_code" "text",
    "last_error_text" "text",
    "retry_count" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 3 NOT NULL,
    "next_attempt_at" timestamp with time zone,
    "claimed_at" timestamp with time zone,
    "claim_token" "uuid",
    "manual_fallback_text" "text",
    "suppressed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "suppressed_by_profile_fk" "uuid",
    "suppression_reason_text" "text",
    CONSTRAINT "ck_notification_outbox_channel" CHECK (("channel_code" = ANY (ARRAY['PUSH'::"text", 'EMAIL'::"text", 'WHATSAPP'::"text", 'SMS'::"text"]))),
    CONSTRAINT "ck_notification_outbox_status" CHECK (("send_status_code" = ANY (ARRAY['QUEUED'::"text", 'SENDING'::"text", 'SENT'::"text", 'FAILED'::"text", 'CANCELLED'::"text", 'SUPPRESSED'::"text"])))
);


ALTER TABLE "public"."notification_outbox" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_outbox" IS 'Queued notification messages. Business APIs enqueue rows; workers send asynchronously. resolved_destination_text snapshots email/phone/device token at enqueue time. Before enqueue: check privacy_consent_event and consumer_notification_preference. send_status_code SUPPRESSED records consent/preference suppression instead of silently skipping.';



COMMENT ON COLUMN "public"."notification_outbox"."resolved_destination_text" IS 'Actual destination used at send time: email, E.164 phone, or push token. Stored for delivery audit.';



COMMENT ON COLUMN "public"."notification_outbox"."business_context_type_code" IS 'Context type: DROP, ORDER, REFUND, SUPPORT_TICKET, INCIDENT, SUBSCRIPTION, MARKETING. business_context_fk points to matching table but no DB FK for polymorphic context.';



COMMENT ON COLUMN "public"."notification_outbox"."idempotency_key" IS 'Slice 6 idempotency key. One notification per context/template/channel/audience/destination intent.';



COMMENT ON COLUMN "public"."notification_outbox"."manual_fallback_text" IS 'Support-safe manual fallback copy. Must not include raw pickup OTP, QR nonce, hashes, provider secrets, or raw provider payloads.';



CREATE OR REPLACE VIEW "public"."api_admin_notification_attempt_summary" WITH ("security_barrier"='true') AS
 SELECT "a"."notification_delivery_attempt_pk",
    "a"."notification_outbox_fk",
    "a"."provider_code",
    "a"."provider_message_ref",
    "a"."attempt_status_code",
    "a"."attempt_number",
    "a"."error_code",
    "a"."error_text",
    "a"."attempted_at",
    "a"."created_at"
   FROM ("public"."notification_delivery_attempt" "a"
     JOIN "public"."notification_outbox" "n" ON (("n"."notification_outbox_pk" = "a"."notification_outbox_fk")))
  WHERE "public"."rls_is_platform_user"();


ALTER VIEW "public"."api_admin_notification_attempt_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_template" (
    "notification_template_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_code" "text" NOT NULL,
    "channel_code" "text" NOT NULL,
    "locale_code" "text" DEFAULT 'en'::"text" NOT NULL,
    "subject_template" "text",
    "body_template" "text" NOT NULL,
    "provider_template_ref" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_notification_template_channel" CHECK (("channel_code" = ANY (ARRAY['PUSH'::"text", 'EMAIL'::"text", 'WHATSAPP'::"text", 'SMS'::"text"])))
);


ALTER TABLE "public"."notification_template" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_template" IS 'Notification templates by channel and locale. Examples: DROP_PUBLISHED, HOLD_EXPIRING, ORDER_CONFIRMED, PICKUP_REMINDER, REFUND_PROCESSED. WhatsApp templates must map to approved WATI provider_template_ref. Do not send notifications inline from business APIs; enqueue notification_outbox.';



COMMENT ON COLUMN "public"."notification_template"."provider_template_ref" IS 'Provider-side template identifier. Required for WhatsApp/WATI pre-approved template messages.';



CREATE OR REPLACE VIEW "public"."api_admin_notification_delivery_summary" WITH ("security_barrier"='true') AS
 SELECT "n"."notification_outbox_pk",
        CASE
            WHEN ("n"."business_context_type_code" = 'ORDER'::"text") THEN "n"."business_context_fk"
            ELSE NULL::"uuid"
        END AS "order_pk",
    "o"."order_number",
    "o"."restaurant_fk",
    COALESCE("o"."snapshot_restaurant_name", "r"."restaurant_name") AS "restaurant_name",
    COALESCE("n"."template_code", "t"."template_code") AS "template_code",
    "n"."recipient_audience_code" AS "audience_code",
    "n"."channel_code",
    "n"."send_status_code",
    "n"."provider_code",
    "n"."delivery_reason_code",
    "n"."business_context_type_code",
    "a"."provider_message_ref",
    "public"."api_notification_mask_destination"("n"."resolved_destination_text") AS "destination_masked_text",
    "n"."scheduled_at",
    "n"."sent_at",
    "n"."next_attempt_at",
    "n"."retry_count",
    "n"."max_attempts",
    "a"."attempt_status_code" AS "last_attempt_status_code",
    "a"."attempted_at" AS "last_attempt_at",
    COALESCE("n"."last_error_code", "a"."error_code") AS "last_error_code",
    COALESCE("n"."last_error_text", "a"."error_text") AS "last_error_text",
    "n"."manual_fallback_text",
    "n"."created_at",
    "n"."updated_at"
   FROM ((((("public"."notification_outbox" "n"
     LEFT JOIN "public"."notification_template" "t" ON (("t"."notification_template_pk" = "n"."notification_template_fk")))
     LEFT JOIN "public"."order_order" "o" ON ((("o"."order_order_pk" = "n"."business_context_fk") AND ("n"."business_context_type_code" = 'ORDER'::"text"))))
     LEFT JOIN "public"."incident_incident" "inc" ON ((("inc"."incident_incident_pk" = "n"."business_context_fk") AND ("n"."business_context_type_code" = 'INCIDENT'::"text"))))
     LEFT JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "inc"."restaurant_fk")))
     LEFT JOIN LATERAL ( SELECT "notification_delivery_attempt"."provider_message_ref",
            "notification_delivery_attempt"."attempt_status_code",
            "notification_delivery_attempt"."attempted_at",
            "notification_delivery_attempt"."error_code",
            "notification_delivery_attempt"."error_text"
           FROM "public"."notification_delivery_attempt"
          WHERE ("notification_delivery_attempt"."notification_outbox_fk" = "n"."notification_outbox_pk")
          ORDER BY "notification_delivery_attempt"."attempted_at" DESC, "notification_delivery_attempt"."attempt_number" DESC
         LIMIT 1) "a" ON (true))
  WHERE "public"."rls_is_platform_user"();


ALTER VIEW "public"."api_admin_notification_delivery_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "audit_log_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_profile_fk" "uuid",
    "actor_role_code" "text",
    "action_code" "text" NOT NULL,
    "target_entity_type_code" "text",
    "target_entity_pk" "uuid",
    "audit_payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_log" IS 'SERVICE-ROLE ONLY. APPEND-ONLY. Platform-wide privileged action audit trail. Never UPDATE or DELETE. Immutability enforced by trigger. Written by server-side code for all material state changes to: financial records, compliance docs, restaurant status, team memberships, admin data corrections, erasure requests, config changes. Retained per privacy_retention_policy AUDIT_3Y (3 years).';



COMMENT ON COLUMN "public"."audit_log"."action_code" IS 'UPPER_SNAKE_CASE action identifier. Examples: RESTAURANT_ACTIVATED, ORDER_REFUNDED, ERASURE_EXECUTED, SETTLEMENT_LOCKED, ADMIN_DATA_CORRECTION_APPROVED.';



COMMENT ON COLUMN "public"."audit_log"."audit_payload_json" IS 'Action context: {"before": {...}, "after": {...}, "reason": "..."}. Never include plaintext credentials or full PAN/bank numbers.';



COMMENT ON COLUMN "public"."audit_log"."ip_address" IS 'Requester IP at action time. For security audit and fraud investigation.';



CREATE OR REPLACE VIEW "public"."api_admin_ops_audit_log" WITH ("security_barrier"='true') AS
 SELECT "audit_log_pk",
    "actor_profile_fk",
    "actor_role_code",
    "action_code",
    "target_entity_type_code",
    "target_entity_pk",
    ("audit_payload_json" ->> 'reason'::"text") AS "reason_text",
    "created_at"
   FROM "public"."audit_log" "a"
  WHERE (("public"."rls_is_platform_user"() OR ("auth"."role"() = 'service_role'::"text")) AND (("action_code" ~~ 'RESTAURANT_%'::"text") OR ("action_code" ~~ 'DROP_%'::"text") OR ("action_code" ~~ 'SUPPORT_%'::"text") OR ("action_code" ~~ 'INCIDENT_%'::"text") OR ("action_code" ~~ 'REFUND_%'::"text") OR ("action_code" ~~ 'CONFIG_%'::"text") OR ("action_code" ~~ 'SETTLEMENT_%'::"text")))
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."api_admin_ops_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."config_feature_flag" (
    "config_feature_flag_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flag_code" "text" NOT NULL,
    "flag_name" "text" NOT NULL,
    "description" "text",
    "is_enabled" boolean DEFAULT false NOT NULL,
    "scope_code" "text" DEFAULT 'GLOBAL'::"text" NOT NULL,
    "scope_entity_pk" "uuid",
    "config_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."config_feature_flag" OWNER TO "postgres";


COMMENT ON TABLE "public"."config_feature_flag" IS 'SERVICE-ROLE ONLY. Feature flags with optional scope. scope_code: GLOBAL, CITY, RESTAURANT, SEGMENT. scope_entity_pk: geo_city_pk | restaurant_restaurant_pk | master_audience_segment_pk | NULL (GLOBAL). Config examples: SWAAD_CLUB_ENABLED, SPOTLIGHT_DROPS_ENABLED, NEW_CLAIM_FLOW_V2.';



COMMENT ON COLUMN "public"."config_feature_flag"."scope_code" IS 'GLOBAL: applies everywhere. CITY: specific city. RESTAURANT: specific restaurant. SEGMENT: specific audience.';



COMMENT ON COLUMN "public"."config_feature_flag"."config_json" IS 'Additional flag configuration. Example: {"rollout_percentage": 50, "allowlist_profiles": ["uuid1"]}.';



CREATE OR REPLACE VIEW "public"."api_admin_ops_config_flag" WITH ("security_barrier"='true') AS
 SELECT "f"."config_feature_flag_pk" AS "config_pk",
    "f"."flag_code",
    "f"."flag_name",
    "f"."description",
    "f"."scope_code",
    "f"."scope_entity_pk",
    COALESCE("r"."restaurant_name", "f"."scope_code") AS "scope_label",
    "f"."is_enabled",
        CASE
            WHEN ("f"."flag_code" = 'MAX_BAGS_PER_DROP'::"text") THEN NULLIF((("f"."config_json" ->> 'max_bags_per_drop'::"text"))::integer, 0)
            ELSE NULL::integer
        END AS "numeric_value",
    COALESCE(("f"."config_json" ->> 'consumed_by'::"text"),
        CASE "f"."flag_code"
            WHEN 'CLAIMS_ENABLED'::"text" THEN 'consumer discovery and claim hold RPC'::"text"
            WHEN 'PUBLISHING_ENABLED'::"text" THEN 'restaurant portal drop publishing'::"text"
            WHEN 'MAX_BAGS_PER_DROP'::"text" THEN 'restaurant portal drop publishing'::"text"
            ELSE 'not allowlisted'::"text"
        END) AS "consumed_by_text",
    "f"."updated_at"
   FROM ("public"."config_feature_flag" "f"
     LEFT JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "f"."scope_entity_pk")))
  WHERE (("public"."rls_is_platform_user"() OR ("auth"."role"() = 'service_role'::"text")) AND ("f"."flag_code" = ANY (ARRAY['CLAIMS_ENABLED'::"text", 'PUBLISHING_ENABLED'::"text", 'MAX_BAGS_PER_DROP'::"text"])) AND ("f"."scope_code" = ANY (ARRAY['GLOBAL'::"text", 'RESTAURANT'::"text"])));


ALTER VIEW "public"."api_admin_ops_config_flag" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_ops_config_flag" IS 'Slice 8B allowlisted operational config flags consumed by claim and publishing guardrails.';



CREATE TABLE IF NOT EXISTS "public"."drop_drop" (
    "drop_drop_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "catalog_bag_template_revision_fk" "uuid" NOT NULL,
    "drop_recurring_schedule_fk" "uuid",
    "drop_title" "text" NOT NULL,
    "drop_status_code" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "drop_type_code" "text" DEFAULT 'STANDARD'::"text" NOT NULL,
    "geo_city_fk" "uuid" NOT NULL,
    "geo_neighborhood_fk" "uuid",
    "quantity_total" integer NOT NULL,
    "quantity_reserved" integer DEFAULT 0 NOT NULL,
    "quantity_sold" integer DEFAULT 0 NOT NULL,
    "quantity_collected" integer DEFAULT 0 NOT NULL,
    "price_paise" bigint NOT NULL,
    "currency_code" "text" DEFAULT 'INR'::"text" NOT NULL,
    "publish_at" timestamp with time zone,
    "pickup_start_at" timestamp with time zone NOT NULL,
    "pickup_end_at" timestamp with time zone NOT NULL,
    "hold_duration_minutes" integer DEFAULT 10 NOT NULL,
    "visibility_code" "text" DEFAULT 'PUBLIC'::"text" NOT NULL,
    "created_by_profile_fk" "uuid",
    "published_by_profile_fk" "uuid",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "computed_quantity_available" integer GENERATED ALWAYS AS (GREATEST((("quantity_total" - "quantity_reserved") - "quantity_sold"), 0)) STORED,
    "computed_sell_through_bps" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "ck_drop_hold_minutes" CHECK ((("hold_duration_minutes" >= 1) AND ("hold_duration_minutes" <= 60))),
    CONSTRAINT "ck_drop_price" CHECK (("price_paise" >= 0)),
    CONSTRAINT "ck_drop_quantities_bounds" CHECK (((("quantity_reserved" + "quantity_sold") <= "quantity_total") AND ("quantity_collected" <= "quantity_sold"))),
    CONSTRAINT "ck_drop_quantities_nonneg" CHECK ((("quantity_reserved" >= 0) AND ("quantity_sold" >= 0) AND ("quantity_collected" >= 0))),
    CONSTRAINT "ck_drop_quantity_total" CHECK (("quantity_total" > 0)),
    CONSTRAINT "ck_drop_status" CHECK (("drop_status_code" = ANY (ARRAY['DRAFT'::"text", 'SCHEDULED'::"text", 'ACTIVE'::"text", 'PAUSED'::"text", 'SOLD_OUT'::"text", 'PICKUP_CLOSED'::"text", 'EMERGENCY_CLOSED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "ck_drop_type" CHECK (("drop_type_code" = ANY (ARRAY['STANDARD'::"text", 'SPOTLIGHT'::"text", 'CHEF_SPECIAL'::"text"]))),
    CONSTRAINT "ck_drop_visibility" CHECK (("visibility_code" = ANY (ARRAY['PUBLIC'::"text", 'PRIVATE_LINK'::"text", 'INTERNAL_ONLY'::"text"]))),
    CONSTRAINT "ck_drop_window" CHECK (("pickup_end_at" > "pickup_start_at"))
);


ALTER TABLE "public"."drop_drop" OWNER TO "postgres";


COMMENT ON TABLE "public"."drop_drop" IS 'Live BAM Bag drop/listing. This is the high-contention inventory table. Consumer claim flow MUST lock this row SELECT ... FOR UPDATE before modifying quantity_reserved/sold. Status machine: DRAFT → SCHEDULED → ACTIVE → SOLD_OUT/PICKUP_CLOSED. PAUSED temporarily blocks new holds. EMERGENCY_CLOSED triggers refund workflow for affected orders. Pickup-only: no delivery fields exist. Realtime subscription publishes quantity changes.';



COMMENT ON COLUMN "public"."drop_drop"."quantity_total" IS 'Total bags available for this drop. Admin-only adjustment after publish must append drop_inventory_event.';



COMMENT ON COLUMN "public"."drop_drop"."quantity_reserved" IS 'Temporary held quantity awaiting payment. Incremented on hold create; decremented on payment success or hold expiry.';



COMMENT ON COLUMN "public"."drop_drop"."quantity_sold" IS 'Paid orders count. Incremented only after payment confirmation converts hold to order.';



COMMENT ON COLUMN "public"."drop_drop"."quantity_collected" IS 'Collected order count. Incremented on successful pickup verification.';



COMMENT ON COLUMN "public"."drop_drop"."price_paise" IS 'Consumer-facing price in paise. Snapshotted into order_order/order_item at checkout.';



COMMENT ON COLUMN "public"."drop_drop"."hold_duration_minutes" IS 'Minutes a claim hold remains valid while user completes Razorpay checkout. Default 10.';



COMMENT ON COLUMN "public"."drop_drop"."computed_quantity_available" IS 'GENERATED STORED: max(quantity_total - quantity_reserved - quantity_sold, 0). Used by Realtime and inventory-claim guard.';



COMMENT ON COLUMN "public"."drop_drop"."computed_sell_through_bps" IS 'COMPUTED: quantity_sold / quantity_total * 10000. Maintained by COMPUTED_refresh_drop_sell_through.';



CREATE OR REPLACE VIEW "public"."api_admin_ops_drop_summary" WITH ("security_barrier"='true') AS
 SELECT "d"."drop_drop_pk" AS "drop_pk",
    "d"."restaurant_fk",
    "r"."restaurant_name",
    "d"."drop_title",
    "d"."drop_status_code" AS "status_code",
    "d"."quantity_total",
    "d"."computed_quantity_available" AS "quantity_available",
    (COALESCE("orders"."paid_order_count", (0)::bigint))::integer AS "paid_order_count",
    "d"."pickup_start_at",
    "d"."pickup_end_at",
    "d"."updated_at"
   FROM (("public"."drop_drop" "d"
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "d"."restaurant_fk")))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "paid_order_count"
           FROM "public"."order_order" "o"
          WHERE (("o"."drop_fk" = "d"."drop_drop_pk") AND ("o"."payment_status_code" = 'CAPTURED'::"text"))) "orders" ON (true))
  WHERE (("public"."rls_is_platform_user"() OR ("auth"."role"() = 'service_role'::"text")) AND ("d"."drop_status_code" = ANY (ARRAY['ACTIVE'::"text", 'SCHEDULED'::"text", 'PAUSED'::"text"])))
  ORDER BY "d"."pickup_start_at" DESC;


ALTER VIEW "public"."api_admin_ops_drop_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incident_event" (
    "incident_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_fk" "uuid" NOT NULL,
    "event_type_code" "text" NOT NULL,
    "from_status_fk" "uuid",
    "to_status_fk" "uuid",
    "comment_text" "text",
    "actor_profile_fk" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."incident_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."incident_event" IS 'APPEND-ONLY incident timeline. Events: CREATED, TRIAGED, ASSIGNED, STATUS_CHANGED, RESTAURANT_CONTACTED, ROOT_CAUSE_ADDED, RESOLVED, CLOSED. Retained for compliance and food-safety audit.';



CREATE OR REPLACE VIEW "public"."api_admin_ops_incident_queue" WITH ("security_barrier"='true') AS
 SELECT "i"."incident_incident_pk" AS "incident_pk",
    "i"."restaurant_fk",
    "r"."restaurant_name",
    "i"."order_fk",
    "o"."order_number",
    "i"."support_ticket_fk",
    "ty"."type_code",
    "sev"."severity_code",
    "st"."status_code",
    "i"."title_text",
    "i"."description_text",
    "i"."assigned_to_profile_fk",
    "latest"."latest_event_at",
    "i"."occurred_at",
    "i"."created_at",
    "i"."updated_at"
   FROM (((((("public"."incident_incident" "i"
     JOIN "public"."master_incident_type" "ty" ON (("ty"."master_incident_type_pk" = "i"."master_incident_type_fk")))
     JOIN "public"."master_incident_severity" "sev" ON (("sev"."master_incident_severity_pk" = "i"."master_incident_severity_fk")))
     JOIN "public"."master_incident_status" "st" ON (("st"."master_incident_status_pk" = "i"."master_incident_status_fk")))
     LEFT JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "i"."restaurant_fk")))
     LEFT JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "i"."order_fk")))
     LEFT JOIN LATERAL ( SELECT "max"("e"."recorded_at") AS "latest_event_at"
           FROM "public"."incident_event" "e"
          WHERE ("e"."incident_fk" = "i"."incident_incident_pk")) "latest" ON (true))
  WHERE ("public"."rls_is_platform_user"() OR ("auth"."role"() = 'service_role'::"text"));


ALTER VIEW "public"."api_admin_ops_incident_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_refund" (
    "payment_refund_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_fk" "uuid" NOT NULL,
    "payment_transaction_fk" "uuid",
    "provider_code" "text" DEFAULT 'RAZORPAY'::"text" NOT NULL,
    "provider_refund_ref" "text",
    "refund_status_code" "text" DEFAULT 'REQUESTED'::"text" NOT NULL,
    "refund_reason_code" "text" NOT NULL,
    "amount_paise" bigint NOT NULL,
    "idempotency_key" "text",
    "requested_by_profile_fk" "uuid",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "provider_payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "support_ticket_fk" "uuid",
    "incident_fk" "uuid",
    "tracking_status_code" "text" DEFAULT 'REQUESTED'::"text" NOT NULL,
    "manual_tracking_note_text" "text",
    "provider_refund_disabled" boolean DEFAULT true NOT NULL,
    CONSTRAINT "ck_payment_refund_amount" CHECK (("amount_paise" > 0)),
    CONSTRAINT "ck_payment_refund_status" CHECK (("refund_status_code" = ANY (ARRAY['REQUESTED'::"text", 'PROCESSING'::"text", 'SUCCEEDED'::"text", 'FAILED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "ck_payment_refund_tracking_status" CHECK (("tracking_status_code" = ANY (ARRAY['REQUESTED'::"text", 'OPS_REVIEW'::"text", 'FINANCE_REVIEW'::"text", 'APPROVED_MANUAL'::"text", 'TRACKED_EXTERNALLY'::"text", 'REJECTED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."payment_refund" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_refund" IS 'Refund request and provider result. Refund initiation does NOT directly mutate settlement records. Finance effects are recorded separately after provider confirmation. Refunds may be linked to support_ticket or incident via their FK fields. idempotency_key prevents duplicate refund requests from admin/support retries.';



COMMENT ON COLUMN "public"."payment_refund"."refund_reason_code" IS 'Machine reason. Examples: EMERGENCY_CLOSED, RESTAURANT_NO_SHOW, CUSTOMER_SUPPORT, PAYMENT_DUPLICATE, ADMIN_OVERRIDE.';



COMMENT ON COLUMN "public"."payment_refund"."idempotency_key" IS 'Retry key for refund initiation. Unique per order when present.';



CREATE OR REPLACE VIEW "public"."api_admin_ops_refund_queue" WITH ("security_barrier"='true') AS
 SELECT "pr"."payment_refund_pk" AS "refund_pk",
    "o"."restaurant_fk",
    "r"."restaurant_name",
    "pr"."order_fk",
    "o"."order_number",
    "pr"."support_ticket_fk",
    "pr"."incident_fk",
    "pr"."refund_status_code",
    COALESCE("pr"."tracking_status_code", 'REQUESTED'::"text") AS "tracking_status_code",
    "pr"."refund_reason_code",
    "pr"."amount_paise",
    "pr"."requested_at",
    "pr"."processed_at",
    "pr"."updated_at"
   FROM (("public"."payment_refund" "pr"
     JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "pr"."order_fk")))
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "o"."restaurant_fk")))
  WHERE ("public"."rls_is_platform_user"() OR ("auth"."role"() = 'service_role'::"text"));


ALTER VIEW "public"."api_admin_ops_refund_queue" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_ops_refund_queue" IS 'Slice 8B manual refund/debit tracking queue. Read-only support artifact; no provider refund execution.';



CREATE TABLE IF NOT EXISTS "public"."master_support_ticket_status" (
    "master_support_ticket_status_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status_code" "text" NOT NULL,
    "status_name" "text" NOT NULL,
    "description" "text",
    "is_terminal" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_support_ticket_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_support_ticket_status" IS 'Support ticket lifecycle states. Seed: OPEN (default, awaiting agent), IN_PROGRESS (assigned), PENDING_CUSTOMER (waiting on consumer response), PENDING_MERCHANT (waiting on restaurant), RESOLVED (terminal), CLOSED (terminal, post-resolution confirmation), REJECTED (terminal, not a valid ticket).';



CREATE TABLE IF NOT EXISTS "public"."support_ticket" (
    "support_ticket_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_profile_fk" "uuid",
    "restaurant_fk" "uuid",
    "order_fk" "uuid",
    "marketing_partner_lead_fk" "uuid",
    "master_support_ticket_type_fk" "uuid" NOT NULL,
    "master_support_ticket_status_fk" "uuid" NOT NULL,
    "master_support_ticket_priority_fk" "uuid" NOT NULL,
    "requester_idempotency_key" "text",
    "subject_text" "text" NOT NULL,
    "description_text" "text",
    "assigned_to_profile_fk" "uuid",
    "sla_due_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "incident_fk" "uuid",
    "payment_refund_fk" "uuid"
);


ALTER TABLE "public"."support_ticket" OWNER TO "postgres";


COMMENT ON TABLE "public"."support_ticket" IS 'Support queue item. May be linked to consumer, restaurant, order, or anonymous partner lead. Status/type/priority are master-data FKs, not free text. All status changes/comments are recorded in support_ticket_event append-only table.';



COMMENT ON COLUMN "public"."support_ticket"."requester_idempotency_key" IS 'Optional public/API retry key. Unique per requester when requester_profile_fk is present. Prevents duplicate tickets on retry.';



COMMENT ON COLUMN "public"."support_ticket"."sla_due_at" IS 'Computed at creation from priority SLA. Used by admin support queue.';



CREATE OR REPLACE VIEW "public"."api_admin_ops_restaurant_summary" WITH ("security_barrier"='true') AS
 SELECT "r"."restaurant_restaurant_pk" AS "restaurant_pk",
    "r"."restaurant_name",
    "r"."restaurant_slug",
    "r"."restaurant_status_code" AS "status_code",
    (COALESCE("inc"."open_incident_count", (0)::bigint))::integer AS "open_incident_count",
    (COALESCE("st"."open_support_ticket_count", (0)::bigint))::integer AS "open_support_ticket_count",
    (COALESCE("ref"."open_refund_request_count", (0)::bigint))::integer AS "open_refund_request_count",
    (COALESCE("dr"."active_drop_count", (0)::bigint))::integer AS "active_drop_count",
    (COALESCE("dr"."paused_drop_count", (0)::bigint))::integer AS "paused_drop_count",
    "aud"."latest_audit_at",
    "r"."updated_at"
   FROM ((((("public"."restaurant_restaurant" "r"
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "open_incident_count"
           FROM ("public"."incident_incident" "i"
             JOIN "public"."master_incident_status" "s" ON (("s"."master_incident_status_pk" = "i"."master_incident_status_fk")))
          WHERE (("i"."restaurant_fk" = "r"."restaurant_restaurant_pk") AND ("s"."status_code" <> ALL (ARRAY['RESOLVED'::"text", 'CLOSED'::"text", 'REJECTED'::"text"])))) "inc" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "open_support_ticket_count"
           FROM ("public"."support_ticket" "t"
             JOIN "public"."master_support_ticket_status" "s" ON (("s"."master_support_ticket_status_pk" = "t"."master_support_ticket_status_fk")))
          WHERE (("t"."restaurant_fk" = "r"."restaurant_restaurant_pk") AND ("s"."status_code" <> ALL (ARRAY['RESOLVED'::"text", 'CLOSED'::"text", 'REJECTED'::"text"])))) "st" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "open_refund_request_count"
           FROM ("public"."payment_refund" "pr"
             JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "pr"."order_fk")))
          WHERE (("o"."restaurant_fk" = "r"."restaurant_restaurant_pk") AND (COALESCE("pr"."tracking_status_code", 'REQUESTED'::"text") <> ALL (ARRAY['TRACKED_EXTERNALLY'::"text", 'REJECTED'::"text", 'CANCELLED'::"text"])))) "ref" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) FILTER (WHERE ("d"."drop_status_code" = ANY (ARRAY['ACTIVE'::"text", 'SCHEDULED'::"text"]))) AS "active_drop_count",
            "count"(*) FILTER (WHERE ("d"."drop_status_code" = 'PAUSED'::"text")) AS "paused_drop_count"
           FROM "public"."drop_drop" "d"
          WHERE ("d"."restaurant_fk" = "r"."restaurant_restaurant_pk")) "dr" ON (true))
     LEFT JOIN LATERAL ( SELECT "max"("a"."created_at") AS "latest_audit_at"
           FROM "public"."audit_log" "a"
          WHERE ("a"."target_entity_pk" = "r"."restaurant_restaurant_pk")) "aud" ON (true))
  WHERE ("public"."rls_is_platform_user"() OR ("auth"."role"() = 'service_role'::"text"));


ALTER VIEW "public"."api_admin_ops_restaurant_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_ops_restaurant_summary" IS 'Slice 8B admin ops restaurant control-center summary. Platform-admin scoped; no PII, private docs, provider payloads, pickup credentials, or internal note bodies.';



CREATE TABLE IF NOT EXISTS "public"."master_support_ticket_priority" (
    "master_support_ticket_priority_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "priority_code" "text" NOT NULL,
    "priority_name" "text" NOT NULL,
    "description" "text",
    "sla_first_response_minutes" integer,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_support_ticket_priority" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_support_ticket_priority" IS 'Support ticket priority levels with SLA targets. Seed: CRITICAL (30 min, food safety incidents), HIGH (120 min, payment failures), NORMAL (480 min, standard), LOW (2880 min, general queries). sla_first_response_minutes used to compute support_ticket.sla_due_at at ticket creation.';



COMMENT ON COLUMN "public"."master_support_ticket_priority"."sla_first_response_minutes" IS 'Target minutes to first agent response from ticket creation. NULL = no SLA defined. Used to set support_ticket.sla_due_at.';



CREATE TABLE IF NOT EXISTS "public"."master_support_ticket_type" (
    "master_support_ticket_type_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type_code" "text" NOT NULL,
    "type_name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_support_ticket_type" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_support_ticket_type" IS 'Support ticket classification for routing and SLA assignment. Seed: ORDER_ISSUE, REFUND_REQUEST, FOOD_SAFETY, PACKAGING_COMPLAINT, DIETARY_MISMATCH, MISSING_PICKUP, ACCOUNT_ISSUE, RESTAURANT_ONBOARDING, BILLING_QUERY, GENERAL.';



CREATE TABLE IF NOT EXISTS "public"."support_ticket_event" (
    "support_ticket_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "support_ticket_fk" "uuid" NOT NULL,
    "event_type_code" "text" NOT NULL,
    "from_status_fk" "uuid",
    "to_status_fk" "uuid",
    "comment_text" "text",
    "is_internal_note" boolean DEFAULT false NOT NULL,
    "actor_profile_fk" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_ticket_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."support_ticket_event" IS 'APPEND-ONLY support timeline. Events: CREATED, ASSIGNED, STATUS_CHANGED, COMMENT_ADDED, REFUND_LINKED, INCIDENT_LINKED, RESOLVED, CLOSED. is_internal_note=true hides comment from consumer/restaurant portals.';



COMMENT ON COLUMN "public"."support_ticket_event"."is_internal_note" IS 'true = visible only to platform admins/support agents. false = visible to requester/restaurant if policy permits.';



CREATE OR REPLACE VIEW "public"."api_admin_ops_support_queue" WITH ("security_barrier"='true') AS
 SELECT "t"."support_ticket_pk",
    "t"."restaurant_fk",
    "r"."restaurant_name",
    "t"."order_fk",
    "o"."order_number",
    "t"."incident_fk",
    "t"."payment_refund_fk" AS "refund_pk",
    "ty"."type_code",
    "st"."status_code",
    "pr"."priority_code",
    "t"."subject_text",
    "t"."description_text",
    "t"."assigned_to_profile_fk",
    "t"."sla_due_at",
    "t"."resolved_at",
    "latest"."latest_event_at",
    "t"."created_at",
    "t"."updated_at"
   FROM (((((("public"."support_ticket" "t"
     JOIN "public"."master_support_ticket_type" "ty" ON (("ty"."master_support_ticket_type_pk" = "t"."master_support_ticket_type_fk")))
     JOIN "public"."master_support_ticket_status" "st" ON (("st"."master_support_ticket_status_pk" = "t"."master_support_ticket_status_fk")))
     JOIN "public"."master_support_ticket_priority" "pr" ON (("pr"."master_support_ticket_priority_pk" = "t"."master_support_ticket_priority_fk")))
     LEFT JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "t"."restaurant_fk")))
     LEFT JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "t"."order_fk")))
     LEFT JOIN LATERAL ( SELECT "max"("e"."recorded_at") AS "latest_event_at"
           FROM "public"."support_ticket_event" "e"
          WHERE ("e"."support_ticket_fk" = "t"."support_ticket_pk")) "latest" ON (true))
  WHERE ("public"."rls_is_platform_user"() OR ("auth"."role"() = 'service_role'::"text"));


ALTER VIEW "public"."api_admin_ops_support_queue" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_ops_support_queue" IS 'Slice 8B support-safe admin ticket queue. Includes linked entity IDs and status only, not consumer contact lists or internal event bodies.';



CREATE OR REPLACE VIEW "public"."api_admin_payment_order_summary" AS
SELECT
    NULL::"uuid" AS "payment_order_intent_pk",
    NULL::"uuid" AS "hold_pk",
    NULL::"uuid" AS "order_pk",
    NULL::"text" AS "order_number",
    NULL::"text" AS "provider_code",
    NULL::"text" AS "provider_order_ref",
    NULL::"text" AS "payment_intent_status_code",
    NULL::bigint AS "amount_paise",
    NULL::"text" AS "currency_code",
    NULL::"text" AS "order_status_code",
    NULL::"text" AS "payment_status_code",
    NULL::"text" AS "restaurant_name",
    NULL::"text" AS "drop_title",
    NULL::"text" AS "hold_status_code",
    NULL::timestamp with time zone AS "hold_expires_at",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::timestamp with time zone AS "payment_captured_at",
    NULL::bigint AS "transaction_count";


ALTER VIEW "public"."api_admin_payment_order_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_payment_order_summary" IS 'Slice 4B admin support-safe payment/order state. Excludes raw provider payloads, pickup credential hashes, private docs, and consumer PII.';



CREATE TABLE IF NOT EXISTS "public"."payment_webhook_event" (
    "payment_webhook_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_code" "text" DEFAULT 'RAZORPAY'::"text" NOT NULL,
    "provider_event_id" "text" NOT NULL,
    "event_type_code" "text" NOT NULL,
    "signature_verified_flag" boolean DEFAULT false NOT NULL,
    "raw_payload_json" "jsonb" NOT NULL,
    "processing_status_code" "text" DEFAULT 'RECEIVED'::"text" NOT NULL,
    "processed_at" timestamp with time zone,
    "processing_error_text" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_payment_webhook_status" CHECK (("processing_status_code" = ANY (ARRAY['RECEIVED'::"text", 'PROCESSING'::"text", 'PROCESSED'::"text", 'FAILED'::"text", 'IGNORED'::"text"])))
);


ALTER TABLE "public"."payment_webhook_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_webhook_event" IS 'Raw payment provider webhook ledger. Webhook handler MUST insert this row before mutating payment/order state. Unique provider_event_id provides idempotency for webhook replays. signature_verified_flag must be true before processing business effects. processing_status_code, processed_at, and processing_error_text are mutable operational reconciliation fields. Do not delete; retained for financial audit.';



COMMENT ON COLUMN "public"."payment_webhook_event"."raw_payload_json" IS 'Raw provider payload. May contain PII/provider metadata; service-role only.';



COMMENT ON COLUMN "public"."payment_webhook_event"."processing_status_code" IS 'Operational processing state maintained by the webhook handler: RECEIVED -> PROCESSING -> PROCESSED or FAILED/IGNORED.';



CREATE OR REPLACE VIEW "public"."api_admin_payment_webhook_summary" WITH ("security_barrier"='true') AS
 SELECT "payment_webhook_event_pk",
    "provider_code",
    "provider_event_id",
    "event_type_code",
    "signature_verified_flag",
    "processing_status_code",
    "processed_at",
    "processing_error_text",
    "received_at"
   FROM "public"."payment_webhook_event"
  WHERE "public"."rls_is_platform_user"();


ALTER VIEW "public"."api_admin_payment_webhook_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_payment_webhook_summary" IS 'Slice 4B admin support-safe webhook ledger. Raw provider payload is intentionally omitted.';



CREATE TABLE IF NOT EXISTS "public"."catalog_bag_template_allergen" (
    "catalog_bag_template_allergen_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "catalog_bag_template_revision_fk" "uuid" NOT NULL,
    "master_allergen_fk" "uuid" NOT NULL,
    "contains_flag" boolean DEFAULT true NOT NULL,
    "may_contain_flag" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalog_bag_template_allergen" OWNER TO "postgres";


COMMENT ON TABLE "public"."catalog_bag_template_allergen" IS 'SAFETY-CRITICAL allergen disclosure per published bag revision. contains_flag=true means allergen is intentionally present. may_contain_flag=true means cross-contact risk. Consumers with matching consumer_allergen_preference MUST see a prominent warning at detail and checkout.';



COMMENT ON COLUMN "public"."catalog_bag_template_allergen"."contains_flag" IS 'Ingredient intentionally contains this allergen.';



COMMENT ON COLUMN "public"."catalog_bag_template_allergen"."may_contain_flag" IS 'Possible cross-contact / kitchen handling risk. Display as "may contain".';



CREATE TABLE IF NOT EXISTS "public"."master_allergen" (
    "master_allergen_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "allergen_code" "text" NOT NULL,
    "allergen_name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_allergen" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_allergen" IS 'SAFETY-CRITICAL. Controlled allergen registry. Referenced by: consumer_allergen_preference (what a consumer wants to avoid) and catalog_bag_template_allergen (what a bag contains). Stored as a master table NOT as an enum — new allergens added without schema migrations. The drop detail page and order confirmation MUST cross-reference these two tables and surface a prominent warning if the consumer avoids any allergen present in the bag. Seed (FSSAI-listed 14): DAIRY, EGGS, FISH, SHELLFISH, PEANUTS, NUTS, WHEAT_GLUTEN, SOY, SESAME, MUSTARD, CELERY, LUPIN, MOLLUSCS, SULPHITES.';



COMMENT ON COLUMN "public"."master_allergen"."allergen_code" IS 'UPPER_SNAKE_CASE. Referenced by both consumer preference and bag disclosure tables. Example: DAIRY, GLUTEN, NUTS.';



COMMENT ON COLUMN "public"."master_allergen"."sort_order" IS 'Controls display order on allergen chips and preference screens. Common allergens (DAIRY, WHEAT_GLUTEN) get low sort_order.';



CREATE TABLE IF NOT EXISTS "public"."order_item" (
    "order_item_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_fk" "uuid" NOT NULL,
    "drop_fk" "uuid" NOT NULL,
    "catalog_bag_template_revision_fk" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price_paise" bigint NOT NULL,
    "line_total_paise" bigint NOT NULL,
    "snapshot_bag_display_name" "text" NOT NULL,
    "snapshot_dietary_category_code" "text" NOT NULL,
    "snapshot_allergen_summary_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_order_item_price" CHECK ((("unit_price_paise" >= 0) AND ("line_total_paise" >= 0))),
    CONSTRAINT "ck_order_item_qty" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_item" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_item" IS 'Order line items. Launch model is one BAM Bag per order, but table supports future multi-bag checkout. Snapshot fields preserve purchase-time representation. line_total_paise should equal quantity * unit_price_paise (application enforced).';



COMMENT ON COLUMN "public"."order_item"."snapshot_bag_display_name" IS 'Purchase-time bag name copied from catalog_bag_template_revision.display_name.';



COMMENT ON COLUMN "public"."order_item"."snapshot_allergen_summary_text" IS 'Purchase-time allergen disclosure copied from revision.';



CREATE TABLE IF NOT EXISTS "public"."order_pickup_verification_event" (
    "order_pickup_verification_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_fk" "uuid" NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "verifying_profile_fk" "uuid",
    "verification_method_code" "text" NOT NULL,
    "verification_result_code" "text" NOT NULL,
    "idempotency_key" "text",
    "device_label" "text",
    "failure_reason_text" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_pickup_verification_method" CHECK (("verification_method_code" = ANY (ARRAY['QR_SCAN'::"text", 'OTP_ENTRY'::"text", 'OFFLINE_SYNC'::"text", 'ADMIN_OVERRIDE'::"text"]))),
    CONSTRAINT "ck_pickup_verification_result" CHECK (("verification_result_code" = ANY (ARRAY['SUCCESS'::"text", 'INVALID_CODE'::"text", 'WRONG_RESTAURANT'::"text", 'ALREADY_COLLECTED'::"text", 'EXPIRED_WINDOW'::"text", 'ORDER_NOT_READY'::"text", 'OFFLINE_PENDING'::"text"])))
);


ALTER TABLE "public"."order_pickup_verification_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_pickup_verification_event" IS 'APPEND-ONLY. Every pickup verification attempt, successful or failed. Staff app writes one row per QR/OTP scan. Successful verification transitions order to COLLECTED and increments drop.quantity_collected. Failed attempts are retained for fraud/support investigation. OFFLINE_SYNC records cached verification replay when staff app reconnects.';



COMMENT ON COLUMN "public"."order_pickup_verification_event"."verification_method_code" IS 'QR_SCAN, OTP_ENTRY, OFFLINE_SYNC, ADMIN_OVERRIDE.';



COMMENT ON COLUMN "public"."order_pickup_verification_event"."verification_result_code" IS 'SUCCESS, INVALID_CODE, WRONG_RESTAURANT, ALREADY_COLLECTED, EXPIRED_WINDOW, ORDER_NOT_READY, OFFLINE_PENDING.';



COMMENT ON COLUMN "public"."order_pickup_verification_event"."idempotency_key" IS 'Retry/offline sync idempotency key. Unique per order when present. Prevents duplicate collection from staff app retries.';



CREATE TABLE IF NOT EXISTS "public"."payment_order_intent" (
    "payment_order_intent_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_fk" "uuid",
    "drop_inventory_hold_fk" "uuid" NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "provider_code" "text" DEFAULT 'RAZORPAY'::"text" NOT NULL,
    "provider_order_ref" "text",
    "payment_intent_status_code" "text" DEFAULT 'CREATED'::"text" NOT NULL,
    "amount_paise" bigint NOT NULL,
    "currency_code" "text" DEFAULT 'INR'::"text" NOT NULL,
    "idempotency_key" "text",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_payment_order_intent_amount" CHECK (("amount_paise" >= 0)),
    CONSTRAINT "ck_payment_order_intent_provider" CHECK (("provider_code" = 'RAZORPAY'::"text")),
    CONSTRAINT "ck_payment_order_intent_status" CHECK (("payment_intent_status_code" = ANY (ARRAY['CREATED'::"text", 'RAZORPAY_ORDER_CREATED'::"text", 'AUTHORIZED'::"text", 'CAPTURED'::"text", 'FAILED'::"text", 'EXPIRED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."payment_order_intent" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_order_intent" IS 'Order payment intent tied to an inventory hold. Created before Razorpay checkout opens. order_fk is NULL until payment success creates order_order. Payment success webhook must atomically set order_fk and payment_intent_status_code=CAPTURED. idempotency_key protects client retries creating the provider order.';



COMMENT ON COLUMN "public"."payment_order_intent"."provider_order_ref" IS 'Razorpay order_id. Unique when present. Used to correlate webhooks.';



COMMENT ON COLUMN "public"."payment_order_intent"."idempotency_key" IS 'Client/server retry key for creating payment intent. Unique per consumer when present.';



CREATE TABLE IF NOT EXISTS "public"."payment_transaction" (
    "payment_transaction_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_order_intent_fk" "uuid" NOT NULL,
    "provider_code" "text" DEFAULT 'RAZORPAY'::"text" NOT NULL,
    "provider_payment_ref" "text" NOT NULL,
    "transaction_status_code" "text" NOT NULL,
    "amount_paise" bigint NOT NULL,
    "fee_paise" bigint DEFAULT 0 NOT NULL,
    "tax_paise" bigint DEFAULT 0 NOT NULL,
    "payment_method_code" "text",
    "captured_at" timestamp with time zone,
    "provider_payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_payment_transaction_amount" CHECK ((("amount_paise" >= 0) AND ("fee_paise" >= 0) AND ("tax_paise" >= 0))),
    CONSTRAINT "ck_payment_transaction_status" CHECK (("transaction_status_code" = ANY (ARRAY['AUTHORIZED'::"text", 'CAPTURED'::"text", 'FAILED'::"text", 'REFUNDED'::"text", 'PARTIALLY_REFUNDED'::"text"])))
);


ALTER TABLE "public"."payment_transaction" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_transaction" IS 'Concrete Razorpay payment transaction. Written from webhook or verified callback. provider_payload_json stores provider details needed for reconciliation; do not expose to consumers. A payment_order_intent may have multiple transactions if retries/failures occur.';



COMMENT ON COLUMN "public"."payment_transaction"."provider_payment_ref" IS 'Razorpay payment_id. Unique with provider_code.';



COMMENT ON COLUMN "public"."payment_transaction"."payment_method_code" IS 'UPI, CARD, NETBANKING, WALLET, etc. Stored from provider payload.';



CREATE OR REPLACE VIEW "public"."api_admin_pickup_order_summary" WITH ("security_barrier"='true') AS
 SELECT "o"."order_order_pk" AS "order_pk",
    "o"."order_number",
    "o"."restaurant_fk",
    "o"."drop_fk",
    "o"."order_status_code",
    "o"."payment_status_code",
    "o"."snapshot_restaurant_name" AS "restaurant_name",
    "o"."snapshot_drop_title" AS "drop_title",
    "o"."snapshot_bag_display_name" AS "bag_display_name",
    "o"."snapshot_dietary_category_code" AS "dietary_category_code",
    "o"."snapshot_spice_level_code" AS "spice_level_code",
    "o"."snapshot_allergen_summary_text" AS "allergen_summary_text",
    COALESCE("allergens"."allergen_codes", ARRAY[]::"text"[]) AS "allergen_codes",
    "oi"."quantity",
    "o"."total_paise" AS "paid_amount_paise",
    "o"."currency_code",
    "o"."pickup_window_start_at",
    "o"."pickup_window_end_at",
    "i"."payment_intent_status_code",
    "captured"."payment_captured_at",
    "o"."collected_at",
    (COALESCE("verifications"."attempt_count", (0)::bigint))::integer AS "pickup_verification_attempt_count",
    "verifications"."last_result_code" AS "last_pickup_verification_result_code",
    "verifications"."last_recorded_at" AS "last_pickup_verification_at",
    (COALESCE("incidents"."incident_count", (0)::bigint))::integer AS "incident_count",
    "o"."created_at",
    "o"."updated_at",
    "o"."consumer_profile_fk",
    "o"."drop_inventory_hold_fk" AS "hold_pk",
    "i"."provider_order_ref",
    NULL::timestamp with time zone AS "webhook_processed_at",
    NULL::"text" AS "webhook_processing_status_code"
   FROM (((((("public"."order_order" "o"
     LEFT JOIN "public"."order_item" "oi" ON (("oi"."order_fk" = "o"."order_order_pk")))
     LEFT JOIN "public"."payment_order_intent" "i" ON (("i"."order_fk" = "o"."order_order_pk")))
     LEFT JOIN LATERAL ( SELECT "max"("t"."captured_at") AS "payment_captured_at"
           FROM "public"."payment_transaction" "t"
          WHERE (("t"."payment_order_intent_fk" = "i"."payment_order_intent_pk") AND ("t"."transaction_status_code" = 'CAPTURED'::"text"))) "captured" ON (true))
     LEFT JOIN LATERAL ( SELECT "array_agg"("ma"."allergen_code" ORDER BY "ma"."sort_order") AS "allergen_codes"
           FROM (("public"."drop_drop" "d"
             JOIN "public"."catalog_bag_template_allergen" "bta" ON ((("bta"."catalog_bag_template_revision_fk" = "d"."catalog_bag_template_revision_fk") AND ("bta"."contains_flag" OR "bta"."may_contain_flag"))))
             JOIN "public"."master_allergen" "ma" ON (("ma"."master_allergen_pk" = "bta"."master_allergen_fk")))
          WHERE ("d"."drop_drop_pk" = "o"."drop_fk")) "allergens" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "attempt_count",
            ("array_agg"("v"."verification_result_code" ORDER BY "v"."recorded_at" DESC))[1] AS "last_result_code",
            "max"("v"."recorded_at") AS "last_recorded_at"
           FROM "public"."order_pickup_verification_event" "v"
          WHERE ("v"."order_fk" = "o"."order_order_pk")) "verifications" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "incident_count"
           FROM "public"."incident_incident" "inc"
          WHERE ("inc"."order_fk" = "o"."order_order_pk")) "incidents" ON (true))
  WHERE ("public"."rls_is_platform_user"() AND ("o"."order_status_code" = ANY (ARRAY['PAID'::"text", 'CONFIRMED'::"text", 'READY_FOR_PICKUP'::"text", 'COLLECTED'::"text", 'NO_SHOW'::"text", 'PICKUP_EXPIRED'::"text"])));


ALTER VIEW "public"."api_admin_pickup_order_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_pickup_order_summary" IS 'Slice 5 admin support-safe pickup/order summary. Uses truncated app-side display for IDs and omits raw credentials, hashes, payment payloads, private docs, and direct consumer contact fields.';



CREATE TABLE IF NOT EXISTS "public"."catalog_bag_template_revision" (
    "catalog_bag_template_revision_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "catalog_bag_template_fk" "uuid" NOT NULL,
    "revision_number" integer NOT NULL,
    "display_name" "text" NOT NULL,
    "short_description" "text",
    "dietary_category_code" "text" NOT NULL,
    "spice_level_code" "text",
    "serves_min" integer,
    "serves_max" integer,
    "max_holding_minutes" integer,
    "holding_guidance_text" "text",
    "min_menu_value_paise" bigint,
    "suggested_price_paise" bigint,
    "allergen_summary_text" "text",
    "included_item_hint_text" "text",
    "revision_status_code" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_by_profile_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_catalog_bag_revision_dietary" CHECK (("dietary_category_code" = ANY (ARRAY['VEG'::"text", 'NON_VEG'::"text", 'JAIN'::"text", 'EGG_ONLY'::"text"]))),
    CONSTRAINT "ck_catalog_bag_revision_price" CHECK ((("suggested_price_paise" IS NULL) OR ("suggested_price_paise" >= 0))),
    CONSTRAINT "ck_catalog_bag_revision_serves" CHECK ((("serves_min" IS NULL) OR ("serves_max" IS NULL) OR ("serves_min" <= "serves_max"))),
    CONSTRAINT "ck_catalog_bag_revision_spice" CHECK ((("spice_level_code" IS NULL) OR ("spice_level_code" = ANY (ARRAY['MILD'::"text", 'MEDIUM'::"text", 'HOT'::"text", 'EXTRA_HOT'::"text"])))),
    CONSTRAINT "ck_catalog_bag_revision_status" CHECK (("revision_status_code" = ANY (ARRAY['DRAFT'::"text", 'PUBLISHED'::"text", 'RETIRED'::"text"]))),
    CONSTRAINT "ck_catalog_bag_revision_value" CHECK ((("min_menu_value_paise" IS NULL) OR ("min_menu_value_paise" >= 0)))
);


ALTER TABLE "public"."catalog_bag_template_revision" OWNER TO "postgres";


COMMENT ON TABLE "public"."catalog_bag_template_revision" IS 'IMMUTABLE AFTER PUBLISHED in application logic. Customer-facing BAM Bag disclosure. Drops reference this exact revision to preserve what was promised at purchase time. Surprise model: included_item_hint_text may be broad ("chef''s selection of rice + curry") but allergen_summary_text and catalog_bag_template_allergen MUST be truthful and complete. No exact menu item list is required, but safety disclosure is non-negotiable.';



COMMENT ON COLUMN "public"."catalog_bag_template_revision"."display_name" IS 'Customer-facing bag title. Example: "Biryani BAM Bag", "Chef''s Veg Surprise". Snapshotted onto order_order.';



COMMENT ON COLUMN "public"."catalog_bag_template_revision"."short_description" IS 'Short card/detail copy. Must not say "leftover" or "discount". Should preserve premium/off-menu positioning.';



COMMENT ON COLUMN "public"."catalog_bag_template_revision"."dietary_category_code" IS 'VEG, NON_VEG, JAIN, EGG_ONLY. Drives dietary badges and filters. Snapshotted onto order_order.';



COMMENT ON COLUMN "public"."catalog_bag_template_revision"."max_holding_minutes" IS 'Maximum recommended time between preparation and consumption. Used in food-safety display and internal checks.';



COMMENT ON COLUMN "public"."catalog_bag_template_revision"."holding_guidance_text" IS 'Food-safety guidance shown to restaurants/admins and optionally consumers. Example: "Consume within 2 hours of pickup; keep chilled if not eaten immediately."';



COMMENT ON COLUMN "public"."catalog_bag_template_revision"."allergen_summary_text" IS 'Human-readable allergen disclosure shown on drop detail and order confirmation. Must match catalog_bag_template_allergen rows.';



COMMENT ON COLUMN "public"."catalog_bag_template_revision"."included_item_hint_text" IS 'Surprise-safe description. Example: "Includes a rice item and chef-selected side." Never promises exact items unless restaurant guarantees them.';



CREATE OR REPLACE VIEW "public"."api_restaurant_roi_drop_detail" WITH ("security_barrier"='true') AS
 SELECT "d"."restaurant_fk",
    "r"."restaurant_name",
    "d"."drop_drop_pk" AS "drop_pk",
    "d"."drop_title",
    "rev"."display_name" AS "bag_display_name",
    "d"."drop_status_code",
    "d"."pickup_start_at",
    "d"."pickup_end_at",
    "d"."quantity_total" AS "quantity_listed",
    COALESCE("order_metrics"."quantity_sold", 0) AS "quantity_sold",
    COALESCE("order_metrics"."quantity_collected", 0) AS "quantity_collected",
    COALESCE("order_metrics"."no_show_count", 0) AS "no_show_count",
    COALESCE("order_metrics"."open_pickup_order_count", 0) AS "open_pickup_order_count",
        CASE
            WHEN ("d"."quantity_total" > 0) THEN ("round"((((COALESCE("order_metrics"."quantity_sold", 0))::numeric * (10000)::numeric) / ("d"."quantity_total")::numeric)))::integer
            ELSE NULL::integer
        END AS "sell_through_bps",
    COALESCE("order_metrics"."gmv_paise", (0)::bigint) AS "gmv_paise",
    GREATEST((((COALESCE("order_metrics"."gmv_paise", (0)::bigint) - COALESCE("order_metrics"."refund_debit_paise", (0)::bigint)) - COALESCE("order_metrics"."payment_fee_paise", (0)::bigint)) - COALESCE("order_metrics"."payment_tax_paise", (0)::bigint)), (0)::bigint) AS "estimated_net_recovery_paise",
    COALESCE("order_metrics"."refund_debit_paise", (0)::bigint) AS "refund_debit_paise",
    COALESCE("order_metrics"."payment_fee_paise", (0)::bigint) AS "payment_fee_paise",
    COALESCE("order_metrics"."payment_tax_paise", (0)::bigint) AS "payment_tax_paise",
    COALESCE("order_metrics"."incident_count", 0) AS "incident_count",
    COALESCE("order_metrics"."first_time_buyer_count", 0) AS "first_time_buyer_count",
    COALESCE("order_metrics"."repeat_buyer_count", 0) AS "repeat_buyer_count",
    "order_metrics"."settlement_run_pk",
    "order_metrics"."settlement_status_code",
    "order_metrics"."latest_order_created_at",
    "d"."updated_at"
   FROM ((("public"."drop_drop" "d"
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "d"."restaurant_fk")))
     JOIN "public"."catalog_bag_template_revision" "rev" ON (("rev"."catalog_bag_template_revision_pk" = "d"."catalog_bag_template_revision_fk")))
     LEFT JOIN LATERAL ( WITH "paid_orders" AS (
                 SELECT "o"."order_order_pk",
                    "o"."order_number",
                    "o"."consumer_profile_fk",
                    "o"."order_status_code",
                    "o"."total_paise",
                    "o"."created_at",
                    COALESCE("oi"."quantity", 1) AS "quantity",
                    COALESCE("tx"."payment_fee_paise", (0)::bigint) AS "payment_fee_paise",
                    COALESCE("tx"."payment_tax_paise", (0)::bigint) AS "payment_tax_paise",
                    COALESCE("refunds"."refund_debit_paise", (0)::bigint) AS "refund_debit_paise",
                    COALESCE("incidents"."incident_count", 0) AS "incident_count",
                    (EXISTS ( SELECT 1
                           FROM "public"."order_order" "prior"
                          WHERE (("prior"."restaurant_fk" = "o"."restaurant_fk") AND ("prior"."consumer_profile_fk" = "o"."consumer_profile_fk") AND ("prior"."payment_status_code" = 'CAPTURED'::"text") AND ("prior"."created_at" < "o"."created_at")))) AS "is_repeat_buyer"
                   FROM (((("public"."order_order" "o"
                     LEFT JOIN "public"."order_item" "oi" ON (("oi"."order_fk" = "o"."order_order_pk")))
                     LEFT JOIN LATERAL ( SELECT ("sum"(COALESCE("pt"."fee_paise", (0)::bigint)))::bigint AS "payment_fee_paise",
                            ("sum"(COALESCE("pt"."tax_paise", (0)::bigint)))::bigint AS "payment_tax_paise"
                           FROM ("public"."payment_order_intent" "pi"
                             JOIN "public"."payment_transaction" "pt" ON ((("pt"."payment_order_intent_fk" = "pi"."payment_order_intent_pk") AND ("pt"."transaction_status_code" = 'CAPTURED'::"text"))))
                          WHERE ("pi"."order_fk" = "o"."order_order_pk")) "tx" ON (true))
                     LEFT JOIN LATERAL ( SELECT ("sum"("pr"."amount_paise"))::bigint AS "refund_debit_paise"
                           FROM "public"."payment_refund" "pr"
                          WHERE (("pr"."order_fk" = "o"."order_order_pk") AND ("pr"."refund_status_code" = ANY (ARRAY['PROCESSING'::"text", 'SUCCEEDED'::"text"])))) "refunds" ON (true))
                     LEFT JOIN LATERAL ( SELECT ("count"(*))::integer AS "incident_count"
                           FROM "public"."incident_incident" "inc"
                          WHERE ("inc"."order_fk" = "o"."order_order_pk")) "incidents" ON (true))
                  WHERE (("o"."drop_fk" = "d"."drop_drop_pk") AND ("o"."payment_status_code" = 'CAPTURED'::"text"))
                )
         SELECT ("sum"("po"."quantity"))::integer AS "quantity_sold",
            ("sum"("po"."quantity") FILTER (WHERE ("po"."order_status_code" = 'COLLECTED'::"text")))::integer AS "quantity_collected",
            ("count"(*) FILTER (WHERE ("po"."order_status_code" = 'NO_SHOW'::"text")))::integer AS "no_show_count",
            ("count"(*) FILTER (WHERE (("po"."order_status_code" <> ALL (ARRAY['COLLECTED'::"text", 'NO_SHOW'::"text", 'CANCELLED'::"text", 'REFUNDED'::"text", 'PICKUP_EXPIRED'::"text"])) AND ("d"."pickup_end_at" > "now"()))))::integer AS "open_pickup_order_count",
            ("sum"("po"."total_paise"))::bigint AS "gmv_paise",
            ("sum"("po"."refund_debit_paise"))::bigint AS "refund_debit_paise",
            ("sum"("po"."payment_fee_paise"))::bigint AS "payment_fee_paise",
            ("sum"("po"."payment_tax_paise"))::bigint AS "payment_tax_paise",
            ("sum"("po"."incident_count"))::integer AS "incident_count",
            ("count"(DISTINCT "po"."consumer_profile_fk") FILTER (WHERE (NOT "po"."is_repeat_buyer")))::integer AS "first_time_buyer_count",
            ("count"(DISTINCT "po"."consumer_profile_fk") FILTER (WHERE "po"."is_repeat_buyer"))::integer AS "repeat_buyer_count",
            ("array_agg"("sr"."finance_settlement_run_pk" ORDER BY "sr"."locked_at" DESC NULLS LAST, "sr"."updated_at" DESC) FILTER (WHERE ("sr"."finance_settlement_run_pk" IS NOT NULL)))[1] AS "settlement_run_pk",
            ("array_agg"("sr"."settlement_status_code" ORDER BY "sr"."locked_at" DESC NULLS LAST, "sr"."updated_at" DESC) FILTER (WHERE ("sr"."finance_settlement_run_pk" IS NOT NULL)))[1] AS "settlement_status_code",
            "max"("po"."created_at") AS "latest_order_created_at"
           FROM (("paid_orders" "po"
             LEFT JOIN "public"."finance_restaurant_payout_entry" "e" ON ((("e"."order_fk" = "po"."order_order_pk") AND ("e"."entry_type_code" = 'ORDER_GROSS'::"text"))))
             LEFT JOIN "public"."finance_settlement_run" "sr" ON ((("sr"."finance_settlement_run_pk" = "e"."finance_settlement_run_fk") AND ("sr"."settlement_status_code" <> 'CANCELLED'::"text"))))) "order_metrics" ON (true))
  WHERE ("public"."rls_has_restaurant_access"("d"."restaurant_fk") OR "public"."rls_is_platform_user"());


ALTER VIEW "public"."api_restaurant_roi_drop_detail" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_restaurant_roi_drop_detail" IS 'Slice 8A restaurant-safe ROI drop detail. Scoped to active restaurant membership and excludes consumer PII, provider payloads, pickup credentials, and private documents.';



CREATE OR REPLACE VIEW "public"."api_admin_roi_drop_detail" WITH ("security_barrier"='true') AS
 SELECT "restaurant_fk",
    "restaurant_name",
    "drop_pk",
    "drop_title",
    "bag_display_name",
    "drop_status_code",
    "pickup_start_at",
    "pickup_end_at",
    "quantity_listed",
    "quantity_sold",
    "quantity_collected",
    "no_show_count",
    "open_pickup_order_count",
    "sell_through_bps",
    "gmv_paise",
    "estimated_net_recovery_paise",
    "refund_debit_paise",
    "payment_fee_paise",
    "payment_tax_paise",
    "incident_count",
    "first_time_buyer_count",
    "repeat_buyer_count",
    "settlement_run_pk",
    "settlement_status_code",
    "latest_order_created_at",
    "updated_at"
   FROM "public"."api_restaurant_roi_drop_detail"
  WHERE "public"."rls_is_platform_user"();


ALTER VIEW "public"."api_admin_roi_drop_detail" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_roi_drop_detail" IS 'Slice 8A admin ROI drop detail. Platform-admin scoped, support-safe, and read-only.';



CREATE OR REPLACE VIEW "public"."api_restaurant_roi_report_note" WITH ("security_barrier"='true') AS
 SELECT "inc"."incident_incident_pk" AS "row_pk",
    "inc"."restaurant_fk",
    "r"."restaurant_name",
    "inc"."order_fk" AS "order_pk",
    "o"."order_number",
    "o"."drop_fk",
    'INCIDENT'::"text" AS "note_type_code",
    "mis"."severity_code",
    "mst"."status_code",
    NULL::bigint AS "amount_paise",
    "inc"."title_text",
    "inc"."description_text",
    COALESCE("inc"."occurred_at", "inc"."created_at") AS "occurred_at"
   FROM (((("public"."incident_incident" "inc"
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "inc"."restaurant_fk")))
     LEFT JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "inc"."order_fk")))
     JOIN "public"."master_incident_severity" "mis" ON (("mis"."master_incident_severity_pk" = "inc"."master_incident_severity_fk")))
     JOIN "public"."master_incident_status" "mst" ON (("mst"."master_incident_status_pk" = "inc"."master_incident_status_fk")))
  WHERE (("inc"."restaurant_fk" IS NOT NULL) AND ("public"."rls_has_restaurant_access"("inc"."restaurant_fk") OR "public"."rls_is_platform_user"()))
UNION ALL
 SELECT "pr"."payment_refund_pk" AS "row_pk",
    "o"."restaurant_fk",
    "r"."restaurant_name",
    "o"."order_order_pk" AS "order_pk",
    "o"."order_number",
    "o"."drop_fk",
    'REFUND'::"text" AS "note_type_code",
    NULL::"text" AS "severity_code",
    "pr"."refund_status_code" AS "status_code",
    "pr"."amount_paise",
    "concat"('Refund/debit: ', "pr"."refund_reason_code") AS "title_text",
        CASE
            WHEN ("pr"."refund_status_code" = 'SUCCEEDED'::"text") THEN 'Refund/debit succeeded and is included in report deductions.'::"text"
            WHEN ("pr"."refund_status_code" = 'PROCESSING'::"text") THEN 'Refund/debit is processing and shown for partner review.'::"text"
            ELSE 'Refund/debit request is visible for support review.'::"text"
        END AS "description_text",
    COALESCE("pr"."processed_at", "pr"."requested_at", "pr"."created_at") AS "occurred_at"
   FROM (("public"."payment_refund" "pr"
     JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "pr"."order_fk")))
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "o"."restaurant_fk")))
  WHERE (("pr"."refund_status_code" = ANY (ARRAY['PROCESSING'::"text", 'SUCCEEDED'::"text"])) AND ("public"."rls_has_restaurant_access"("o"."restaurant_fk") OR "public"."rls_is_platform_user"()));


ALTER VIEW "public"."api_restaurant_roi_report_note" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_restaurant_roi_report_note" IS 'Slice 8A restaurant-safe incident/refund note rows for partner ROI reports. Excludes internal notes, consumer contact data, provider payloads, and secrets.';



CREATE OR REPLACE VIEW "public"."api_admin_roi_report_note" WITH ("security_barrier"='true') AS
 SELECT "row_pk",
    "restaurant_fk",
    "restaurant_name",
    "order_pk",
    "order_number",
    "drop_fk",
    "note_type_code",
    "severity_code",
    "status_code",
    "amount_paise",
    "title_text",
    "description_text",
    "occurred_at"
   FROM "public"."api_restaurant_roi_report_note"
  WHERE "public"."rls_is_platform_user"();


ALTER VIEW "public"."api_admin_roi_report_note" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_admin_roi_report_note" IS 'Slice 8A admin incident/refund note rows for ROI review. Support-safe and read-only.';



CREATE TABLE IF NOT EXISTS "public"."drop_inventory_hold" (
    "drop_inventory_hold_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drop_fk" "uuid" NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "hold_status_code" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "idempotency_key" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "converted_order_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_drop_inventory_hold_qty" CHECK (("quantity" > 0)),
    CONSTRAINT "ck_drop_inventory_hold_status" CHECK (("hold_status_code" = ANY (ARRAY['ACTIVE'::"text", 'CONVERTED'::"text", 'EXPIRED'::"text", 'RELEASED'::"text"])))
);


ALTER TABLE "public"."drop_inventory_hold" OWNER TO "postgres";


COMMENT ON TABLE "public"."drop_inventory_hold" IS 'Temporary inventory reservation created when consumer taps Claim. High-contention write path: API MUST create hold in the same DB transaction that locks drop_drop row and increments quantity_reserved. hold_status_code: ACTIVE → CONVERTED after payment success/order creation; ACTIVE → EXPIRED by cleanup job; ACTIVE → RELEASED if user cancels. expires_at is calculated from drop_drop.hold_duration_minutes.';



COMMENT ON COLUMN "public"."drop_inventory_hold"."idempotency_key" IS 'Client/API retry key for hold creation. Unique per consumer when present. Prevents duplicate active holds on network retry.';



COMMENT ON COLUMN "public"."drop_inventory_hold"."expires_at" IS 'Cleanup job expires ACTIVE holds where expires_at < now(), decrements drop.quantity_reserved, appends inventory event.';



CREATE TABLE IF NOT EXISTS "public"."geo_neighborhood" (
    "geo_neighborhood_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "geo_city_fk" "uuid" NOT NULL,
    "neighborhood_code" "text" NOT NULL,
    "neighborhood_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."geo_neighborhood" OWNER TO "postgres";


COMMENT ON TABLE "public"."geo_neighborhood" IS 'Sub-city areas for drop discovery filtering. Primary consumer discovery path: city → neighborhood → drops. Seed HYD: JUBILEE_HILLS, BANJARA_HILLS, GACHIBOWLI, KONDAPUR, HITECH_CITY, MADHAPUR, BEGUMPET, AMEERPET, SECUNDERABAD, TOLICHOWKI, KUKATPALLY.';



COMMENT ON COLUMN "public"."geo_neighborhood"."neighborhood_code" IS 'UPPER_SNAKE_CASE unique within a city. Used as /drops filter parameter.';



CREATE OR REPLACE VIEW "public"."api_claim_hold_summary" WITH ("security_barrier"='true') AS
 SELECT "h"."drop_inventory_hold_pk" AS "hold_pk",
    "h"."drop_fk" AS "drop_pk",
    "h"."consumer_profile_fk",
    "h"."hold_status_code",
    "h"."quantity" AS "quantity_held",
    "h"."expires_at",
    "h"."created_at" AS "hold_created_at",
    "h"."updated_at" AS "hold_updated_at",
    "d"."drop_title",
    "d"."drop_status_code",
    "d"."drop_type_code",
    "d"."quantity_total",
    "d"."computed_quantity_available" AS "quantity_available",
    "d"."price_paise",
    "d"."pickup_start_at",
    "d"."pickup_end_at",
    "r"."restaurant_restaurant_pk" AS "restaurant_pk",
    "r"."restaurant_slug",
    "r"."restaurant_name",
    "gn"."neighborhood_name",
    "rev"."catalog_bag_template_revision_pk",
    "rev"."display_name" AS "bag_display_name",
    "rev"."short_description" AS "bag_short_description",
    "rev"."dietary_category_code",
    "rev"."spice_level_code",
    "rev"."serves_min",
    "rev"."serves_max",
    "rev"."max_holding_minutes",
    "rev"."holding_guidance_text",
    "rev"."min_menu_value_paise",
    "rev"."allergen_summary_text",
    COALESCE("array_remove"("array_agg"("ma"."allergen_code" ORDER BY "ma"."sort_order") FILTER (WHERE ("ma"."allergen_code" IS NOT NULL)), NULL::"text"), ARRAY[]::"text"[]) AS "allergen_codes"
   FROM (((((("public"."drop_inventory_hold" "h"
     JOIN "public"."drop_drop" "d" ON (("d"."drop_drop_pk" = "h"."drop_fk")))
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "d"."restaurant_fk")))
     JOIN "public"."catalog_bag_template_revision" "rev" ON (("rev"."catalog_bag_template_revision_pk" = "d"."catalog_bag_template_revision_fk")))
     LEFT JOIN "public"."geo_neighborhood" "gn" ON (("gn"."geo_neighborhood_pk" = "d"."geo_neighborhood_fk")))
     LEFT JOIN "public"."catalog_bag_template_allergen" "bta" ON ((("bta"."catalog_bag_template_revision_fk" = "rev"."catalog_bag_template_revision_pk") AND ("bta"."contains_flag" OR "bta"."may_contain_flag"))))
     LEFT JOIN "public"."master_allergen" "ma" ON (("ma"."master_allergen_pk" = "bta"."master_allergen_fk")))
  WHERE ("public"."rls_is_consumer_profile"("h"."consumer_profile_fk") OR "public"."rls_has_restaurant_access"("d"."restaurant_fk") OR "public"."rls_is_platform_user"())
  GROUP BY "h"."drop_inventory_hold_pk", "h"."drop_fk", "h"."consumer_profile_fk", "h"."hold_status_code", "h"."quantity", "h"."expires_at", "h"."created_at", "h"."updated_at", "d"."drop_title", "d"."drop_status_code", "d"."drop_type_code", "d"."quantity_total", "d"."computed_quantity_available", "d"."price_paise", "d"."pickup_start_at", "d"."pickup_end_at", "r"."restaurant_restaurant_pk", "r"."restaurant_slug", "r"."restaurant_name", "gn"."neighborhood_name", "rev"."catalog_bag_template_revision_pk", "rev"."display_name", "rev"."short_description", "rev"."dietary_category_code", "rev"."spice_level_code", "rev"."serves_min", "rev"."serves_max", "rev"."max_holding_minutes", "rev"."holding_guidance_text", "rev"."min_menu_value_paise", "rev"."allergen_summary_text";


ALTER VIEW "public"."api_claim_hold_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_claim_hold_summary" IS 'Slice 4A safe hold/order-intent read model. Consumers see their own holds, restaurant users see holds for their restaurant, and platform admins see launch support metadata. No payment, pickup QR, private compliance, or provider data is exposed.';



CREATE OR REPLACE VIEW "public"."api_consumer_notification_summary" WITH ("security_barrier"='true') AS
 SELECT "n"."notification_outbox_pk",
    "n"."business_context_fk" AS "order_pk",
    "o"."order_number",
    "o"."restaurant_fk",
    "o"."snapshot_restaurant_name" AS "restaurant_name",
    COALESCE("n"."template_code", "t"."template_code") AS "template_code",
    "n"."recipient_audience_code" AS "audience_code",
    "n"."channel_code",
    "n"."send_status_code",
    "n"."provider_code",
    "n"."delivery_reason_code",
    "n"."scheduled_at",
    "n"."sent_at",
    "n"."next_attempt_at",
    "n"."retry_count",
    "n"."max_attempts",
    "a"."attempt_status_code" AS "last_attempt_status_code",
    "a"."attempted_at" AS "last_attempt_at",
    "n"."last_error_code",
        CASE
            WHEN ("n"."send_status_code" = ANY (ARRAY['FAILED'::"text", 'SUPPRESSED'::"text", 'CANCELLED'::"text"])) THEN "n"."last_error_text"
            ELSE NULL::"text"
        END AS "last_error_text",
    NULL::"text" AS "manual_fallback_text",
    "n"."created_at",
    "n"."updated_at"
   FROM ((("public"."notification_outbox" "n"
     LEFT JOIN "public"."notification_template" "t" ON (("t"."notification_template_pk" = "n"."notification_template_fk")))
     LEFT JOIN "public"."order_order" "o" ON ((("o"."order_order_pk" = "n"."business_context_fk") AND ("n"."business_context_type_code" = 'ORDER'::"text"))))
     LEFT JOIN LATERAL ( SELECT "notification_delivery_attempt"."attempt_status_code",
            "notification_delivery_attempt"."attempted_at"
           FROM "public"."notification_delivery_attempt"
          WHERE ("notification_delivery_attempt"."notification_outbox_fk" = "n"."notification_outbox_pk")
          ORDER BY "notification_delivery_attempt"."attempted_at" DESC, "notification_delivery_attempt"."attempt_number" DESC
         LIMIT 1) "a" ON (true))
  WHERE (("n"."recipient_audience_code" = 'CONSUMER'::"text") AND ("n"."business_context_type_code" = 'ORDER'::"text") AND "public"."rls_is_consumer_profile"("o"."consumer_profile_fk"));


ALTER VIEW "public"."api_consumer_notification_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."api_consumer_order_history" WITH ("security_barrier"='true') AS
 SELECT "order_order_pk",
    "order_number",
    "order_status_code",
    "payment_status_code",
    "snapshot_restaurant_name",
    "snapshot_restaurant_slug",
    "snapshot_drop_title",
    "pickup_window_start_at",
    "pickup_window_end_at",
    "snapshot_dietary_category_code",
    "snapshot_spice_level_code",
    "snapshot_allergen_summary_text",
    "total_paise",
    ("pickup_qr_nonce_hash" IS NOT NULL) AS "has_pickup_qr",
    "computed_pickup_ready_flag",
    "created_at",
    "updated_at"
   FROM "public"."order_order" "o"
  WHERE ("consumer_profile_fk" = "public"."rls_current_consumer_profile_pk"());


ALTER VIEW "public"."api_consumer_order_history" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_consumer_order_history" IS 'Authenticated consumer order history/read model for app and PWA account pages.';



CREATE OR REPLACE VIEW "public"."api_consumer_order_summary" AS
SELECT
    NULL::"uuid" AS "order_pk",
    NULL::"text" AS "order_number",
    NULL::"uuid" AS "consumer_profile_fk",
    NULL::"uuid" AS "restaurant_fk",
    NULL::"uuid" AS "drop_fk",
    NULL::"uuid" AS "hold_pk",
    NULL::"text" AS "order_status_code",
    NULL::"text" AS "payment_status_code",
    NULL::"text" AS "restaurant_name",
    NULL::"text" AS "restaurant_slug",
    NULL::"text" AS "drop_title",
    NULL::"text" AS "bag_display_name",
    NULL::"text" AS "dietary_category_code",
    NULL::"text" AS "spice_level_code",
    NULL::"text" AS "allergen_summary_text",
    NULL::"text"[] AS "allergen_codes",
    NULL::"text" AS "serves_text",
    NULL::"text" AS "pickup_instructions",
    NULL::integer AS "quantity",
    NULL::bigint AS "unit_price_paise",
    NULL::bigint AS "paid_amount_paise",
    NULL::"text" AS "currency_code",
    NULL::timestamp with time zone AS "pickup_window_start_at",
    NULL::timestamp with time zone AS "pickup_window_end_at",
    NULL::boolean AS "has_pickup_qr",
    NULL::boolean AS "has_pickup_otp",
    NULL::"uuid" AS "payment_order_intent_pk",
    NULL::"text" AS "provider_order_ref",
    NULL::"text" AS "payment_intent_status_code",
    NULL::timestamp with time zone AS "payment_captured_at",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::timestamp with time zone AS "collected_at";


ALTER VIEW "public"."api_consumer_order_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_consumer_order_summary" IS 'Slice 4B consumer-safe paid order read model. Exposes order facts and support-safe payment state but never raw provider payloads or pickup credential hashes.';



CREATE TABLE IF NOT EXISTS "public"."geo_city" (
    "geo_city_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city_code" "text" NOT NULL,
    "city_name" "text" NOT NULL,
    "state_name" "text" NOT NULL,
    "country_code" "text" DEFAULT 'IN'::"text" NOT NULL,
    "currency_code" "text" DEFAULT 'INR'::"text" NOT NULL,
    "timezone_name" "text" DEFAULT 'Asia/Kolkata'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."geo_city" OWNER TO "postgres";


COMMENT ON TABLE "public"."geo_city" IS 'Cities where goZaika operates or plans to operate. First launch city: HYD (Hyderabad). New cities configured here before any restaurant or drop can be associated with them. is_active=false means city is configured but not yet publicly launched; drops in this city are excluded from consumer discovery. city_code used as URL segment (/cities/hyd) and in config_runtime_setting scope filtering.';



COMMENT ON COLUMN "public"."geo_city"."city_code" IS 'Short UPPER_CASE code. Immutable once drops or restaurants exist. Seed: HYD. Future: BLR, MUM, DEL.';



COMMENT ON COLUMN "public"."geo_city"."timezone_name" IS 'IANA timezone. Used to interpret pickup windows and schedule notifications. Default: Asia/Kolkata.';



COMMENT ON COLUMN "public"."geo_city"."is_active" IS 'false = city pre-configured but not yet launched. Flip to true at city launch event.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_public_profile" (
    "restaurant_public_profile_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "headline" "text",
    "story_markdown" "text",
    "hero_storage_object_fk" "uuid",
    "logo_storage_object_fk" "uuid",
    "is_featured" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."restaurant_public_profile" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_public_profile" IS 'Public-facing restaurant profile content: story, hero image, logo, feature flag. Published only when restaurant_status_code=ACTIVE and published_at is not null. Used by /restaurants/[slug] and SEO city pages. This separates editorial/marketing content from operational restaurant_restaurant data.';



COMMENT ON COLUMN "public"."restaurant_public_profile"."story_markdown" IS 'Markdown story shown on public profile. Sanitise server-side before rendering. Restaurant dignity matters: copy should not frame bags as leftovers.';



COMMENT ON COLUMN "public"."restaurant_public_profile"."is_featured" IS 'When true, eligible for homepage/city page featured restaurant carousel. Final placement controlled by CMS rules.';



CREATE OR REPLACE VIEW "public"."api_public_drop_card" WITH ("security_barrier"='true') AS
 SELECT "d"."drop_drop_pk",
    "d"."drop_drop_pk" AS "drop_id",
    "d"."drop_title",
    "d"."drop_status_code",
    "d"."drop_type_code",
    "d"."quantity_total",
    "d"."computed_quantity_available",
    "d"."computed_quantity_available" AS "available_quantity",
    "d"."price_paise",
    "d"."pickup_start_at",
    "d"."pickup_end_at",
    "d"."geo_city_fk",
    "gc"."city_code",
    "gc"."city_name",
    "gn"."neighborhood_name",
    "r"."restaurant_restaurant_pk",
    "r"."restaurant_slug",
    "r"."restaurant_name",
    "rp"."headline" AS "restaurant_headline",
    "rp"."hero_storage_object_fk",
    "rev"."catalog_bag_template_revision_pk",
    "rev"."display_name" AS "bag_display_name",
    "rev"."short_description" AS "bag_short_description",
    "rev"."dietary_category_code",
    "rev"."spice_level_code",
    "rev"."serves_min",
    "rev"."serves_max",
    "rev"."max_holding_minutes",
    "rev"."holding_guidance_text",
    "rev"."min_menu_value_paise",
    "rev"."allergen_summary_text",
    COALESCE("array_remove"("array_agg"("ma"."allergen_code" ORDER BY "ma"."sort_order") FILTER (WHERE ("ma"."allergen_code" IS NOT NULL)), NULL::"text"), ARRAY[]::"text"[]) AS "allergen_codes"
   FROM ((((((("public"."drop_drop" "d"
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "d"."restaurant_fk")))
     JOIN "public"."catalog_bag_template_revision" "rev" ON (("rev"."catalog_bag_template_revision_pk" = "d"."catalog_bag_template_revision_fk")))
     JOIN "public"."geo_city" "gc" ON (("gc"."geo_city_pk" = "d"."geo_city_fk")))
     LEFT JOIN "public"."restaurant_public_profile" "rp" ON (("rp"."restaurant_fk" = "r"."restaurant_restaurant_pk")))
     LEFT JOIN "public"."geo_neighborhood" "gn" ON (("gn"."geo_neighborhood_pk" = "d"."geo_neighborhood_fk")))
     LEFT JOIN "public"."catalog_bag_template_allergen" "bta" ON ((("bta"."catalog_bag_template_revision_fk" = "rev"."catalog_bag_template_revision_pk") AND ("bta"."contains_flag" OR "bta"."may_contain_flag"))))
     LEFT JOIN "public"."master_allergen" "ma" ON (("ma"."master_allergen_pk" = "bta"."master_allergen_fk")))
  WHERE "public"."rls_drop_is_public"("d"."drop_drop_pk")
  GROUP BY "d"."drop_drop_pk", "d"."drop_title", "d"."drop_status_code", "d"."drop_type_code", "d"."quantity_total", "d"."computed_quantity_available", "d"."price_paise", "d"."pickup_start_at", "d"."pickup_end_at", "d"."geo_city_fk", "gc"."city_code", "gc"."city_name", "gn"."neighborhood_name", "r"."restaurant_restaurant_pk", "r"."restaurant_slug", "r"."restaurant_name", "rp"."headline", "rp"."hero_storage_object_fk", "rev"."catalog_bag_template_revision_pk", "rev"."display_name", "rev"."short_description", "rev"."dietary_category_code", "rev"."spice_level_code", "rev"."serves_min", "rev"."serves_max", "rev"."max_holding_minutes", "rev"."holding_guidance_text", "rev"."min_menu_value_paise", "rev"."allergen_summary_text";


ALTER VIEW "public"."api_public_drop_card" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_public_drop_card" IS 'Safe public discovery card/detail shape for Slice 3. Includes canonical app columns plus operator-friendly drop_id and available_quantity aliases.';



CREATE OR REPLACE VIEW "public"."api_public_restaurant_profile" WITH ("security_barrier"='true') AS
 SELECT "r"."restaurant_restaurant_pk",
    "r"."restaurant_slug",
    "r"."restaurant_name",
    "r"."average_rating",
    "r"."rating_count",
    "r"."geo_city_fk",
    "gc"."city_name",
    "r"."geo_neighborhood_fk",
    "gn"."neighborhood_name",
    "r"."pickup_instructions",
    "rp"."headline",
    "rp"."story_markdown",
    "rp"."hero_storage_object_fk",
    "rp"."logo_storage_object_fk",
    "rp"."is_featured",
    "rp"."published_at"
   FROM ((("public"."restaurant_restaurant" "r"
     LEFT JOIN "public"."restaurant_public_profile" "rp" ON (("rp"."restaurant_fk" = "r"."restaurant_restaurant_pk")))
     LEFT JOIN "public"."geo_city" "gc" ON (("gc"."geo_city_pk" = "r"."geo_city_fk")))
     LEFT JOIN "public"."geo_neighborhood" "gn" ON (("gn"."geo_neighborhood_pk" = "r"."geo_neighborhood_fk")))
  WHERE "public"."rls_restaurant_is_public"("r"."restaurant_restaurant_pk");


ALTER VIEW "public"."api_public_restaurant_profile" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_public_restaurant_profile" IS 'Safe public restaurant profile for /restaurants/[slug]. Excludes private contact, legal, compliance, payout, and team data.';



CREATE OR REPLACE VIEW "public"."api_restaurant_finance_settlement_detail" WITH ("security_barrier"='true') AS
 SELECT "e"."finance_restaurant_payout_entry_pk" AS "payout_entry_pk",
    "e"."finance_settlement_run_fk" AS "settlement_run_pk",
    "e"."restaurant_fk",
    "e"."order_fk",
    "e"."order_number",
    "e"."payment_refund_fk",
    "e"."entry_type_code",
    "e"."amount_paise",
    "e"."description_text",
    "e"."commission_bps",
    "e"."commission_plan_code",
    "e"."source_status_code",
    "o"."pickup_window_end_at",
    "o"."snapshot_bag_display_name" AS "bag_display_name",
    "o"."total_paise" AS "order_total_paise",
    "e"."created_at"
   FROM (("public"."finance_restaurant_payout_entry" "e"
     JOIN "public"."finance_settlement_run" "sr" ON (("sr"."finance_settlement_run_pk" = "e"."finance_settlement_run_fk")))
     LEFT JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "e"."order_fk")))
  WHERE "public"."rls_has_restaurant_access"("e"."restaurant_fk");


ALTER VIEW "public"."api_restaurant_finance_settlement_detail" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_restaurant_finance_settlement_detail" IS 'Restaurant-safe settlement line detail scoped to own restaurant. Shows order numbers and accounting entries, not consumer contact data or provider payloads.';



CREATE OR REPLACE VIEW "public"."api_restaurant_finance_settlement_summary" WITH ("security_barrier"='true') AS
 SELECT "sr"."finance_settlement_run_pk" AS "settlement_run_pk",
    "sr"."restaurant_fk",
    "r"."restaurant_name",
    "sr"."period_start_at",
    "sr"."period_end_at",
    "sr"."settlement_status_code",
    "sr"."order_count",
    "sr"."excluded_order_count",
    "sr"."gross_sales_paise",
    "sr"."refund_paise",
    "sr"."commission_paise",
    "sr"."payment_fee_paise",
    "sr"."tax_paise",
    "sr"."adjustment_paise",
    "sr"."net_payout_paise",
    "sr"."locked_at",
    "sr"."paid_at",
    "sr"."reconciled_at",
    "sr"."cancelled_at",
    "sr"."status_note_text",
    "sr"."payout_provider_reference_text",
    "pa"."payout_account_status_code",
    "public"."api_finance_payout_account_mask"("pa"."masked_account_number", "pa"."payout_account_status_code") AS "masked_payout_account",
    "inv"."finance_invoice_pk" AS "invoice_pk",
    "inv"."invoice_number",
    "inv"."invoice_status_code",
    "inv"."invoice_amount_paise",
    "inv"."issued_at" AS "invoice_issued_at",
    "inv"."download_safe_filename",
    "sr"."created_at",
    "sr"."updated_at"
   FROM ((("public"."finance_settlement_run" "sr"
     JOIN "public"."restaurant_restaurant" "r" ON (("r"."restaurant_restaurant_pk" = "sr"."restaurant_fk")))
     LEFT JOIN "public"."restaurant_payout_account" "pa" ON (("pa"."restaurant_fk" = "sr"."restaurant_fk")))
     LEFT JOIN "public"."finance_invoice" "inv" ON (("inv"."finance_settlement_run_fk" = "sr"."finance_settlement_run_pk")))
  WHERE "public"."rls_has_restaurant_access"("sr"."restaurant_fk");


ALTER VIEW "public"."api_restaurant_finance_settlement_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_restaurant_finance_settlement_summary" IS 'Restaurant-safe settlement summary scoped by active restaurant membership. Shows masked payout account, invoice metadata, payout status, and paise totals only.';



CREATE OR REPLACE VIEW "public"."api_restaurant_notification_summary" WITH ("security_barrier"='true') AS
 SELECT "n"."notification_outbox_pk",
    "n"."business_context_fk" AS "order_pk",
    "o"."order_number",
    "o"."restaurant_fk",
    "o"."snapshot_restaurant_name" AS "restaurant_name",
    COALESCE("n"."template_code", "t"."template_code") AS "template_code",
    "n"."recipient_audience_code" AS "audience_code",
    "n"."channel_code",
    "n"."send_status_code",
    "n"."provider_code",
    "n"."delivery_reason_code",
    "n"."scheduled_at",
    "n"."sent_at",
    "n"."next_attempt_at",
    "n"."retry_count",
    "n"."max_attempts",
    "a"."attempt_status_code" AS "last_attempt_status_code",
    "a"."attempted_at" AS "last_attempt_at",
    "n"."last_error_code",
    "n"."last_error_text",
    "n"."manual_fallback_text",
    "n"."created_at",
    "n"."updated_at"
   FROM ((("public"."notification_outbox" "n"
     LEFT JOIN "public"."notification_template" "t" ON (("t"."notification_template_pk" = "n"."notification_template_fk")))
     LEFT JOIN "public"."order_order" "o" ON ((("o"."order_order_pk" = "n"."business_context_fk") AND ("n"."business_context_type_code" = 'ORDER'::"text"))))
     LEFT JOIN LATERAL ( SELECT "notification_delivery_attempt"."attempt_status_code",
            "notification_delivery_attempt"."attempted_at"
           FROM "public"."notification_delivery_attempt"
          WHERE ("notification_delivery_attempt"."notification_outbox_fk" = "n"."notification_outbox_pk")
          ORDER BY "notification_delivery_attempt"."attempted_at" DESC, "notification_delivery_attempt"."attempt_number" DESC
         LIMIT 1) "a" ON (true))
  WHERE (("n"."business_context_type_code" = 'ORDER'::"text") AND "public"."rls_has_restaurant_access"("o"."restaurant_fk"));


ALTER VIEW "public"."api_restaurant_notification_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."api_restaurant_order_summary" AS
SELECT
    NULL::"uuid" AS "order_pk",
    NULL::"text" AS "order_number",
    NULL::"uuid" AS "restaurant_fk",
    NULL::"uuid" AS "drop_fk",
    NULL::"text" AS "order_status_code",
    NULL::"text" AS "payment_status_code",
    NULL::"text" AS "restaurant_name",
    NULL::"text" AS "drop_title",
    NULL::"text" AS "bag_display_name",
    NULL::"text" AS "dietary_category_code",
    NULL::"text" AS "spice_level_code",
    NULL::"text" AS "allergen_summary_text",
    NULL::"text"[] AS "allergen_codes",
    NULL::integer AS "quantity",
    NULL::bigint AS "paid_amount_paise",
    NULL::"text" AS "currency_code",
    NULL::timestamp with time zone AS "pickup_window_start_at",
    NULL::timestamp with time zone AS "pickup_window_end_at",
    NULL::"text" AS "payment_intent_status_code",
    NULL::timestamp with time zone AS "payment_captured_at",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::timestamp with time zone AS "collected_at";


ALTER VIEW "public"."api_restaurant_order_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_restaurant_order_summary" IS 'Slice 4B restaurant-safe current paid order support queue. Does not expose consumer PII, provider payloads, QR hashes, or OTP hashes.';



CREATE OR REPLACE VIEW "public"."api_restaurant_pickup_order_summary" WITH ("security_barrier"='true') AS
 SELECT "o"."order_order_pk" AS "order_pk",
    "o"."order_number",
    "o"."restaurant_fk",
    "o"."drop_fk",
    "o"."order_status_code",
    "o"."payment_status_code",
    "o"."snapshot_restaurant_name" AS "restaurant_name",
    "o"."snapshot_drop_title" AS "drop_title",
    "o"."snapshot_bag_display_name" AS "bag_display_name",
    "o"."snapshot_dietary_category_code" AS "dietary_category_code",
    "o"."snapshot_spice_level_code" AS "spice_level_code",
    "o"."snapshot_allergen_summary_text" AS "allergen_summary_text",
    COALESCE("allergens"."allergen_codes", ARRAY[]::"text"[]) AS "allergen_codes",
    "oi"."quantity",
    "o"."total_paise" AS "paid_amount_paise",
    "o"."currency_code",
    "o"."pickup_window_start_at",
    "o"."pickup_window_end_at",
    "i"."payment_intent_status_code",
    "captured"."payment_captured_at",
    "o"."collected_at",
    (COALESCE("verifications"."attempt_count", (0)::bigint))::integer AS "pickup_verification_attempt_count",
    "verifications"."last_result_code" AS "last_pickup_verification_result_code",
    "verifications"."last_recorded_at" AS "last_pickup_verification_at",
    (COALESCE("incidents"."incident_count", (0)::bigint))::integer AS "incident_count",
    "o"."created_at",
    "o"."updated_at"
   FROM (((((("public"."order_order" "o"
     LEFT JOIN "public"."order_item" "oi" ON (("oi"."order_fk" = "o"."order_order_pk")))
     LEFT JOIN "public"."payment_order_intent" "i" ON (("i"."order_fk" = "o"."order_order_pk")))
     LEFT JOIN LATERAL ( SELECT "max"("t"."captured_at") AS "payment_captured_at"
           FROM "public"."payment_transaction" "t"
          WHERE (("t"."payment_order_intent_fk" = "i"."payment_order_intent_pk") AND ("t"."transaction_status_code" = 'CAPTURED'::"text"))) "captured" ON (true))
     LEFT JOIN LATERAL ( SELECT "array_agg"("ma"."allergen_code" ORDER BY "ma"."sort_order") AS "allergen_codes"
           FROM (("public"."drop_drop" "d"
             JOIN "public"."catalog_bag_template_allergen" "bta" ON ((("bta"."catalog_bag_template_revision_fk" = "d"."catalog_bag_template_revision_fk") AND ("bta"."contains_flag" OR "bta"."may_contain_flag"))))
             JOIN "public"."master_allergen" "ma" ON (("ma"."master_allergen_pk" = "bta"."master_allergen_fk")))
          WHERE ("d"."drop_drop_pk" = "o"."drop_fk")) "allergens" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "attempt_count",
            ("array_agg"("v"."verification_result_code" ORDER BY "v"."recorded_at" DESC))[1] AS "last_result_code",
            "max"("v"."recorded_at") AS "last_recorded_at"
           FROM "public"."order_pickup_verification_event" "v"
          WHERE ("v"."order_fk" = "o"."order_order_pk")) "verifications" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "incident_count"
           FROM "public"."incident_incident" "inc"
          WHERE ("inc"."order_fk" = "o"."order_order_pk")) "incidents" ON (true))
  WHERE ("public"."rls_has_restaurant_access"("o"."restaurant_fk") AND ("o"."order_status_code" = ANY (ARRAY['PAID'::"text", 'CONFIRMED'::"text", 'READY_FOR_PICKUP'::"text", 'COLLECTED'::"text", 'NO_SHOW'::"text", 'PICKUP_EXPIRED'::"text"])))
  ORDER BY "o"."pickup_window_start_at" DESC;


ALTER VIEW "public"."api_restaurant_pickup_order_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_restaurant_pickup_order_summary" IS 'Slice 5 restaurant pickup queue and terminal-state summary. Excludes raw pickup credentials, hashes, provider payloads, private docs, and consumer PII.';



CREATE OR REPLACE VIEW "public"."api_restaurant_pickup_queue" WITH ("security_barrier"='true') AS
 SELECT "order_order_pk",
    "order_number",
    "order_status_code",
    "payment_status_code",
    "restaurant_fk",
    "drop_fk",
    "snapshot_drop_title",
    "pickup_window_start_at",
    "pickup_window_end_at",
    "computed_pickup_ready_flag",
    "created_at",
    "updated_at"
   FROM "public"."order_order" "o"
  WHERE (("computed_pickup_ready_flag" = true) AND "public"."rls_has_restaurant_access"("restaurant_fk"));


ALTER VIEW "public"."api_restaurant_pickup_queue" OWNER TO "postgres";


COMMENT ON VIEW "public"."api_restaurant_pickup_queue" IS 'Restaurant staff app queue. Returns only pickup-ready orders for restaurants accessible to the current staff user.';



CREATE TABLE IF NOT EXISTS "public"."billing_subscription_charge" (
    "billing_subscription_charge_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_subscription_fk" "uuid" NOT NULL,
    "provider_code" "text" DEFAULT 'RAZORPAY'::"text" NOT NULL,
    "provider_payment_ref" "text",
    "charge_status_code" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "amount_paise" bigint NOT NULL,
    "currency_code" "text" DEFAULT 'INR'::"text" NOT NULL,
    "billing_period_start_at" timestamp with time zone NOT NULL,
    "billing_period_end_at" timestamp with time zone NOT NULL,
    "charged_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_billing_subscription_charge_amount" CHECK (("amount_paise" >= 0)),
    CONSTRAINT "ck_billing_subscription_charge_period" CHECK (("billing_period_end_at" > "billing_period_start_at")),
    CONSTRAINT "ck_billing_subscription_charge_status" CHECK (("charge_status_code" = ANY (ARRAY['PENDING'::"text", 'PAID'::"text", 'FAILED'::"text", 'REFUNDED'::"text"])))
);


ALTER TABLE "public"."billing_subscription_charge" OWNER TO "postgres";


COMMENT ON TABLE "public"."billing_subscription_charge" IS 'Subscription billing charge for Swaad Club. Deliberately separate from payment_order_intent. Do not reuse order payment flow for subscription charges. Each paid charge extends/renews consumer_subscription.current_period_end_at.';



COMMENT ON COLUMN "public"."billing_subscription_charge"."provider_payment_ref" IS 'Razorpay payment id for subscription charge. Unique when present.';



CREATE TABLE IF NOT EXISTS "public"."billing_subscription_event" (
    "billing_subscription_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_subscription_fk" "uuid" NOT NULL,
    "event_type_code" "text" NOT NULL,
    "event_payload_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_subscription_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."billing_subscription_event" IS 'APPEND-ONLY event trail for Swaad Club subscription lifecycle. Events: CREATED, RENEWED, PAYMENT_FAILED, CANCEL_REQUESTED, CANCELLED, EXPIRED, PLAN_CHANGED. Used for account timeline and support investigations.';



COMMENT ON COLUMN "public"."billing_subscription_event"."event_type_code" IS 'CREATED, RENEWED, PAYMENT_FAILED, CANCEL_REQUESTED, CANCELLED, EXPIRED, PLAN_CHANGED.';



CREATE TABLE IF NOT EXISTS "public"."catalog_bag_template" (
    "catalog_bag_template_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "template_name" "text" NOT NULL,
    "template_status_code" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "active_revision_fk" "uuid",
    "created_by_profile_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "default_drop_quantity" integer DEFAULT 10 NOT NULL,
    "default_pickup_start_offset_minutes" integer DEFAULT 15 NOT NULL,
    "default_pickup_duration_minutes" integer DEFAULT 90 NOT NULL,
    CONSTRAINT "ck_catalog_bag_template_default_drop_quantity" CHECK ((("default_drop_quantity" >= 1) AND ("default_drop_quantity" <= 500))),
    CONSTRAINT "ck_catalog_bag_template_default_pickup_duration" CHECK ((("default_pickup_duration_minutes" >= 15) AND ("default_pickup_duration_minutes" <= 480))),
    CONSTRAINT "ck_catalog_bag_template_default_pickup_offset" CHECK ((("default_pickup_start_offset_minutes" >= 0) AND ("default_pickup_start_offset_minutes" <= 1440))),
    CONSTRAINT "ck_catalog_bag_template_status" CHECK (("template_status_code" = ANY (ARRAY['DRAFT'::"text", 'ACTIVE'::"text", 'INACTIVE'::"text", 'ARCHIVED'::"text"])))
);


ALTER TABLE "public"."catalog_bag_template" OWNER TO "postgres";


COMMENT ON TABLE "public"."catalog_bag_template" IS 'Mutable container for a restaurant''s reusable BAM Bag definition. Actual customer-facing content lives in immutable catalog_bag_template_revision rows. Publishing a template creates a revision and updates active_revision_fk. Drops always reference a specific revision to preserve historical disclosure.';



COMMENT ON COLUMN "public"."catalog_bag_template"."template_status_code" IS 'DRAFT: editable. ACTIVE: can be used in drops. INACTIVE: hidden from new drops but history remains. ARCHIVED: retired.';



CREATE TABLE IF NOT EXISTS "public"."catalog_bag_template_media" (
    "catalog_bag_template_media_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "catalog_bag_template_revision_fk" "uuid" NOT NULL,
    "storage_object_fk" "uuid" NOT NULL,
    "media_role_code" "text" DEFAULT 'GALLERY'::"text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_catalog_bag_media_role" CHECK (("media_role_code" = ANY (ARRAY['PRIMARY'::"text", 'GALLERY'::"text", 'THUMBNAIL'::"text"])))
);


ALTER TABLE "public"."catalog_bag_template_media" OWNER TO "postgres";


COMMENT ON TABLE "public"."catalog_bag_template_media" IS 'Images for BAM Bag template revisions. Usually PUBLIC_CDN storage objects. PRIMARY image shown on drop cards; GALLERY images on detail page. Media belongs to a revision to avoid changing historical representation of past drops.';



COMMENT ON COLUMN "public"."catalog_bag_template_media"."media_role_code" IS 'PRIMARY, GALLERY, THUMBNAIL. API enforces at most one PRIMARY per revision.';



CREATE TABLE IF NOT EXISTS "public"."cms_banner" (
    "cms_banner_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "banner_code" "text" NOT NULL,
    "banner_title" "text" NOT NULL,
    "banner_body_text" "text",
    "target_url" "text",
    "placement_code" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cms_banner" OWNER TO "postgres";


COMMENT ON TABLE "public"."cms_banner" IS 'Promotional or informational banners for consumer-facing pages. placement_code: CONSUMER_HOME_TOP, DROP_DISCOVERY_TOP, CHECKOUT_SIDEBAR, RESTAURANT_PORTAL_DASHBOARD.';



COMMENT ON COLUMN "public"."cms_banner"."placement_code" IS 'Controls where banner renders. Possible values: CONSUMER_HOME_TOP, DROP_DISCOVERY_TOP, CHECKOUT_SIDEBAR, RESTAURANT_PORTAL_DASHBOARD.';



CREATE TABLE IF NOT EXISTS "public"."cms_city_page" (
    "cms_city_page_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "geo_city_fk" "uuid" NOT NULL,
    "city_page_title" "text" NOT NULL,
    "hero_text" "text",
    "body_markdown" "text",
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cms_city_page" OWNER TO "postgres";


COMMENT ON TABLE "public"."cms_city_page" IS 'SEO landing page per city (/cities/hyd). One page per city. Contains: city hero text, neighborhood guide, launch narrative, restaurant teasers. Published at city launch.';



CREATE TABLE IF NOT EXISTS "public"."cms_page" (
    "cms_page_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_code" "text" NOT NULL,
    "page_title" "text" NOT NULL,
    "page_status_code" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "body_markdown" "text",
    "published_at" timestamp with time zone,
    "created_by_profile_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cms_page" OWNER TO "postgres";


COMMENT ON TABLE "public"."cms_page" IS 'Static informational pages managed via admin CMS. page_code is the URL path identifier. Seed: PRIVACY_POLICY, TERMS_OF_SERVICE, REFUND_POLICY, FOOD_SAFETY_POLICY, GRIEVANCE_REDRESSAL, HOW_IT_WORKS, ABOUT, FAQ.';



COMMENT ON COLUMN "public"."cms_page"."page_status_code" IS 'DRAFT: not public. PUBLISHED: live. ARCHIVED: removed from navigation but URL preserved.';



CREATE TABLE IF NOT EXISTS "public"."cms_post" (
    "cms_post_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_slug" "text" NOT NULL,
    "post_title" "text" NOT NULL,
    "excerpt_text" "text",
    "body_markdown" "text",
    "post_status_code" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "author_profile_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cms_post" OWNER TO "postgres";


COMMENT ON TABLE "public"."cms_post" IS 'Blog/editorial posts at /blog/[slug]. Content types: restaurant feature stories, food culture, city launch announcements. post_status_code: DRAFT, PUBLISHED, ARCHIVED.';



CREATE TABLE IF NOT EXISTS "public"."cms_restaurant_feature" (
    "cms_restaurant_feature_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "feature_title" "text" NOT NULL,
    "feature_body_markdown" "text",
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cms_restaurant_feature" OWNER TO "postgres";


COMMENT ON TABLE "public"."cms_restaurant_feature" IS 'Editorial spotlight feature for a restaurant. Appears on /blog and restaurant profile page. Written by goZaika team to highlight the restaurant''s story, chef, and philosophy.';



CREATE TABLE IF NOT EXISTS "public"."cms_seo_metadata" (
    "cms_seo_metadata_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type_code" "text" NOT NULL,
    "entity_pk" "uuid" NOT NULL,
    "seo_title" "text",
    "seo_description" "text",
    "canonical_url" "text",
    "og_image_storage_object_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cms_seo_metadata" OWNER TO "postgres";


COMMENT ON TABLE "public"."cms_seo_metadata" IS 'SEO and OG metadata for CMS entities. entity_type_code identifies the owning entity: CMS_PAGE, CMS_POST, CMS_CITY_PAGE, RESTAURANT, GEO_CITY.';



COMMENT ON COLUMN "public"."cms_seo_metadata"."entity_type_code" IS 'Entity class. Valid values: CMS_PAGE, CMS_POST, CMS_CITY_PAGE, RESTAURANT, GEO_CITY.';



CREATE TABLE IF NOT EXISTS "public"."config_runtime_setting" (
    "config_runtime_setting_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_code" "text" NOT NULL,
    "scope_code" "text" DEFAULT 'GLOBAL'::"text" NOT NULL,
    "scope_entity_pk" "uuid",
    "setting_value_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."config_runtime_setting" OWNER TO "postgres";


COMMENT ON TABLE "public"."config_runtime_setting" IS 'SERVICE-ROLE ONLY. Runtime operational settings. Examples: DEFAULT_HOLD_EXPIRY_MINUTES, MAX_BAGS_PER_DROP, RAZORPAY_KEY_ID, WHATSAPP_TEMPLATE_NAMESPACE, SPOTLIGHT_PRICE_MULTIPLIER_BPS.';



COMMENT ON COLUMN "public"."config_runtime_setting"."setting_value_json" IS 'Type-free value container. Example: {"minutes": 10} or {"key": "rzp_live_xxxx"}.';



CREATE TABLE IF NOT EXISTS "public"."consumer_allergen_preference" (
    "consumer_allergen_preference_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "master_allergen_fk" "uuid" NOT NULL,
    "avoid_flag" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consumer_allergen_preference" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_allergen_preference" IS 'SAFETY-CRITICAL. Allergens a consumer wants to avoid. The drop detail page and checkout flow MUST cross-reference this against catalog_bag_template_allergen. A matching allergen MUST display a prominent warning. goZaika does NOT block purchase (consumer decision) but MUST warn clearly. avoid_flag always true at launch (no tolerance level feature yet).';



COMMENT ON COLUMN "public"."consumer_allergen_preference"."avoid_flag" IS 'Always true at launch. Reserved for future "I can tolerate small amounts" feature.';



CREATE TABLE IF NOT EXISTS "public"."consumer_city_preference" (
    "consumer_city_preference_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "geo_city_fk" "uuid" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consumer_city_preference" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_city_preference" IS 'Cities a consumer browses for drops. is_default=true determines app-open city. Partial unique index enforces single default per consumer. UPDATE RULE: within one transaction, SET old default false THEN set new default true.';



COMMENT ON COLUMN "public"."consumer_city_preference"."is_default" IS 'Marks primary city for app-open discovery. Partial unique index enforces at most one default per consumer.';



CREATE TABLE IF NOT EXISTS "public"."consumer_dietary_preference" (
    "consumer_dietary_preference_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "dietary_category_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consumer_dietary_preference" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_dietary_preference" IS 'Consumer dietary requirements. Primary drop discovery filter (/drops page). A consumer may hold multiple preferences (e.g., VEG and JAIN). Matched against catalog_bag_template_revision.dietary_category_code for compatibility. API MUST validate dietary_category_code against: VEG, NON_VEG, JAIN, EGG_ONLY.';



COMMENT ON COLUMN "public"."consumer_dietary_preference"."dietary_category_code" IS 'Valid values: VEG, NON_VEG, JAIN, EGG_ONLY. Text (not enum) for extensibility. Validated at API layer.';



CREATE TABLE IF NOT EXISTS "public"."consumer_notification_preference" (
    "consumer_notification_preference_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "channel_code" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "quiet_hours_start_local" time without time zone,
    "quiet_hours_end_local" time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_consumer_notification_channel" CHECK (("channel_code" = ANY (ARRAY['PUSH'::"text", 'EMAIL'::"text", 'WHATSAPP'::"text", 'SMS'::"text"])))
);


ALTER TABLE "public"."consumer_notification_preference" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_notification_preference" IS 'Per-consumer notification channel preference. Consent still controlled by privacy_consent_event. To send notification: (1) check latest consent for purpose; (2) check this preference; (3) resolve destination from iam_profile / notification_device. Operational messages may override preference only if legally required and consent purpose is OPERATIONAL.';



COMMENT ON COLUMN "public"."consumer_notification_preference"."quiet_hours_start_local" IS 'Local time in the consumer default city. If NULL no quiet-hours suppression.';



COMMENT ON COLUMN "public"."consumer_notification_preference"."quiet_hours_end_local" IS 'Local time in the consumer default city. Quiet window may cross midnight.';



CREATE TABLE IF NOT EXISTS "public"."consumer_passport_stat" (
    "consumer_passport_stat_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "total_bags_collected" integer DEFAULT 0 NOT NULL,
    "total_restaurants_visited" integer DEFAULT 0 NOT NULL,
    "total_neighborhoods_visited" integer DEFAULT 0 NOT NULL,
    "current_tier_code" "text" DEFAULT 'BRONZE'::"text" NOT NULL,
    "last_calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_consumer_passport_tier" CHECK (("current_tier_code" = ANY (ARRAY['BRONZE'::"text", 'SILVER'::"text", 'GOLD'::"text", 'PLATINUM'::"text"])))
);


ALTER TABLE "public"."consumer_passport_stat" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_passport_stat" IS 'Zayka Passport gamification rollup. Maintained by background job when orders transition to COLLECTED. This table is a denormalized read model; canonical history remains in order_order and order_status_transition. Do not use for financial or operational decisions.';



COMMENT ON COLUMN "public"."consumer_passport_stat"."total_bags_collected" IS 'Number of order items collected, not just order count. Updated after order status COLLECTED.';



COMMENT ON COLUMN "public"."consumer_passport_stat"."total_restaurants_visited" IS 'Distinct restaurants where this consumer has at least one COLLECTED order.';



COMMENT ON COLUMN "public"."consumer_passport_stat"."current_tier_code" IS 'Gamification tier. Logic in app/background job. Current values: BRONZE, SILVER, GOLD, PLATINUM.';



CREATE TABLE IF NOT EXISTS "public"."consumer_profile" (
    "consumer_profile_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iam_profile_fk" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "preferred_language_code" "text" DEFAULT 'en'::"text" NOT NULL,
    "marketing_source_code" "text",
    "used_referral_code_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consumer_profile" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_profile" IS 'Consumer-specific profile extending iam_profile. Created after first successful OTP login. 1:1 with iam_profile (unique constraint). All preferences are in child tables for extensibility. used_referral_code_fk records the signup referral for attribution and rewards.';



COMMENT ON COLUMN "public"."consumer_profile"."preferred_language_code" IS 'BCP 47 code. Supported at launch: en, hi. Controls notification language and in-app bilingual content.';



COMMENT ON COLUMN "public"."consumer_profile"."marketing_source_code" IS 'Acquisition source. Set at signup from UTM params. Immutable. Values: REFERRAL, INSTAGRAM, GOOGLE, APP_STORE, ORGANIC. Used for funnel analytics.';



COMMENT ON COLUMN "public"."consumer_profile"."used_referral_code_fk" IS 'Another consumer''s referral code used at this consumer''s signup. Set once; never changed. Used to create consumer_referral row. FK patched below.';



CREATE TABLE IF NOT EXISTS "public"."consumer_referral" (
    "consumer_referral_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_consumer_profile_fk" "uuid" NOT NULL,
    "referred_consumer_profile_fk" "uuid" NOT NULL,
    "referral_status_code" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "qualified_at" timestamp with time zone,
    "rewarded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_consumer_referral_not_self" CHECK (("referrer_consumer_profile_fk" <> "referred_consumer_profile_fk")),
    CONSTRAINT "ck_consumer_referral_status" CHECK (("referral_status_code" = ANY (ARRAY['PENDING'::"text", 'QUALIFIED'::"text", 'REWARDED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."consumer_referral" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_referral" IS 'Referral relationship and reward state. PENDING when referred user signs up. QUALIFIED after first paid order collected. REWARDED after credit issued. REJECTED for fraud, self-referral, or cancelled order. Rewards are intentionally NOT modelled as money here; future wallet/credit ledger will reference this row.';



COMMENT ON COLUMN "public"."consumer_referral"."referral_status_code" IS 'PENDING → QUALIFIED → REWARDED, or REJECTED. QUALIFIED triggered when referred consumer has first COLLECTED paid order.';



CREATE TABLE IF NOT EXISTS "public"."consumer_referral_code" (
    "consumer_referral_code_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "referral_code" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consumer_referral_code" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_referral_code" IS 'One unique referral code per consumer. Auto-generated at consumer_profile creation. Shared externally (e.g., GZ-A3X9K). When a new consumer signs up using this code, consumer_profile.used_referral_code_fk is set and a consumer_referral row is created. is_active=false retires the code (fraud/abuse response).';



COMMENT ON COLUMN "public"."consumer_referral_code"."referral_code" IS 'Short alphanumeric, platform-wide unique. Auto-generated at consumer_profile creation. Example format: GZ-A3X9K.';



CREATE TABLE IF NOT EXISTS "public"."consumer_saved_restaurant" (
    "consumer_saved_restaurant_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consumer_saved_restaurant" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_saved_restaurant" IS 'Consumer follows a restaurant to receive new-drop notifications. When a drop is published, notification system queries this table to target consumers who follow the restaurant (respecting consumer_notification_preference). RESTAURANT_FOLLOWERS audience segment eligibility checked here.';



COMMENT ON COLUMN "public"."consumer_saved_restaurant"."saved_at" IS 'Canonical follow timestamp. Equal to created_at at creation and never changes.';



CREATE TABLE IF NOT EXISTS "public"."consumer_subscription" (
    "consumer_subscription_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "consumer_subscription_plan_fk" "uuid" NOT NULL,
    "subscription_status_code" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_period_start_at" timestamp with time zone NOT NULL,
    "current_period_end_at" timestamp with time zone NOT NULL,
    "cancel_at_period_end_flag" boolean DEFAULT false NOT NULL,
    "cancelled_at" timestamp with time zone,
    "provider_customer_ref" "text",
    "provider_subscription_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_consumer_subscription_status" CHECK (("subscription_status_code" = ANY (ARRAY['ACTIVE'::"text", 'PAST_DUE'::"text", 'CANCELLED'::"text", 'EXPIRED'::"text"])))
);


ALTER TABLE "public"."consumer_subscription" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_subscription" IS 'Current and historical Swaad Club subscriptions. Active benefits exist when subscription_status_code=ACTIVE and now() between current_period_start_at and current_period_end_at. DO NOT join this into order payment flows; subscription billing is intentionally separate. cancel_at_period_end_flag indicates user has requested cancellation but still has access until period end.';



COMMENT ON COLUMN "public"."consumer_subscription"."provider_subscription_ref" IS 'Razorpay subscription/payment-link reference. Unique per provider subscription when present.';



CREATE TABLE IF NOT EXISTS "public"."consumer_subscription_plan" (
    "consumer_subscription_plan_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_code" "text" NOT NULL,
    "plan_name" "text" NOT NULL,
    "description" "text",
    "billing_interval_code" "text" NOT NULL,
    "price_paise" bigint NOT NULL,
    "currency_code" "text" DEFAULT 'INR'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_consumer_subscription_interval" CHECK (("billing_interval_code" = ANY (ARRAY['MONTHLY'::"text", 'QUARTERLY'::"text", 'YEARLY'::"text"]))),
    CONSTRAINT "ck_consumer_subscription_price" CHECK (("price_paise" >= 0))
);


ALTER TABLE "public"."consumer_subscription_plan" OWNER TO "postgres";


COMMENT ON TABLE "public"."consumer_subscription_plan" IS 'Swaad Club subscription plans. Separate from order payments. Billing handled via billing_subscription_charge and Razorpay recurring/payment links. Plan changes create new plan rows or future-dated price changes — do not rewrite historical plan terms.';



COMMENT ON COLUMN "public"."consumer_subscription_plan"."price_paise" IS 'Plan price in paise. 9900 = ₹99. Money stored as integer only.';



CREATE TABLE IF NOT EXISTS "public"."dev_demo_seed_registry" (
    "dev_demo_seed_registry_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seed_key" "text" NOT NULL,
    "entity_table" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "slice" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dev_demo_seed_registry" OWNER TO "postgres";


COMMENT ON TABLE "public"."dev_demo_seed_registry" IS 'LOCAL/DEMO ONLY. Registry of demo-owned rows so cleanup scripts can delete deterministic Slice fixture data without broad truncation.';



CREATE TABLE IF NOT EXISTS "public"."drop_audience" (
    "drop_audience_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drop_fk" "uuid" NOT NULL,
    "master_audience_segment_fk" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."drop_audience" OWNER TO "postgres";


COMMENT ON TABLE "public"."drop_audience" IS 'Audience segment restrictions for a drop. No rows = visible and claimable by all users. Rows present = user must match at least one segment before claiming. Visibility filtering and claim eligibility are enforced in API/RLS helper logic.';



CREATE TABLE IF NOT EXISTS "public"."drop_closure_log" (
    "drop_closure_log_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drop_fk" "uuid" NOT NULL,
    "closure_type_code" "text" NOT NULL,
    "reason_text" "text",
    "closed_by_profile_fk" "uuid",
    "closed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_drop_closure_type" CHECK (("closure_type_code" = ANY (ARRAY['SOLD_OUT'::"text", 'PICKUP_WINDOW_ENDED'::"text", 'EMERGENCY'::"text", 'MANUAL_CANCEL'::"text", 'SYSTEM_EXPIRED'::"text"])))
);


ALTER TABLE "public"."drop_closure_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."drop_closure_log" IS 'Audit trail for drop closures. Created when drop moves to SOLD_OUT, PICKUP_CLOSED, EMERGENCY_CLOSED, or CANCELLED. Emergency closures are operationally important: trigger refund workflow and incident review.';



COMMENT ON COLUMN "public"."drop_closure_log"."closure_type_code" IS 'SOLD_OUT, PICKUP_WINDOW_ENDED, EMERGENCY, MANUAL_CANCEL, SYSTEM_EXPIRED.';



CREATE TABLE IF NOT EXISTS "public"."drop_inventory_event" (
    "drop_inventory_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drop_fk" "uuid" NOT NULL,
    "drop_inventory_hold_fk" "uuid",
    "order_fk" "uuid",
    "event_type_code" "text" NOT NULL,
    "quantity_delta" integer NOT NULL,
    "reason_text" "text",
    "actor_profile_fk" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_drop_inventory_event_type" CHECK (("event_type_code" = ANY (ARRAY['HOLD_CREATED'::"text", 'HOLD_EXPIRED'::"text", 'HOLD_RELEASED'::"text", 'HOLD_CONVERTED'::"text", 'ORDER_CANCELLED'::"text", 'PICKUP_COLLECTED'::"text", 'MANUAL_ADJUSTMENT'::"text", 'DROP_CLOSED'::"text"])))
);


ALTER TABLE "public"."drop_inventory_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."drop_inventory_event" IS 'APPEND-ONLY inventory ledger. Every inventory-affecting action writes one row here. Canonical audit trail for oversell investigations. Do not update/delete. quantity_delta is signed from available inventory perspective: negative for hold/sale, positive for release/cancel/manual add. drop_drop counters are denormalized hot-path values; this ledger is the audit source.';



COMMENT ON COLUMN "public"."drop_inventory_event"."event_type_code" IS 'HOLD_CREATED, HOLD_EXPIRED, HOLD_RELEASED, HOLD_CONVERTED, ORDER_CANCELLED, PICKUP_COLLECTED, MANUAL_ADJUSTMENT, DROP_CLOSED.';



COMMENT ON COLUMN "public"."drop_inventory_event"."quantity_delta" IS 'Signed quantity. Example: HOLD_CREATED = -1, HOLD_EXPIRED = +1, HOLD_CONVERTED = 0 (reserved→sold transfer), MANUAL_ADJUSTMENT may be positive/negative.';



CREATE TABLE IF NOT EXISTS "public"."drop_media" (
    "drop_media_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drop_fk" "uuid" NOT NULL,
    "storage_object_fk" "uuid" NOT NULL,
    "media_role_code" "text" DEFAULT 'GALLERY'::"text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_drop_media_role" CHECK (("media_role_code" = ANY (ARRAY['PRIMARY'::"text", 'GALLERY'::"text", 'THUMBNAIL'::"text"])))
);


ALTER TABLE "public"."drop_media" OWNER TO "postgres";


COMMENT ON TABLE "public"."drop_media" IS 'Optional drop-specific images. Overrides or supplements template media. PRIMARY image used on drop card. Usually PUBLIC_CDN storage. If absent, API falls back to catalog_bag_template_media for the revision.';



COMMENT ON COLUMN "public"."drop_media"."media_role_code" IS 'PRIMARY, GALLERY, THUMBNAIL. API enforces at most one PRIMARY per drop.';



CREATE TABLE IF NOT EXISTS "public"."drop_recurring_schedule" (
    "drop_recurring_schedule_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "catalog_bag_template_fk" "uuid" NOT NULL,
    "schedule_status_code" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "rrule_text" "text" NOT NULL,
    "default_quantity_total" integer NOT NULL,
    "default_price_paise" bigint NOT NULL,
    "default_pickup_window_minutes" integer NOT NULL,
    "next_run_at" timestamp with time zone,
    "created_by_profile_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_drop_recurring_pickup_window" CHECK (("default_pickup_window_minutes" > 0)),
    CONSTRAINT "ck_drop_recurring_schedule_price" CHECK (("default_price_paise" >= 0)),
    CONSTRAINT "ck_drop_recurring_schedule_qty" CHECK (("default_quantity_total" > 0)),
    CONSTRAINT "ck_drop_recurring_schedule_status" CHECK (("schedule_status_code" = ANY (ARRAY['ACTIVE'::"text", 'PAUSED'::"text", 'ARCHIVED'::"text"])))
);


ALTER TABLE "public"."drop_recurring_schedule" OWNER TO "postgres";


COMMENT ON TABLE "public"."drop_recurring_schedule" IS 'Optional RRULE-based automation for future drops. Background job reads ACTIVE schedules with next_run_at <= now(), creates drop_drop in DRAFT/SCHEDULED, then advances next_run_at. Restaurants can pause/archive schedules. RRULE is stored as text because recurrence semantics live in application scheduler.';



COMMENT ON COLUMN "public"."drop_recurring_schedule"."rrule_text" IS 'RFC 5545 RRULE text. Example: FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=17. Validate in application.';



CREATE TABLE IF NOT EXISTS "public"."geo_address" (
    "geo_address_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_1" "text" NOT NULL,
    "line_2" "text",
    "landmark" "text",
    "geo_city_fk" "uuid" NOT NULL,
    "geo_neighborhood_fk" "uuid",
    "postal_code" "text",
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "google_place_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_geo_address_lat" CHECK ((("latitude" IS NULL) OR (("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric)))),
    CONSTRAINT "ck_geo_address_lng" CHECK ((("longitude" IS NULL) OR (("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric))))
);


ALTER TABLE "public"."geo_address" OWNER TO "postgres";


COMMENT ON TABLE "public"."geo_address" IS 'Physical addresses for restaurant locations. PostGIS not used at launch — Hyderabad discovery is city/neighborhood-led. latitude/longitude support map pin display. Referenced by restaurant_restaurant.geo_address_fk. One address per restaurant location.';



COMMENT ON COLUMN "public"."geo_address"."landmark" IS 'Human-readable nearby landmark for pickup instructions. Example: "Near Inorbit Mall gate 2". Displayed on drop detail page and order confirmation QR screen.';



COMMENT ON COLUMN "public"."geo_address"."latitude" IS 'WGS-84 decimal degrees. Required for Google Maps pin on drop detail and restaurant profile pages. Validated -90 to +90.';



COMMENT ON COLUMN "public"."geo_address"."longitude" IS 'WGS-84 decimal degrees. Required for Google Maps pin. Validated -180 to +180.';



COMMENT ON COLUMN "public"."geo_address"."google_place_id" IS 'Google Places API place_id for the restaurant location. Enables rich map integration and future directions feature.';



CREATE TABLE IF NOT EXISTS "public"."iam_platform_membership" (
    "iam_platform_membership_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iam_profile_fk" "uuid" NOT NULL,
    "iam_platform_role_fk" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."iam_platform_membership" OWNER TO "postgres";


COMMENT ON TABLE "public"."iam_platform_membership" IS 'SERVICE-ROLE WRITE ONLY. Assigns platform admin roles to iam_profiles. Browser clients must never create or modify. When membership created: set iam_profile.is_platform_user = true. When all memberships deactivated: set is_platform_user = false and revoke Supabase session. CASCADE on iam_profile ensures DPDP erasure removes memberships cleanly.';



COMMENT ON COLUMN "public"."iam_platform_membership"."is_active" IS 'Soft-disable: false = access suspended without deleting audit trail. Revoke Supabase session when last active membership is deactivated.';



CREATE TABLE IF NOT EXISTS "public"."iam_platform_role" (
    "iam_platform_role_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_code" "text" NOT NULL,
    "role_name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."iam_platform_role" OWNER TO "postgres";


COMMENT ON TABLE "public"."iam_platform_role" IS 'Platform admin role definitions. Assigned via iam_platform_membership. Capabilities granted via iam_platform_role_scope. Seed: SUPER_ADMIN (unrestricted), SUPPORT_ADMIN (consumer/merchant support + refunds), FINANCE_ADMIN (settlements, invoices, reconciliation), OPS_ADMIN (restaurant onboarding, configuration, incidents).';



CREATE TABLE IF NOT EXISTS "public"."iam_platform_role_scope" (
    "iam_platform_role_scope_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iam_platform_role_fk" "uuid" NOT NULL,
    "master_scope_fk" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."iam_platform_role_scope" OWNER TO "postgres";


COMMENT ON TABLE "public"."iam_platform_role_scope" IS 'Fine-grained capability grants for platform admin roles. Middleware has_platform_scope(scope_code) checks via join: iam_platform_membership → iam_platform_role_scope → master_scope. CASCADE on role keeps rows clean when a role is deleted.';



CREATE TABLE IF NOT EXISTS "public"."iam_profile" (
    "iam_profile_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_fk" "uuid" NOT NULL,
    "phone_e164" "text",
    "email_address" "public"."citext",
    "display_name" "text",
    "default_city_fk" "uuid",
    "is_consumer" boolean DEFAULT true NOT NULL,
    "is_restaurant_user" boolean DEFAULT false NOT NULL,
    "is_platform_user" boolean DEFAULT false NOT NULL,
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."iam_profile" OWNER TO "postgres";


COMMENT ON TABLE "public"."iam_profile" IS 'Central identity record. Every actor (consumer, restaurant staff, platform admin) maps auth.users → iam_profile 1:1. Business state NEVER lives in auth.users. is_consumer / is_restaurant_user / is_platform_user are denormalised from membership tables for fast RLS checks — MUST be kept in sync by application code on any membership change. Created immediately after first successful Supabase Auth OTP verification.';



COMMENT ON COLUMN "public"."iam_profile"."auth_user_fk" IS 'FK to auth.users.id (Supabase Auth UUID). Used in RLS (auth.uid() = auth_user_fk). RESTRICT delete: only removed via DPDP privacy_erasure_request workflow.';



COMMENT ON COLUMN "public"."iam_profile"."phone_e164" IS 'E.164 format (+91XXXXXXXXXX). Primary login for consumers. Partial unique index prevents duplicates. Set at OTP signup.';



COMMENT ON COLUMN "public"."iam_profile"."email_address" IS 'citext (case-insensitive). Login for restaurant admins and platform staff. Also captured for consumers who add email. Partial unique index.';



COMMENT ON COLUMN "public"."iam_profile"."is_consumer" IS 'Denormalised: true when consumer_profile exists. Set by app on consumer_profile creation. Used in RLS helper current_is_consumer().';



COMMENT ON COLUMN "public"."iam_profile"."is_restaurant_user" IS 'Denormalised: true when ≥1 active restaurant_team_membership. Maintained on membership changes. Gates restaurant portal access.';



COMMENT ON COLUMN "public"."iam_profile"."is_platform_user" IS 'Denormalised: true when ≥1 active iam_platform_membership. Maintained on membership changes. Gates admin portal access.';



COMMENT ON COLUMN "public"."iam_profile"."last_seen_at" IS 'Updated by auth middleware on each authenticated API call. Used for DAU/MAU analytics. Not a security field — not used for session expiry decisions.';



CREATE TABLE IF NOT EXISTS "public"."marketing_partner_lead" (
    "marketing_partner_lead_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_name" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "email_address" "public"."citext" NOT NULL,
    "phone_e164" "text",
    "city_text" "text",
    "geo_city_fk" "uuid",
    "cuisine_text" "text",
    "estimated_daily_covers_text" "text",
    "message_text" "text",
    "consent_captured_flag" boolean DEFAULT true NOT NULL,
    "source_page_code" "text" NOT NULL,
    "source_campaign_code" "text",
    "qualification_status_code" "text" DEFAULT 'NEW'::"text" NOT NULL,
    "assigned_to_profile_fk" "uuid",
    "converted_restaurant_fk" "uuid",
    "converted_support_ticket_fk" "uuid",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "qualified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketing_partner_lead" OWNER TO "postgres";


COMMENT ON TABLE "public"."marketing_partner_lead" IS 'Restaurant partner interest from /for-restaurants page. No restaurant_restaurant row created immediately. Ops team qualifies lead, creates onboarding support ticket, then creates restaurant. qualification_status_code drives admin lead queue.';



COMMENT ON COLUMN "public"."marketing_partner_lead"."consent_captured_flag" IS 'DPDP: consent checkbox checked at submission. Immutable after set.';



COMMENT ON COLUMN "public"."marketing_partner_lead"."qualification_status_code" IS 'NEW: submitted. REVIEWED: admin assessed. QUALIFIED: onboarding started. DISQUALIFIED: not a fit. CONVERTED: restaurant created.';



CREATE TABLE IF NOT EXISTS "public"."marketing_waitlist_lead" (
    "marketing_waitlist_lead_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "email_address" "public"."citext" NOT NULL,
    "city_text" "text",
    "geo_city_fk" "uuid",
    "lead_type_code" "text" DEFAULT 'CONSUMER'::"text" NOT NULL,
    "consent_captured_flag" boolean DEFAULT true NOT NULL,
    "source_page_code" "text" NOT NULL,
    "source_campaign_code" "text",
    "converted_consumer_profile_fk" "uuid",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "qualified_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_marketing_waitlist_lead_type" CHECK (("lead_type_code" = ANY (ARRAY['CONSUMER'::"text", 'RESTAURANT'::"text"])))
);


ALTER TABLE "public"."marketing_waitlist_lead" OWNER TO "postgres";


COMMENT ON TABLE "public"."marketing_waitlist_lead" IS 'Anonymous consumer interest from the website waitlist form (/). No auth identity or business profile is created at this stage. API writes here without authentication; rate-limited at edge. consent_captured_flag MUST be true before any outbound communication. When lead converts to consumer, converted_consumer_profile_fk is set for attribution. DPDP: this record IS consent evidence for launch notifications.';



COMMENT ON COLUMN "public"."marketing_waitlist_lead"."consent_captured_flag" IS 'DPDP compliance: true = consent checkbox was checked at form submission. Must be true before sending any notification. Immutable after set.';



COMMENT ON COLUMN "public"."marketing_waitlist_lead"."source_page_code" IS 'Which page/CTA submitted the form. Example: HOME_HERO, CITIES_PAGE. Used for conversion funnel analytics.';



COMMENT ON COLUMN "public"."marketing_waitlist_lead"."converted_consumer_profile_fk" IS 'Set when this lead later creates a consumer_profile. Enables acquisition attribution and launch-invite priority.';



CREATE TABLE IF NOT EXISTS "public"."master_audience_segment" (
    "master_audience_segment_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "segment_code" "text" NOT NULL,
    "segment_name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_audience_segment" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_audience_segment" IS 'Drop audience targeting segments. Rows in drop_audience link a drop to one or more segments. If a drop has NO drop_audience rows it is visible to ALL_USERS with no eligibility check. When segments exist, middleware MUST enforce eligibility before allowing claim: SWAAD_CLUB → active consumer_subscription required; RESTAURANT_FOLLOWERS → consumer_saved_restaurant row required; WHATSAPP_INSIDERS → consumer in a marketing WhatsApp group (app-managed flag). Seed: ALL_USERS, SWAAD_CLUB, WHATSAPP_INSIDERS, RESTAURANT_FOLLOWERS, EARLY_ACCESS.';



COMMENT ON COLUMN "public"."master_audience_segment"."segment_code" IS 'UPPER_SNAKE_CASE. Eligibility enforcement logic per code documented in api-and-middleware-guidelines.md.';



CREATE TABLE IF NOT EXISTS "public"."master_cuisine" (
    "master_cuisine_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cuisine_code" "text" NOT NULL,
    "cuisine_name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_cuisine" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_cuisine" IS 'Cuisine type reference used by restaurant_cuisine_map (restaurant tagging) and drop discovery filter API. Seed: SOUTH_INDIAN, NORTH_INDIAN, BIRYANI, HYDERABADI, CHINESE, CONTINENTAL, SEAFOOD, ITALIAN, MUGHLAI, STREET_FOOD, DESSERTS, BAKERY, MULTI_CUISINE.';



COMMENT ON COLUMN "public"."master_cuisine"."cuisine_code" IS 'UPPER_SNAKE_CASE. Used as filter value in /drops discovery API. Example: SOUTH_INDIAN, BIRYANI.';



CREATE TABLE IF NOT EXISTS "public"."master_document_status" (
    "master_document_status_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status_code" "text" NOT NULL,
    "status_name" "text" NOT NULL,
    "description" "text",
    "is_terminal" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_document_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_document_status" IS 'Document verification lifecycle for restaurant_document rows. Seed: PENDING_REVIEW (default, newly uploaded), UNDER_REVIEW (admin reviewing), APPROVED (terminal, verified), REJECTED (terminal, rejection_reason required), EXPIRED (terminal, document past expiry date).';



COMMENT ON COLUMN "public"."master_document_status"."is_terminal" IS 'When true, no further transitions expected. Used to filter open vs closed document reviews in admin queue.';



CREATE TABLE IF NOT EXISTS "public"."master_document_type" (
    "master_document_type_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type_code" "text" NOT NULL,
    "type_name" "text" NOT NULL,
    "description" "text",
    "is_required" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_document_type" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_document_type" IS 'Classifies compliance documents in restaurant_document. is_required=true → restaurant_onboarding_task auto-created; restaurant cannot transition to ACTIVE status without all required docs APPROVED. Seed (required): FSSAI_LICENSE, GST_CERTIFICATE, PAN_CARD, BANK_CANCELLED_CHEQUE. Seed (optional): FOOD_SAFETY_AUDIT, MENU_CARD, IDENTITY_PROOF.';



COMMENT ON COLUMN "public"."master_document_type"."is_required" IS 'When true, this document is mandatory before restaurant_restaurant.restaurant_status_code can advance to ACTIVE.';



CREATE TABLE IF NOT EXISTS "public"."master_scope" (
    "master_scope_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scope_code" "text" NOT NULL,
    "scope_name" "text" NOT NULL,
    "description" "text",
    "applies_to" "text" DEFAULT 'BOTH'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_master_scope_applies" CHECK (("applies_to" = ANY (ARRAY['PLATFORM'::"text", 'RESTAURANT'::"text", 'BOTH'::"text"])))
);


ALTER TABLE "public"."master_scope" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_scope" IS 'Controlled registry of permission scope codes. Every scope_code referenced anywhere in iam_platform_role_scope or restaurant_team_role_scope MUST exist here first. Seed (PLATFORM): ADMIN_USERS, ADMIN_RESTAURANTS, ADMIN_FINANCE, ADMIN_CONFIG, ADMIN_INCIDENTS, ADMIN_SUPPORT. Seed (RESTAURANT): DROP_CREATE, DROP_PUBLISH, DROP_PAUSE, DROP_EMERGENCY_CLOSE, ORDER_VIEW, ORDER_VERIFY_PICKUP, FINANCE_VIEW, FINANCE_EXPORT, TEAM_MANAGE, SETTINGS_MANAGE, ANALYTICS_VIEW, CATALOG_MANAGE.';



COMMENT ON COLUMN "public"."master_scope"."scope_code" IS 'UPPER_SNAKE_CASE identifier used in role-scope tables and middleware checks. Immutable once referenced by a role.';



COMMENT ON COLUMN "public"."master_scope"."applies_to" IS 'PLATFORM = valid only in iam_platform_role_scope. RESTAURANT = valid only in restaurant_team_role_scope. BOTH = either.';



COMMENT ON COLUMN "public"."master_scope"."sort_order" IS 'Display order in role permissions management screens. Lower value first.';



CREATE TABLE IF NOT EXISTS "public"."master_storage_visibility" (
    "master_storage_visibility_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visibility_code" "text" NOT NULL,
    "visibility_name" "text" NOT NULL,
    "description" "text",
    "is_public_readable" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_storage_visibility" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_storage_visibility" IS 'Access posture for files tracked in storage_object. Drives Supabase Storage bucket policy. Seed: PUBLIC_CDN (restaurant/drop images; served via CDN without auth; is_public_readable=true), AUTHENTICATED_ONLY (receipts, order exports; presigned URL, owner only), SERVICE_ONLY (KYC/FSSAI/payout docs; NEVER browser-accessible; presigned from service role only), OWNER_ONLY (personal consumer uploads; owner only).';



COMMENT ON COLUMN "public"."master_storage_visibility"."is_public_readable" IS 'When true, Supabase Storage policy allows anonymous CDN read. API MUST NOT require auth for download URLs of these objects.';



CREATE TABLE IF NOT EXISTS "public"."notification_device" (
    "notification_device_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iam_profile_fk" "uuid" NOT NULL,
    "device_platform_code" "text" NOT NULL,
    "push_token" "text" NOT NULL,
    "device_label" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_notification_device_platform" CHECK (("device_platform_code" = ANY (ARRAY['IOS'::"text", 'ANDROID'::"text", 'WEB'::"text"])))
);


ALTER TABLE "public"."notification_device" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_device" IS 'Push device registry for Expo/FCM/APNs tokens. When app refreshes token, update/insert active row. is_active=false when provider reports token invalid or user logs out. Required for BAM Bag drop push notifications and pickup reminders.';



COMMENT ON COLUMN "public"."notification_device"."push_token" IS 'Expo/FCM/APNs push token. Unique. Treat as sensitive; never expose to other users.';



CREATE SEQUENCE IF NOT EXISTS "public"."order_order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_order_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_transition" (
    "order_status_transition_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_fk" "uuid" NOT NULL,
    "from_status_code" "text",
    "to_status_code" "text" NOT NULL,
    "transition_reason_code" "text",
    "actor_profile_fk" "uuid",
    "metadata_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_status_transition" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_status_transition" IS 'APPEND-ONLY order status audit trail. Each order_order.order_status_code change MUST append one row. Used for consumer order timeline, support investigations, and audit. metadata_json may include payment_intent_fk, webhook_event_fk, pickup_verification_event_fk, refund_fk.';



COMMENT ON COLUMN "public"."order_status_transition"."transition_reason_code" IS 'Machine code for why transition happened. Example: PAYMENT_CAPTURED, STAFF_QR_VERIFIED, PICKUP_WINDOW_EXPIRED, ADMIN_CANCELLED.';



CREATE TABLE IF NOT EXISTS "public"."privacy_consent_event" (
    "privacy_consent_event_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iam_profile_fk" "uuid" NOT NULL,
    "privacy_consent_purpose_fk" "uuid" NOT NULL,
    "consent_state_code" "text" NOT NULL,
    "policy_version" "text" NOT NULL,
    "capture_source_code" "text" NOT NULL,
    "proof_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recorded_by_profile_fk" "uuid",
    CONSTRAINT "ck_privacy_consent_state" CHECK (("consent_state_code" = ANY (ARRAY['GRANTED'::"text", 'REVOKED'::"text"])))
);


ALTER TABLE "public"."privacy_consent_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."privacy_consent_event" IS 'APPEND-ONLY. DPDP consent audit ledger. Never UPDATE or DELETE rows. To determine current consent: query latest row per (iam_profile_fk, privacy_consent_purpose_fk) ordered by recorded_at DESC. proof_json stores UI context (screen_name, consent_text_shown, policy_version_text) for legal audit. Immutability enforced by trigger raise_immutable_error.';



COMMENT ON COLUMN "public"."privacy_consent_event"."consent_state_code" IS 'GRANTED or REVOKED. Append a REVOKED row to record withdrawal; never delete the GRANTED row.';



COMMENT ON COLUMN "public"."privacy_consent_event"."policy_version" IS 'Version of the Privacy Policy shown when consent was captured. Example: v1.2, 2024-01-15.';



COMMENT ON COLUMN "public"."privacy_consent_event"."capture_source_code" IS 'Context of capture. Example: SIGNUP_FLOW, SETTINGS_PAGE, ADMIN_ACTION, SYSTEM_GRANT.';



COMMENT ON COLUMN "public"."privacy_consent_event"."proof_json" IS 'UI audit context: { "screen_name": "signup_consent", "consent_text_shown": "...", "checkbox_label": "..." }.';



CREATE TABLE IF NOT EXISTS "public"."privacy_consent_purpose" (
    "privacy_consent_purpose_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purpose_code" "text" NOT NULL,
    "purpose_name" "text" NOT NULL,
    "description" "text",
    "is_required_for_service" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_order" integer
);


ALTER TABLE "public"."privacy_consent_purpose" OWNER TO "postgres";


COMMENT ON TABLE "public"."privacy_consent_purpose" IS 'DPDP Act: each distinct processing purpose requires separate consent. is_required_for_service=true means the purpose cannot be revoked without closing the account. Seed: OPERATIONAL (required, service delivery), MARKETING_EMAIL (optional), MARKETING_WHATSAPP (optional), ANALYTICS (optional), REFERRAL_COMMS (optional), PUSH_NOTIFICATIONS (optional).';



COMMENT ON COLUMN "public"."privacy_consent_purpose"."is_required_for_service" IS 'When true, this consent is essential to provide the goZaika service and cannot be independently revoked. Displayed to user as mandatory at signup.';



CREATE TABLE IF NOT EXISTS "public"."privacy_erasure_request" (
    "privacy_erasure_request_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iam_profile_fk" "uuid" NOT NULL,
    "erasure_status_code" "text" DEFAULT 'REQUESTED'::"text" NOT NULL,
    "requested_reason" "text",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_by_profile_fk" "uuid",
    "reviewed_at" timestamp with time zone,
    "executed_at" timestamp with time zone,
    "rejected_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_privacy_erasure_status" CHECK (("erasure_status_code" = ANY (ARRAY['REQUESTED'::"text", 'IN_REVIEW'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'EXECUTING'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."privacy_erasure_request" OWNER TO "postgres";


COMMENT ON TABLE "public"."privacy_erasure_request" IS 'DPDP erasure right-to-be-forgotten workflow. Status machine: REQUESTED → IN_REVIEW → APPROVED | REJECTED → EXECUTING → COMPLETED | CANCELLED. On EXECUTING: anonymise iam_profile (null phone/email/name), delete consumer PII, revoke Supabase Auth session, purge Supabase Storage personal uploads. RETAIN: financial records per retention_policy, consent events (legal proof), audit_log. RESTRICT on iam_profile delete: profile must remain until erasure is COMPLETED.';



COMMENT ON COLUMN "public"."privacy_erasure_request"."erasure_status_code" IS 'REQUESTED → IN_REVIEW → APPROVED or REJECTED → EXECUTING → COMPLETED. CANCELLED if user withdraws request or admin determines not applicable.';



CREATE TABLE IF NOT EXISTS "public"."privacy_retention_policy" (
    "privacy_retention_policy_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "policy_code" "text" NOT NULL,
    "applies_to_table_name" "text" NOT NULL,
    "retention_days" integer,
    "anonymize_after_days" integer,
    "purge_after_days" integer,
    "legal_hold_supported" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."privacy_retention_policy" OWNER TO "postgres";


COMMENT ON TABLE "public"."privacy_retention_policy" IS 'SERVICE-ROLE ONLY. Data retention schedule per table. Managed by legal/compliance. Enforced by scheduled Edge Function jobs. Seed policies: ORDER_7Y (order data, 7yr GST), FINANCE_7Y (financial entries, 7yr), CONSENT_PERMANENT (privacy_consent_event, permanent), AUDIT_3Y (audit_log, 3yr), ANALYTICS_2Y_5Y (anonymise at 2yr, purge at 5yr), KYC_5Y_POST_DEACT (restaurant_document, 5yr post-deactivation), NOTIFICATION_90D (delivery attempts, 90 days).';



COMMENT ON COLUMN "public"."privacy_retention_policy"."retention_days" IS 'Days to retain row before action. NULL = indefinite.';



COMMENT ON COLUMN "public"."privacy_retention_policy"."anonymize_after_days" IS 'Days after which PII fields are nulled/hashed. Used for analytics_event anonymisation.';



COMMENT ON COLUMN "public"."privacy_retention_policy"."purge_after_days" IS 'Days after which the row is hard-deleted. Applies after legal_hold expires.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_commission_override" (
    "restaurant_commission_override_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "restaurant_commission_plan_fk" "uuid",
    "override_commission_bps" integer,
    "override_platform_fee_paise" bigint,
    "effective_from_at" timestamp with time zone NOT NULL,
    "effective_until_at" timestamp with time zone,
    "reason_text" "text",
    "created_by_profile_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_restaurant_commission_override_bps" CHECK ((("override_commission_bps" IS NULL) OR (("override_commission_bps" >= 0) AND ("override_commission_bps" <= 10000)))),
    CONSTRAINT "ck_restaurant_commission_override_fee" CHECK ((("override_platform_fee_paise" IS NULL) OR ("override_platform_fee_paise" >= 0))),
    CONSTRAINT "ck_restaurant_commission_override_window" CHECK ((("effective_until_at" IS NULL) OR ("effective_until_at" > "effective_from_at")))
);


ALTER TABLE "public"."restaurant_commission_override" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_commission_override" IS 'Restaurant-specific commission override, time-bounded. Settlement logic selects active override for order.created_at; if none, uses default plan. Never edit historical override rows after settlements are locked; create new override.';



COMMENT ON COLUMN "public"."restaurant_commission_override"."override_commission_bps" IS 'If non-null, overrides plan commission_bps for the effective window.';



COMMENT ON COLUMN "public"."restaurant_commission_override"."effective_from_at" IS 'Inclusive start timestamp. Settlement engine uses order.created_at within [from, until).';



CREATE TABLE IF NOT EXISTS "public"."restaurant_commission_plan" (
    "restaurant_commission_plan_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_code" "text" NOT NULL,
    "plan_name" "text" NOT NULL,
    "commission_bps" integer NOT NULL,
    "platform_fee_paise" bigint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    CONSTRAINT "ck_restaurant_commission_bps" CHECK ((("commission_bps" >= 0) AND ("commission_bps" <= 10000))),
    CONSTRAINT "ck_restaurant_platform_fee" CHECK (("platform_fee_paise" >= 0))
);


ALTER TABLE "public"."restaurant_commission_plan" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_commission_plan" IS 'Default commission plans for restaurants. bps = basis points (10000 = 100%). Used by settlement calculations unless restaurant_commission_override applies. Example: STANDARD_15 = 1500 bps (15%).';



COMMENT ON COLUMN "public"."restaurant_commission_plan"."commission_bps" IS 'Commission in basis points. 1500 = 15%. Used to compute finance_restaurant_payout_entry commission amounts.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_compliance" (
    "restaurant_compliance_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "fssai_license_number" "text",
    "fssai_license_expiry_date" "date",
    "gstin" "text",
    "pan_number" "text",
    "compliance_status_code" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "last_reviewed_by_profile_fk" "uuid",
    "last_reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_restaurant_compliance_status" CHECK (("compliance_status_code" = ANY (ARRAY['PENDING'::"text", 'UNDER_REVIEW'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'EXPIRED'::"text"])))
);


ALTER TABLE "public"."restaurant_compliance" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_compliance" IS 'Compliance summary for a restaurant. Underlying documents are in restaurant_document. Admin onboarding flow updates this row. Restaurant cannot become ACTIVE until compliance_status_code=APPROVED and required documents are APPROVED. FSSAI license is food-safety critical and surfaced in admin portal.';



COMMENT ON COLUMN "public"."restaurant_compliance"."fssai_license_number" IS 'FSSAI license number. Required before ACTIVE. Validate format in API where possible.';



COMMENT ON COLUMN "public"."restaurant_compliance"."fssai_license_expiry_date" IS 'If date < current_date, compliance_status_code should become EXPIRED by scheduled job.';



COMMENT ON COLUMN "public"."restaurant_compliance"."gstin" IS 'GSTIN for invoices and settlement tax reporting.';



COMMENT ON COLUMN "public"."restaurant_compliance"."pan_number" IS 'PAN for payout/KYC. Access limited to finance/admin service-role paths.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_contact" (
    "restaurant_contact_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "contact_type_code" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "email_address" "public"."citext",
    "phone_e164" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_restaurant_contact_type" CHECK (("contact_type_code" = ANY (ARRAY['OWNER'::"text", 'MANAGER'::"text", 'FINANCE'::"text", 'PICKUP'::"text", 'SUPPORT'::"text", 'LEGAL'::"text"])))
);


ALTER TABLE "public"."restaurant_contact" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_contact" IS 'Operational and legal contacts for a restaurant. Not all contacts need auth accounts. Contacts differ from restaurant_team_membership: team_membership grants system access; contact is just communication metadata. is_primary=true is app-enforced at most one per contact_type_code per restaurant.';



COMMENT ON COLUMN "public"."restaurant_contact"."contact_type_code" IS 'OWNER, MANAGER, FINANCE, PICKUP, SUPPORT, LEGAL. Used for routing notifications and admin escalation.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_cuisine_map" (
    "restaurant_cuisine_map_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "master_cuisine_fk" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."restaurant_cuisine_map" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_cuisine_map" IS 'Cuisine tags for restaurant discovery and filtering. A restaurant may have multiple cuisines; is_primary=true controls primary badge on cards. Do not infer bag-specific cuisine from this table — individual bag templates may differ.';



COMMENT ON COLUMN "public"."restaurant_cuisine_map"."is_primary" IS 'Primary cuisine shown on restaurant card. API enforces at most one primary cuisine per restaurant.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_document" (
    "restaurant_document_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "master_document_type_fk" "uuid" NOT NULL,
    "master_document_status_fk" "uuid" NOT NULL,
    "storage_object_fk" "uuid",
    "document_number" "text",
    "issued_at" "date",
    "expires_at" "date",
    "rejection_reason" "text",
    "uploaded_by_profile_fk" "uuid",
    "reviewed_by_profile_fk" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."restaurant_document" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_document" IS 'Compliance/KYC document metadata for a restaurant. File stored in Supabase Storage and tracked by storage_object_fk. SERVICE_ONLY visibility for KYC/FSSAI/PAN/bank docs. Admin review updates master_document_status_fk and reviewed_at/by. Rejected docs require rejection_reason. Expired docs set status EXPIRED by scheduled job.';



COMMENT ON COLUMN "public"."restaurant_document"."storage_object_fk" IS 'FK to storage_object storing the actual document. SERVICE_ONLY visibility expected. Patched after storage_object table.';



COMMENT ON COLUMN "public"."restaurant_document"."expires_at" IS 'Used by scheduled compliance job to flag EXPIRED document status and pause restaurant if required.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_onboarding_task" (
    "restaurant_onboarding_task_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "task_code" "text" NOT NULL,
    "task_name" "text" NOT NULL,
    "task_status_code" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "due_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "completed_by_profile_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_restaurant_onboarding_task_status" CHECK (("task_status_code" = ANY (ARRAY['PENDING'::"text", 'IN_PROGRESS'::"text", 'BLOCKED'::"text", 'COMPLETED'::"text", 'WAIVED'::"text"])))
);


ALTER TABLE "public"."restaurant_onboarding_task" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_onboarding_task" IS 'Operational onboarding checklist shown in admin portal and restaurant management portal. Tasks drive readiness to publish first drop. Seed per restaurant: UPLOAD_FSSAI, VERIFY_BANK_ACCOUNT, CREATE_FIRST_TEMPLATE, PUBLISH_FIRST_DROP, TRAIN_PICKUP_STAFF, SET_PICKUP_INSTRUCTIONS.';



COMMENT ON COLUMN "public"."restaurant_onboarding_task"."task_status_code" IS 'PENDING → IN_PROGRESS → COMPLETED, or BLOCKED/WAIVED by admin. Restaurant cannot publish until required tasks complete/waived.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_setting" (
    "restaurant_setting_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."restaurant_setting" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_setting" IS 'Per-restaurant configuration overrides. Examples: default_hold_minutes, pickup_grace_minutes, auto_publish_enabled, default_pickup_instruction_text, staff_sound_alert_enabled. Do not store secrets here. setting_value_json shape is validated in API.';



COMMENT ON COLUMN "public"."restaurant_setting"."setting_key" IS 'Stable snake_case key. Validate against application allowlist to prevent arbitrary config sprawl.';



COMMENT ON COLUMN "public"."restaurant_setting"."setting_value_json" IS 'JSON value for this setting. API owns schema validation.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_team_membership" (
    "restaurant_team_membership_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "iam_profile_fk" "uuid" NOT NULL,
    "restaurant_team_role_fk" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "invited_by_profile_fk" "uuid",
    "joined_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."restaurant_team_membership" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_team_membership" IS 'Maps iam_profiles to restaurants with a role. A profile can hold memberships at multiple restaurants. RLS helper has_restaurant_access(restaurant_id) checks is_active=true here. On membership create: set iam_profile.is_restaurant_user = true. On last active membership deactivated: set false. CASCADE on iam_profile means DPDP erasure removes all memberships.';



COMMENT ON COLUMN "public"."restaurant_team_membership"."is_default" IS 'Primary restaurant for profiles who manage multiple restaurants. Determines portal landing. One is_default=true per iam_profile recommended (app-enforced).';



COMMENT ON COLUMN "public"."restaurant_team_membership"."invited_by_profile_fk" IS 'The profile who sent the team invitation. SET NULL if that profile is later deleted.';



COMMENT ON COLUMN "public"."restaurant_team_membership"."joined_at" IS 'When invited member accepted their invitation. NULL until accepted.';



CREATE TABLE IF NOT EXISTS "public"."restaurant_team_role" (
    "restaurant_team_role_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_code" "text" NOT NULL,
    "role_name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."restaurant_team_role" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_team_role" IS 'Restaurant staff role definitions. Capabilities via restaurant_team_role_scope. Seed: OWNER (full access, billing, team management), ADMIN (drops + analytics + team), OPERATIONS (drop create/manage, order view), PICKUP_STAFF (pickup verification only — staff app only), FINANCE (financial reports and invoice access, read-only).';



CREATE TABLE IF NOT EXISTS "public"."restaurant_team_role_scope" (
    "restaurant_team_role_scope_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_team_role_fk" "uuid" NOT NULL,
    "master_scope_fk" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."restaurant_team_role_scope" OWNER TO "postgres";


COMMENT ON TABLE "public"."restaurant_team_role_scope" IS 'Fine-grained capability grants for restaurant team roles. Middleware has_restaurant_scope(restaurant_id, scope_code) checks via join: restaurant_team_membership → restaurant_team_role_scope → master_scope. CASCADE on role keeps rows clean.';



CREATE TABLE IF NOT EXISTS "public"."review_media" (
    "review_media_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_fk" "uuid" NOT NULL,
    "storage_object_fk" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."review_media" OWNER TO "postgres";


COMMENT ON TABLE "public"."review_media" IS 'Optional review images. Public display only after parent review is APPROVED and is_public=true. Images are usually OWNER_ONLY until moderation, then may be served through controlled public URL.';



CREATE TABLE IF NOT EXISTS "public"."review_review" (
    "review_review_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_fk" "uuid" NOT NULL,
    "consumer_profile_fk" "uuid" NOT NULL,
    "restaurant_fk" "uuid" NOT NULL,
    "rating_value" integer NOT NULL,
    "review_text" "text",
    "is_public" boolean DEFAULT true NOT NULL,
    "moderation_status_code" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "moderated_by_profile_fk" "uuid",
    "moderated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_review_moderation_status" CHECK (("moderation_status_code" = ANY (ARRAY['PENDING'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'HIDDEN'::"text"]))),
    CONSTRAINT "ck_review_rating" CHECK ((("rating_value" >= 1) AND ("rating_value" <= 5)))
);


ALTER TABLE "public"."review_review" OWNER TO "postgres";


COMMENT ON TABLE "public"."review_review" IS 'One review per collected order. Reviews are moderated before public display. Only consumers who placed the order can create. Restaurant can read public/own reviews, not edit.';



COMMENT ON COLUMN "public"."review_review"."moderation_status_code" IS 'PENDING by default. APPROVED visible publicly if is_public=true. REJECTED/HIDDEN not shown.';



CREATE TABLE IF NOT EXISTS "public"."storage_object" (
    "storage_object_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_name" "text" NOT NULL,
    "object_path" "text" NOT NULL,
    "original_filename" "text",
    "mime_type" "text",
    "size_bytes" bigint,
    "checksum_sha256_hex" "text",
    "master_storage_visibility_fk" "uuid" NOT NULL,
    "uploaded_by_profile_fk" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_storage_object_size" CHECK ((("size_bytes" IS NULL) OR ("size_bytes" >= 0)))
);


ALTER TABLE "public"."storage_object" OWNER TO "postgres";


COMMENT ON TABLE "public"."storage_object" IS 'Metadata pointer to Supabase Storage objects. The binary file lives in Storage; this row tracks visibility, uploader, filename, checksum, and relationship targets. Supabase Storage bucket policies MUST mirror master_storage_visibility. Public images use PUBLIC_CDN. KYC, FSSAI, bank docs use SERVICE_ONLY.';



COMMENT ON COLUMN "public"."storage_object"."bucket_name" IS 'Supabase Storage bucket. Launch buckets: public-media, private-documents, exports.';



COMMENT ON COLUMN "public"."storage_object"."object_path" IS 'Object key/path in bucket. Unique within bucket. Use stable prefixed paths: restaurants/{id}/hero.jpg, drops/{id}/primary.jpg.';



COMMENT ON COLUMN "public"."storage_object"."checksum_sha256_hex" IS 'Optional SHA-256 checksum for duplicate detection and tamper audit.';



COMMENT ON COLUMN "public"."storage_object"."master_storage_visibility_fk" IS 'Visibility policy FK. Drives URL-generation logic and Storage RLS.';



CREATE TABLE IF NOT EXISTS "public"."website_contact_submission" (
    "contact_submission_pk" bigint NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "subject_code" "text" NOT NULL,
    "message" "text" NOT NULL,
    "responded_flag" boolean DEFAULT false NOT NULL,
    "created_on" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_on" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_website_contact_submission_email_format" CHECK (("email" ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'::"text")),
    CONSTRAINT "ck_website_contact_submission_message_length" CHECK ((("char_length"("message") >= 10) AND ("char_length"("message") <= 2000))),
    CONSTRAINT "contact_submission_subject_code_check" CHECK (("subject_code" = ANY (ARRAY['general'::"text", 'restaurant'::"text", 'investor'::"text", 'press'::"text", 'careers'::"text"])))
);


ALTER TABLE "public"."website_contact_submission" OWNER TO "postgres";


ALTER TABLE "public"."website_contact_submission" ALTER COLUMN "contact_submission_pk" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."website_contact_submission_contact_submission_pk_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."website_partner_interest" (
    "partner_interest_pk" bigint NOT NULL,
    "restaurant_name" "text" NOT NULL,
    "owner_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "city_name" "text" NOT NULL,
    "cuisine_name" "text" NOT NULL,
    "daily_covers" "text" NOT NULL,
    "message" "text",
    "status_code" "text" DEFAULT 'new'::"text" NOT NULL,
    "created_on" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_on" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_website_partner_interest_email_format" CHECK (("email" ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'::"text")),
    CONSTRAINT "partner_interest_status_code_check" CHECK (("status_code" = ANY (ARRAY['new'::"text", 'contacted'::"text", 'qualified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."website_partner_interest" OWNER TO "postgres";


ALTER TABLE "public"."website_partner_interest" ALTER COLUMN "partner_interest_pk" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."website_partner_interest_partner_interest_pk_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."website_waitlist_lead" (
    "waitlist_lead_pk" bigint NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "city_name" "text" DEFAULT 'Hyderabad'::"text" NOT NULL,
    "role_code" "text" NOT NULL,
    "source_code" "text" DEFAULT 'website_waitlist'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_on" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_on" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_website_waitlist_lead_email_format" CHECK (("email" ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'::"text")),
    CONSTRAINT "waitlist_lead_role_code_check" CHECK (("role_code" = ANY (ARRAY['consumer'::"text", 'restaurant'::"text"])))
);


ALTER TABLE "public"."website_waitlist_lead" OWNER TO "postgres";


ALTER TABLE "public"."website_waitlist_lead" ALTER COLUMN "waitlist_lead_pk" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."website_waitlist_lead_waitlist_lead_pk_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."analytics_event" ATTACH PARTITION "public"."analytics_event_2026_q2" FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');



ALTER TABLE ONLY "public"."analytics_event" ATTACH PARTITION "public"."analytics_event_2026_q3" FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');



ALTER TABLE ONLY "public"."analytics_event" ATTACH PARTITION "public"."analytics_event_default" DEFAULT;



ALTER TABLE ONLY "public"."admin_data_correction"
    ADD CONSTRAINT "admin_data_correction_pk" PRIMARY KEY ("admin_data_correction_pk");



ALTER TABLE ONLY "public"."admin_export_job"
    ADD CONSTRAINT "admin_export_job_pk" PRIMARY KEY ("admin_export_job_pk");



ALTER TABLE ONLY "public"."analytics_event"
    ADD CONSTRAINT "analytics_event_pkey" PRIMARY KEY ("analytics_event_pk", "created_at");



ALTER TABLE ONLY "public"."analytics_event_2026_q2"
    ADD CONSTRAINT "analytics_event_2026_q2_pkey" PRIMARY KEY ("analytics_event_pk", "created_at");



ALTER TABLE ONLY "public"."analytics_event_2026_q3"
    ADD CONSTRAINT "analytics_event_2026_q3_pkey" PRIMARY KEY ("analytics_event_pk", "created_at");



ALTER TABLE ONLY "public"."analytics_event_default"
    ADD CONSTRAINT "analytics_event_default_pkey" PRIMARY KEY ("analytics_event_pk", "created_at");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pk" PRIMARY KEY ("audit_log_pk");



ALTER TABLE ONLY "public"."billing_subscription_charge"
    ADD CONSTRAINT "billing_subscription_charge_pk" PRIMARY KEY ("billing_subscription_charge_pk");



ALTER TABLE ONLY "public"."billing_subscription_event"
    ADD CONSTRAINT "billing_subscription_event_pk" PRIMARY KEY ("billing_subscription_event_pk");



ALTER TABLE ONLY "public"."catalog_bag_template_allergen"
    ADD CONSTRAINT "catalog_bag_template_allergen_pk" PRIMARY KEY ("catalog_bag_template_allergen_pk");



ALTER TABLE ONLY "public"."catalog_bag_template_media"
    ADD CONSTRAINT "catalog_bag_template_media_pk" PRIMARY KEY ("catalog_bag_template_media_pk");



ALTER TABLE ONLY "public"."catalog_bag_template"
    ADD CONSTRAINT "catalog_bag_template_pk" PRIMARY KEY ("catalog_bag_template_pk");



ALTER TABLE ONLY "public"."catalog_bag_template_revision"
    ADD CONSTRAINT "catalog_bag_template_revision_pk" PRIMARY KEY ("catalog_bag_template_revision_pk");



ALTER TABLE ONLY "public"."cms_banner"
    ADD CONSTRAINT "cms_banner_pk" PRIMARY KEY ("cms_banner_pk");



ALTER TABLE ONLY "public"."cms_city_page"
    ADD CONSTRAINT "cms_city_page_pk" PRIMARY KEY ("cms_city_page_pk");



ALTER TABLE ONLY "public"."cms_page"
    ADD CONSTRAINT "cms_page_pk" PRIMARY KEY ("cms_page_pk");



ALTER TABLE ONLY "public"."cms_post"
    ADD CONSTRAINT "cms_post_pk" PRIMARY KEY ("cms_post_pk");



ALTER TABLE ONLY "public"."cms_restaurant_feature"
    ADD CONSTRAINT "cms_restaurant_feature_pk" PRIMARY KEY ("cms_restaurant_feature_pk");



ALTER TABLE ONLY "public"."cms_seo_metadata"
    ADD CONSTRAINT "cms_seo_metadata_pk" PRIMARY KEY ("cms_seo_metadata_pk");



ALTER TABLE ONLY "public"."config_feature_flag"
    ADD CONSTRAINT "config_feature_flag_pk" PRIMARY KEY ("config_feature_flag_pk");



ALTER TABLE ONLY "public"."config_runtime_setting"
    ADD CONSTRAINT "config_runtime_setting_pk" PRIMARY KEY ("config_runtime_setting_pk");



ALTER TABLE ONLY "public"."consumer_allergen_preference"
    ADD CONSTRAINT "consumer_allergen_preference_pk" PRIMARY KEY ("consumer_allergen_preference_pk");



ALTER TABLE ONLY "public"."consumer_city_preference"
    ADD CONSTRAINT "consumer_city_preference_pk" PRIMARY KEY ("consumer_city_preference_pk");



ALTER TABLE ONLY "public"."consumer_dietary_preference"
    ADD CONSTRAINT "consumer_dietary_preference_pk" PRIMARY KEY ("consumer_dietary_preference_pk");



ALTER TABLE ONLY "public"."consumer_notification_preference"
    ADD CONSTRAINT "consumer_notification_preference_pk" PRIMARY KEY ("consumer_notification_preference_pk");



ALTER TABLE ONLY "public"."consumer_passport_stat"
    ADD CONSTRAINT "consumer_passport_stat_pk" PRIMARY KEY ("consumer_passport_stat_pk");



ALTER TABLE ONLY "public"."consumer_profile"
    ADD CONSTRAINT "consumer_profile_pk" PRIMARY KEY ("consumer_profile_pk");



ALTER TABLE ONLY "public"."consumer_referral_code"
    ADD CONSTRAINT "consumer_referral_code_pk" PRIMARY KEY ("consumer_referral_code_pk");



ALTER TABLE ONLY "public"."consumer_referral"
    ADD CONSTRAINT "consumer_referral_pk" PRIMARY KEY ("consumer_referral_pk");



ALTER TABLE ONLY "public"."consumer_saved_restaurant"
    ADD CONSTRAINT "consumer_saved_restaurant_pk" PRIMARY KEY ("consumer_saved_restaurant_pk");



ALTER TABLE ONLY "public"."consumer_subscription"
    ADD CONSTRAINT "consumer_subscription_pk" PRIMARY KEY ("consumer_subscription_pk");



ALTER TABLE ONLY "public"."consumer_subscription_plan"
    ADD CONSTRAINT "consumer_subscription_plan_pk" PRIMARY KEY ("consumer_subscription_plan_pk");



ALTER TABLE ONLY "public"."dev_demo_seed_registry"
    ADD CONSTRAINT "dev_demo_seed_registry_pk" PRIMARY KEY ("dev_demo_seed_registry_pk");



ALTER TABLE ONLY "public"."drop_audience"
    ADD CONSTRAINT "drop_audience_pk" PRIMARY KEY ("drop_audience_pk");



ALTER TABLE ONLY "public"."drop_closure_log"
    ADD CONSTRAINT "drop_closure_log_pk" PRIMARY KEY ("drop_closure_log_pk");



ALTER TABLE ONLY "public"."drop_drop"
    ADD CONSTRAINT "drop_drop_pk" PRIMARY KEY ("drop_drop_pk");



ALTER TABLE ONLY "public"."drop_inventory_event"
    ADD CONSTRAINT "drop_inventory_event_pk" PRIMARY KEY ("drop_inventory_event_pk");



ALTER TABLE ONLY "public"."drop_inventory_hold"
    ADD CONSTRAINT "drop_inventory_hold_pk" PRIMARY KEY ("drop_inventory_hold_pk");



ALTER TABLE ONLY "public"."drop_media"
    ADD CONSTRAINT "drop_media_pk" PRIMARY KEY ("drop_media_pk");



ALTER TABLE ONLY "public"."drop_recurring_schedule"
    ADD CONSTRAINT "drop_recurring_schedule_pk" PRIMARY KEY ("drop_recurring_schedule_pk");



ALTER TABLE ONLY "public"."finance_invoice"
    ADD CONSTRAINT "finance_invoice_pk" PRIMARY KEY ("finance_invoice_pk");



ALTER TABLE ONLY "public"."finance_restaurant_payout_entry"
    ADD CONSTRAINT "finance_payout_entry_pk" PRIMARY KEY ("finance_restaurant_payout_entry_pk");



ALTER TABLE ONLY "public"."finance_settlement_run"
    ADD CONSTRAINT "finance_settlement_run_pk" PRIMARY KEY ("finance_settlement_run_pk");



ALTER TABLE ONLY "public"."geo_address"
    ADD CONSTRAINT "geo_address_pk" PRIMARY KEY ("geo_address_pk");



ALTER TABLE ONLY "public"."geo_city"
    ADD CONSTRAINT "geo_city_pk" PRIMARY KEY ("geo_city_pk");



ALTER TABLE ONLY "public"."geo_neighborhood"
    ADD CONSTRAINT "geo_neighborhood_pk" PRIMARY KEY ("geo_neighborhood_pk");



ALTER TABLE ONLY "public"."iam_platform_membership"
    ADD CONSTRAINT "iam_platform_membership_pk" PRIMARY KEY ("iam_platform_membership_pk");



ALTER TABLE ONLY "public"."iam_platform_role"
    ADD CONSTRAINT "iam_platform_role_pk" PRIMARY KEY ("iam_platform_role_pk");



ALTER TABLE ONLY "public"."iam_platform_role_scope"
    ADD CONSTRAINT "iam_platform_role_scope_pk" PRIMARY KEY ("iam_platform_role_scope_pk");



ALTER TABLE ONLY "public"."iam_profile"
    ADD CONSTRAINT "iam_profile_pk" PRIMARY KEY ("iam_profile_pk");



ALTER TABLE ONLY "public"."incident_event"
    ADD CONSTRAINT "incident_event_pk" PRIMARY KEY ("incident_event_pk");



ALTER TABLE ONLY "public"."incident_incident"
    ADD CONSTRAINT "incident_incident_pk" PRIMARY KEY ("incident_incident_pk");



ALTER TABLE ONLY "public"."marketing_partner_lead"
    ADD CONSTRAINT "marketing_partner_lead_pk" PRIMARY KEY ("marketing_partner_lead_pk");



ALTER TABLE ONLY "public"."marketing_waitlist_lead"
    ADD CONSTRAINT "marketing_waitlist_lead_pk" PRIMARY KEY ("marketing_waitlist_lead_pk");



ALTER TABLE ONLY "public"."master_allergen"
    ADD CONSTRAINT "master_allergen_pk" PRIMARY KEY ("master_allergen_pk");



ALTER TABLE ONLY "public"."master_audience_segment"
    ADD CONSTRAINT "master_audience_segment_pk" PRIMARY KEY ("master_audience_segment_pk");



ALTER TABLE ONLY "public"."master_cuisine"
    ADD CONSTRAINT "master_cuisine_pk" PRIMARY KEY ("master_cuisine_pk");



ALTER TABLE ONLY "public"."master_document_status"
    ADD CONSTRAINT "master_document_status_pk" PRIMARY KEY ("master_document_status_pk");



ALTER TABLE ONLY "public"."master_document_type"
    ADD CONSTRAINT "master_document_type_pk" PRIMARY KEY ("master_document_type_pk");



ALTER TABLE ONLY "public"."master_incident_severity"
    ADD CONSTRAINT "master_incident_severity_pk" PRIMARY KEY ("master_incident_severity_pk");



ALTER TABLE ONLY "public"."master_incident_status"
    ADD CONSTRAINT "master_incident_status_pk" PRIMARY KEY ("master_incident_status_pk");



ALTER TABLE ONLY "public"."master_incident_type"
    ADD CONSTRAINT "master_incident_type_pk" PRIMARY KEY ("master_incident_type_pk");



ALTER TABLE ONLY "public"."master_scope"
    ADD CONSTRAINT "master_scope_pk" PRIMARY KEY ("master_scope_pk");



ALTER TABLE ONLY "public"."master_storage_visibility"
    ADD CONSTRAINT "master_storage_visibility_pk" PRIMARY KEY ("master_storage_visibility_pk");



ALTER TABLE ONLY "public"."master_support_ticket_priority"
    ADD CONSTRAINT "master_support_ticket_priority_pk" PRIMARY KEY ("master_support_ticket_priority_pk");



ALTER TABLE ONLY "public"."master_support_ticket_status"
    ADD CONSTRAINT "master_support_ticket_status_pk" PRIMARY KEY ("master_support_ticket_status_pk");



ALTER TABLE ONLY "public"."master_support_ticket_type"
    ADD CONSTRAINT "master_support_ticket_type_pk" PRIMARY KEY ("master_support_ticket_type_pk");



ALTER TABLE ONLY "public"."notification_delivery_attempt"
    ADD CONSTRAINT "notification_delivery_attempt_pk" PRIMARY KEY ("notification_delivery_attempt_pk");



ALTER TABLE ONLY "public"."notification_device"
    ADD CONSTRAINT "notification_device_pk" PRIMARY KEY ("notification_device_pk");



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "notification_outbox_pk" PRIMARY KEY ("notification_outbox_pk");



ALTER TABLE ONLY "public"."notification_template"
    ADD CONSTRAINT "notification_template_pk" PRIMARY KEY ("notification_template_pk");



ALTER TABLE ONLY "public"."order_item"
    ADD CONSTRAINT "order_item_pk" PRIMARY KEY ("order_item_pk");



ALTER TABLE ONLY "public"."order_order"
    ADD CONSTRAINT "order_order_pk" PRIMARY KEY ("order_order_pk");



ALTER TABLE ONLY "public"."order_pickup_verification_event"
    ADD CONSTRAINT "order_pickup_verification_event_pk" PRIMARY KEY ("order_pickup_verification_event_pk");



ALTER TABLE ONLY "public"."order_status_transition"
    ADD CONSTRAINT "order_status_transition_pk" PRIMARY KEY ("order_status_transition_pk");



ALTER TABLE ONLY "public"."payment_order_intent"
    ADD CONSTRAINT "payment_order_intent_pk" PRIMARY KEY ("payment_order_intent_pk");



ALTER TABLE ONLY "public"."payment_refund"
    ADD CONSTRAINT "payment_refund_pk" PRIMARY KEY ("payment_refund_pk");



ALTER TABLE ONLY "public"."payment_transaction"
    ADD CONSTRAINT "payment_transaction_pk" PRIMARY KEY ("payment_transaction_pk");



ALTER TABLE ONLY "public"."payment_webhook_event"
    ADD CONSTRAINT "payment_webhook_event_pk" PRIMARY KEY ("payment_webhook_event_pk");



ALTER TABLE ONLY "public"."privacy_consent_event"
    ADD CONSTRAINT "privacy_consent_event_pk" PRIMARY KEY ("privacy_consent_event_pk");



ALTER TABLE ONLY "public"."privacy_consent_purpose"
    ADD CONSTRAINT "privacy_consent_purpose_pk" PRIMARY KEY ("privacy_consent_purpose_pk");



ALTER TABLE ONLY "public"."privacy_erasure_request"
    ADD CONSTRAINT "privacy_erasure_request_pk" PRIMARY KEY ("privacy_erasure_request_pk");



ALTER TABLE ONLY "public"."privacy_retention_policy"
    ADD CONSTRAINT "privacy_retention_policy_pk" PRIMARY KEY ("privacy_retention_policy_pk");



ALTER TABLE ONLY "public"."restaurant_commission_override"
    ADD CONSTRAINT "restaurant_commission_override_pk" PRIMARY KEY ("restaurant_commission_override_pk");



ALTER TABLE ONLY "public"."restaurant_commission_plan"
    ADD CONSTRAINT "restaurant_commission_plan_pk" PRIMARY KEY ("restaurant_commission_plan_pk");



ALTER TABLE ONLY "public"."restaurant_compliance"
    ADD CONSTRAINT "restaurant_compliance_pk" PRIMARY KEY ("restaurant_compliance_pk");



ALTER TABLE ONLY "public"."restaurant_contact"
    ADD CONSTRAINT "restaurant_contact_pk" PRIMARY KEY ("restaurant_contact_pk");



ALTER TABLE ONLY "public"."restaurant_cuisine_map"
    ADD CONSTRAINT "restaurant_cuisine_map_pk" PRIMARY KEY ("restaurant_cuisine_map_pk");



ALTER TABLE ONLY "public"."restaurant_document"
    ADD CONSTRAINT "restaurant_document_pk" PRIMARY KEY ("restaurant_document_pk");



ALTER TABLE ONLY "public"."restaurant_onboarding_task"
    ADD CONSTRAINT "restaurant_onboarding_task_pk" PRIMARY KEY ("restaurant_onboarding_task_pk");



ALTER TABLE ONLY "public"."restaurant_payout_account"
    ADD CONSTRAINT "restaurant_payout_account_pk" PRIMARY KEY ("restaurant_payout_account_pk");



ALTER TABLE ONLY "public"."restaurant_public_profile"
    ADD CONSTRAINT "restaurant_public_profile_pk" PRIMARY KEY ("restaurant_public_profile_pk");



ALTER TABLE ONLY "public"."restaurant_restaurant"
    ADD CONSTRAINT "restaurant_restaurant_pk" PRIMARY KEY ("restaurant_restaurant_pk");



ALTER TABLE ONLY "public"."restaurant_setting"
    ADD CONSTRAINT "restaurant_setting_pk" PRIMARY KEY ("restaurant_setting_pk");



ALTER TABLE ONLY "public"."restaurant_team_membership"
    ADD CONSTRAINT "restaurant_team_membership_pk" PRIMARY KEY ("restaurant_team_membership_pk");



ALTER TABLE ONLY "public"."restaurant_team_role"
    ADD CONSTRAINT "restaurant_team_role_pk" PRIMARY KEY ("restaurant_team_role_pk");



ALTER TABLE ONLY "public"."restaurant_team_role_scope"
    ADD CONSTRAINT "restaurant_team_role_scope_pk" PRIMARY KEY ("restaurant_team_role_scope_pk");



ALTER TABLE ONLY "public"."review_media"
    ADD CONSTRAINT "review_media_pk" PRIMARY KEY ("review_media_pk");



ALTER TABLE ONLY "public"."review_review"
    ADD CONSTRAINT "review_review_pk" PRIMARY KEY ("review_review_pk");



ALTER TABLE ONLY "public"."storage_object"
    ADD CONSTRAINT "storage_object_pk" PRIMARY KEY ("storage_object_pk");



ALTER TABLE ONLY "public"."support_ticket_event"
    ADD CONSTRAINT "support_ticket_event_pk" PRIMARY KEY ("support_ticket_event_pk");



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "support_ticket_pk" PRIMARY KEY ("support_ticket_pk");



ALTER TABLE ONLY "public"."catalog_bag_template_allergen"
    ADD CONSTRAINT "uq_catalog_bag_template_allergen" UNIQUE ("catalog_bag_template_revision_fk", "master_allergen_fk");



ALTER TABLE ONLY "public"."catalog_bag_template_revision"
    ADD CONSTRAINT "uq_catalog_bag_template_revision" UNIQUE ("catalog_bag_template_fk", "revision_number");



ALTER TABLE ONLY "public"."cms_banner"
    ADD CONSTRAINT "uq_cms_banner_code" UNIQUE ("banner_code");



ALTER TABLE ONLY "public"."cms_city_page"
    ADD CONSTRAINT "uq_cms_city_page_city" UNIQUE ("geo_city_fk");



ALTER TABLE ONLY "public"."cms_page"
    ADD CONSTRAINT "uq_cms_page_code" UNIQUE ("page_code");



ALTER TABLE ONLY "public"."cms_post"
    ADD CONSTRAINT "uq_cms_post_slug" UNIQUE ("post_slug");



ALTER TABLE ONLY "public"."cms_seo_metadata"
    ADD CONSTRAINT "uq_cms_seo_metadata_entity" UNIQUE ("entity_type_code", "entity_pk");



ALTER TABLE ONLY "public"."config_feature_flag"
    ADD CONSTRAINT "uq_config_feature_flag" UNIQUE ("flag_code", "scope_code", "scope_entity_pk");



ALTER TABLE ONLY "public"."config_runtime_setting"
    ADD CONSTRAINT "uq_config_runtime_setting" UNIQUE ("setting_code", "scope_code", "scope_entity_pk");



ALTER TABLE ONLY "public"."consumer_allergen_preference"
    ADD CONSTRAINT "uq_consumer_allergen_preference" UNIQUE ("consumer_profile_fk", "master_allergen_fk");



ALTER TABLE ONLY "public"."consumer_city_preference"
    ADD CONSTRAINT "uq_consumer_city_preference" UNIQUE ("consumer_profile_fk", "geo_city_fk");



ALTER TABLE ONLY "public"."consumer_dietary_preference"
    ADD CONSTRAINT "uq_consumer_dietary_preference" UNIQUE ("consumer_profile_fk", "dietary_category_code");



ALTER TABLE ONLY "public"."consumer_notification_preference"
    ADD CONSTRAINT "uq_consumer_notification_preference" UNIQUE ("consumer_profile_fk", "channel_code");



ALTER TABLE ONLY "public"."consumer_passport_stat"
    ADD CONSTRAINT "uq_consumer_passport_stat_cons" UNIQUE ("consumer_profile_fk");



ALTER TABLE ONLY "public"."consumer_profile"
    ADD CONSTRAINT "uq_consumer_profile_iam" UNIQUE ("iam_profile_fk");



ALTER TABLE ONLY "public"."consumer_referral_code"
    ADD CONSTRAINT "uq_consumer_referral_code_profile" UNIQUE ("consumer_profile_fk");



ALTER TABLE ONLY "public"."consumer_referral_code"
    ADD CONSTRAINT "uq_consumer_referral_code_value" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."consumer_referral"
    ADD CONSTRAINT "uq_consumer_referral_pair" UNIQUE ("referrer_consumer_profile_fk", "referred_consumer_profile_fk");



ALTER TABLE ONLY "public"."consumer_saved_restaurant"
    ADD CONSTRAINT "uq_consumer_saved_restaurant" UNIQUE ("consumer_profile_fk", "restaurant_fk");



ALTER TABLE ONLY "public"."consumer_subscription_plan"
    ADD CONSTRAINT "uq_consumer_subscription_plan_code" UNIQUE ("plan_code");



ALTER TABLE ONLY "public"."dev_demo_seed_registry"
    ADD CONSTRAINT "uq_dev_demo_seed_key" UNIQUE ("seed_key");



ALTER TABLE ONLY "public"."dev_demo_seed_registry"
    ADD CONSTRAINT "uq_dev_demo_seed_registry" UNIQUE ("entity_table", "entity_id");



ALTER TABLE ONLY "public"."drop_audience"
    ADD CONSTRAINT "uq_drop_audience" UNIQUE ("drop_fk", "master_audience_segment_fk");



ALTER TABLE ONLY "public"."finance_invoice"
    ADD CONSTRAINT "uq_finance_invoice_number" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."geo_city"
    ADD CONSTRAINT "uq_geo_city_code" UNIQUE ("city_code");



ALTER TABLE ONLY "public"."geo_neighborhood"
    ADD CONSTRAINT "uq_geo_neighborhood_city_code" UNIQUE ("geo_city_fk", "neighborhood_code");



ALTER TABLE ONLY "public"."iam_platform_membership"
    ADD CONSTRAINT "uq_iam_platform_membership" UNIQUE ("iam_profile_fk", "iam_platform_role_fk");



ALTER TABLE ONLY "public"."iam_platform_role"
    ADD CONSTRAINT "uq_iam_platform_role_code" UNIQUE ("role_code");



ALTER TABLE ONLY "public"."iam_platform_role_scope"
    ADD CONSTRAINT "uq_iam_platform_role_scope" UNIQUE ("iam_platform_role_fk", "master_scope_fk");



ALTER TABLE ONLY "public"."iam_profile"
    ADD CONSTRAINT "uq_iam_profile_auth_user" UNIQUE ("auth_user_fk");



ALTER TABLE ONLY "public"."master_allergen"
    ADD CONSTRAINT "uq_master_allergen_code" UNIQUE ("allergen_code");



ALTER TABLE ONLY "public"."master_audience_segment"
    ADD CONSTRAINT "uq_master_audience_segment_code" UNIQUE ("segment_code");



ALTER TABLE ONLY "public"."master_cuisine"
    ADD CONSTRAINT "uq_master_cuisine_code" UNIQUE ("cuisine_code");



ALTER TABLE ONLY "public"."master_document_status"
    ADD CONSTRAINT "uq_master_document_status_code" UNIQUE ("status_code");



ALTER TABLE ONLY "public"."master_document_type"
    ADD CONSTRAINT "uq_master_document_type_code" UNIQUE ("type_code");



ALTER TABLE ONLY "public"."master_incident_severity"
    ADD CONSTRAINT "uq_master_incident_severity_code" UNIQUE ("severity_code");



ALTER TABLE ONLY "public"."master_incident_status"
    ADD CONSTRAINT "uq_master_incident_status_code" UNIQUE ("status_code");



ALTER TABLE ONLY "public"."master_incident_type"
    ADD CONSTRAINT "uq_master_incident_type_code" UNIQUE ("type_code");



ALTER TABLE ONLY "public"."master_scope"
    ADD CONSTRAINT "uq_master_scope_code" UNIQUE ("scope_code");



ALTER TABLE ONLY "public"."master_storage_visibility"
    ADD CONSTRAINT "uq_master_storage_visibility_code" UNIQUE ("visibility_code");



ALTER TABLE ONLY "public"."master_support_ticket_priority"
    ADD CONSTRAINT "uq_master_support_ticket_priority_code" UNIQUE ("priority_code");



ALTER TABLE ONLY "public"."master_support_ticket_status"
    ADD CONSTRAINT "uq_master_support_ticket_status_code" UNIQUE ("status_code");



ALTER TABLE ONLY "public"."master_support_ticket_type"
    ADD CONSTRAINT "uq_master_support_ticket_type_code" UNIQUE ("type_code");



ALTER TABLE ONLY "public"."notification_device"
    ADD CONSTRAINT "uq_notification_device_token" UNIQUE ("push_token");



ALTER TABLE ONLY "public"."notification_template"
    ADD CONSTRAINT "uq_notification_template" UNIQUE ("template_code", "channel_code", "locale_code");



ALTER TABLE ONLY "public"."order_order"
    ADD CONSTRAINT "uq_order_number" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."payment_transaction"
    ADD CONSTRAINT "uq_payment_transaction_provider" UNIQUE ("provider_code", "provider_payment_ref");



ALTER TABLE ONLY "public"."payment_webhook_event"
    ADD CONSTRAINT "uq_payment_webhook_event" UNIQUE ("provider_code", "provider_event_id");



ALTER TABLE ONLY "public"."privacy_consent_purpose"
    ADD CONSTRAINT "uq_privacy_consent_purpose_code" UNIQUE ("purpose_code");



ALTER TABLE ONLY "public"."privacy_retention_policy"
    ADD CONSTRAINT "uq_privacy_retention_policy_code" UNIQUE ("policy_code");



ALTER TABLE ONLY "public"."restaurant_commission_plan"
    ADD CONSTRAINT "uq_restaurant_commission_plan_code" UNIQUE ("plan_code");



ALTER TABLE ONLY "public"."restaurant_compliance"
    ADD CONSTRAINT "uq_restaurant_compliance_rest" UNIQUE ("restaurant_fk");



ALTER TABLE ONLY "public"."restaurant_cuisine_map"
    ADD CONSTRAINT "uq_restaurant_cuisine_map" UNIQUE ("restaurant_fk", "master_cuisine_fk");



ALTER TABLE ONLY "public"."restaurant_onboarding_task"
    ADD CONSTRAINT "uq_restaurant_onboarding_task" UNIQUE ("restaurant_fk", "task_code");



ALTER TABLE ONLY "public"."restaurant_payout_account"
    ADD CONSTRAINT "uq_restaurant_payout_account_rest" UNIQUE ("restaurant_fk");



ALTER TABLE ONLY "public"."restaurant_public_profile"
    ADD CONSTRAINT "uq_restaurant_public_profile" UNIQUE ("restaurant_fk");



ALTER TABLE ONLY "public"."restaurant_restaurant"
    ADD CONSTRAINT "uq_restaurant_restaurant_slug" UNIQUE ("restaurant_slug");



ALTER TABLE ONLY "public"."restaurant_setting"
    ADD CONSTRAINT "uq_restaurant_setting" UNIQUE ("restaurant_fk", "setting_key");



ALTER TABLE ONLY "public"."restaurant_team_membership"
    ADD CONSTRAINT "uq_restaurant_team_membership" UNIQUE ("restaurant_fk", "iam_profile_fk", "restaurant_team_role_fk");



ALTER TABLE ONLY "public"."restaurant_team_role"
    ADD CONSTRAINT "uq_restaurant_team_role_code" UNIQUE ("role_code");



ALTER TABLE ONLY "public"."restaurant_team_role_scope"
    ADD CONSTRAINT "uq_restaurant_team_role_scope" UNIQUE ("restaurant_team_role_fk", "master_scope_fk");



ALTER TABLE ONLY "public"."review_review"
    ADD CONSTRAINT "uq_review_order" UNIQUE ("order_fk");



ALTER TABLE ONLY "public"."storage_object"
    ADD CONSTRAINT "uq_storage_object_path" UNIQUE ("bucket_name", "object_path");



ALTER TABLE ONLY "public"."website_waitlist_lead"
    ADD CONSTRAINT "uq_website_waitlist_lead_email" UNIQUE ("email");



ALTER TABLE ONLY "public"."website_contact_submission"
    ADD CONSTRAINT "website_contact_submission_pkey" PRIMARY KEY ("contact_submission_pk");



ALTER TABLE ONLY "public"."website_partner_interest"
    ADD CONSTRAINT "website_partner_interest_pkey" PRIMARY KEY ("partner_interest_pk");



ALTER TABLE ONLY "public"."website_waitlist_lead"
    ADD CONSTRAINT "website_waitlist_lead_pkey" PRIMARY KEY ("waitlist_lead_pk");



CREATE INDEX "idx_audit_log_action" ON "public"."audit_log" USING "btree" ("action_code", "created_at" DESC);



CREATE INDEX "idx_audit_log_actor" ON "public"."audit_log" USING "btree" ("actor_profile_fk", "created_at" DESC);



CREATE INDEX "idx_audit_log_entity" ON "public"."audit_log" USING "btree" ("target_entity_type_code", "target_entity_pk", "created_at" DESC);



CREATE INDEX "idx_catalog_bag_allergen_allergen" ON "public"."catalog_bag_template_allergen" USING "btree" ("master_allergen_fk");



CREATE INDEX "idx_catalog_bag_media_revision_order" ON "public"."catalog_bag_template_media" USING "btree" ("catalog_bag_template_revision_fk", "display_order");



CREATE INDEX "idx_catalog_bag_revision_template_status" ON "public"."catalog_bag_template_revision" USING "btree" ("catalog_bag_template_fk", "revision_status_code");



CREATE INDEX "idx_catalog_bag_template_rest_status" ON "public"."catalog_bag_template" USING "btree" ("restaurant_fk", "template_status_code");



CREATE INDEX "idx_consumer_profile_iam" ON "public"."consumer_profile" USING "btree" ("iam_profile_fk");



CREATE INDEX "idx_consumer_profile_profile_fk" ON "public"."consumer_profile" USING "btree" ("iam_profile_fk");



CREATE INDEX "idx_consumer_profile_used_referral" ON "public"."consumer_profile" USING "btree" ("used_referral_code_fk") WHERE ("used_referral_code_fk" IS NOT NULL);



CREATE INDEX "idx_consumer_saved_restaurant_profile" ON "public"."consumer_saved_restaurant" USING "btree" ("consumer_profile_fk");



CREATE INDEX "idx_consumer_saved_restaurant_restaurant" ON "public"."consumer_saved_restaurant" USING "btree" ("restaurant_fk");



CREATE INDEX "idx_consumer_subscription_active" ON "public"."consumer_subscription" USING "btree" ("consumer_profile_fk", "subscription_status_code", "current_period_end_at");



CREATE INDEX "idx_dev_demo_seed_registry_seed_key" ON "public"."dev_demo_seed_registry" USING "btree" ("seed_key");



CREATE INDEX "idx_dev_demo_seed_registry_slice" ON "public"."dev_demo_seed_registry" USING "btree" ("slice");



CREATE INDEX "idx_drop_active_discovery" ON "public"."drop_drop" USING "btree" ("geo_city_fk", "pickup_start_at", "pickup_end_at", "computed_quantity_available") WHERE (("drop_status_code" = ANY (ARRAY['SCHEDULED'::"text", 'ACTIVE'::"text"])) AND ("visibility_code" = 'PUBLIC'::"text"));



CREATE INDEX "idx_drop_audience_segment" ON "public"."drop_audience" USING "btree" ("master_audience_segment_fk");



CREATE INDEX "idx_drop_city_status_pickup" ON "public"."drop_drop" USING "btree" ("geo_city_fk", "drop_status_code", "pickup_start_at");



CREATE INDEX "idx_drop_inventory_event_drop_time" ON "public"."drop_inventory_event" USING "btree" ("drop_fk", "recorded_at" DESC);



CREATE INDEX "idx_drop_inventory_hold_consumer" ON "public"."drop_inventory_hold" USING "btree" ("consumer_profile_fk", "created_at" DESC);



CREATE INDEX "idx_drop_inventory_hold_drop_status" ON "public"."drop_inventory_hold" USING "btree" ("drop_fk", "hold_status_code", "expires_at");



CREATE INDEX "idx_drop_media_drop_order" ON "public"."drop_media" USING "btree" ("drop_fk", "display_order");



CREATE INDEX "idx_drop_public_active" ON "public"."drop_drop" USING "btree" ("geo_city_fk", "pickup_start_at") WHERE (("drop_status_code" = ANY (ARRAY['SCHEDULED'::"text", 'ACTIVE'::"text"])) AND ("visibility_code" = 'PUBLIC'::"text"));



CREATE INDEX "idx_drop_rest_status_pickup" ON "public"."drop_drop" USING "btree" ("restaurant_fk", "drop_status_code", "pickup_start_at");



CREATE INDEX "idx_finance_invoice_rest_status" ON "public"."finance_invoice" USING "btree" ("restaurant_fk", "invoice_status_code");



CREATE INDEX "idx_finance_payout_entry_rest_order" ON "public"."finance_restaurant_payout_entry" USING "btree" ("restaurant_fk", "order_fk");



CREATE INDEX "idx_finance_payout_entry_run" ON "public"."finance_restaurant_payout_entry" USING "btree" ("finance_settlement_run_fk");



CREATE INDEX "idx_finance_settlement_rest_period" ON "public"."finance_settlement_run" USING "btree" ("restaurant_fk", "period_start_at", "period_end_at");



CREATE INDEX "idx_geo_address_city" ON "public"."geo_address" USING "btree" ("geo_city_fk");



CREATE INDEX "idx_geo_address_neighborhood" ON "public"."geo_address" USING "btree" ("geo_neighborhood_fk") WHERE ("geo_neighborhood_fk" IS NOT NULL);



CREATE INDEX "idx_geo_neighborhood_city" ON "public"."geo_neighborhood" USING "btree" ("geo_city_fk");



CREATE INDEX "idx_iam_platform_membership_profile" ON "public"."iam_platform_membership" USING "btree" ("iam_profile_fk", "is_active");



CREATE INDEX "idx_iam_profile_auth_user_fk" ON "public"."iam_profile" USING "btree" ("auth_user_fk");



CREATE INDEX "idx_iam_profile_city" ON "public"."iam_profile" USING "btree" ("default_city_fk") WHERE ("default_city_fk" IS NOT NULL);



CREATE INDEX "idx_incident_event_incident_time" ON "public"."incident_event" USING "btree" ("incident_fk", "recorded_at" DESC);



CREATE INDEX "idx_incident_order_created" ON "public"."incident_incident" USING "btree" ("order_fk", "created_at" DESC) WHERE ("order_fk" IS NOT NULL);



CREATE INDEX "idx_incident_status_severity" ON "public"."incident_incident" USING "btree" ("master_incident_status_fk", "master_incident_severity_fk", "created_at");



CREATE INDEX "idx_marketing_partner_lead_city" ON "public"."marketing_partner_lead" USING "btree" ("geo_city_fk") WHERE ("geo_city_fk" IS NOT NULL);



CREATE INDEX "idx_marketing_partner_lead_status" ON "public"."marketing_partner_lead" USING "btree" ("qualification_status_code");



CREATE INDEX "idx_marketing_waitlist_lead_city" ON "public"."marketing_waitlist_lead" USING "btree" ("geo_city_fk") WHERE ("geo_city_fk" IS NOT NULL);



CREATE INDEX "idx_marketing_waitlist_lead_status" ON "public"."marketing_waitlist_lead" USING "btree" ("qualified_at") WHERE ("qualified_at" IS NOT NULL);



CREATE INDEX "idx_notification_attempt_outbox_number" ON "public"."notification_delivery_attempt" USING "btree" ("notification_outbox_fk", "attempt_number" DESC);



CREATE INDEX "idx_notification_attempt_outbox_time" ON "public"."notification_delivery_attempt" USING "btree" ("notification_outbox_fk", "attempted_at" DESC);



CREATE INDEX "idx_notification_device_profile_active" ON "public"."notification_device" USING "btree" ("iam_profile_fk", "is_active");



CREATE INDEX "idx_notification_outbox_business_context" ON "public"."notification_outbox" USING "btree" ("business_context_type_code", "business_context_fk");



CREATE INDEX "idx_notification_outbox_profile_time" ON "public"."notification_outbox" USING "btree" ("recipient_profile_fk", "created_at" DESC);



CREATE INDEX "idx_notification_outbox_status_sched" ON "public"."notification_outbox" USING "btree" ("send_status_code", "scheduled_at");



CREATE INDEX "idx_notification_outbox_template_context" ON "public"."notification_outbox" USING "btree" ("template_code", "business_context_type_code", "business_context_fk", "channel_code");



CREATE INDEX "idx_notification_outbox_worker_due" ON "public"."notification_outbox" USING "btree" ("send_status_code", COALESCE("next_attempt_at", "scheduled_at"), "created_at") WHERE ("send_status_code" = 'QUEUED'::"text");



CREATE INDEX "idx_order_consumer_created" ON "public"."order_order" USING "btree" ("consumer_profile_fk", "created_at" DESC);



CREATE INDEX "idx_order_drop_status" ON "public"."order_order" USING "btree" ("drop_fk", "order_status_code");



CREATE INDEX "idx_order_hold" ON "public"."order_order" USING "btree" ("drop_inventory_hold_fk") WHERE ("drop_inventory_hold_fk" IS NOT NULL);



CREATE INDEX "idx_order_pickup_ready" ON "public"."order_order" USING "btree" ("restaurant_fk", "computed_pickup_ready_flag") WHERE ("computed_pickup_ready_flag" = true);



CREATE INDEX "idx_order_pickup_terminal" ON "public"."order_order" USING "btree" ("restaurant_fk", "pickup_window_end_at", "order_status_code");



CREATE INDEX "idx_order_restaurant_status" ON "public"."order_order" USING "btree" ("restaurant_fk", "order_status_code", "pickup_window_start_at");



CREATE INDEX "idx_payment_order_intent_hold_status" ON "public"."payment_order_intent" USING "btree" ("drop_inventory_hold_fk", "payment_intent_status_code", "created_at" DESC);



CREATE INDEX "idx_payment_webhook_event_status_time" ON "public"."payment_webhook_event" USING "btree" ("processing_status_code", "received_at" DESC);



CREATE INDEX "idx_pickup_verification_order_time" ON "public"."order_pickup_verification_event" USING "btree" ("order_fk", "recorded_at" DESC);



CREATE INDEX "idx_pickup_verification_rest_time" ON "public"."order_pickup_verification_event" USING "btree" ("restaurant_fk", "recorded_at" DESC);



CREATE INDEX "idx_privacy_consent_event_latest" ON "public"."privacy_consent_event" USING "btree" ("iam_profile_fk", "privacy_consent_purpose_fk", "recorded_at" DESC, "privacy_consent_event_pk" DESC);



CREATE INDEX "idx_privacy_consent_event_profile_purpose" ON "public"."privacy_consent_event" USING "btree" ("iam_profile_fk", "privacy_consent_purpose_fk", "recorded_at" DESC);



CREATE INDEX "idx_privacy_erasure_profile" ON "public"."privacy_erasure_request" USING "btree" ("iam_profile_fk");



CREATE INDEX "idx_privacy_erasure_status" ON "public"."privacy_erasure_request" USING "btree" ("erasure_status_code", "requested_at");



CREATE INDEX "idx_restaurant_city_status" ON "public"."restaurant_restaurant" USING "btree" ("geo_city_fk", "restaurant_status_code");



CREATE INDEX "idx_restaurant_commission_override_rest_window" ON "public"."restaurant_commission_override" USING "btree" ("restaurant_fk", "effective_from_at", "effective_until_at");



CREATE INDEX "idx_restaurant_contact_restaurant" ON "public"."restaurant_contact" USING "btree" ("restaurant_fk", "contact_type_code");



CREATE INDEX "idx_restaurant_cuisine_map_cuisine" ON "public"."restaurant_cuisine_map" USING "btree" ("master_cuisine_fk");



CREATE INDEX "idx_restaurant_document_rest_status" ON "public"."restaurant_document" USING "btree" ("restaurant_fk", "master_document_status_fk");



CREATE INDEX "idx_restaurant_neighborhood_status" ON "public"."restaurant_restaurant" USING "btree" ("geo_neighborhood_fk", "restaurant_status_code") WHERE ("geo_neighborhood_fk" IS NOT NULL);



CREATE INDEX "idx_restaurant_owner_profile" ON "public"."restaurant_restaurant" USING "btree" ("owner_profile_fk") WHERE ("owner_profile_fk" IS NOT NULL);



CREATE INDEX "idx_restaurant_team_membership_profile" ON "public"."restaurant_team_membership" USING "btree" ("iam_profile_fk", "is_active");



CREATE INDEX "idx_restaurant_team_membership_restaurant" ON "public"."restaurant_team_membership" USING "btree" ("restaurant_fk", "iam_profile_fk", "is_active");



CREATE INDEX "idx_review_media_review_order" ON "public"."review_media" USING "btree" ("review_fk", "display_order");



CREATE INDEX "idx_slice2_restaurant_compliance_status" ON "public"."restaurant_compliance" USING "btree" ("restaurant_fk", "compliance_status_code");



CREATE INDEX "idx_slice2_restaurant_onboarding_task_status" ON "public"."restaurant_onboarding_task" USING "btree" ("restaurant_fk", "task_status_code");



CREATE INDEX "idx_slice2_restaurant_restaurant_status" ON "public"."restaurant_restaurant" USING "btree" ("restaurant_status_code");



CREATE INDEX "idx_slice2_restaurant_team_membership_profile_active" ON "public"."restaurant_team_membership" USING "btree" ("iam_profile_fk", "is_active");



CREATE INDEX "idx_slice2_restaurant_team_membership_rest_profile_active" ON "public"."restaurant_team_membership" USING "btree" ("restaurant_fk", "iam_profile_fk", "is_active");



CREATE INDEX "idx_slice2_storage_object_bucket_path" ON "public"."storage_object" USING "btree" ("bucket_name", "object_path");



CREATE INDEX "idx_slice7_finance_entry_order_type" ON "public"."finance_restaurant_payout_entry" USING "btree" ("order_fk", "entry_type_code") WHERE ("order_fk" IS NOT NULL);



CREATE INDEX "idx_slice7_finance_settlement_status" ON "public"."finance_settlement_run" USING "btree" ("settlement_status_code", "created_at" DESC);



CREATE INDEX "idx_slice7_order_settlement_eligibility" ON "public"."order_order" USING "btree" ("restaurant_fk", "pickup_window_end_at", "order_status_code", "payment_status_code");



CREATE INDEX "idx_slice8b_config_flag_lookup" ON "public"."config_feature_flag" USING "btree" ("flag_code", "scope_code", "scope_entity_pk");



CREATE INDEX "idx_slice8b_payment_refund_tracking" ON "public"."payment_refund" USING "btree" ("tracking_status_code", "updated_at" DESC);



CREATE INDEX "idx_slice8b_support_ticket_rest_status" ON "public"."support_ticket" USING "btree" ("restaurant_fk", "master_support_ticket_status_fk", "updated_at" DESC) WHERE ("restaurant_fk" IS NOT NULL);



CREATE INDEX "idx_storage_object_uploader" ON "public"."storage_object" USING "btree" ("uploaded_by_profile_fk") WHERE ("uploaded_by_profile_fk" IS NOT NULL);



CREATE INDEX "idx_storage_object_visibility" ON "public"."storage_object" USING "btree" ("master_storage_visibility_fk");



CREATE INDEX "idx_support_event_ticket_time" ON "public"."support_ticket_event" USING "btree" ("support_ticket_fk", "recorded_at" DESC);



CREATE INDEX "idx_support_ticket_order" ON "public"."support_ticket" USING "btree" ("order_fk") WHERE ("order_fk" IS NOT NULL);



CREATE INDEX "idx_support_ticket_status_priority" ON "public"."support_ticket" USING "btree" ("master_support_ticket_status_fk", "master_support_ticket_priority_fk", "created_at");



CREATE INDEX "idx_website_contact_submission_created_on" ON "public"."website_contact_submission" USING "btree" ("created_on" DESC);



CREATE INDEX "idx_website_partner_interest_created_on" ON "public"."website_partner_interest" USING "btree" ("created_on" DESC);



CREATE INDEX "idx_website_waitlist_lead_created_on" ON "public"."website_waitlist_lead" USING "btree" ("created_on" DESC);



CREATE INDEX "idxfk_admin_data_correction_approved_by_profile_fk" ON "public"."admin_data_correction" USING "btree" ("approved_by_profile_fk");



CREATE INDEX "idxfk_admin_data_correction_executed_by_profile_fk" ON "public"."admin_data_correction" USING "btree" ("executed_by_profile_fk");



CREATE INDEX "idxfk_admin_data_correction_requested_by_profile_fk" ON "public"."admin_data_correction" USING "btree" ("requested_by_profile_fk");



CREATE INDEX "idxfk_admin_export_job_requested_by_profile_fk" ON "public"."admin_export_job" USING "btree" ("requested_by_profile_fk");



CREATE INDEX "idxfk_admin_export_job_result_storage_object_fk" ON "public"."admin_export_job" USING "btree" ("result_storage_object_fk");



CREATE INDEX "idxfk_billing_subscription_charge_consumer_subscription_fk" ON "public"."billing_subscription_charge" USING "btree" ("consumer_subscription_fk");



CREATE INDEX "idxfk_catalog_bag_template_allergen_master_allergen_fk" ON "public"."catalog_bag_template_allergen" USING "btree" ("master_allergen_fk");



CREATE INDEX "idxfk_catalog_bag_template_created_by_profile_fk" ON "public"."catalog_bag_template" USING "btree" ("created_by_profile_fk");



CREATE INDEX "idxfk_catalog_bag_template_media_storage_object_fk" ON "public"."catalog_bag_template_media" USING "btree" ("storage_object_fk");



CREATE INDEX "idxfk_cms_page_created_by_profile_fk" ON "public"."cms_page" USING "btree" ("created_by_profile_fk");



CREATE INDEX "idxfk_cms_post_author_profile_fk" ON "public"."cms_post" USING "btree" ("author_profile_fk");



CREATE INDEX "idxfk_cms_restaurant_feature_restaurant_fk" ON "public"."cms_restaurant_feature" USING "btree" ("restaurant_fk");



CREATE INDEX "idxfk_cms_seo_metadata_og_image_storage_object_fk" ON "public"."cms_seo_metadata" USING "btree" ("og_image_storage_object_fk");



CREATE INDEX "idxfk_consumer_allergen_preference_master_allergen_fk" ON "public"."consumer_allergen_preference" USING "btree" ("master_allergen_fk");



CREATE INDEX "idxfk_consumer_city_preference_geo_city_fk" ON "public"."consumer_city_preference" USING "btree" ("geo_city_fk");



CREATE INDEX "idxfk_consumer_subscription_consumer_subscription_plan_fk" ON "public"."consumer_subscription" USING "btree" ("consumer_subscription_plan_fk");



CREATE INDEX "idxfk_drop_audience_master_audience_segment_fk" ON "public"."drop_audience" USING "btree" ("master_audience_segment_fk");



CREATE INDEX "idxfk_drop_closure_log_closed_by_profile_fk" ON "public"."drop_closure_log" USING "btree" ("closed_by_profile_fk");



CREATE INDEX "idxfk_drop_drop_catalog_bag_template_revision_fk" ON "public"."drop_drop" USING "btree" ("catalog_bag_template_revision_fk");



CREATE INDEX "idxfk_drop_drop_created_by_profile_fk" ON "public"."drop_drop" USING "btree" ("created_by_profile_fk");



CREATE INDEX "idxfk_drop_drop_drop_recurring_schedule_fk" ON "public"."drop_drop" USING "btree" ("drop_recurring_schedule_fk");



CREATE INDEX "idxfk_drop_inventory_event_drop_inventory_hold_fk" ON "public"."drop_inventory_event" USING "btree" ("drop_inventory_hold_fk");



CREATE INDEX "idxfk_drop_inventory_hold_converted_order_fk" ON "public"."drop_inventory_hold" USING "btree" ("converted_order_fk");



CREATE INDEX "idxfk_drop_media_storage_object_fk" ON "public"."drop_media" USING "btree" ("storage_object_fk");



CREATE INDEX "idxfk_finance_invoice_finance_settlement_run_fk" ON "public"."finance_invoice" USING "btree" ("finance_settlement_run_fk");



CREATE INDEX "idxfk_finance_invoice_storage_object_fk" ON "public"."finance_invoice" USING "btree" ("storage_object_fk");



CREATE INDEX "idxfk_finance_restaurant_payout_entry_order_fk" ON "public"."finance_restaurant_payout_entry" USING "btree" ("order_fk");



CREATE INDEX "idxfk_finance_restaurant_payout_entry_payment_refund_fk" ON "public"."finance_restaurant_payout_entry" USING "btree" ("payment_refund_fk");



CREATE INDEX "idxfk_finance_settlement_run_locked_by_profile_fk" ON "public"."finance_settlement_run" USING "btree" ("locked_by_profile_fk");



CREATE INDEX "idxfk_iam_platform_membership_iam_platform_role_fk" ON "public"."iam_platform_membership" USING "btree" ("iam_platform_role_fk");



CREATE INDEX "idxfk_iam_platform_role_scope_master_scope_fk" ON "public"."iam_platform_role_scope" USING "btree" ("master_scope_fk");



CREATE INDEX "idxfk_incident_event_actor_profile_fk" ON "public"."incident_event" USING "btree" ("actor_profile_fk");



CREATE INDEX "idxfk_incident_incident_assigned_to_profile_fk" ON "public"."incident_incident" USING "btree" ("assigned_to_profile_fk");



CREATE INDEX "idxfk_incident_incident_master_incident_severity_fk" ON "public"."incident_incident" USING "btree" ("master_incident_severity_fk");



CREATE INDEX "idxfk_incident_incident_master_incident_type_fk" ON "public"."incident_incident" USING "btree" ("master_incident_type_fk");



CREATE INDEX "idxfk_incident_incident_order_fk" ON "public"."incident_incident" USING "btree" ("order_fk");



CREATE INDEX "idxfk_incident_incident_support_ticket_fk" ON "public"."incident_incident" USING "btree" ("support_ticket_fk");



CREATE INDEX "idxfk_marketing_partner_lead_assigned_to_profile_fk" ON "public"."marketing_partner_lead" USING "btree" ("assigned_to_profile_fk");



CREATE INDEX "idxfk_marketing_partner_lead_converted_restaurant_fk" ON "public"."marketing_partner_lead" USING "btree" ("converted_restaurant_fk");



CREATE INDEX "idxfk_marketing_partner_lead_converted_support_ticket_fk" ON "public"."marketing_partner_lead" USING "btree" ("converted_support_ticket_fk");



CREATE INDEX "idxfk_marketing_waitlist_lead_converted_consumer_profile_fk" ON "public"."marketing_waitlist_lead" USING "btree" ("converted_consumer_profile_fk");



CREATE INDEX "idxfk_notification_outbox_notification_template_fk" ON "public"."notification_outbox" USING "btree" ("notification_template_fk");



CREATE INDEX "idxfk_order_item_catalog_bag_template_revision_fk" ON "public"."order_item" USING "btree" ("catalog_bag_template_revision_fk");



CREATE INDEX "idxfk_order_order_drop_inventory_hold_fk" ON "public"."order_order" USING "btree" ("drop_inventory_hold_fk");



CREATE INDEX "idxfk_order_pickup_verification_event_verifying_profile_fk" ON "public"."order_pickup_verification_event" USING "btree" ("verifying_profile_fk");



CREATE INDEX "idxfk_order_status_transition_actor_profile_fk" ON "public"."order_status_transition" USING "btree" ("actor_profile_fk");



CREATE INDEX "idxfk_payment_refund_requested_by_profile_fk" ON "public"."payment_refund" USING "btree" ("requested_by_profile_fk");



CREATE INDEX "idxfk_privacy_consent_event_privacy_consent_purpose_fk" ON "public"."privacy_consent_event" USING "btree" ("privacy_consent_purpose_fk");



CREATE INDEX "idxfk_privacy_consent_event_recorded_by_profile_fk" ON "public"."privacy_consent_event" USING "btree" ("recorded_by_profile_fk");



CREATE INDEX "idxfk_privacy_erasure_request_reviewed_by_profile_fk" ON "public"."privacy_erasure_request" USING "btree" ("reviewed_by_profile_fk");



CREATE INDEX "idxfk_restaurant_commission_override_restaurant_commission_plan" ON "public"."restaurant_commission_override" USING "btree" ("restaurant_commission_plan_fk");



CREATE INDEX "idxfk_restaurant_compliance_last_reviewed_by_profile_fk" ON "public"."restaurant_compliance" USING "btree" ("last_reviewed_by_profile_fk");



CREATE INDEX "idxfk_restaurant_document_master_document_type_fk" ON "public"."restaurant_document" USING "btree" ("master_document_type_fk");



CREATE INDEX "idxfk_restaurant_document_reviewed_by_profile_fk" ON "public"."restaurant_document" USING "btree" ("reviewed_by_profile_fk");



CREATE INDEX "idxfk_restaurant_onboarding_task_completed_by_profile_fk" ON "public"."restaurant_onboarding_task" USING "btree" ("completed_by_profile_fk");



CREATE INDEX "idxfk_restaurant_public_profile_hero_storage_object_fk" ON "public"."restaurant_public_profile" USING "btree" ("hero_storage_object_fk");



CREATE INDEX "idxfk_restaurant_restaurant_geo_address_fk" ON "public"."restaurant_restaurant" USING "btree" ("geo_address_fk");



CREATE INDEX "idxfk_restaurant_team_membership_invited_by_profile_fk" ON "public"."restaurant_team_membership" USING "btree" ("invited_by_profile_fk");



CREATE INDEX "idxfk_restaurant_team_membership_restaurant_team_role_fk" ON "public"."restaurant_team_membership" USING "btree" ("restaurant_team_role_fk");



CREATE INDEX "idxfk_restaurant_team_role_scope_master_scope_fk" ON "public"."restaurant_team_role_scope" USING "btree" ("master_scope_fk");



CREATE INDEX "idxfk_review_media_storage_object_fk" ON "public"."review_media" USING "btree" ("storage_object_fk");



CREATE INDEX "idxfk_storage_object_master_storage_visibility_fk" ON "public"."storage_object" USING "btree" ("master_storage_visibility_fk");



CREATE INDEX "idxfk_support_ticket_event_actor_profile_fk" ON "public"."support_ticket_event" USING "btree" ("actor_profile_fk");



CREATE INDEX "idxfk_support_ticket_marketing_partner_lead_fk" ON "public"."support_ticket" USING "btree" ("marketing_partner_lead_fk");



CREATE INDEX "idxfk_support_ticket_master_support_ticket_priority_fk" ON "public"."support_ticket" USING "btree" ("master_support_ticket_priority_fk");



CREATE INDEX "idxfk_support_ticket_master_support_ticket_type_fk" ON "public"."support_ticket" USING "btree" ("master_support_ticket_type_fk");



CREATE INDEX "idxfk_support_ticket_order_fk" ON "public"."support_ticket" USING "btree" ("order_fk");



CREATE UNIQUE INDEX "uq_billing_subscription_charge_provider" ON "public"."billing_subscription_charge" USING "btree" ("provider_code", "provider_payment_ref") WHERE ("provider_payment_ref" IS NOT NULL);



CREATE UNIQUE INDEX "uq_consumer_city_preference_default" ON "public"."consumer_city_preference" USING "btree" ("consumer_profile_fk") WHERE ("is_default" = true);



CREATE UNIQUE INDEX "uq_consumer_subscription_provider" ON "public"."consumer_subscription" USING "btree" ("provider_subscription_ref") WHERE ("provider_subscription_ref" IS NOT NULL);



CREATE UNIQUE INDEX "uq_drop_inventory_hold_idempotency" ON "public"."drop_inventory_hold" USING "btree" ("consumer_profile_fk", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_finance_invoice_run" ON "public"."finance_invoice" USING "btree" ("finance_settlement_run_fk");



CREATE UNIQUE INDEX "uq_finance_payout_entry_run_line_key" ON "public"."finance_restaurant_payout_entry" USING "btree" ("finance_settlement_run_fk", "line_key") WHERE ("line_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_finance_settlement_active_period" ON "public"."finance_settlement_run" USING "btree" ("restaurant_fk", "period_start_at", "period_end_at") WHERE ("settlement_status_code" <> 'CANCELLED'::"text");



CREATE UNIQUE INDEX "uq_iam_profile_email" ON "public"."iam_profile" USING "btree" ("email_address") WHERE ("email_address" IS NOT NULL);



CREATE UNIQUE INDEX "uq_iam_profile_phone" ON "public"."iam_profile" USING "btree" ("phone_e164") WHERE ("phone_e164" IS NOT NULL);



CREATE UNIQUE INDEX "uq_notification_outbox_idempotency_key" ON "public"."notification_outbox" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_payment_order_intent_idempotency" ON "public"."payment_order_intent" USING "btree" ("consumer_profile_fk", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_payment_order_intent_provider_ref" ON "public"."payment_order_intent" USING "btree" ("provider_code", "provider_order_ref") WHERE ("provider_order_ref" IS NOT NULL);



CREATE UNIQUE INDEX "uq_payment_refund_idempotency" ON "public"."payment_refund" USING "btree" ("order_fk", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_payment_refund_provider_ref" ON "public"."payment_refund" USING "btree" ("provider_code", "provider_refund_ref") WHERE ("provider_refund_ref" IS NOT NULL);



CREATE UNIQUE INDEX "uq_pickup_verification_idempotency" ON "public"."order_pickup_verification_event" USING "btree" ("order_fk", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_restaurant_commission_plan_single_default" ON "public"."restaurant_commission_plan" USING "btree" ("is_default") WHERE "is_default";



CREATE UNIQUE INDEX "uq_restaurant_payout_account_provider" ON "public"."restaurant_payout_account" USING "btree" ("razorpay_fund_account_ref") WHERE ("razorpay_fund_account_ref" IS NOT NULL);



CREATE UNIQUE INDEX "uq_support_ticket_requester_idempotency" ON "public"."support_ticket" USING "btree" ("requester_profile_fk", "requester_idempotency_key") WHERE (("requester_profile_fk" IS NOT NULL) AND ("requester_idempotency_key" IS NOT NULL));



ALTER INDEX "public"."analytics_event_pkey" ATTACH PARTITION "public"."analytics_event_2026_q2_pkey";



ALTER INDEX "public"."analytics_event_pkey" ATTACH PARTITION "public"."analytics_event_2026_q3_pkey";



ALTER INDEX "public"."analytics_event_pkey" ATTACH PARTITION "public"."analytics_event_default_pkey";



CREATE OR REPLACE VIEW "public"."api_admin_payment_order_summary" WITH ("security_barrier"='true') AS
 SELECT "i"."payment_order_intent_pk",
    "i"."drop_inventory_hold_fk" AS "hold_pk",
    "i"."order_fk" AS "order_pk",
    "o"."order_number",
    "i"."provider_code",
    "i"."provider_order_ref",
    "i"."payment_intent_status_code",
    "i"."amount_paise",
    "i"."currency_code",
    "o"."order_status_code",
    "o"."payment_status_code",
    "o"."snapshot_restaurant_name" AS "restaurant_name",
    "o"."snapshot_drop_title" AS "drop_title",
    "h"."hold_status_code",
    "h"."expires_at" AS "hold_expires_at",
    "i"."created_at",
    "i"."updated_at",
    "max"("t"."captured_at") AS "payment_captured_at",
    "count"("t"."payment_transaction_pk") AS "transaction_count"
   FROM ((("public"."payment_order_intent" "i"
     JOIN "public"."drop_inventory_hold" "h" ON (("h"."drop_inventory_hold_pk" = "i"."drop_inventory_hold_fk")))
     LEFT JOIN "public"."order_order" "o" ON (("o"."order_order_pk" = "i"."order_fk")))
     LEFT JOIN "public"."payment_transaction" "t" ON (("t"."payment_order_intent_fk" = "i"."payment_order_intent_pk")))
  WHERE "public"."rls_is_platform_user"()
  GROUP BY "i"."payment_order_intent_pk", "o"."order_number", "o"."order_status_code", "o"."payment_status_code", "o"."snapshot_restaurant_name", "o"."snapshot_drop_title", "h"."hold_status_code", "h"."expires_at";



CREATE OR REPLACE VIEW "public"."api_consumer_order_summary" WITH ("security_barrier"='true') AS
 SELECT "o"."order_order_pk" AS "order_pk",
    "o"."order_number",
    "o"."consumer_profile_fk",
    "o"."restaurant_fk",
    "o"."drop_fk",
    "o"."drop_inventory_hold_fk" AS "hold_pk",
    "o"."order_status_code",
    "o"."payment_status_code",
    "o"."snapshot_restaurant_name" AS "restaurant_name",
    "o"."snapshot_restaurant_slug" AS "restaurant_slug",
    "o"."snapshot_drop_title" AS "drop_title",
    "o"."snapshot_bag_display_name" AS "bag_display_name",
    "o"."snapshot_dietary_category_code" AS "dietary_category_code",
    "o"."snapshot_spice_level_code" AS "spice_level_code",
    "o"."snapshot_allergen_summary_text" AS "allergen_summary_text",
    COALESCE("array_remove"("array_agg"("ma"."allergen_code" ORDER BY "ma"."sort_order") FILTER (WHERE ("ma"."allergen_code" IS NOT NULL)), NULL::"text"), ARRAY[]::"text"[]) AS "allergen_codes",
    "o"."snapshot_serves_text" AS "serves_text",
    "o"."snapshot_pickup_instructions" AS "pickup_instructions",
    "oi"."quantity",
    "oi"."unit_price_paise",
    "o"."total_paise" AS "paid_amount_paise",
    "o"."currency_code",
    "o"."pickup_window_start_at",
    "o"."pickup_window_end_at",
    ("o"."pickup_qr_nonce_hash" IS NOT NULL) AS "has_pickup_qr",
    ("o"."pickup_otp_hash" IS NOT NULL) AS "has_pickup_otp",
    "i"."payment_order_intent_pk",
    "i"."provider_order_ref",
    "i"."payment_intent_status_code",
    "max"("t"."captured_at") AS "payment_captured_at",
    "o"."created_at",
    "o"."updated_at",
    "o"."collected_at"
   FROM (((((("public"."order_order" "o"
     LEFT JOIN "public"."order_item" "oi" ON (("oi"."order_fk" = "o"."order_order_pk")))
     LEFT JOIN "public"."drop_drop" "d" ON (("d"."drop_drop_pk" = "o"."drop_fk")))
     LEFT JOIN "public"."catalog_bag_template_allergen" "bta" ON ((("bta"."catalog_bag_template_revision_fk" = "d"."catalog_bag_template_revision_fk") AND ("bta"."contains_flag" OR "bta"."may_contain_flag"))))
     LEFT JOIN "public"."master_allergen" "ma" ON (("ma"."master_allergen_pk" = "bta"."master_allergen_fk")))
     LEFT JOIN "public"."payment_order_intent" "i" ON (("i"."order_fk" = "o"."order_order_pk")))
     LEFT JOIN "public"."payment_transaction" "t" ON ((("t"."payment_order_intent_fk" = "i"."payment_order_intent_pk") AND ("t"."transaction_status_code" = 'CAPTURED'::"text"))))
  WHERE "public"."rls_is_consumer_profile"("o"."consumer_profile_fk")
  GROUP BY "o"."order_order_pk", "oi"."quantity", "oi"."unit_price_paise", "i"."payment_order_intent_pk", "i"."provider_order_ref", "i"."payment_intent_status_code";



CREATE OR REPLACE VIEW "public"."api_restaurant_order_summary" WITH ("security_barrier"='true') AS
 SELECT "o"."order_order_pk" AS "order_pk",
    "o"."order_number",
    "o"."restaurant_fk",
    "o"."drop_fk",
    "o"."order_status_code",
    "o"."payment_status_code",
    "o"."snapshot_restaurant_name" AS "restaurant_name",
    "o"."snapshot_drop_title" AS "drop_title",
    "o"."snapshot_bag_display_name" AS "bag_display_name",
    "o"."snapshot_dietary_category_code" AS "dietary_category_code",
    "o"."snapshot_spice_level_code" AS "spice_level_code",
    "o"."snapshot_allergen_summary_text" AS "allergen_summary_text",
    COALESCE("array_remove"("array_agg"("ma"."allergen_code" ORDER BY "ma"."sort_order") FILTER (WHERE ("ma"."allergen_code" IS NOT NULL)), NULL::"text"), ARRAY[]::"text"[]) AS "allergen_codes",
    "oi"."quantity",
    "o"."total_paise" AS "paid_amount_paise",
    "o"."currency_code",
    "o"."pickup_window_start_at",
    "o"."pickup_window_end_at",
    "i"."payment_intent_status_code",
    "max"("t"."captured_at") AS "payment_captured_at",
    "o"."created_at",
    "o"."updated_at",
    "o"."collected_at"
   FROM (((((("public"."order_order" "o"
     LEFT JOIN "public"."order_item" "oi" ON (("oi"."order_fk" = "o"."order_order_pk")))
     LEFT JOIN "public"."drop_drop" "d" ON (("d"."drop_drop_pk" = "o"."drop_fk")))
     LEFT JOIN "public"."catalog_bag_template_allergen" "bta" ON ((("bta"."catalog_bag_template_revision_fk" = "d"."catalog_bag_template_revision_fk") AND ("bta"."contains_flag" OR "bta"."may_contain_flag"))))
     LEFT JOIN "public"."master_allergen" "ma" ON (("ma"."master_allergen_pk" = "bta"."master_allergen_fk")))
     LEFT JOIN "public"."payment_order_intent" "i" ON (("i"."order_fk" = "o"."order_order_pk")))
     LEFT JOIN "public"."payment_transaction" "t" ON ((("t"."payment_order_intent_fk" = "i"."payment_order_intent_pk") AND ("t"."transaction_status_code" = 'CAPTURED'::"text"))))
  WHERE (("o"."order_status_code" = ANY (ARRAY['PAID'::"text", 'CONFIRMED'::"text", 'READY_FOR_PICKUP'::"text", 'COLLECTED'::"text", 'NO_SHOW'::"text"])) AND "public"."rls_has_restaurant_access"("o"."restaurant_fk"))
  GROUP BY "o"."order_order_pk", "oi"."quantity", "i"."payment_intent_status_code";



CREATE OR REPLACE TRIGGER "admin_data_correction_set_updated_at" BEFORE UPDATE ON "public"."admin_data_correction" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "admin_export_job_set_updated_at" BEFORE UPDATE ON "public"."admin_export_job" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "analytics_event_immutable" BEFORE DELETE OR UPDATE ON "public"."analytics_event" FOR EACH ROW EXECUTE FUNCTION "public"."raise_immutable_error"();



CREATE OR REPLACE TRIGGER "audit_log_immutable" BEFORE DELETE OR UPDATE ON "public"."audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."raise_immutable_error"();



CREATE OR REPLACE TRIGGER "billing_subscription_charge_set_updated_at" BEFORE UPDATE ON "public"."billing_subscription_charge" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "billing_subscription_event_immutable" BEFORE DELETE OR UPDATE ON "public"."billing_subscription_event" FOR EACH ROW EXECUTE FUNCTION "public"."raise_immutable_error"();



CREATE OR REPLACE TRIGGER "catalog_bag_template_allergen_set_updated_at" BEFORE UPDATE ON "public"."catalog_bag_template_allergen" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "catalog_bag_template_media_set_updated_at" BEFORE UPDATE ON "public"."catalog_bag_template_media" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "catalog_bag_template_revision_set_updated_at" BEFORE UPDATE ON "public"."catalog_bag_template_revision" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "catalog_bag_template_set_updated_at" BEFORE UPDATE ON "public"."catalog_bag_template" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "cms_banner_set_updated_at" BEFORE UPDATE ON "public"."cms_banner" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "cms_city_page_set_updated_at" BEFORE UPDATE ON "public"."cms_city_page" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "cms_page_set_updated_at" BEFORE UPDATE ON "public"."cms_page" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "cms_post_set_updated_at" BEFORE UPDATE ON "public"."cms_post" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "cms_restaurant_feature_set_updated_at" BEFORE UPDATE ON "public"."cms_restaurant_feature" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "cms_seo_metadata_set_updated_at" BEFORE UPDATE ON "public"."cms_seo_metadata" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "config_feature_flag_set_updated_at" BEFORE UPDATE ON "public"."config_feature_flag" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "config_runtime_setting_set_updated_at" BEFORE UPDATE ON "public"."config_runtime_setting" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_allergen_preference_set_updated_at" BEFORE UPDATE ON "public"."consumer_allergen_preference" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_city_preference_set_updated_at" BEFORE UPDATE ON "public"."consumer_city_preference" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_dietary_preference_set_updated_at" BEFORE UPDATE ON "public"."consumer_dietary_preference" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_notification_preference_set_updated_at" BEFORE UPDATE ON "public"."consumer_notification_preference" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_passport_stat_set_updated_at" BEFORE UPDATE ON "public"."consumer_passport_stat" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_profile_set_updated_at" BEFORE UPDATE ON "public"."consumer_profile" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_referral_code_set_updated_at" BEFORE UPDATE ON "public"."consumer_referral_code" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_referral_set_updated_at" BEFORE UPDATE ON "public"."consumer_referral" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_saved_restaurant_set_updated_at" BEFORE UPDATE ON "public"."consumer_saved_restaurant" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_subscription_plan_set_updated_at" BEFORE UPDATE ON "public"."consumer_subscription_plan" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "consumer_subscription_set_updated_at" BEFORE UPDATE ON "public"."consumer_subscription" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "drop_audience_set_updated_at" BEFORE UPDATE ON "public"."drop_audience" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "drop_drop_computed_restaurant_counts" AFTER INSERT OR DELETE OR UPDATE OF "drop_status_code" ON "public"."drop_drop" FOR EACH ROW EXECUTE FUNCTION "public"."computed_refresh_restaurant_counts"();



CREATE OR REPLACE TRIGGER "drop_drop_computed_sell_through" BEFORE INSERT OR UPDATE OF "quantity_total", "quantity_sold" ON "public"."drop_drop" FOR EACH ROW EXECUTE FUNCTION "public"."computed_refresh_drop_sell_through"();



CREATE OR REPLACE TRIGGER "drop_drop_set_updated_at" BEFORE UPDATE ON "public"."drop_drop" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "drop_inventory_event_immutable" BEFORE DELETE OR UPDATE ON "public"."drop_inventory_event" FOR EACH ROW EXECUTE FUNCTION "public"."raise_immutable_error"();



CREATE OR REPLACE TRIGGER "drop_inventory_hold_set_updated_at" BEFORE UPDATE ON "public"."drop_inventory_hold" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "drop_media_set_updated_at" BEFORE UPDATE ON "public"."drop_media" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "drop_recurring_schedule_set_updated_at" BEFORE UPDATE ON "public"."drop_recurring_schedule" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "finance_invoice_set_updated_at" BEFORE UPDATE ON "public"."finance_invoice" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "finance_settlement_run_set_updated_at" BEFORE UPDATE ON "public"."finance_settlement_run" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "geo_address_set_updated_at" BEFORE UPDATE ON "public"."geo_address" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "geo_city_set_updated_at" BEFORE UPDATE ON "public"."geo_city" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "geo_neighborhood_set_updated_at" BEFORE UPDATE ON "public"."geo_neighborhood" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "iam_platform_membership_set_updated_at" BEFORE UPDATE ON "public"."iam_platform_membership" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "iam_platform_role_scope_set_updated_at" BEFORE UPDATE ON "public"."iam_platform_role_scope" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "iam_platform_role_set_updated_at" BEFORE UPDATE ON "public"."iam_platform_role" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "iam_profile_set_updated_at" BEFORE UPDATE ON "public"."iam_profile" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "incident_event_immutable" BEFORE DELETE OR UPDATE ON "public"."incident_event" FOR EACH ROW EXECUTE FUNCTION "public"."raise_immutable_error"();



CREATE OR REPLACE TRIGGER "incident_incident_set_updated_at" BEFORE UPDATE ON "public"."incident_incident" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "marketing_partner_lead_set_updated_at" BEFORE UPDATE ON "public"."marketing_partner_lead" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "marketing_waitlist_lead_set_updated_at" BEFORE UPDATE ON "public"."marketing_waitlist_lead" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_allergen_set_updated_at" BEFORE UPDATE ON "public"."master_allergen" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_audience_segment_set_updated_at" BEFORE UPDATE ON "public"."master_audience_segment" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_cuisine_set_updated_at" BEFORE UPDATE ON "public"."master_cuisine" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_document_status_set_updated_at" BEFORE UPDATE ON "public"."master_document_status" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_document_type_set_updated_at" BEFORE UPDATE ON "public"."master_document_type" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_incident_severity_set_updated_at" BEFORE UPDATE ON "public"."master_incident_severity" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_incident_status_set_updated_at" BEFORE UPDATE ON "public"."master_incident_status" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_incident_type_set_updated_at" BEFORE UPDATE ON "public"."master_incident_type" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_scope_set_updated_at" BEFORE UPDATE ON "public"."master_scope" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_storage_visibility_set_updated_at" BEFORE UPDATE ON "public"."master_storage_visibility" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_support_ticket_priority_set_updated_at" BEFORE UPDATE ON "public"."master_support_ticket_priority" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_support_ticket_status_set_updated_at" BEFORE UPDATE ON "public"."master_support_ticket_status" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "master_support_ticket_type_set_updated_at" BEFORE UPDATE ON "public"."master_support_ticket_type" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "notification_device_set_updated_at" BEFORE UPDATE ON "public"."notification_device" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "notification_outbox_set_updated_at" BEFORE UPDATE ON "public"."notification_outbox" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "notification_template_set_updated_at" BEFORE UPDATE ON "public"."notification_template" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "order_item_set_updated_at" BEFORE UPDATE ON "public"."order_item" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "order_order_computed_pickup_ready" BEFORE INSERT OR UPDATE OF "order_status_code" ON "public"."order_order" FOR EACH ROW EXECUTE FUNCTION "public"."computed_refresh_order_pickup_flag"();



CREATE OR REPLACE TRIGGER "order_order_computed_restaurant_counts" AFTER INSERT OR DELETE OR UPDATE OF "order_status_code" ON "public"."order_order" FOR EACH ROW EXECUTE FUNCTION "public"."computed_refresh_restaurant_counts"();



CREATE OR REPLACE TRIGGER "order_order_set_updated_at" BEFORE UPDATE ON "public"."order_order" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "order_pickup_verification_event_immutable" BEFORE DELETE OR UPDATE ON "public"."order_pickup_verification_event" FOR EACH ROW EXECUTE FUNCTION "public"."raise_immutable_error"();



CREATE OR REPLACE TRIGGER "order_status_transition_immutable" BEFORE DELETE OR UPDATE ON "public"."order_status_transition" FOR EACH ROW EXECUTE FUNCTION "public"."raise_immutable_error"();



CREATE OR REPLACE TRIGGER "payment_order_intent_set_updated_at" BEFORE UPDATE ON "public"."payment_order_intent" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "payment_refund_set_updated_at" BEFORE UPDATE ON "public"."payment_refund" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "privacy_consent_event_immutable" BEFORE DELETE OR UPDATE ON "public"."privacy_consent_event" FOR EACH ROW EXECUTE FUNCTION "public"."raise_immutable_error"();



CREATE OR REPLACE TRIGGER "privacy_consent_purpose_set_updated_at" BEFORE UPDATE ON "public"."privacy_consent_purpose" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "privacy_erasure_request_set_updated_at" BEFORE UPDATE ON "public"."privacy_erasure_request" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "privacy_retention_policy_set_updated_at" BEFORE UPDATE ON "public"."privacy_retention_policy" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_commission_override_set_updated_at" BEFORE UPDATE ON "public"."restaurant_commission_override" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_commission_plan_set_updated_at" BEFORE UPDATE ON "public"."restaurant_commission_plan" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_compliance_set_updated_at" BEFORE UPDATE ON "public"."restaurant_compliance" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_contact_set_updated_at" BEFORE UPDATE ON "public"."restaurant_contact" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_cuisine_map_set_updated_at" BEFORE UPDATE ON "public"."restaurant_cuisine_map" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_document_set_updated_at" BEFORE UPDATE ON "public"."restaurant_document" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_onboarding_task_set_updated_at" BEFORE UPDATE ON "public"."restaurant_onboarding_task" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_payout_account_set_updated_at" BEFORE UPDATE ON "public"."restaurant_payout_account" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_public_profile_set_updated_at" BEFORE UPDATE ON "public"."restaurant_public_profile" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_restaurant_set_updated_at" BEFORE UPDATE ON "public"."restaurant_restaurant" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_setting_set_updated_at" BEFORE UPDATE ON "public"."restaurant_setting" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_team_membership_set_updated_at" BEFORE UPDATE ON "public"."restaurant_team_membership" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_team_role_scope_set_updated_at" BEFORE UPDATE ON "public"."restaurant_team_role_scope" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "restaurant_team_role_set_updated_at" BEFORE UPDATE ON "public"."restaurant_team_role" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "review_media_set_updated_at" BEFORE UPDATE ON "public"."review_media" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "review_review_computed_restaurant_rating" AFTER INSERT OR UPDATE OF "rating_value", "moderation_status_code", "is_public" ON "public"."review_review" FOR EACH ROW EXECUTE FUNCTION "public"."computed_refresh_restaurant_rating"();



CREATE OR REPLACE TRIGGER "review_review_set_updated_at" BEFORE UPDATE ON "public"."review_review" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "storage_object_set_updated_at" BEFORE UPDATE ON "public"."storage_object" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "support_ticket_event_immutable" BEFORE DELETE OR UPDATE ON "public"."support_ticket_event" FOR EACH ROW EXECUTE FUNCTION "public"."raise_immutable_error"();



CREATE OR REPLACE TRIGGER "support_ticket_set_updated_at" BEFORE UPDATE ON "public"."support_ticket" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_finance_entry_locked_guard" BEFORE INSERT OR DELETE OR UPDATE ON "public"."finance_restaurant_payout_entry" FOR EACH ROW EXECUTE FUNCTION "public"."api_finance_assert_mutable_run"();



CREATE OR REPLACE TRIGGER "trg_finance_settlement_run_locked_guard" BEFORE UPDATE ON "public"."finance_settlement_run" FOR EACH ROW EXECUTE FUNCTION "public"."api_finance_assert_mutable_run"();



CREATE OR REPLACE TRIGGER "website_contact_submission_set_updated_on" BEFORE UPDATE ON "public"."website_contact_submission" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_on"();



CREATE OR REPLACE TRIGGER "website_partner_interest_set_updated_on" BEFORE UPDATE ON "public"."website_partner_interest" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_on"();



CREATE OR REPLACE TRIGGER "website_waitlist_lead_set_updated_on" BEFORE UPDATE ON "public"."website_waitlist_lead" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_on"();



ALTER TABLE ONLY "public"."admin_data_correction"
    ADD CONSTRAINT "fk_admin_data_correction_approver" FOREIGN KEY ("approved_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_data_correction"
    ADD CONSTRAINT "fk_admin_data_correction_executor" FOREIGN KEY ("executed_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_data_correction"
    ADD CONSTRAINT "fk_admin_data_correction_requester" FOREIGN KEY ("requested_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_export_job"
    ADD CONSTRAINT "fk_admin_export_job_requester" FOREIGN KEY ("requested_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_export_job"
    ADD CONSTRAINT "fk_admin_export_job_result" FOREIGN KEY ("result_storage_object_fk") REFERENCES "public"."storage_object"("storage_object_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "fk_audit_log_actor" FOREIGN KEY ("actor_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_subscription_charge"
    ADD CONSTRAINT "fk_billing_subscription_charge_sub" FOREIGN KEY ("consumer_subscription_fk") REFERENCES "public"."consumer_subscription"("consumer_subscription_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_subscription_event"
    ADD CONSTRAINT "fk_billing_subscription_event_sub" FOREIGN KEY ("consumer_subscription_fk") REFERENCES "public"."consumer_subscription"("consumer_subscription_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_bag_template_allergen"
    ADD CONSTRAINT "fk_catalog_bag_allergen_allergen" FOREIGN KEY ("master_allergen_fk") REFERENCES "public"."master_allergen"("master_allergen_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."catalog_bag_template_allergen"
    ADD CONSTRAINT "fk_catalog_bag_allergen_revision" FOREIGN KEY ("catalog_bag_template_revision_fk") REFERENCES "public"."catalog_bag_template_revision"("catalog_bag_template_revision_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_bag_template_media"
    ADD CONSTRAINT "fk_catalog_bag_media_revision" FOREIGN KEY ("catalog_bag_template_revision_fk") REFERENCES "public"."catalog_bag_template_revision"("catalog_bag_template_revision_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_bag_template_media"
    ADD CONSTRAINT "fk_catalog_bag_media_storage" FOREIGN KEY ("storage_object_fk") REFERENCES "public"."storage_object"("storage_object_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."catalog_bag_template"
    ADD CONSTRAINT "fk_catalog_bag_template_active_revision" FOREIGN KEY ("active_revision_fk") REFERENCES "public"."catalog_bag_template_revision"("catalog_bag_template_revision_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."catalog_bag_template"
    ADD CONSTRAINT "fk_catalog_bag_template_creator" FOREIGN KEY ("created_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."catalog_bag_template"
    ADD CONSTRAINT "fk_catalog_bag_template_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_bag_template_revision"
    ADD CONSTRAINT "fk_catalog_bag_template_revision_creator" FOREIGN KEY ("created_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."catalog_bag_template_revision"
    ADD CONSTRAINT "fk_catalog_bag_template_revision_template" FOREIGN KEY ("catalog_bag_template_fk") REFERENCES "public"."catalog_bag_template"("catalog_bag_template_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cms_city_page"
    ADD CONSTRAINT "fk_cms_city_page_city" FOREIGN KEY ("geo_city_fk") REFERENCES "public"."geo_city"("geo_city_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cms_page"
    ADD CONSTRAINT "fk_cms_page_creator" FOREIGN KEY ("created_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cms_post"
    ADD CONSTRAINT "fk_cms_post_author" FOREIGN KEY ("author_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cms_restaurant_feature"
    ADD CONSTRAINT "fk_cms_restaurant_feature_restaurant" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cms_seo_metadata"
    ADD CONSTRAINT "fk_cms_seo_metadata_og_image" FOREIGN KEY ("og_image_storage_object_fk") REFERENCES "public"."storage_object"("storage_object_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consumer_allergen_preference"
    ADD CONSTRAINT "fk_consumer_allergen_pref_allergen" FOREIGN KEY ("master_allergen_fk") REFERENCES "public"."master_allergen"("master_allergen_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consumer_allergen_preference"
    ADD CONSTRAINT "fk_consumer_allergen_pref_profile" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_city_preference"
    ADD CONSTRAINT "fk_consumer_city_pref_city" FOREIGN KEY ("geo_city_fk") REFERENCES "public"."geo_city"("geo_city_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consumer_city_preference"
    ADD CONSTRAINT "fk_consumer_city_pref_profile" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_dietary_preference"
    ADD CONSTRAINT "fk_consumer_dietary_preference_profile" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_notification_preference"
    ADD CONSTRAINT "fk_consumer_notification_preference_cons" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_passport_stat"
    ADD CONSTRAINT "fk_consumer_passport_stat_cons" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_profile"
    ADD CONSTRAINT "fk_consumer_profile_iam" FOREIGN KEY ("iam_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_profile"
    ADD CONSTRAINT "fk_consumer_profile_used_referral" FOREIGN KEY ("used_referral_code_fk") REFERENCES "public"."consumer_referral_code"("consumer_referral_code_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consumer_referral_code"
    ADD CONSTRAINT "fk_consumer_referral_code_profile" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_referral"
    ADD CONSTRAINT "fk_consumer_referral_referred" FOREIGN KEY ("referred_consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_referral"
    ADD CONSTRAINT "fk_consumer_referral_referrer" FOREIGN KEY ("referrer_consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_saved_restaurant"
    ADD CONSTRAINT "fk_consumer_saved_restaurant_consumer" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_saved_restaurant"
    ADD CONSTRAINT "fk_consumer_saved_restaurant_restaurant" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_subscription"
    ADD CONSTRAINT "fk_consumer_subscription_consumer" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumer_subscription"
    ADD CONSTRAINT "fk_consumer_subscription_plan" FOREIGN KEY ("consumer_subscription_plan_fk") REFERENCES "public"."consumer_subscription_plan"("consumer_subscription_plan_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."drop_audience"
    ADD CONSTRAINT "fk_drop_audience_drop" FOREIGN KEY ("drop_fk") REFERENCES "public"."drop_drop"("drop_drop_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_audience"
    ADD CONSTRAINT "fk_drop_audience_seg" FOREIGN KEY ("master_audience_segment_fk") REFERENCES "public"."master_audience_segment"("master_audience_segment_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."drop_drop"
    ADD CONSTRAINT "fk_drop_city" FOREIGN KEY ("geo_city_fk") REFERENCES "public"."geo_city"("geo_city_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."drop_closure_log"
    ADD CONSTRAINT "fk_drop_closure_log_actor" FOREIGN KEY ("closed_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."drop_closure_log"
    ADD CONSTRAINT "fk_drop_closure_log_drop" FOREIGN KEY ("drop_fk") REFERENCES "public"."drop_drop"("drop_drop_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_drop"
    ADD CONSTRAINT "fk_drop_creator" FOREIGN KEY ("created_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."drop_inventory_event"
    ADD CONSTRAINT "fk_drop_inventory_event_actor" FOREIGN KEY ("actor_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."drop_inventory_event"
    ADD CONSTRAINT "fk_drop_inventory_event_drop" FOREIGN KEY ("drop_fk") REFERENCES "public"."drop_drop"("drop_drop_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_inventory_event"
    ADD CONSTRAINT "fk_drop_inventory_event_hold" FOREIGN KEY ("drop_inventory_hold_fk") REFERENCES "public"."drop_inventory_hold"("drop_inventory_hold_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."drop_inventory_event"
    ADD CONSTRAINT "fk_drop_inventory_event_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."drop_inventory_hold"
    ADD CONSTRAINT "fk_drop_inventory_hold_cons" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_inventory_hold"
    ADD CONSTRAINT "fk_drop_inventory_hold_drop" FOREIGN KEY ("drop_fk") REFERENCES "public"."drop_drop"("drop_drop_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_inventory_hold"
    ADD CONSTRAINT "fk_drop_inventory_hold_order" FOREIGN KEY ("converted_order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."drop_media"
    ADD CONSTRAINT "fk_drop_media_drop" FOREIGN KEY ("drop_fk") REFERENCES "public"."drop_drop"("drop_drop_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_media"
    ADD CONSTRAINT "fk_drop_media_storage" FOREIGN KEY ("storage_object_fk") REFERENCES "public"."storage_object"("storage_object_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."drop_drop"
    ADD CONSTRAINT "fk_drop_neighborhood" FOREIGN KEY ("geo_neighborhood_fk") REFERENCES "public"."geo_neighborhood"("geo_neighborhood_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."drop_drop"
    ADD CONSTRAINT "fk_drop_publisher" FOREIGN KEY ("published_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."drop_recurring_schedule"
    ADD CONSTRAINT "fk_drop_recurring_schedule_creator" FOREIGN KEY ("created_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."drop_recurring_schedule"
    ADD CONSTRAINT "fk_drop_recurring_schedule_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_recurring_schedule"
    ADD CONSTRAINT "fk_drop_recurring_schedule_template" FOREIGN KEY ("catalog_bag_template_fk") REFERENCES "public"."catalog_bag_template"("catalog_bag_template_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."drop_drop"
    ADD CONSTRAINT "fk_drop_restaurant" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drop_drop"
    ADD CONSTRAINT "fk_drop_revision" FOREIGN KEY ("catalog_bag_template_revision_fk") REFERENCES "public"."catalog_bag_template_revision"("catalog_bag_template_revision_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."drop_drop"
    ADD CONSTRAINT "fk_drop_schedule" FOREIGN KEY ("drop_recurring_schedule_fk") REFERENCES "public"."drop_recurring_schedule"("drop_recurring_schedule_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_invoice"
    ADD CONSTRAINT "fk_finance_invoice_issued_by_profile" FOREIGN KEY ("issued_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_invoice"
    ADD CONSTRAINT "fk_finance_invoice_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."finance_invoice"
    ADD CONSTRAINT "fk_finance_invoice_run" FOREIGN KEY ("finance_settlement_run_fk") REFERENCES "public"."finance_settlement_run"("finance_settlement_run_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finance_invoice"
    ADD CONSTRAINT "fk_finance_invoice_storage" FOREIGN KEY ("storage_object_fk") REFERENCES "public"."storage_object"("storage_object_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_restaurant_payout_entry"
    ADD CONSTRAINT "fk_finance_payout_entry_created_by_profile" FOREIGN KEY ("created_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_restaurant_payout_entry"
    ADD CONSTRAINT "fk_finance_payout_entry_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_restaurant_payout_entry"
    ADD CONSTRAINT "fk_finance_payout_entry_payment_transaction" FOREIGN KEY ("payment_transaction_fk") REFERENCES "public"."payment_transaction"("payment_transaction_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_restaurant_payout_entry"
    ADD CONSTRAINT "fk_finance_payout_entry_refund" FOREIGN KEY ("payment_refund_fk") REFERENCES "public"."payment_refund"("payment_refund_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_restaurant_payout_entry"
    ADD CONSTRAINT "fk_finance_payout_entry_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."finance_restaurant_payout_entry"
    ADD CONSTRAINT "fk_finance_payout_entry_run" FOREIGN KEY ("finance_settlement_run_fk") REFERENCES "public"."finance_settlement_run"("finance_settlement_run_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finance_settlement_run"
    ADD CONSTRAINT "fk_finance_settlement_locker" FOREIGN KEY ("locked_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_settlement_run"
    ADD CONSTRAINT "fk_finance_settlement_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."geo_address"
    ADD CONSTRAINT "fk_geo_address_city" FOREIGN KEY ("geo_city_fk") REFERENCES "public"."geo_city"("geo_city_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."geo_address"
    ADD CONSTRAINT "fk_geo_address_neighborhood" FOREIGN KEY ("geo_neighborhood_fk") REFERENCES "public"."geo_neighborhood"("geo_neighborhood_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."geo_neighborhood"
    ADD CONSTRAINT "fk_geo_neighborhood_city" FOREIGN KEY ("geo_city_fk") REFERENCES "public"."geo_city"("geo_city_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."iam_platform_membership"
    ADD CONSTRAINT "fk_iam_platform_membership_profile" FOREIGN KEY ("iam_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."iam_platform_membership"
    ADD CONSTRAINT "fk_iam_platform_membership_role" FOREIGN KEY ("iam_platform_role_fk") REFERENCES "public"."iam_platform_role"("iam_platform_role_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."iam_platform_role_scope"
    ADD CONSTRAINT "fk_iam_platform_role_scope_role" FOREIGN KEY ("iam_platform_role_fk") REFERENCES "public"."iam_platform_role"("iam_platform_role_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."iam_platform_role_scope"
    ADD CONSTRAINT "fk_iam_platform_role_scope_scope" FOREIGN KEY ("master_scope_fk") REFERENCES "public"."master_scope"("master_scope_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."iam_profile"
    ADD CONSTRAINT "fk_iam_profile_auth_user" FOREIGN KEY ("auth_user_fk") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."iam_profile"
    ADD CONSTRAINT "fk_iam_profile_default_city" FOREIGN KEY ("default_city_fk") REFERENCES "public"."geo_city"("geo_city_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_incident"
    ADD CONSTRAINT "fk_incident_assignee" FOREIGN KEY ("assigned_to_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_event"
    ADD CONSTRAINT "fk_incident_event_actor" FOREIGN KEY ("actor_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_event"
    ADD CONSTRAINT "fk_incident_event_from_status" FOREIGN KEY ("from_status_fk") REFERENCES "public"."master_incident_status"("master_incident_status_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_event"
    ADD CONSTRAINT "fk_incident_event_incident" FOREIGN KEY ("incident_fk") REFERENCES "public"."incident_incident"("incident_incident_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incident_event"
    ADD CONSTRAINT "fk_incident_event_to_status" FOREIGN KEY ("to_status_fk") REFERENCES "public"."master_incident_status"("master_incident_status_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_incident"
    ADD CONSTRAINT "fk_incident_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_incident"
    ADD CONSTRAINT "fk_incident_reporter" FOREIGN KEY ("reported_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_incident"
    ADD CONSTRAINT "fk_incident_restaurant" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_incident"
    ADD CONSTRAINT "fk_incident_severity" FOREIGN KEY ("master_incident_severity_fk") REFERENCES "public"."master_incident_severity"("master_incident_severity_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."incident_incident"
    ADD CONSTRAINT "fk_incident_status" FOREIGN KEY ("master_incident_status_fk") REFERENCES "public"."master_incident_status"("master_incident_status_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."incident_incident"
    ADD CONSTRAINT "fk_incident_support_ticket" FOREIGN KEY ("support_ticket_fk") REFERENCES "public"."support_ticket"("support_ticket_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_incident"
    ADD CONSTRAINT "fk_incident_type" FOREIGN KEY ("master_incident_type_fk") REFERENCES "public"."master_incident_type"("master_incident_type_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."marketing_partner_lead"
    ADD CONSTRAINT "fk_marketing_partner_lead_assigned" FOREIGN KEY ("assigned_to_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_partner_lead"
    ADD CONSTRAINT "fk_marketing_partner_lead_city" FOREIGN KEY ("geo_city_fk") REFERENCES "public"."geo_city"("geo_city_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_partner_lead"
    ADD CONSTRAINT "fk_marketing_partner_lead_restaurant" FOREIGN KEY ("converted_restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_partner_lead"
    ADD CONSTRAINT "fk_marketing_partner_lead_ticket" FOREIGN KEY ("converted_support_ticket_fk") REFERENCES "public"."support_ticket"("support_ticket_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_waitlist_lead"
    ADD CONSTRAINT "fk_marketing_waitlist_lead_city" FOREIGN KEY ("geo_city_fk") REFERENCES "public"."geo_city"("geo_city_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_waitlist_lead"
    ADD CONSTRAINT "fk_marketing_waitlist_lead_consumer" FOREIGN KEY ("converted_consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_delivery_attempt"
    ADD CONSTRAINT "fk_notification_attempt_outbox" FOREIGN KEY ("notification_outbox_fk") REFERENCES "public"."notification_outbox"("notification_outbox_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_device"
    ADD CONSTRAINT "fk_notification_device_profile" FOREIGN KEY ("iam_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "fk_notification_outbox_profile" FOREIGN KEY ("recipient_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "fk_notification_outbox_template" FOREIGN KEY ("notification_template_fk") REFERENCES "public"."notification_template"("notification_template_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_order"
    ADD CONSTRAINT "fk_order_consumer" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_order"
    ADD CONSTRAINT "fk_order_drop" FOREIGN KEY ("drop_fk") REFERENCES "public"."drop_drop"("drop_drop_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_order"
    ADD CONSTRAINT "fk_order_hold" FOREIGN KEY ("drop_inventory_hold_fk") REFERENCES "public"."drop_inventory_hold"("drop_inventory_hold_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_item"
    ADD CONSTRAINT "fk_order_item_drop" FOREIGN KEY ("drop_fk") REFERENCES "public"."drop_drop"("drop_drop_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_item"
    ADD CONSTRAINT "fk_order_item_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_item"
    ADD CONSTRAINT "fk_order_item_revision" FOREIGN KEY ("catalog_bag_template_revision_fk") REFERENCES "public"."catalog_bag_template_revision"("catalog_bag_template_revision_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_order"
    ADD CONSTRAINT "fk_order_restaurant" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_status_transition"
    ADD CONSTRAINT "fk_order_status_transition_actor" FOREIGN KEY ("actor_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_status_transition"
    ADD CONSTRAINT "fk_order_status_transition_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_order_intent"
    ADD CONSTRAINT "fk_payment_order_intent_cons" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payment_order_intent"
    ADD CONSTRAINT "fk_payment_order_intent_hold" FOREIGN KEY ("drop_inventory_hold_fk") REFERENCES "public"."drop_inventory_hold"("drop_inventory_hold_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payment_order_intent"
    ADD CONSTRAINT "fk_payment_order_intent_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_refund"
    ADD CONSTRAINT "fk_payment_refund_incident" FOREIGN KEY ("incident_fk") REFERENCES "public"."incident_incident"("incident_incident_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_refund"
    ADD CONSTRAINT "fk_payment_refund_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payment_refund"
    ADD CONSTRAINT "fk_payment_refund_requester" FOREIGN KEY ("requested_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_refund"
    ADD CONSTRAINT "fk_payment_refund_support_ticket" FOREIGN KEY ("support_ticket_fk") REFERENCES "public"."support_ticket"("support_ticket_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_refund"
    ADD CONSTRAINT "fk_payment_refund_txn" FOREIGN KEY ("payment_transaction_fk") REFERENCES "public"."payment_transaction"("payment_transaction_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_transaction"
    ADD CONSTRAINT "fk_payment_transaction_intent" FOREIGN KEY ("payment_order_intent_fk") REFERENCES "public"."payment_order_intent"("payment_order_intent_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_pickup_verification_event"
    ADD CONSTRAINT "fk_pickup_verification_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_pickup_verification_event"
    ADD CONSTRAINT "fk_pickup_verification_profile" FOREIGN KEY ("verifying_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_pickup_verification_event"
    ADD CONSTRAINT "fk_pickup_verification_restaurant" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."privacy_consent_event"
    ADD CONSTRAINT "fk_privacy_consent_event_profile" FOREIGN KEY ("iam_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."privacy_consent_event"
    ADD CONSTRAINT "fk_privacy_consent_event_purpose" FOREIGN KEY ("privacy_consent_purpose_fk") REFERENCES "public"."privacy_consent_purpose"("privacy_consent_purpose_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."privacy_consent_event"
    ADD CONSTRAINT "fk_privacy_consent_event_recorder" FOREIGN KEY ("recorded_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."privacy_erasure_request"
    ADD CONSTRAINT "fk_privacy_erasure_request_profile" FOREIGN KEY ("iam_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."privacy_erasure_request"
    ADD CONSTRAINT "fk_privacy_erasure_request_reviewer" FOREIGN KEY ("reviewed_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_restaurant"
    ADD CONSTRAINT "fk_restaurant_address" FOREIGN KEY ("geo_address_fk") REFERENCES "public"."geo_address"("geo_address_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_restaurant"
    ADD CONSTRAINT "fk_restaurant_city" FOREIGN KEY ("geo_city_fk") REFERENCES "public"."geo_city"("geo_city_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."restaurant_commission_override"
    ADD CONSTRAINT "fk_restaurant_commission_override_creator" FOREIGN KEY ("created_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_commission_override"
    ADD CONSTRAINT "fk_restaurant_commission_override_plan" FOREIGN KEY ("restaurant_commission_plan_fk") REFERENCES "public"."restaurant_commission_plan"("restaurant_commission_plan_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_commission_override"
    ADD CONSTRAINT "fk_restaurant_commission_override_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_compliance"
    ADD CONSTRAINT "fk_restaurant_compliance_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_compliance"
    ADD CONSTRAINT "fk_restaurant_compliance_reviewer" FOREIGN KEY ("last_reviewed_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_contact"
    ADD CONSTRAINT "fk_restaurant_contact_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_cuisine_map"
    ADD CONSTRAINT "fk_restaurant_cuisine_map_cuisine" FOREIGN KEY ("master_cuisine_fk") REFERENCES "public"."master_cuisine"("master_cuisine_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."restaurant_cuisine_map"
    ADD CONSTRAINT "fk_restaurant_cuisine_map_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_document"
    ADD CONSTRAINT "fk_restaurant_document_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_document"
    ADD CONSTRAINT "fk_restaurant_document_reviewer" FOREIGN KEY ("reviewed_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_document"
    ADD CONSTRAINT "fk_restaurant_document_status" FOREIGN KEY ("master_document_status_fk") REFERENCES "public"."master_document_status"("master_document_status_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."restaurant_document"
    ADD CONSTRAINT "fk_restaurant_document_storage" FOREIGN KEY ("storage_object_fk") REFERENCES "public"."storage_object"("storage_object_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_document"
    ADD CONSTRAINT "fk_restaurant_document_type" FOREIGN KEY ("master_document_type_fk") REFERENCES "public"."master_document_type"("master_document_type_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."restaurant_document"
    ADD CONSTRAINT "fk_restaurant_document_uploader" FOREIGN KEY ("uploaded_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_restaurant"
    ADD CONSTRAINT "fk_restaurant_neighborhood" FOREIGN KEY ("geo_neighborhood_fk") REFERENCES "public"."geo_neighborhood"("geo_neighborhood_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_onboarding_task"
    ADD CONSTRAINT "fk_restaurant_onboarding_task_completed" FOREIGN KEY ("completed_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_onboarding_task"
    ADD CONSTRAINT "fk_restaurant_onboarding_task_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_restaurant"
    ADD CONSTRAINT "fk_restaurant_owner_profile" FOREIGN KEY ("owner_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_payout_account"
    ADD CONSTRAINT "fk_restaurant_payout_account_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_public_profile"
    ADD CONSTRAINT "fk_restaurant_public_profile_hero" FOREIGN KEY ("hero_storage_object_fk") REFERENCES "public"."storage_object"("storage_object_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_public_profile"
    ADD CONSTRAINT "fk_restaurant_public_profile_logo" FOREIGN KEY ("logo_storage_object_fk") REFERENCES "public"."storage_object"("storage_object_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_public_profile"
    ADD CONSTRAINT "fk_restaurant_public_profile_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_setting"
    ADD CONSTRAINT "fk_restaurant_setting_rest" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_team_membership"
    ADD CONSTRAINT "fk_restaurant_team_membership_inviter" FOREIGN KEY ("invited_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."restaurant_team_membership"
    ADD CONSTRAINT "fk_restaurant_team_membership_profile" FOREIGN KEY ("iam_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_team_membership"
    ADD CONSTRAINT "fk_restaurant_team_membership_restaurant" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_team_membership"
    ADD CONSTRAINT "fk_restaurant_team_membership_role" FOREIGN KEY ("restaurant_team_role_fk") REFERENCES "public"."restaurant_team_role"("restaurant_team_role_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."restaurant_team_role_scope"
    ADD CONSTRAINT "fk_restaurant_team_role_scope_role" FOREIGN KEY ("restaurant_team_role_fk") REFERENCES "public"."restaurant_team_role"("restaurant_team_role_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurant_team_role_scope"
    ADD CONSTRAINT "fk_restaurant_team_role_scope_scope" FOREIGN KEY ("master_scope_fk") REFERENCES "public"."master_scope"("master_scope_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."review_review"
    ADD CONSTRAINT "fk_review_consumer" FOREIGN KEY ("consumer_profile_fk") REFERENCES "public"."consumer_profile"("consumer_profile_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_media"
    ADD CONSTRAINT "fk_review_media_review" FOREIGN KEY ("review_fk") REFERENCES "public"."review_review"("review_review_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_media"
    ADD CONSTRAINT "fk_review_media_storage" FOREIGN KEY ("storage_object_fk") REFERENCES "public"."storage_object"("storage_object_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."review_review"
    ADD CONSTRAINT "fk_review_moderator" FOREIGN KEY ("moderated_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."review_review"
    ADD CONSTRAINT "fk_review_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_review"
    ADD CONSTRAINT "fk_review_restaurant" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storage_object"
    ADD CONSTRAINT "fk_storage_object_uploader" FOREIGN KEY ("uploaded_by_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."storage_object"
    ADD CONSTRAINT "fk_storage_object_visibility" FOREIGN KEY ("master_storage_visibility_fk") REFERENCES "public"."master_storage_visibility"("master_storage_visibility_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."support_ticket_event"
    ADD CONSTRAINT "fk_support_event_actor" FOREIGN KEY ("actor_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket_event"
    ADD CONSTRAINT "fk_support_event_from_status" FOREIGN KEY ("from_status_fk") REFERENCES "public"."master_support_ticket_status"("master_support_ticket_status_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket_event"
    ADD CONSTRAINT "fk_support_event_ticket" FOREIGN KEY ("support_ticket_fk") REFERENCES "public"."support_ticket"("support_ticket_pk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_ticket_event"
    ADD CONSTRAINT "fk_support_event_to_status" FOREIGN KEY ("to_status_fk") REFERENCES "public"."master_support_ticket_status"("master_support_ticket_status_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_assignee" FOREIGN KEY ("assigned_to_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_incident" FOREIGN KEY ("incident_fk") REFERENCES "public"."incident_incident"("incident_incident_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_order" FOREIGN KEY ("order_fk") REFERENCES "public"."order_order"("order_order_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_partner_lead" FOREIGN KEY ("marketing_partner_lead_fk") REFERENCES "public"."marketing_partner_lead"("marketing_partner_lead_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_payment_refund" FOREIGN KEY ("payment_refund_fk") REFERENCES "public"."payment_refund"("payment_refund_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_priority" FOREIGN KEY ("master_support_ticket_priority_fk") REFERENCES "public"."master_support_ticket_priority"("master_support_ticket_priority_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_requester" FOREIGN KEY ("requester_profile_fk") REFERENCES "public"."iam_profile"("iam_profile_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_restaurant" FOREIGN KEY ("restaurant_fk") REFERENCES "public"."restaurant_restaurant"("restaurant_restaurant_pk") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_status" FOREIGN KEY ("master_support_ticket_status_fk") REFERENCES "public"."master_support_ticket_status"("master_support_ticket_status_pk") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."support_ticket"
    ADD CONSTRAINT "fk_support_ticket_type" FOREIGN KEY ("master_support_ticket_type_fk") REFERENCES "public"."master_support_ticket_type"("master_support_ticket_type_pk") ON DELETE RESTRICT;



ALTER TABLE "public"."admin_data_correction" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_export_job" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_event_2026_q2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_event_2026_q3" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_event_default" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon_insert_website_contact_submission" ON "public"."website_contact_submission" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "anon_insert_website_partner_interest" ON "public"."website_partner_interest" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "anon_insert_website_waitlist_lead" ON "public"."website_waitlist_lead" FOR INSERT TO "anon" WITH CHECK (true);



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_select_website_contact_submission" ON "public"."website_contact_submission" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_website_partner_interest" ON "public"."website_partner_interest" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_select_website_waitlist_lead" ON "public"."website_waitlist_lead" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."billing_subscription_charge" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_subscription_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_bag_template" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_bag_template_allergen" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_bag_template_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_bag_template_revision" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cms_banner" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cms_city_page" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cms_page" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cms_post" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cms_restaurant_feature" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cms_seo_metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."config_feature_flag" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."config_runtime_setting" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_allergen_preference" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_city_preference" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_dietary_preference" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_notification_preference" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_passport_stat" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_referral" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_referral_code" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_saved_restaurant" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_subscription" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumer_subscription_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dev_demo_seed_registry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drop_audience" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drop_closure_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drop_drop" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drop_inventory_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drop_inventory_hold" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drop_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drop_recurring_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finance_invoice" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finance_restaurant_payout_entry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finance_settlement_run" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geo_address" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geo_city" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geo_neighborhood" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."iam_platform_membership" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."iam_platform_role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."iam_platform_role_scope" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."iam_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incident_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incident_incident" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_partner_lead" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_waitlist_lead" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_allergen" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_audience_segment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_cuisine" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_document_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_document_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_incident_severity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_incident_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_incident_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_scope" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_storage_visibility" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_support_ticket_priority" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_support_ticket_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_support_ticket_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_delivery_attempt" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_device" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_template" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_item" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_order" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_pickup_verification_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_transition" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "p_billing_subscription_charge_consumer_select" ON "public"."billing_subscription_charge" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."consumer_subscription" "cs"
  WHERE (("cs"."consumer_subscription_pk" = "billing_subscription_charge"."consumer_subscription_fk") AND ("cs"."consumer_profile_fk" = "public"."rls_current_consumer_profile_pk"())))));



CREATE POLICY "p_billing_subscription_charge_self" ON "public"."billing_subscription_charge" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."consumer_subscription" "s"
  WHERE (("s"."consumer_subscription_pk" = "billing_subscription_charge"."consumer_subscription_fk") AND ("public"."rls_is_consumer_profile"("s"."consumer_profile_fk") OR "public"."rls_is_platform_user"())))));



CREATE POLICY "p_billing_subscription_event_consumer_select" ON "public"."billing_subscription_event" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."consumer_subscription" "cs"
  WHERE (("cs"."consumer_subscription_pk" = "billing_subscription_event"."consumer_subscription_fk") AND ("cs"."consumer_profile_fk" = "public"."rls_current_consumer_profile_pk"())))));



CREATE POLICY "p_catalog_allergen_public_read" ON "public"."catalog_bag_template_allergen" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "p_catalog_allergen_team" ON "public"."catalog_bag_template_allergen" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."catalog_bag_template_revision" "r"
     JOIN "public"."catalog_bag_template" "t" ON (("t"."catalog_bag_template_pk" = "r"."catalog_bag_template_fk")))
  WHERE (("r"."catalog_bag_template_revision_pk" = "catalog_bag_template_allergen"."catalog_bag_template_revision_fk") AND "public"."rls_has_restaurant_access"("t"."restaurant_fk"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."catalog_bag_template_revision" "r"
     JOIN "public"."catalog_bag_template" "t" ON (("t"."catalog_bag_template_pk" = "r"."catalog_bag_template_fk")))
  WHERE (("r"."catalog_bag_template_revision_pk" = "catalog_bag_template_allergen"."catalog_bag_template_revision_fk") AND "public"."rls_has_restaurant_access"("t"."restaurant_fk")))));



CREATE POLICY "p_catalog_media_public_read" ON "public"."catalog_bag_template_media" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "p_catalog_media_team" ON "public"."catalog_bag_template_media" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."catalog_bag_template_revision" "r"
     JOIN "public"."catalog_bag_template" "t" ON (("t"."catalog_bag_template_pk" = "r"."catalog_bag_template_fk")))
  WHERE (("r"."catalog_bag_template_revision_pk" = "catalog_bag_template_media"."catalog_bag_template_revision_fk") AND "public"."rls_has_restaurant_access"("t"."restaurant_fk"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."catalog_bag_template_revision" "r"
     JOIN "public"."catalog_bag_template" "t" ON (("t"."catalog_bag_template_pk" = "r"."catalog_bag_template_fk")))
  WHERE (("r"."catalog_bag_template_revision_pk" = "catalog_bag_template_media"."catalog_bag_template_revision_fk") AND "public"."rls_has_restaurant_access"("t"."restaurant_fk")))));



CREATE POLICY "p_catalog_revision_public_read" ON "public"."catalog_bag_template_revision" FOR SELECT TO "authenticated", "anon" USING (("revision_status_code" = 'PUBLISHED'::"text"));



CREATE POLICY "p_catalog_revision_team" ON "public"."catalog_bag_template_revision" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."catalog_bag_template" "t"
  WHERE (("t"."catalog_bag_template_pk" = "catalog_bag_template_revision"."catalog_bag_template_fk") AND "public"."rls_has_restaurant_access"("t"."restaurant_fk"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."catalog_bag_template" "t"
  WHERE (("t"."catalog_bag_template_pk" = "catalog_bag_template_revision"."catalog_bag_template_fk") AND "public"."rls_has_restaurant_access"("t"."restaurant_fk")))));



CREATE POLICY "p_catalog_template_public_read" ON "public"."catalog_bag_template" FOR SELECT TO "authenticated", "anon" USING (("template_status_code" = 'ACTIVE'::"text"));



CREATE POLICY "p_catalog_template_team" ON "public"."catalog_bag_template" TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk")) WITH CHECK ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_cms_banner_public_read" ON "public"."cms_banner" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" > "now"()))));



CREATE POLICY "p_cms_city_page_public_read" ON "public"."cms_city_page" FOR SELECT TO "authenticated", "anon" USING (("is_published" = true));



CREATE POLICY "p_cms_page_public_read" ON "public"."cms_page" FOR SELECT TO "authenticated", "anon" USING (("page_status_code" = 'PUBLISHED'::"text"));



CREATE POLICY "p_cms_post_public_read" ON "public"."cms_post" FOR SELECT TO "authenticated", "anon" USING (("post_status_code" = 'PUBLISHED'::"text"));



CREATE POLICY "p_cms_restaurant_feature_public_read" ON "public"."cms_restaurant_feature" FOR SELECT TO "authenticated", "anon" USING (("is_published" = true));



CREATE POLICY "p_consumer_allergen_self" ON "public"."consumer_allergen_preference" TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"())) WITH CHECK (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_consumer_city_self" ON "public"."consumer_city_preference" TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"())) WITH CHECK (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_consumer_dietary_self" ON "public"."consumer_dietary_preference" TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"())) WITH CHECK (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_consumer_notification_pref_self" ON "public"."consumer_notification_preference" TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"())) WITH CHECK (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_consumer_passport_self" ON "public"."consumer_passport_stat" FOR SELECT TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_consumer_profile_self" ON "public"."consumer_profile" TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_pk") OR "public"."rls_is_platform_user"())) WITH CHECK (("public"."rls_is_consumer_profile"("consumer_profile_pk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_consumer_referral_code_self" ON "public"."consumer_referral_code" FOR SELECT TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_consumer_referral_self" ON "public"."consumer_referral" FOR SELECT TO "authenticated" USING (("public"."rls_is_consumer_profile"("referrer_consumer_profile_fk") OR "public"."rls_is_consumer_profile"("referred_consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_consumer_saved_restaurant_self" ON "public"."consumer_saved_restaurant" TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"())) WITH CHECK (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_consumer_subscription_self" ON "public"."consumer_subscription" FOR SELECT TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_drop_audience_authenticated_read" ON "public"."drop_audience" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_drop_audience_team" ON "public"."drop_audience" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."drop_drop" "d"
  WHERE (("d"."drop_drop_pk" = "drop_audience"."drop_fk") AND "public"."rls_has_restaurant_access"("d"."restaurant_fk"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."drop_drop" "d"
  WHERE (("d"."drop_drop_pk" = "drop_audience"."drop_fk") AND "public"."rls_has_restaurant_access"("d"."restaurant_fk")))));



CREATE POLICY "p_drop_closure_log_team_select" ON "public"."drop_closure_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."drop_drop" "d"
  WHERE (("d"."drop_drop_pk" = "drop_closure_log"."drop_fk") AND "public"."rls_has_restaurant_access"("d"."restaurant_fk")))));



CREATE POLICY "p_drop_inventory_event_team_select" ON "public"."drop_inventory_event" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."drop_drop" "d"
  WHERE (("d"."drop_drop_pk" = "drop_inventory_event"."drop_fk") AND "public"."rls_has_restaurant_access"("d"."restaurant_fk")))));



CREATE POLICY "p_drop_inventory_hold_consumer_select" ON "public"."drop_inventory_hold" FOR SELECT TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_drop_inventory_hold_restaurant_select" ON "public"."drop_inventory_hold" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."drop_drop" "d"
  WHERE (("d"."drop_drop_pk" = "drop_inventory_hold"."drop_fk") AND "public"."rls_has_restaurant_access"("d"."restaurant_fk")))) OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_drop_media_public_read" ON "public"."drop_media" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "p_drop_media_team" ON "public"."drop_media" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."drop_drop" "d"
  WHERE (("d"."drop_drop_pk" = "drop_media"."drop_fk") AND "public"."rls_has_restaurant_access"("d"."restaurant_fk"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."drop_drop" "d"
  WHERE (("d"."drop_drop_pk" = "drop_media"."drop_fk") AND "public"."rls_has_restaurant_access"("d"."restaurant_fk")))));



CREATE POLICY "p_drop_public_read" ON "public"."drop_drop" FOR SELECT TO "authenticated", "anon" USING ((("visibility_code" = 'PUBLIC'::"text") AND ("drop_status_code" = ANY (ARRAY['SCHEDULED'::"text", 'ACTIVE'::"text", 'SOLD_OUT'::"text", 'PICKUP_CLOSED'::"text"]))));



CREATE POLICY "p_finance_invoice_restaurant_select" ON "public"."finance_invoice" FOR SELECT TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_finance_payout_entry_restaurant_select" ON "public"."finance_restaurant_payout_entry" FOR SELECT TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_finance_settlement_run_restaurant_select" ON "public"."finance_settlement_run" FOR SELECT TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_geo_city_public_read" ON "public"."geo_city" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "p_geo_neighborhood_public_read" ON "public"."geo_neighborhood" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "p_iam_platform_membership_self_or_admin_select" ON "public"."iam_platform_membership" FOR SELECT TO "authenticated" USING ((("iam_profile_fk" = "public"."rls_current_profile_pk"()) OR "public"."rls_is_platform_admin"()));



CREATE POLICY "p_iam_platform_role_admin_select" ON "public"."iam_platform_role" FOR SELECT TO "authenticated" USING ("public"."rls_is_platform_admin"());



CREATE POLICY "p_iam_profile_self_select" ON "public"."iam_profile" FOR SELECT TO "authenticated" USING ((("auth_user_fk" = "auth"."uid"()) OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_iam_profile_self_update" ON "public"."iam_profile" FOR UPDATE TO "authenticated" USING (("auth_user_fk" = "auth"."uid"())) WITH CHECK (("auth_user_fk" = "auth"."uid"()));



CREATE POLICY "p_master_allergen_public_read" ON "public"."master_allergen" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "p_master_cuisine_public_read" ON "public"."master_cuisine" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "p_master_document_status_read" ON "public"."master_document_status" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_master_document_type_read" ON "public"."master_document_type" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "p_master_storage_visibility_admin_select" ON "public"."master_storage_visibility" FOR SELECT TO "authenticated" USING ("public"."rls_is_platform_admin"());



CREATE POLICY "p_order_consumer_select" ON "public"."order_order" FOR SELECT TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_has_restaurant_access"("restaurant_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_order_item_consumer_select" ON "public"."order_item" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."order_order" "o"
  WHERE (("o"."order_order_pk" = "order_item"."order_fk") AND ("public"."rls_is_consumer_profile"("o"."consumer_profile_fk") OR "public"."rls_has_restaurant_access"("o"."restaurant_fk") OR "public"."rls_is_platform_user"())))));



CREATE POLICY "p_order_item_restaurant_select" ON "public"."order_item" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."order_order" "o"
  WHERE (("o"."order_order_pk" = "order_item"."order_fk") AND "public"."rls_has_restaurant_access"("o"."restaurant_fk")))));



CREATE POLICY "p_order_status_transition_restaurant_select" ON "public"."order_status_transition" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."order_order" "o"
  WHERE (("o"."order_order_pk" = "order_status_transition"."order_fk") AND "public"."rls_has_restaurant_access"("o"."restaurant_fk")))));



CREATE POLICY "p_payment_order_intent_consumer_select" ON "public"."payment_order_intent" FOR SELECT TO "authenticated" USING (("public"."rls_is_consumer_profile"("consumer_profile_fk") OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_payment_refund_consumer_select" ON "public"."payment_refund" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."order_order" "o"
  WHERE (("o"."order_order_pk" = "payment_refund"."order_fk") AND ("public"."rls_is_consumer_profile"("o"."consumer_profile_fk") OR "public"."rls_has_restaurant_access"("o"."restaurant_fk") OR "public"."rls_is_platform_user"())))));



CREATE POLICY "p_payment_transaction_consumer_select" ON "public"."payment_transaction" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."payment_order_intent" "i"
  WHERE (("i"."payment_order_intent_pk" = "payment_transaction"."payment_order_intent_fk") AND ("public"."rls_is_consumer_profile"("i"."consumer_profile_fk") OR "public"."rls_is_platform_user"())))));



CREATE POLICY "p_pickup_ver_event_consumer_select" ON "public"."order_pickup_verification_event" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."order_order" "o"
  WHERE (("o"."order_order_pk" = "order_pickup_verification_event"."order_fk") AND ("o"."consumer_profile_fk" = "public"."rls_current_consumer_profile_pk"())))));



CREATE POLICY "p_platform_admin_all" ON "public"."admin_data_correction" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."admin_export_job" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."analytics_event" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."audit_log" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."billing_subscription_charge" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."billing_subscription_event" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."catalog_bag_template" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."catalog_bag_template_allergen" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."catalog_bag_template_media" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."catalog_bag_template_revision" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."cms_banner" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."cms_city_page" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."cms_page" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."cms_post" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."cms_restaurant_feature" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."cms_seo_metadata" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."config_feature_flag" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."config_runtime_setting" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_allergen_preference" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_city_preference" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_dietary_preference" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_notification_preference" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_passport_stat" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_profile" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_referral" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_referral_code" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_saved_restaurant" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_subscription" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."consumer_subscription_plan" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."drop_audience" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."drop_closure_log" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."drop_drop" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."drop_inventory_event" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."drop_inventory_hold" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."drop_media" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."drop_recurring_schedule" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."finance_invoice" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."finance_restaurant_payout_entry" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."finance_settlement_run" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."geo_address" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."geo_city" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."geo_neighborhood" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."iam_platform_membership" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."iam_platform_role" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."iam_platform_role_scope" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."iam_profile" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."incident_event" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."incident_incident" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."marketing_partner_lead" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."marketing_waitlist_lead" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_allergen" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_audience_segment" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_cuisine" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_document_status" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_document_type" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_incident_severity" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_incident_status" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_incident_type" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_scope" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_storage_visibility" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_support_ticket_priority" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_support_ticket_status" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."master_support_ticket_type" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."notification_delivery_attempt" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."notification_device" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."notification_outbox" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."notification_template" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."order_item" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."order_order" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."order_pickup_verification_event" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."order_status_transition" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."payment_order_intent" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."payment_refund" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."payment_transaction" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."payment_webhook_event" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."privacy_consent_event" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."privacy_consent_purpose" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."privacy_erasure_request" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."privacy_retention_policy" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_commission_override" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_commission_plan" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_compliance" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_contact" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_cuisine_map" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_document" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_onboarding_task" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_payout_account" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_public_profile" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_restaurant" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_setting" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_team_membership" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_team_role" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."restaurant_team_role_scope" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."review_media" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."review_review" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."storage_object" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."support_ticket" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."support_ticket_event" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."website_contact_submission" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."website_partner_interest" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_platform_admin_all" ON "public"."website_waitlist_lead" TO "authenticated" USING ("public"."rls_is_platform_admin"()) WITH CHECK ("public"."rls_is_platform_admin"());



CREATE POLICY "p_privacy_consent_event_self_insert" ON "public"."privacy_consent_event" FOR INSERT TO "authenticated" WITH CHECK ((("iam_profile_fk" = "public"."rls_current_profile_pk"()) AND ("recorded_by_profile_fk" = "public"."rls_current_profile_pk"())));



CREATE POLICY "p_privacy_consent_event_self_select" ON "public"."privacy_consent_event" FOR SELECT TO "authenticated" USING ((("iam_profile_fk" = "public"."rls_current_profile_pk"()) OR "public"."rls_is_platform_user"()));



CREATE POLICY "p_privacy_consent_purpose_public_read" ON "public"."privacy_consent_purpose" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "p_restaurant_contact_team" ON "public"."restaurant_contact" TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk")) WITH CHECK ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_restaurant_cuisine_map_team" ON "public"."restaurant_cuisine_map" TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk")) WITH CHECK ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_restaurant_document_team_select" ON "public"."restaurant_document" FOR SELECT TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_restaurant_onboarding_task_team" ON "public"."restaurant_onboarding_task" FOR SELECT TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_restaurant_payout_account_team_select" ON "public"."restaurant_payout_account" FOR SELECT TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_restaurant_public_profile_read" ON "public"."restaurant_public_profile" FOR SELECT TO "authenticated", "anon" USING (("published_at" IS NOT NULL));



CREATE POLICY "p_restaurant_public_profile_team" ON "public"."restaurant_public_profile" TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_fk")) WITH CHECK ("public"."rls_has_restaurant_access"("restaurant_fk"));



CREATE POLICY "p_restaurant_public_read" ON "public"."restaurant_restaurant" FOR SELECT TO "authenticated", "anon" USING (("restaurant_status_code" = 'ACTIVE'::"text"));



CREATE POLICY "p_restaurant_self_select" ON "public"."restaurant_restaurant" FOR SELECT TO "authenticated" USING ("public"."rls_has_restaurant_access"("restaurant_restaurant_pk"));



CREATE POLICY "p_restaurant_team_membership_self_select" ON "public"."restaurant_team_membership" FOR SELECT TO "authenticated" USING ((("iam_profile_fk" = "public"."rls_current_profile_pk"()) OR "public"."rls_is_platform_admin"()));



CREATE POLICY "p_restaurant_team_role_authenticated_select" ON "public"."restaurant_team_role" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_restaurant_team_role_scope_authenticated_select" ON "public"."restaurant_team_role_scope" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_storage_object_public_metadata_select" ON "public"."storage_object" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."master_storage_visibility" "v"
  WHERE (("v"."master_storage_visibility_pk" = "storage_object"."master_storage_visibility_fk") AND ("v"."visibility_code" = 'PUBLIC_CDN'::"text") AND ("v"."is_public_readable" = true)))));



ALTER TABLE "public"."payment_order_intent" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_refund" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_transaction" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_webhook_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_consent_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_consent_purpose" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_erasure_request" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_retention_policy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_commission_override" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_commission_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_compliance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_contact" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_cuisine_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_document" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_onboarding_task" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_payout_account" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_public_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_restaurant" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_setting" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_team_membership" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_team_role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurant_team_role_scope" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_review" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storage_object" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_ticket" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_ticket_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."website_contact_submission" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."website_partner_interest" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."website_waitlist_lead" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."drop_drop";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."api_admin_ops_has_role"("p_actor_profile_pk" "uuid", "p_allowed_roles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_admin_ops_has_role"("p_actor_profile_pk" "uuid", "p_allowed_roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."api_admin_ops_has_role"("p_actor_profile_pk" "uuid", "p_allowed_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_admin_ops_has_role"("p_actor_profile_pk" "uuid", "p_allowed_roles" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_admin_set_drop_operational_status"("p_drop_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_admin_set_drop_operational_status"("p_drop_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_admin_set_drop_operational_status"("p_drop_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_admin_set_drop_operational_status"("p_drop_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_admin_set_restaurant_operational_status"("p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text", "p_public_note_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_admin_set_restaurant_operational_status"("p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text", "p_public_note_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_admin_set_restaurant_operational_status"("p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text", "p_public_note_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_admin_set_restaurant_operational_status"("p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_reason_text" "text", "p_public_note_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_bootstrap_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_default_city_code" "text", "p_preferred_language_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_bootstrap_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_default_city_code" "text", "p_preferred_language_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_bootstrap_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_default_city_code" "text", "p_preferred_language_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_capture_consents"("p_events" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."api_capture_consents"("p_events" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_capture_consents"("p_events" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_claim_notification_batch"("p_batch_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_claim_notification_batch"("p_batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."api_claim_notification_batch"("p_batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_claim_notification_batch"("p_batch_size" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_convert_paid_hold_to_order"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_fee_paise" bigint, "p_tax_paise" bigint, "p_captured_at" timestamp with time zone, "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_convert_paid_hold_to_order"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_fee_paise" bigint, "p_tax_paise" bigint, "p_captured_at" timestamp with time zone, "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."api_convert_paid_hold_to_order"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_fee_paise" bigint, "p_tax_paise" bigint, "p_captured_at" timestamp with time zone, "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_convert_paid_hold_to_order"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_fee_paise" bigint, "p_tax_paise" bigint, "p_captured_at" timestamp with time zone, "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_create_inventory_hold"("p_drop_pk" "uuid", "p_idempotency_key" "text", "p_quantity" integer, "p_hold_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_create_inventory_hold"("p_drop_pk" "uuid", "p_idempotency_key" "text", "p_quantity" integer, "p_hold_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."api_create_inventory_hold"("p_drop_pk" "uuid", "p_idempotency_key" "text", "p_quantity" integer, "p_hold_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_create_inventory_hold"("p_drop_pk" "uuid", "p_idempotency_key" "text", "p_quantity" integer, "p_hold_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_create_or_get_restaurant_onboarding"("p_restaurant_name" "text", "p_restaurant_slug" "text", "p_legal_entity_name" "text", "p_primary_contact_email" "text", "p_primary_contact_phone_e164" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_create_or_get_restaurant_onboarding"("p_restaurant_name" "text", "p_restaurant_slug" "text", "p_legal_entity_name" "text", "p_primary_contact_email" "text", "p_primary_contact_phone_e164" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_create_or_get_restaurant_onboarding"("p_restaurant_name" "text", "p_restaurant_slug" "text", "p_legal_entity_name" "text", "p_primary_contact_email" "text", "p_primary_contact_phone_e164" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_create_or_recalculate_settlement_run"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid", "p_note_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_create_or_recalculate_settlement_run"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid", "p_note_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_create_or_recalculate_settlement_run"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid", "p_note_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_create_or_recalculate_settlement_run"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid", "p_note_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_create_order_incident"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_type_code" "text", "p_severity_code" "text", "p_description_text" "text", "p_internal_note_text" "text", "p_source_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_create_order_incident"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_type_code" "text", "p_severity_code" "text", "p_description_text" "text", "p_internal_note_text" "text", "p_source_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_create_order_incident"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_type_code" "text", "p_severity_code" "text", "p_description_text" "text", "p_internal_note_text" "text", "p_source_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_create_order_incident"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_type_code" "text", "p_severity_code" "text", "p_description_text" "text", "p_internal_note_text" "text", "p_source_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_create_settlement_adjustment"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_amount_paise" bigint, "p_description_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_create_settlement_adjustment"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_amount_paise" bigint, "p_description_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_create_settlement_adjustment"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_amount_paise" bigint, "p_description_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_create_settlement_adjustment"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_amount_paise" bigint, "p_description_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_enqueue_incident_alerts"("p_incident_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_enqueue_incident_alerts"("p_incident_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_enqueue_incident_alerts"("p_incident_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_enqueue_incident_alerts"("p_incident_pk" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_enqueue_notification_outbox_row"("p_template_code" "text", "p_channel_code" "text", "p_audience_code" "text", "p_business_context_type_code" "text", "p_business_context_fk" "uuid", "p_recipient_profile_fk" "uuid", "p_resolved_destination_text" "text", "p_payload_json" "jsonb", "p_send_status_code" "text", "p_delivery_reason_code" "text", "p_purpose_code" "text", "p_scheduled_at" timestamp with time zone, "p_manual_fallback_text" "text", "p_idempotency_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_enqueue_notification_outbox_row"("p_template_code" "text", "p_channel_code" "text", "p_audience_code" "text", "p_business_context_type_code" "text", "p_business_context_fk" "uuid", "p_recipient_profile_fk" "uuid", "p_resolved_destination_text" "text", "p_payload_json" "jsonb", "p_send_status_code" "text", "p_delivery_reason_code" "text", "p_purpose_code" "text", "p_scheduled_at" timestamp with time zone, "p_manual_fallback_text" "text", "p_idempotency_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_enqueue_notification_outbox_row"("p_template_code" "text", "p_channel_code" "text", "p_audience_code" "text", "p_business_context_type_code" "text", "p_business_context_fk" "uuid", "p_recipient_profile_fk" "uuid", "p_resolved_destination_text" "text", "p_payload_json" "jsonb", "p_send_status_code" "text", "p_delivery_reason_code" "text", "p_purpose_code" "text", "p_scheduled_at" timestamp with time zone, "p_manual_fallback_text" "text", "p_idempotency_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_enqueue_notification_outbox_row"("p_template_code" "text", "p_channel_code" "text", "p_audience_code" "text", "p_business_context_type_code" "text", "p_business_context_fk" "uuid", "p_recipient_profile_fk" "uuid", "p_resolved_destination_text" "text", "p_payload_json" "jsonb", "p_send_status_code" "text", "p_delivery_reason_code" "text", "p_purpose_code" "text", "p_scheduled_at" timestamp with time zone, "p_manual_fallback_text" "text", "p_idempotency_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_enqueue_order_notifications"("p_order_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_enqueue_order_notifications"("p_order_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_enqueue_order_notifications"("p_order_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_enqueue_order_notifications"("p_order_pk" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_enqueue_pickup_reminders"("p_window_minutes" integer, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_enqueue_pickup_reminders"("p_window_minutes" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."api_enqueue_pickup_reminders"("p_window_minutes" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_enqueue_pickup_reminders"("p_window_minutes" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_finance_assert_mutable_run"() TO "anon";
GRANT ALL ON FUNCTION "public"."api_finance_assert_mutable_run"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_finance_assert_mutable_run"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_finance_has_platform_access"("p_actor_profile_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_finance_has_platform_access"("p_actor_profile_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_finance_has_platform_access"("p_actor_profile_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_finance_has_platform_access"("p_actor_profile_pk" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_finance_is_admin"("p_actor_profile_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_finance_is_admin"("p_actor_profile_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_finance_is_admin"("p_actor_profile_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_finance_is_admin"("p_actor_profile_pk" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_finance_money_round_bps"("p_amount_paise" bigint, "p_bps" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_finance_money_round_bps"("p_amount_paise" bigint, "p_bps" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."api_finance_money_round_bps"("p_amount_paise" bigint, "p_bps" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_finance_money_round_bps"("p_amount_paise" bigint, "p_bps" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_finance_payout_account_mask"("p_masked_account_number" "text", "p_status_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_finance_payout_account_mask"("p_masked_account_number" "text", "p_status_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_finance_payout_account_mask"("p_masked_account_number" "text", "p_status_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_finance_recalculate_run_totals"("p_settlement_run_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_finance_recalculate_run_totals"("p_settlement_run_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_finance_recalculate_run_totals"("p_settlement_run_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_finance_recalculate_run_totals"("p_settlement_run_pk" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_issue_settlement_invoice"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_invoice_number" "text", "p_metadata_json" "jsonb", "p_external_document_ref" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_issue_settlement_invoice"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_invoice_number" "text", "p_metadata_json" "jsonb", "p_external_document_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_issue_settlement_invoice"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_invoice_number" "text", "p_metadata_json" "jsonb", "p_external_document_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_issue_settlement_invoice"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_invoice_number" "text", "p_metadata_json" "jsonb", "p_external_document_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_latest_consents"() TO "anon";
GRANT ALL ON FUNCTION "public"."api_latest_consents"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_latest_consents"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_lock_settlement_run"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_lock_settlement_run"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_lock_settlement_run"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_lock_settlement_run"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_mark_order_no_show"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text", "p_idempotency_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_mark_order_no_show"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text", "p_idempotency_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_mark_order_no_show"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text", "p_idempotency_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_mark_order_no_show"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text", "p_idempotency_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_mark_settlement_status"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_note_text" "text", "p_provider_reference_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_mark_settlement_status"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_note_text" "text", "p_provider_reference_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_mark_settlement_status"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_note_text" "text", "p_provider_reference_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_mark_settlement_status"("p_settlement_run_pk" "uuid", "p_actor_profile_pk" "uuid", "p_next_status_code" "text", "p_note_text" "text", "p_provider_reference_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_notification_channel_enabled"("p_consumer_profile_pk" "uuid", "p_channel_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_notification_channel_enabled"("p_consumer_profile_pk" "uuid", "p_channel_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_notification_channel_enabled"("p_consumer_profile_pk" "uuid", "p_channel_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_notification_channel_enabled"("p_consumer_profile_pk" "uuid", "p_channel_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_notification_latest_consent_granted"("p_iam_profile_pk" "uuid", "p_purpose_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_notification_latest_consent_granted"("p_iam_profile_pk" "uuid", "p_purpose_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_notification_latest_consent_granted"("p_iam_profile_pk" "uuid", "p_purpose_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_notification_latest_consent_granted"("p_iam_profile_pk" "uuid", "p_purpose_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_notification_mask_destination"("p_destination" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_notification_mask_destination"("p_destination" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_notification_mask_destination"("p_destination" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_notification_mask_destination"("p_destination" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_notification_order_fallback_text"("p_order_pk" "uuid", "p_template_code" "text", "p_audience_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_notification_order_fallback_text"("p_order_pk" "uuid", "p_template_code" "text", "p_audience_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_notification_order_fallback_text"("p_order_pk" "uuid", "p_template_code" "text", "p_audience_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_notification_order_fallback_text"("p_order_pk" "uuid", "p_template_code" "text", "p_audience_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_notification_order_payload"("p_order_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_notification_order_payload"("p_order_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_notification_order_payload"("p_order_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_notification_order_payload"("p_order_pk" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_ops_claims_enabled"("p_restaurant_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_ops_claims_enabled"("p_restaurant_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_ops_claims_enabled"("p_restaurant_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_ops_claims_enabled"("p_restaurant_pk" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_ops_max_bags_per_drop"("p_restaurant_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_ops_max_bags_per_drop"("p_restaurant_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_ops_max_bags_per_drop"("p_restaurant_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_ops_max_bags_per_drop"("p_restaurant_pk" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_ops_publishing_enabled"("p_restaurant_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_ops_publishing_enabled"("p_restaurant_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_ops_publishing_enabled"("p_restaurant_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_ops_publishing_enabled"("p_restaurant_pk" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_pickup_result_message"("p_result_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_pickup_result_message"("p_result_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_pickup_result_message"("p_result_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_preview_restaurant_settlement"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_preview_restaurant_settlement"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_preview_restaurant_settlement"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_preview_restaurant_settlement"("p_restaurant_pk" "uuid", "p_period_start_at" timestamp with time zone, "p_period_end_at" timestamp with time zone, "p_actor_profile_pk" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_record_notification_delivery_attempt"("p_notification_outbox_pk" "uuid", "p_attempt_status_code" "text", "p_provider_code" "text", "p_provider_message_ref" "text", "p_error_code" "text", "p_error_text" "text", "p_provider_status_code" "text", "p_retry_after_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_record_notification_delivery_attempt"("p_notification_outbox_pk" "uuid", "p_attempt_status_code" "text", "p_provider_code" "text", "p_provider_message_ref" "text", "p_error_code" "text", "p_error_text" "text", "p_provider_status_code" "text", "p_retry_after_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."api_record_notification_delivery_attempt"("p_notification_outbox_pk" "uuid", "p_attempt_status_code" "text", "p_provider_code" "text", "p_provider_message_ref" "text", "p_error_code" "text", "p_error_text" "text", "p_provider_status_code" "text", "p_retry_after_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_record_notification_delivery_attempt"("p_notification_outbox_pk" "uuid", "p_attempt_status_code" "text", "p_provider_code" "text", "p_provider_message_ref" "text", "p_error_code" "text", "p_error_text" "text", "p_provider_status_code" "text", "p_retry_after_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_record_razorpay_payment_failed"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_record_razorpay_payment_failed"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."api_record_razorpay_payment_failed"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_record_razorpay_payment_failed"("p_provider_order_ref" "text", "p_provider_payment_ref" "text", "p_amount_paise" bigint, "p_currency_code" "text", "p_payment_method_code" "text", "p_webhook_event_pk" "uuid", "p_provider_payload_json" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_release_expired_inventory_holds"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_release_expired_inventory_holds"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."api_release_expired_inventory_holds"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_release_expired_inventory_holds"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_retry_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_retry_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_retry_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_retry_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_suppress_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_suppress_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_suppress_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_suppress_notification"("p_notification_outbox_pk" "uuid", "p_actor_profile_pk" "uuid", "p_reason_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_preferred_language_code" "text", "p_default_city_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_preferred_language_code" "text", "p_default_city_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_preferred_language_code" "text", "p_default_city_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_preferred_language_code" "text", "p_default_city_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_preferred_language_code" "text", "p_default_city_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_update_consumer_profile"("p_full_name" "text", "p_phone_e164" "text", "p_email_address" "public"."citext", "p_preferred_language_code" "text", "p_default_city_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_verify_order_pickup"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_credential_method" "text", "p_credential_hash" "text", "p_idempotency_key" "text", "p_device_label" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_verify_order_pickup"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_credential_method" "text", "p_credential_hash" "text", "p_idempotency_key" "text", "p_device_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."api_verify_order_pickup"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_credential_method" "text", "p_credential_hash" "text", "p_idempotency_key" "text", "p_device_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_verify_order_pickup"("p_order_pk" "uuid", "p_restaurant_pk" "uuid", "p_actor_profile_pk" "uuid", "p_credential_method" "text", "p_credential_hash" "text", "p_idempotency_key" "text", "p_device_label" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."computed_refresh_drop_sell_through"() TO "anon";
GRANT ALL ON FUNCTION "public"."computed_refresh_drop_sell_through"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."computed_refresh_drop_sell_through"() TO "service_role";



GRANT ALL ON FUNCTION "public"."computed_refresh_order_pickup_flag"() TO "anon";
GRANT ALL ON FUNCTION "public"."computed_refresh_order_pickup_flag"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."computed_refresh_order_pickup_flag"() TO "service_role";



GRANT ALL ON FUNCTION "public"."computed_refresh_restaurant_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."computed_refresh_restaurant_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."computed_refresh_restaurant_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."computed_refresh_restaurant_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."computed_refresh_restaurant_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."computed_refresh_restaurant_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."raise_immutable_error"() TO "anon";
GRANT ALL ON FUNCTION "public"."raise_immutable_error"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."raise_immutable_error"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_current_consumer_profile_pk"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_current_consumer_profile_pk"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_current_consumer_profile_pk"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_current_profile_pk"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_current_profile_pk"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_current_profile_pk"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_drop_is_public"("p_drop_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rls_drop_is_public"("p_drop_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_drop_is_public"("p_drop_pk" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_has_restaurant_access"("p_restaurant_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rls_has_restaurant_access"("p_restaurant_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_has_restaurant_access"("p_restaurant_pk" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_is_consumer_profile"("p_consumer_profile_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rls_is_consumer_profile"("p_consumer_profile_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_is_consumer_profile"("p_consumer_profile_pk" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_is_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_is_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_is_platform_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_is_platform_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_is_platform_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_is_platform_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_restaurant_is_public"("p_restaurant_pk" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rls_restaurant_is_public"("p_restaurant_pk" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_restaurant_is_public"("p_restaurant_pk" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_on"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_on"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_on"() TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";









GRANT ALL ON TABLE "public"."admin_data_correction" TO "anon";
GRANT ALL ON TABLE "public"."admin_data_correction" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_data_correction" TO "service_role";



GRANT ALL ON TABLE "public"."admin_export_job" TO "anon";
GRANT ALL ON TABLE "public"."admin_export_job" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_export_job" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_event" TO "anon";
GRANT ALL ON TABLE "public"."analytics_event" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_event" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_event_2026_q2" TO "anon";
GRANT ALL ON TABLE "public"."analytics_event_2026_q2" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_event_2026_q2" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_event_2026_q3" TO "anon";
GRANT ALL ON TABLE "public"."analytics_event_2026_q3" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_event_2026_q3" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_event_default" TO "anon";
GRANT ALL ON TABLE "public"."analytics_event_default" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_event_default" TO "service_role";



GRANT ALL ON TABLE "public"."finance_restaurant_payout_entry" TO "anon";
GRANT ALL ON TABLE "public"."finance_restaurant_payout_entry" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_restaurant_payout_entry" TO "service_role";



GRANT ALL ON TABLE "public"."finance_settlement_run" TO "anon";
GRANT ALL ON TABLE "public"."finance_settlement_run" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_settlement_run" TO "service_role";



GRANT ALL ON TABLE "public"."order_order" TO "anon";
GRANT ALL ON TABLE "public"."order_order" TO "authenticated";
GRANT ALL ON TABLE "public"."order_order" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_restaurant" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_restaurant" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_restaurant" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_finance_eligible_order_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_finance_eligible_order_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_finance_eligible_order_summary" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_finance_settlement_detail" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_finance_settlement_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_finance_settlement_detail" TO "service_role";



GRANT ALL ON TABLE "public"."finance_invoice" TO "anon";
GRANT ALL ON TABLE "public"."finance_invoice" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_invoice" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_payout_account" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_payout_account" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_payout_account" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_finance_settlement_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_finance_settlement_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_finance_settlement_summary" TO "service_role";



GRANT ALL ON TABLE "public"."incident_incident" TO "anon";
GRANT ALL ON TABLE "public"."incident_incident" TO "authenticated";
GRANT ALL ON TABLE "public"."incident_incident" TO "service_role";



GRANT ALL ON TABLE "public"."master_incident_severity" TO "anon";
GRANT ALL ON TABLE "public"."master_incident_severity" TO "authenticated";
GRANT ALL ON TABLE "public"."master_incident_severity" TO "service_role";



GRANT ALL ON TABLE "public"."master_incident_status" TO "anon";
GRANT ALL ON TABLE "public"."master_incident_status" TO "authenticated";
GRANT ALL ON TABLE "public"."master_incident_status" TO "service_role";



GRANT ALL ON TABLE "public"."master_incident_type" TO "anon";
GRANT ALL ON TABLE "public"."master_incident_type" TO "authenticated";
GRANT ALL ON TABLE "public"."master_incident_type" TO "service_role";



GRANT ALL ON TABLE "public"."api_restaurant_incident_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_restaurant_incident_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_restaurant_incident_summary" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_incident_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_incident_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_incident_summary" TO "service_role";



GRANT ALL ON TABLE "public"."notification_delivery_attempt" TO "anon";
GRANT ALL ON TABLE "public"."notification_delivery_attempt" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_delivery_attempt" TO "service_role";



GRANT ALL ON TABLE "public"."notification_outbox" TO "anon";
GRANT ALL ON TABLE "public"."notification_outbox" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_outbox" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_notification_attempt_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_notification_attempt_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_notification_attempt_summary" TO "service_role";



GRANT ALL ON TABLE "public"."notification_template" TO "anon";
GRANT ALL ON TABLE "public"."notification_template" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_template" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_notification_delivery_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_notification_delivery_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_notification_delivery_summary" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_ops_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_ops_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_ops_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."config_feature_flag" TO "anon";
GRANT ALL ON TABLE "public"."config_feature_flag" TO "authenticated";
GRANT ALL ON TABLE "public"."config_feature_flag" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_ops_config_flag" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_ops_config_flag" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_ops_config_flag" TO "service_role";



GRANT ALL ON TABLE "public"."drop_drop" TO "anon";
GRANT ALL ON TABLE "public"."drop_drop" TO "authenticated";
GRANT ALL ON TABLE "public"."drop_drop" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_ops_drop_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_ops_drop_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_ops_drop_summary" TO "service_role";



GRANT ALL ON TABLE "public"."incident_event" TO "anon";
GRANT ALL ON TABLE "public"."incident_event" TO "authenticated";
GRANT ALL ON TABLE "public"."incident_event" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_ops_incident_queue" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_ops_incident_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_ops_incident_queue" TO "service_role";



GRANT ALL ON TABLE "public"."payment_refund" TO "anon";
GRANT ALL ON TABLE "public"."payment_refund" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_refund" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_ops_refund_queue" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_ops_refund_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_ops_refund_queue" TO "service_role";



GRANT ALL ON TABLE "public"."master_support_ticket_status" TO "anon";
GRANT ALL ON TABLE "public"."master_support_ticket_status" TO "authenticated";
GRANT ALL ON TABLE "public"."master_support_ticket_status" TO "service_role";



GRANT ALL ON TABLE "public"."support_ticket" TO "anon";
GRANT ALL ON TABLE "public"."support_ticket" TO "authenticated";
GRANT ALL ON TABLE "public"."support_ticket" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_ops_restaurant_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_ops_restaurant_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_ops_restaurant_summary" TO "service_role";



GRANT ALL ON TABLE "public"."master_support_ticket_priority" TO "anon";
GRANT ALL ON TABLE "public"."master_support_ticket_priority" TO "authenticated";
GRANT ALL ON TABLE "public"."master_support_ticket_priority" TO "service_role";



GRANT ALL ON TABLE "public"."master_support_ticket_type" TO "anon";
GRANT ALL ON TABLE "public"."master_support_ticket_type" TO "authenticated";
GRANT ALL ON TABLE "public"."master_support_ticket_type" TO "service_role";



GRANT ALL ON TABLE "public"."support_ticket_event" TO "anon";
GRANT ALL ON TABLE "public"."support_ticket_event" TO "authenticated";
GRANT ALL ON TABLE "public"."support_ticket_event" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_ops_support_queue" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_ops_support_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_ops_support_queue" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_payment_order_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_payment_order_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_payment_order_summary" TO "service_role";



GRANT ALL ON TABLE "public"."payment_webhook_event" TO "anon";
GRANT ALL ON TABLE "public"."payment_webhook_event" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_webhook_event" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_payment_webhook_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_payment_webhook_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_payment_webhook_summary" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_bag_template_allergen" TO "anon";
GRANT ALL ON TABLE "public"."catalog_bag_template_allergen" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_bag_template_allergen" TO "service_role";



GRANT ALL ON TABLE "public"."master_allergen" TO "anon";
GRANT ALL ON TABLE "public"."master_allergen" TO "authenticated";
GRANT ALL ON TABLE "public"."master_allergen" TO "service_role";



GRANT ALL ON TABLE "public"."order_item" TO "anon";
GRANT ALL ON TABLE "public"."order_item" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item" TO "service_role";



GRANT ALL ON TABLE "public"."order_pickup_verification_event" TO "anon";
GRANT ALL ON TABLE "public"."order_pickup_verification_event" TO "authenticated";
GRANT ALL ON TABLE "public"."order_pickup_verification_event" TO "service_role";



GRANT ALL ON TABLE "public"."payment_order_intent" TO "anon";
GRANT ALL ON TABLE "public"."payment_order_intent" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_order_intent" TO "service_role";



GRANT ALL ON TABLE "public"."payment_transaction" TO "anon";
GRANT ALL ON TABLE "public"."payment_transaction" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_transaction" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_pickup_order_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_pickup_order_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_pickup_order_summary" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_bag_template_revision" TO "anon";
GRANT ALL ON TABLE "public"."catalog_bag_template_revision" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_bag_template_revision" TO "service_role";



GRANT ALL ON TABLE "public"."api_restaurant_roi_drop_detail" TO "anon";
GRANT ALL ON TABLE "public"."api_restaurant_roi_drop_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."api_restaurant_roi_drop_detail" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_roi_drop_detail" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_roi_drop_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_roi_drop_detail" TO "service_role";



GRANT ALL ON TABLE "public"."api_restaurant_roi_report_note" TO "anon";
GRANT ALL ON TABLE "public"."api_restaurant_roi_report_note" TO "authenticated";
GRANT ALL ON TABLE "public"."api_restaurant_roi_report_note" TO "service_role";



GRANT ALL ON TABLE "public"."api_admin_roi_report_note" TO "anon";
GRANT ALL ON TABLE "public"."api_admin_roi_report_note" TO "authenticated";
GRANT ALL ON TABLE "public"."api_admin_roi_report_note" TO "service_role";



GRANT ALL ON TABLE "public"."drop_inventory_hold" TO "anon";
GRANT ALL ON TABLE "public"."drop_inventory_hold" TO "authenticated";
GRANT ALL ON TABLE "public"."drop_inventory_hold" TO "service_role";



GRANT ALL ON TABLE "public"."geo_neighborhood" TO "anon";
GRANT ALL ON TABLE "public"."geo_neighborhood" TO "authenticated";
GRANT ALL ON TABLE "public"."geo_neighborhood" TO "service_role";



GRANT ALL ON TABLE "public"."api_claim_hold_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_claim_hold_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_claim_hold_summary" TO "service_role";



GRANT ALL ON TABLE "public"."api_consumer_notification_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_consumer_notification_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_consumer_notification_summary" TO "service_role";



GRANT ALL ON TABLE "public"."api_consumer_order_history" TO "anon";
GRANT ALL ON TABLE "public"."api_consumer_order_history" TO "authenticated";
GRANT ALL ON TABLE "public"."api_consumer_order_history" TO "service_role";



GRANT ALL ON TABLE "public"."api_consumer_order_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_consumer_order_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_consumer_order_summary" TO "service_role";



GRANT ALL ON TABLE "public"."geo_city" TO "anon";
GRANT ALL ON TABLE "public"."geo_city" TO "authenticated";
GRANT ALL ON TABLE "public"."geo_city" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_public_profile" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_public_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_public_profile" TO "service_role";



GRANT ALL ON TABLE "public"."api_public_drop_card" TO "anon";
GRANT ALL ON TABLE "public"."api_public_drop_card" TO "authenticated";
GRANT ALL ON TABLE "public"."api_public_drop_card" TO "service_role";



GRANT ALL ON TABLE "public"."api_public_restaurant_profile" TO "anon";
GRANT ALL ON TABLE "public"."api_public_restaurant_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."api_public_restaurant_profile" TO "service_role";



GRANT ALL ON TABLE "public"."api_restaurant_finance_settlement_detail" TO "anon";
GRANT ALL ON TABLE "public"."api_restaurant_finance_settlement_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."api_restaurant_finance_settlement_detail" TO "service_role";



GRANT ALL ON TABLE "public"."api_restaurant_finance_settlement_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_restaurant_finance_settlement_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_restaurant_finance_settlement_summary" TO "service_role";



GRANT ALL ON TABLE "public"."api_restaurant_notification_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_restaurant_notification_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_restaurant_notification_summary" TO "service_role";



GRANT ALL ON TABLE "public"."api_restaurant_order_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_restaurant_order_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_restaurant_order_summary" TO "service_role";



GRANT ALL ON TABLE "public"."api_restaurant_pickup_order_summary" TO "anon";
GRANT ALL ON TABLE "public"."api_restaurant_pickup_order_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."api_restaurant_pickup_order_summary" TO "service_role";



GRANT ALL ON TABLE "public"."api_restaurant_pickup_queue" TO "anon";
GRANT ALL ON TABLE "public"."api_restaurant_pickup_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."api_restaurant_pickup_queue" TO "service_role";



GRANT ALL ON TABLE "public"."billing_subscription_charge" TO "anon";
GRANT ALL ON TABLE "public"."billing_subscription_charge" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_subscription_charge" TO "service_role";



GRANT ALL ON TABLE "public"."billing_subscription_event" TO "anon";
GRANT ALL ON TABLE "public"."billing_subscription_event" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_subscription_event" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_bag_template" TO "anon";
GRANT ALL ON TABLE "public"."catalog_bag_template" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_bag_template" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_bag_template_media" TO "anon";
GRANT ALL ON TABLE "public"."catalog_bag_template_media" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_bag_template_media" TO "service_role";



GRANT ALL ON TABLE "public"."cms_banner" TO "anon";
GRANT ALL ON TABLE "public"."cms_banner" TO "authenticated";
GRANT ALL ON TABLE "public"."cms_banner" TO "service_role";



GRANT ALL ON TABLE "public"."cms_city_page" TO "anon";
GRANT ALL ON TABLE "public"."cms_city_page" TO "authenticated";
GRANT ALL ON TABLE "public"."cms_city_page" TO "service_role";



GRANT ALL ON TABLE "public"."cms_page" TO "anon";
GRANT ALL ON TABLE "public"."cms_page" TO "authenticated";
GRANT ALL ON TABLE "public"."cms_page" TO "service_role";



GRANT ALL ON TABLE "public"."cms_post" TO "anon";
GRANT ALL ON TABLE "public"."cms_post" TO "authenticated";
GRANT ALL ON TABLE "public"."cms_post" TO "service_role";



GRANT ALL ON TABLE "public"."cms_restaurant_feature" TO "anon";
GRANT ALL ON TABLE "public"."cms_restaurant_feature" TO "authenticated";
GRANT ALL ON TABLE "public"."cms_restaurant_feature" TO "service_role";



GRANT ALL ON TABLE "public"."cms_seo_metadata" TO "anon";
GRANT ALL ON TABLE "public"."cms_seo_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."cms_seo_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."config_runtime_setting" TO "anon";
GRANT ALL ON TABLE "public"."config_runtime_setting" TO "authenticated";
GRANT ALL ON TABLE "public"."config_runtime_setting" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_allergen_preference" TO "anon";
GRANT ALL ON TABLE "public"."consumer_allergen_preference" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_allergen_preference" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_city_preference" TO "anon";
GRANT ALL ON TABLE "public"."consumer_city_preference" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_city_preference" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_dietary_preference" TO "anon";
GRANT ALL ON TABLE "public"."consumer_dietary_preference" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_dietary_preference" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_notification_preference" TO "anon";
GRANT ALL ON TABLE "public"."consumer_notification_preference" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_notification_preference" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_passport_stat" TO "anon";
GRANT ALL ON TABLE "public"."consumer_passport_stat" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_passport_stat" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_profile" TO "anon";
GRANT ALL ON TABLE "public"."consumer_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_profile" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_referral" TO "anon";
GRANT ALL ON TABLE "public"."consumer_referral" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_referral" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_referral_code" TO "anon";
GRANT ALL ON TABLE "public"."consumer_referral_code" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_referral_code" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_saved_restaurant" TO "anon";
GRANT ALL ON TABLE "public"."consumer_saved_restaurant" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_saved_restaurant" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_subscription" TO "anon";
GRANT ALL ON TABLE "public"."consumer_subscription" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_subscription" TO "service_role";



GRANT ALL ON TABLE "public"."consumer_subscription_plan" TO "anon";
GRANT ALL ON TABLE "public"."consumer_subscription_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."consumer_subscription_plan" TO "service_role";



GRANT ALL ON TABLE "public"."dev_demo_seed_registry" TO "anon";
GRANT ALL ON TABLE "public"."dev_demo_seed_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."dev_demo_seed_registry" TO "service_role";



GRANT ALL ON TABLE "public"."drop_audience" TO "anon";
GRANT ALL ON TABLE "public"."drop_audience" TO "authenticated";
GRANT ALL ON TABLE "public"."drop_audience" TO "service_role";



GRANT ALL ON TABLE "public"."drop_closure_log" TO "anon";
GRANT ALL ON TABLE "public"."drop_closure_log" TO "authenticated";
GRANT ALL ON TABLE "public"."drop_closure_log" TO "service_role";



GRANT ALL ON TABLE "public"."drop_inventory_event" TO "anon";
GRANT ALL ON TABLE "public"."drop_inventory_event" TO "authenticated";
GRANT ALL ON TABLE "public"."drop_inventory_event" TO "service_role";



GRANT ALL ON TABLE "public"."drop_media" TO "anon";
GRANT ALL ON TABLE "public"."drop_media" TO "authenticated";
GRANT ALL ON TABLE "public"."drop_media" TO "service_role";



GRANT ALL ON TABLE "public"."drop_recurring_schedule" TO "anon";
GRANT ALL ON TABLE "public"."drop_recurring_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."drop_recurring_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."geo_address" TO "anon";
GRANT ALL ON TABLE "public"."geo_address" TO "authenticated";
GRANT ALL ON TABLE "public"."geo_address" TO "service_role";



GRANT ALL ON TABLE "public"."iam_platform_membership" TO "anon";
GRANT ALL ON TABLE "public"."iam_platform_membership" TO "authenticated";
GRANT ALL ON TABLE "public"."iam_platform_membership" TO "service_role";



GRANT ALL ON TABLE "public"."iam_platform_role" TO "anon";
GRANT ALL ON TABLE "public"."iam_platform_role" TO "authenticated";
GRANT ALL ON TABLE "public"."iam_platform_role" TO "service_role";



GRANT ALL ON TABLE "public"."iam_platform_role_scope" TO "anon";
GRANT ALL ON TABLE "public"."iam_platform_role_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."iam_platform_role_scope" TO "service_role";



GRANT ALL ON TABLE "public"."iam_profile" TO "anon";
GRANT ALL ON TABLE "public"."iam_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."iam_profile" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_partner_lead" TO "anon";
GRANT ALL ON TABLE "public"."marketing_partner_lead" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_partner_lead" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_waitlist_lead" TO "anon";
GRANT ALL ON TABLE "public"."marketing_waitlist_lead" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_waitlist_lead" TO "service_role";



GRANT ALL ON TABLE "public"."master_audience_segment" TO "anon";
GRANT ALL ON TABLE "public"."master_audience_segment" TO "authenticated";
GRANT ALL ON TABLE "public"."master_audience_segment" TO "service_role";



GRANT ALL ON TABLE "public"."master_cuisine" TO "anon";
GRANT ALL ON TABLE "public"."master_cuisine" TO "authenticated";
GRANT ALL ON TABLE "public"."master_cuisine" TO "service_role";



GRANT ALL ON TABLE "public"."master_document_status" TO "anon";
GRANT ALL ON TABLE "public"."master_document_status" TO "authenticated";
GRANT ALL ON TABLE "public"."master_document_status" TO "service_role";



GRANT ALL ON TABLE "public"."master_document_type" TO "anon";
GRANT ALL ON TABLE "public"."master_document_type" TO "authenticated";
GRANT ALL ON TABLE "public"."master_document_type" TO "service_role";



GRANT ALL ON TABLE "public"."master_scope" TO "anon";
GRANT ALL ON TABLE "public"."master_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."master_scope" TO "service_role";



GRANT ALL ON TABLE "public"."master_storage_visibility" TO "anon";
GRANT ALL ON TABLE "public"."master_storage_visibility" TO "authenticated";
GRANT ALL ON TABLE "public"."master_storage_visibility" TO "service_role";



GRANT ALL ON TABLE "public"."notification_device" TO "anon";
GRANT ALL ON TABLE "public"."notification_device" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_device" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_order_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_transition" TO "anon";
GRANT ALL ON TABLE "public"."order_status_transition" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_transition" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_consent_event" TO "anon";
GRANT ALL ON TABLE "public"."privacy_consent_event" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_consent_event" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_consent_purpose" TO "anon";
GRANT ALL ON TABLE "public"."privacy_consent_purpose" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_consent_purpose" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_erasure_request" TO "anon";
GRANT ALL ON TABLE "public"."privacy_erasure_request" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_erasure_request" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_retention_policy" TO "anon";
GRANT ALL ON TABLE "public"."privacy_retention_policy" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_retention_policy" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_commission_override" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_commission_override" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_commission_override" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_commission_plan" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_commission_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_commission_plan" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_compliance" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_compliance" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_compliance" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_contact" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_contact" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_contact" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_cuisine_map" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_cuisine_map" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_cuisine_map" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_document" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_document" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_document" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_onboarding_task" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_onboarding_task" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_onboarding_task" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_setting" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_setting" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_setting" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_team_membership" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_team_membership" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_team_membership" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_team_role" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_team_role" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_team_role" TO "service_role";



GRANT ALL ON TABLE "public"."restaurant_team_role_scope" TO "anon";
GRANT ALL ON TABLE "public"."restaurant_team_role_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurant_team_role_scope" TO "service_role";



GRANT ALL ON TABLE "public"."review_media" TO "anon";
GRANT ALL ON TABLE "public"."review_media" TO "authenticated";
GRANT ALL ON TABLE "public"."review_media" TO "service_role";



GRANT ALL ON TABLE "public"."review_review" TO "anon";
GRANT ALL ON TABLE "public"."review_review" TO "authenticated";
GRANT ALL ON TABLE "public"."review_review" TO "service_role";



GRANT ALL ON TABLE "public"."storage_object" TO "anon";
GRANT ALL ON TABLE "public"."storage_object" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_object" TO "service_role";



GRANT ALL ON TABLE "public"."website_contact_submission" TO "anon";
GRANT ALL ON TABLE "public"."website_contact_submission" TO "authenticated";
GRANT ALL ON TABLE "public"."website_contact_submission" TO "service_role";



GRANT ALL ON SEQUENCE "public"."website_contact_submission_contact_submission_pk_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."website_contact_submission_contact_submission_pk_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."website_contact_submission_contact_submission_pk_seq" TO "service_role";



GRANT ALL ON TABLE "public"."website_partner_interest" TO "anon";
GRANT ALL ON TABLE "public"."website_partner_interest" TO "authenticated";
GRANT ALL ON TABLE "public"."website_partner_interest" TO "service_role";



GRANT ALL ON SEQUENCE "public"."website_partner_interest_partner_interest_pk_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."website_partner_interest_partner_interest_pk_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."website_partner_interest_partner_interest_pk_seq" TO "service_role";



GRANT ALL ON TABLE "public"."website_waitlist_lead" TO "anon";
GRANT ALL ON TABLE "public"."website_waitlist_lead" TO "authenticated";
GRANT ALL ON TABLE "public"."website_waitlist_lead" TO "service_role";



GRANT ALL ON SEQUENCE "public"."website_waitlist_lead_waitlist_lead_pk_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."website_waitlist_lead_waitlist_lead_pk_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."website_waitlist_lead_waitlist_lead_pk_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































