-- Slice 2: Restaurant onboarding foundation.
-- Additive only: preserves consolidated schema and Slice 1 auth/profile/consent work.

begin;

create index if not exists idx_slice2_restaurant_restaurant_status
  on restaurant_restaurant (restaurant_status_code);

create index if not exists idx_slice2_restaurant_team_membership_profile_active
  on restaurant_team_membership (iam_profile_fk, is_active);

create index if not exists idx_slice2_restaurant_team_membership_rest_profile_active
  on restaurant_team_membership (restaurant_fk, iam_profile_fk, is_active);

create index if not exists idx_slice2_restaurant_compliance_status
  on restaurant_compliance (restaurant_fk, compliance_status_code);

create index if not exists idx_slice2_restaurant_onboarding_task_status
  on restaurant_onboarding_task (restaurant_fk, task_status_code);

create index if not exists idx_slice2_storage_object_bucket_path
  on storage_object (bucket_name, object_path);

insert into storage.buckets (id, name, public)
values
  ('public-media', 'public-media', true),
  ('private-documents', 'private-documents', false),
  ('exports', 'exports', false)
on conflict (id) do update
set public = excluded.public;

insert into master_document_type (type_code, type_name, description, is_required)
values
  ('FSSAI_LICENSE', 'FSSAI License', 'FSSAI food safety license number and certificate.', true),
  ('GST_CERTIFICATE', 'GST Certificate', 'GST registration certificate.', true),
  ('PAN_CARD', 'PAN Card', 'PAN card of the legal entity.', true),
  ('BANK_CANCELLED_CHEQUE', 'Bank Cancelled Cheque', 'Cancelled cheque for payout bank account verification.', true),
  ('FOOD_SAFETY_AUDIT', 'Food Safety Audit Report', 'Third-party food safety audit report.', false),
  ('MENU_CARD', 'Menu Card', 'Current restaurant menu for reference.', false),
  ('IDENTITY_PROOF', 'Identity Proof', 'Government identity proof for authorized restaurant representative.', false)
on conflict (type_code) do update
set type_name = excluded.type_name,
    description = excluded.description,
    is_required = excluded.is_required,
    updated_at = now();

insert into master_document_status (status_code, status_name, description, is_terminal, sort_order)
values
  ('PENDING_REVIEW', 'Pending Review', 'Newly uploaded, awaiting admin review.', false, 1),
  ('UNDER_REVIEW', 'Under Review', 'Admin is actively reviewing this document.', false, 2),
  ('APPROVED', 'Approved', 'Document verified and accepted.', true, 3),
  ('REJECTED', 'Rejected', 'Document rejected. rejection_reason populated.', true, 4),
  ('EXPIRED', 'Expired', 'Document validity period has lapsed.', true, 5)
on conflict (status_code) do update
set status_name = excluded.status_name,
    description = excluded.description,
    is_terminal = excluded.is_terminal,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into restaurant_team_role (role_code, role_name, description)
values
  ('OWNER', 'Owner', 'Full restaurant access including onboarding, billing, team management, and settings.'),
  ('ADMIN', 'Admin', 'Restaurant management access excluding owner-only account controls.'),
  ('OPERATIONS', 'Operations', 'Operational restaurant access for drop and pickup preparation.'),
  ('PICKUP_STAFF', 'Pickup Staff', 'Pickup verification only via staff app.'),
  ('FINANCE', 'Finance', 'Read-only finance and invoice access.')
on conflict (role_code) do update
set role_name = excluded.role_name,
    description = excluded.description,
    updated_at = now();

insert into restaurant_team_role_scope (restaurant_team_role_fk, master_scope_fk)
select r.restaurant_team_role_pk, s.master_scope_pk
from restaurant_team_role r
join master_scope s on s.applies_to in ('RESTAURANT', 'BOTH')
where r.role_code = 'OWNER'
on conflict (restaurant_team_role_fk, master_scope_fk) do nothing;

insert into restaurant_team_role_scope (restaurant_team_role_fk, master_scope_fk)
select r.restaurant_team_role_pk, s.master_scope_pk
from restaurant_team_role r
join master_scope s on s.scope_code in ('DROP_CREATE', 'DROP_PUBLISH', 'DROP_PAUSE', 'ORDER_VIEW', 'TEAM_MANAGE', 'SETTINGS_MANAGE', 'ANALYTICS_VIEW', 'CATALOG_MANAGE')
where r.role_code = 'ADMIN'
on conflict (restaurant_team_role_fk, master_scope_fk) do nothing;

insert into restaurant_team_role_scope (restaurant_team_role_fk, master_scope_fk)
select r.restaurant_team_role_pk, s.master_scope_pk
from restaurant_team_role r
join master_scope s on s.scope_code in ('DROP_CREATE', 'DROP_PAUSE', 'ORDER_VIEW', 'CATALOG_MANAGE')
where r.role_code = 'OPERATIONS'
on conflict (restaurant_team_role_fk, master_scope_fk) do nothing;

insert into restaurant_team_role_scope (restaurant_team_role_fk, master_scope_fk)
select r.restaurant_team_role_pk, s.master_scope_pk
from restaurant_team_role r
join master_scope s on s.scope_code = 'ORDER_VERIFY_PICKUP'
where r.role_code = 'PICKUP_STAFF'
on conflict (restaurant_team_role_fk, master_scope_fk) do nothing;

insert into restaurant_team_role_scope (restaurant_team_role_fk, master_scope_fk)
select r.restaurant_team_role_pk, s.master_scope_pk
from restaurant_team_role r
join master_scope s on s.scope_code in ('FINANCE_VIEW', 'FINANCE_EXPORT')
where r.role_code = 'FINANCE'
on conflict (restaurant_team_role_fk, master_scope_fk) do nothing;

create or replace function api_create_or_get_restaurant_onboarding(
  p_restaurant_name text default null,
  p_restaurant_slug text default null,
  p_legal_entity_name text default null,
  p_primary_contact_email text default null,
  p_primary_contact_phone_e164 text default null
)
returns table (
  restaurant_pk uuid,
  restaurant_status_code text,
  compliance_status_code text
)
language plpgsql
security definer
set search_path = public, auth
as $$
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

grant execute on function api_create_or_get_restaurant_onboarding(text, text, text, text, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_team_membership'
      and policyname = 'p_restaurant_team_membership_self_select'
  ) then
    create policy p_restaurant_team_membership_self_select
      on restaurant_team_membership
      for select
      to authenticated
      using (iam_profile_fk = rls_current_profile_pk() or rls_is_platform_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_team_role'
      and policyname = 'p_restaurant_team_role_authenticated_select'
  ) then
    create policy p_restaurant_team_role_authenticated_select
      on restaurant_team_role
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_team_role_scope'
      and policyname = 'p_restaurant_team_role_scope_authenticated_select'
  ) then
    create policy p_restaurant_team_role_scope_authenticated_select
      on restaurant_team_role_scope
      for select
      to authenticated
      using (true);
  end if;
end $$;

commit;
