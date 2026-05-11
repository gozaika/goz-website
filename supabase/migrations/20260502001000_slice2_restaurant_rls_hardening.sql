-- Slice 2 RLS hardening for restaurant onboarding surfaces.
-- Enables RLS on Slice 2-accessed reference/access/storage metadata tables and adds narrow policies.

begin;

alter table iam_platform_role enable row level security;
alter table iam_platform_membership enable row level security;
alter table restaurant_team_role enable row level security;
alter table restaurant_team_role_scope enable row level security;
alter table master_document_type enable row level security;
alter table master_document_status enable row level security;
alter table master_storage_visibility enable row level security;
alter table storage_object enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'iam_platform_role'
      and policyname = 'p_iam_platform_role_admin_select'
  ) then
    create policy p_iam_platform_role_admin_select
      on iam_platform_role
      for select
      to authenticated
      using (rls_is_platform_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'iam_platform_membership'
      and policyname = 'p_iam_platform_membership_self_or_admin_select'
  ) then
    create policy p_iam_platform_membership_self_or_admin_select
      on iam_platform_membership
      for select
      to authenticated
      using (iam_profile_fk = rls_current_profile_pk() or rls_is_platform_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'master_document_type'
      and policyname = 'p_master_document_type_read'
  ) then
    create policy p_master_document_type_read
      on master_document_type
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'master_document_status'
      and policyname = 'p_master_document_status_read'
  ) then
    create policy p_master_document_status_read
      on master_document_status
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'master_storage_visibility'
      and policyname = 'p_master_storage_visibility_admin_select'
  ) then
    create policy p_master_storage_visibility_admin_select
      on master_storage_visibility
      for select
      to authenticated
      using (rls_is_platform_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'storage_object'
      and policyname = 'p_storage_object_public_metadata_select'
  ) then
    create policy p_storage_object_public_metadata_select
      on storage_object
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from master_storage_visibility v
          where v.master_storage_visibility_pk = storage_object.master_storage_visibility_fk
            and v.visibility_code = 'PUBLIC_CDN'
            and v.is_public_readable = true
        )
      );
  end if;
end $$;

commit;
