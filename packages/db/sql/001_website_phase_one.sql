create or replace function set_updated_on()
returns trigger
language plpgsql
as $$
begin
  new.updated_on = now();
  return new;
end;
$$;

create table if not exists website_waitlist_lead (
  waitlist_lead_pk bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  city_name text not null default 'Hyderabad',
  role_code text not null check (role_code in ('consumer', 'restaurant')),
  source_code text not null default 'website_waitlist',
  metadata jsonb not null default '{}'::jsonb,
  created_on timestamptz not null default now(),
  updated_on timestamptz not null default now(),
  constraint uq_website_waitlist_lead_email unique (email),
  constraint ck_website_waitlist_lead_email_format check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

create table if not exists website_contact_submission (
  contact_submission_pk bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  subject_code text not null check (subject_code in ('general', 'restaurant', 'investor', 'press', 'careers')),
  message text not null,
  responded_flag boolean not null default false,
  created_on timestamptz not null default now(),
  updated_on timestamptz not null default now(),
  constraint ck_website_contact_submission_email_format check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint ck_website_contact_submission_message_length check (char_length(message) between 10 and 2000)
);

create table if not exists website_partner_interest (
  partner_interest_pk bigint generated always as identity primary key,
  restaurant_name text not null,
  owner_name text not null,
  email text not null,
  phone_number text not null,
  city_name text not null,
  cuisine_name text not null,
  daily_covers text not null,
  message text,
  status_code text not null default 'new' check (status_code in ('new', 'contacted', 'qualified', 'rejected')),
  created_on timestamptz not null default now(),
  updated_on timestamptz not null default now(),
  constraint ck_website_partner_interest_email_format check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

create index if not exists idx_website_waitlist_lead_created_on on website_waitlist_lead (created_on desc);
create index if not exists idx_website_contact_submission_created_on on website_contact_submission (created_on desc);
create index if not exists idx_website_partner_interest_created_on on website_partner_interest (created_on desc);

create trigger website_waitlist_lead_set_updated_on
before update on website_waitlist_lead
for each row
execute function set_updated_on();

create trigger website_contact_submission_set_updated_on
before update on website_contact_submission
for each row
execute function set_updated_on();

create trigger website_partner_interest_set_updated_on
before update on website_partner_interest
for each row
execute function set_updated_on();

alter table website_waitlist_lead enable row level security;
alter table website_contact_submission enable row level security;
alter table website_partner_interest enable row level security;

create policy anon_insert_website_waitlist_lead
on website_waitlist_lead
for insert
to anon
with check (true);

create policy anon_insert_website_contact_submission
on website_contact_submission
for insert
to anon
with check (true);

create policy anon_insert_website_partner_interest
on website_partner_interest
for insert
to anon
with check (true);

create policy auth_select_website_waitlist_lead
on website_waitlist_lead
for select
to authenticated
using (true);

create policy auth_select_website_contact_submission
on website_contact_submission
for select
to authenticated
using (true);

create policy auth_select_website_partner_interest
on website_partner_interest
for select
to authenticated
using (true);
