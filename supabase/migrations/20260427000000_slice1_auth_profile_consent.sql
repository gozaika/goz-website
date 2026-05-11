-- Slice 1: consumer auth/profile bootstrap, DPDP consent capture, and demo seed registry.
-- This migration is additive to the canonical consolidated schema.

alter table privacy_consent_purpose
  add column if not exists display_order integer;

insert into privacy_consent_purpose
  (purpose_code, purpose_name, description, is_required_for_service, display_order)
values
  ('OPERATIONAL', 'Operational', 'Core service: account, orders, pickup coordination, safety and support.', true, 10),
  ('MARKETING', 'Marketing', 'Product updates, new drop announcements, campaigns and goZaika news.', false, 20),
  ('ANALYTICS', 'Analytics', 'Privacy-aware product analytics used to improve discovery, reliability and safety.', false, 30),
  ('REFERRAL_COMMS', 'Referral Communications', 'Messages about referral invitations, status and rewards.', false, 40),
  ('WHATSAPP_TRANSACTIONAL', 'WhatsApp Transactional', 'WhatsApp messages for OTP, order confirmation, pickup reminders and support.', false, 50),
  ('WHATSAPP_MARKETING', 'WhatsApp Marketing', 'Promotional WhatsApp messages for drops, Swaad Club and campaigns.', false, 60)
on conflict (purpose_code) do update
set purpose_name = excluded.purpose_name,
    description = excluded.description,
    is_required_for_service = excluded.is_required_for_service,
    display_order = excluded.display_order,
    updated_at = now();

create index if not exists idx_iam_profile_auth_user_fk on iam_profile (auth_user_fk);
create index if not exists idx_consumer_profile_profile_fk on consumer_profile (iam_profile_fk);
create index if not exists idx_privacy_consent_event_latest
  on privacy_consent_event (iam_profile_fk, privacy_consent_purpose_fk, recorded_at desc, privacy_consent_event_pk desc);

alter table privacy_consent_purpose enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'privacy_consent_purpose'
      and policyname = 'p_privacy_consent_purpose_public_read'
  ) then
    create policy p_privacy_consent_purpose_public_read on privacy_consent_purpose
      for select to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'privacy_consent_event'
      and policyname = 'p_privacy_consent_event_self_select'
  ) then
    create policy p_privacy_consent_event_self_select on privacy_consent_event
      for select to authenticated
      using (iam_profile_fk = public.rls_current_profile_pk() or public.rls_is_platform_user());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'privacy_consent_event'
      and policyname = 'p_privacy_consent_event_self_insert'
  ) then
    create policy p_privacy_consent_event_self_insert on privacy_consent_event
      for insert to authenticated
      with check (
        iam_profile_fk = public.rls_current_profile_pk()
        and recorded_by_profile_fk = public.rls_current_profile_pk()
      );
  end if;
end $$;

create table if not exists dev_demo_seed_registry (
  dev_demo_seed_registry_pk uuid not null default gen_random_uuid(),
  seed_key text not null,
  entity_table text not null,
  entity_id uuid not null,
  slice text not null,
  created_at timestamptz not null default now(),
  constraint dev_demo_seed_registry_pk primary key (dev_demo_seed_registry_pk),
  constraint uq_dev_demo_seed_key unique (seed_key),
  constraint uq_dev_demo_seed_registry unique (entity_table, entity_id)
);

comment on table dev_demo_seed_registry is
  'LOCAL/DEMO ONLY. Registry of demo-owned rows so cleanup scripts can delete deterministic Slice fixture data without broad truncation.';

create index if not exists idx_dev_demo_seed_registry_seed_key on dev_demo_seed_registry (seed_key);
create index if not exists idx_dev_demo_seed_registry_slice on dev_demo_seed_registry (slice);

create or replace function public.api_bootstrap_consumer_profile(
  p_full_name text default null,
  p_phone_e164 text default null,
  p_email_address citext default null,
  p_default_city_code text default 'HYD',
  p_preferred_language_code text default 'en'
)
returns table (
  iam_profile_pk uuid,
  consumer_profile_pk uuid,
  needs_operational_consent boolean
)
language plpgsql
security definer
set search_path = public
as $$
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

comment on function public.api_bootstrap_consumer_profile(text, text, citext, text, text) is
  'Idempotently creates/updates iam_profile and consumer_profile for the authenticated consumer-web user. SECURITY DEFINER but scoped to auth.uid().';

create or replace function public.api_latest_consents()
returns table (
  purpose_code text,
  purpose_name text,
  is_required_for_service boolean,
  consent_state_code text,
  recorded_at timestamptz,
  policy_version text
)
language sql
stable
security definer
set search_path = public
as $$
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

create or replace function public.api_capture_consents(p_events jsonb)
returns table (
  privacy_consent_event_pk uuid,
  purpose_code text,
  consent_state_code text,
  recorded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
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

comment on function public.api_capture_consents(jsonb) is
  'Appends DPDP consent events for the current authenticated profile. Never updates prior consent rows.';

create or replace function public.api_update_consumer_profile(
  p_full_name text default null,
  p_phone_e164 text default null,
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

comment on function public.api_update_consumer_profile(text, text, text, text) is
  'Updates only safe consumer profile fields for the authenticated user. SECURITY DEFINER but scoped to rls_current_profile_pk().';
