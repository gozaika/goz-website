create or replace function set_updated_on()
returns trigger
language plpgsql
as $$
begin
  new.updated_on = now();
  return new;
end;
$$;

create table if not exists waitlist_lead (
  waitlist_lead_pk bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  city_name text not null default 'Hyderabad',
  role_code text not null check (role_code in ('consumer', 'restaurant')),
  source_code text not null default 'website_waitlist',
  metadata jsonb not null default '{}'::jsonb,
  created_on timestamptz not null default now(),
  updated_on timestamptz not null default now(),
  constraint uq_waitlist_lead_email unique (email),
  constraint ck_waitlist_lead_email_format check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

create table if not exists contact_submission (
  contact_submission_pk bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  subject_code text not null check (subject_code in ('general', 'restaurant', 'investor', 'press', 'careers')),
  message text not null,
  responded_flag boolean not null default false,
  created_on timestamptz not null default now(),
  updated_on timestamptz not null default now(),
  constraint ck_contact_submission_email_format check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint ck_contact_submission_message_length check (char_length(message) between 10 and 2000)
);

create table if not exists partner_interest (
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
  constraint ck_partner_interest_email_format check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

create index if not exists idx_waitlist_lead_created_on on waitlist_lead (created_on desc);
create index if not exists idx_contact_submission_created_on on contact_submission (created_on desc);
create index if not exists idx_partner_interest_created_on on partner_interest (created_on desc);

create trigger waitlist_lead_set_updated_on
before update on waitlist_lead
for each row
execute function set_updated_on();

create trigger contact_submission_set_updated_on
before update on contact_submission
for each row
execute function set_updated_on();

create trigger partner_interest_set_updated_on
before update on partner_interest
for each row
execute function set_updated_on();

alter table waitlist_lead enable row level security;
alter table contact_submission enable row level security;
alter table partner_interest enable row level security;

create policy anon_insert_waitlist_lead
on waitlist_lead
for insert
to anon
with check (true);

create policy anon_insert_contact_submission
on contact_submission
for insert
to anon
with check (true);

create policy anon_insert_partner_interest
on partner_interest
for insert
to anon
with check (true);

create policy auth_select_waitlist_lead
on waitlist_lead
for select
to authenticated
using (true);

create policy auth_select_contact_submission
on contact_submission
for select
to authenticated
using (true);

create policy auth_select_partner_interest
on partner_interest
for select
to authenticated
using (true);
