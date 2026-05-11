begin;

do $$
begin
  if to_regclass('public.waitlist_lead') is not null
     and to_regclass('public.website_waitlist_lead') is null then
    execute 'alter table public.waitlist_lead rename to website_waitlist_lead';
  end if;

  if to_regclass('public.contact_submission') is not null
     and to_regclass('public.website_contact_submission') is null then
    execute 'alter table public.contact_submission rename to website_contact_submission';
  end if;

  if to_regclass('public.partner_interest') is not null
     and to_regclass('public.website_partner_interest') is null then
    execute 'alter table public.partner_interest rename to website_partner_interest';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'waitlist_lead_pkey'
      and conrelid = 'public.website_waitlist_lead'::regclass
  ) then
    execute 'alter table public.website_waitlist_lead rename constraint waitlist_lead_pkey to website_waitlist_lead_pkey';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'uq_waitlist_lead_email'
      and conrelid = 'public.website_waitlist_lead'::regclass
  ) then
    execute 'alter table public.website_waitlist_lead rename constraint uq_waitlist_lead_email to uq_website_waitlist_lead_email';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'ck_waitlist_lead_email_format'
      and conrelid = 'public.website_waitlist_lead'::regclass
  ) then
    execute 'alter table public.website_waitlist_lead rename constraint ck_waitlist_lead_email_format to ck_website_waitlist_lead_email_format';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'contact_submission_pkey'
      and conrelid = 'public.website_contact_submission'::regclass
  ) then
    execute 'alter table public.website_contact_submission rename constraint contact_submission_pkey to website_contact_submission_pkey';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'ck_contact_submission_email_format'
      and conrelid = 'public.website_contact_submission'::regclass
  ) then
    execute 'alter table public.website_contact_submission rename constraint ck_contact_submission_email_format to ck_website_contact_submission_email_format';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'ck_contact_submission_message_length'
      and conrelid = 'public.website_contact_submission'::regclass
  ) then
    execute 'alter table public.website_contact_submission rename constraint ck_contact_submission_message_length to ck_website_contact_submission_message_length';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'partner_interest_pkey'
      and conrelid = 'public.website_partner_interest'::regclass
  ) then
    execute 'alter table public.website_partner_interest rename constraint partner_interest_pkey to website_partner_interest_pkey';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'ck_partner_interest_email_format'
      and conrelid = 'public.website_partner_interest'::regclass
  ) then
    execute 'alter table public.website_partner_interest rename constraint ck_partner_interest_email_format to ck_website_partner_interest_email_format';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.idx_waitlist_lead_created_on') is not null
     and to_regclass('public.idx_website_waitlist_lead_created_on') is null then
    execute 'alter index public.idx_waitlist_lead_created_on rename to idx_website_waitlist_lead_created_on';
  end if;

  if to_regclass('public.idx_contact_submission_created_on') is not null
     and to_regclass('public.idx_website_contact_submission_created_on') is null then
    execute 'alter index public.idx_contact_submission_created_on rename to idx_website_contact_submission_created_on';
  end if;

  if to_regclass('public.idx_partner_interest_created_on') is not null
     and to_regclass('public.idx_website_partner_interest_created_on') is null then
    execute 'alter index public.idx_partner_interest_created_on rename to idx_website_partner_interest_created_on';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'waitlist_lead_set_updated_on'
      and tgrelid = 'public.website_waitlist_lead'::regclass
      and not tgisinternal
  ) then
    execute 'alter trigger waitlist_lead_set_updated_on on public.website_waitlist_lead rename to website_waitlist_lead_set_updated_on';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgname = 'contact_submission_set_updated_on'
      and tgrelid = 'public.website_contact_submission'::regclass
      and not tgisinternal
  ) then
    execute 'alter trigger contact_submission_set_updated_on on public.website_contact_submission rename to website_contact_submission_set_updated_on';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgname = 'partner_interest_set_updated_on'
      and tgrelid = 'public.website_partner_interest'::regclass
      and not tgisinternal
  ) then
    execute 'alter trigger partner_interest_set_updated_on on public.website_partner_interest rename to website_partner_interest_set_updated_on';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'website_waitlist_lead'
      and policyname = 'anon_insert_waitlist_lead'
  ) then
    execute 'alter policy anon_insert_waitlist_lead on public.website_waitlist_lead rename to anon_insert_website_waitlist_lead';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'website_waitlist_lead'
      and policyname = 'auth_select_waitlist_lead'
  ) then
    execute 'alter policy auth_select_waitlist_lead on public.website_waitlist_lead rename to auth_select_website_waitlist_lead';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'website_contact_submission'
      and policyname = 'anon_insert_contact_submission'
  ) then
    execute 'alter policy anon_insert_contact_submission on public.website_contact_submission rename to anon_insert_website_contact_submission';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'website_contact_submission'
      and policyname = 'auth_select_contact_submission'
  ) then
    execute 'alter policy auth_select_contact_submission on public.website_contact_submission rename to auth_select_website_contact_submission';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'website_partner_interest'
      and policyname = 'anon_insert_partner_interest'
  ) then
    execute 'alter policy anon_insert_partner_interest on public.website_partner_interest rename to anon_insert_website_partner_interest';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'website_partner_interest'
      and policyname = 'auth_select_partner_interest'
  ) then
    execute 'alter policy auth_select_partner_interest on public.website_partner_interest rename to auth_select_website_partner_interest';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.waitlist_lead_waitlist_lead_pk_seq') is not null
     and to_regclass('public.website_waitlist_lead_waitlist_lead_pk_seq') is null then
    execute 'alter sequence public.waitlist_lead_waitlist_lead_pk_seq rename to website_waitlist_lead_waitlist_lead_pk_seq';
  end if;

  if to_regclass('public.contact_submission_contact_submission_pk_seq') is not null
     and to_regclass('public.website_contact_submission_contact_submission_pk_seq') is null then
    execute 'alter sequence public.contact_submission_contact_submission_pk_seq rename to website_contact_submission_contact_submission_pk_seq';
  end if;

  if to_regclass('public.partner_interest_partner_interest_pk_seq') is not null
     and to_regclass('public.website_partner_interest_partner_interest_pk_seq') is null then
    execute 'alter sequence public.partner_interest_partner_interest_pk_seq rename to website_partner_interest_partner_interest_pk_seq';
  end if;
end
$$;

commit;

select
  to_regclass('public.website_waitlist_lead') as website_waitlist_lead,
  to_regclass('public.website_contact_submission') as website_contact_submission,
  to_regclass('public.website_partner_interest') as website_partner_interest;
