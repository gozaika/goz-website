create table if not exists career_application (
  career_application_pk bigint generated always as identity primary key,
  applicant_name text not null,
  email text not null,
  role_interest text not null,
  linkedin_url text,
  location_name text not null,
  portfolio_url text,
  motivation text not null,
  status_code text not null default 'new' check (status_code in ('new', 'reviewing', 'interview', 'closed')),
  created_on timestamptz not null default now(),
  updated_on timestamptz not null default now(),
  constraint ck_career_application_email_format check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

create index if not exists idx_career_application_created_on on career_application (created_on desc);

create trigger career_application_set_updated_on
before update on career_application
for each row
execute function set_updated_on();

alter table career_application enable row level security;

create policy anon_insert_career_application
on career_application
for insert
to anon
with check (true);

create policy auth_select_career_application
on career_application
for select
to authenticated
using (true);
