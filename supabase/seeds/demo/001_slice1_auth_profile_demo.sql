-- Slice 1 demo data entrypoint.
-- Auth users are created through scripts/demo/create-demo-auth-users.ts using the Supabase Admin API.
-- This SQL intentionally seeds only deterministic demo infrastructure markers and never inserts auth.users rows.

insert into dev_demo_seed_registry (
  dev_demo_seed_registry_pk,
  seed_key,
  entity_table,
  entity_id,
  slice,
  created_at
)
values (
  '11111111-0000-4000-8000-000000000001',
  'slice1-auth:demo-sql-marker',
  'dev_demo_seed_registry',
  '11111111-0000-4000-8000-000000000001',
  'slice1_auth_profile',
  '2026-04-27T00:00:00Z'
)
on conflict (seed_key) do nothing;
