-- Deterministic Slice 2 restaurant onboarding demo rows.
-- Run after demo auth users are created so iam_profile rows exist.

with demo_restaurants as (
  select *
  from (values
    ('20000000-0000-0000-0000-000000000001'::uuid, 'biryani.baithak@gozaika.example', 'Biryani Baithak', 'biryani-baithak', 'Biryani Baithak Hospitality LLP', 'BANJARA_HILLS', 'HYDERABADI', 'ACTIVE', 'APPROVED', 'APPROVED'),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'charminar.chai.co@gozaika.example', 'Charminar Chai Co.', 'charminar-chai-co', 'Charminar Chai Company LLP', 'TOLICHOWKI', 'BAKERY', 'ONBOARDING', 'UNDER_REVIEW', 'UNDER_REVIEW'),
    ('20000000-0000-0000-0000-000000000003'::uuid, 'deccan.dosa.house@gozaika.example', 'Deccan Dosa House', 'deccan-dosa-house', 'Deccan Dosa House Private Limited', 'MADHAPUR', 'SOUTH_INDIAN', 'ONBOARDING', 'REJECTED', 'REJECTED'),
    ('20000000-0000-0000-0000-000000000004'::uuid, 'golconda.grills@gozaika.example', 'Golconda Grills', 'golconda-grills', 'Golconda Grills Foods LLP', 'GACHIBOWLI', 'NORTH_INDIAN', 'ONBOARDING', 'PENDING', 'PENDING_REVIEW'),
    ('20000000-0000-0000-0000-000000000005'::uuid, 'hitec.handi@gozaika.example', 'HITEC Handi', 'hitec-handi', 'HITEC Handi Kitchens LLP', 'HITECH_CITY', 'MULTI_CUISINE', 'ONBOARDING', 'UNDER_REVIEW', 'PENDING_REVIEW')
  ) as value(restaurant_pk, owner_email, restaurant_name, restaurant_slug, legal_entity_name, neighborhood_code, cuisine_code, restaurant_status_code, compliance_status_code, document_status_code)
),
resolved as (
  select
    d.*,
    p.iam_profile_pk,
    c.geo_city_pk,
    n.geo_neighborhood_pk,
    cu.master_cuisine_pk,
    owner_role.restaurant_team_role_pk,
    doc_type.master_document_type_pk,
    doc_status.master_document_status_pk,
    visibility.master_storage_visibility_pk
  from demo_restaurants d
  join iam_profile p on lower(p.email_address::text) = d.owner_email
  join geo_city c on c.city_code = 'HYD'
  left join geo_neighborhood n on n.geo_city_fk = c.geo_city_pk and n.neighborhood_code = d.neighborhood_code
  left join master_cuisine cu on cu.cuisine_code = d.cuisine_code
  join restaurant_team_role owner_role on owner_role.role_code = 'OWNER'
  join master_document_type doc_type on doc_type.type_code = 'FSSAI_LICENSE'
  join master_document_status doc_status on doc_status.status_code = d.document_status_code
  join master_storage_visibility visibility on visibility.visibility_code = 'SERVICE_ONLY'
)
insert into restaurant_restaurant (
  restaurant_restaurant_pk,
  restaurant_name,
  restaurant_slug,
  legal_entity_name,
  restaurant_status_code,
  geo_city_fk,
  geo_neighborhood_fk,
  owner_profile_fk,
  primary_contact_email,
  primary_contact_phone_e164,
  pickup_instructions,
  created_at,
  updated_at
)
select
  restaurant_pk,
  restaurant_name,
  restaurant_slug,
  legal_entity_name,
  restaurant_status_code,
  geo_city_pk,
  geo_neighborhood_pk,
  iam_profile_pk,
  owner_email,
  '+919000100000',
  'Pickup from the main billing counter. Please bring QR/OTP and arrive during the pickup window.',
  '2026-05-02T00:00:00Z',
  '2026-05-02T00:00:00Z'
from resolved
on conflict (restaurant_restaurant_pk) do update
set restaurant_name = excluded.restaurant_name,
    restaurant_status_code = excluded.restaurant_status_code,
    updated_at = excluded.updated_at;

with resolved as (
  select r.*, p.iam_profile_pk, role.restaurant_team_role_pk
  from restaurant_restaurant r
  join iam_profile p on p.iam_profile_pk = r.owner_profile_fk
  join restaurant_team_role role on role.role_code = 'OWNER'
  where r.restaurant_restaurant_pk::text like '20000000-0000-0000-0000-00000000000%'
)
insert into restaurant_team_membership (restaurant_fk, iam_profile_fk, restaurant_team_role_fk, is_active, is_default, joined_at, created_at, updated_at)
select restaurant_restaurant_pk, iam_profile_pk, restaurant_team_role_pk, true, true, '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'
from resolved
on conflict (restaurant_fk, iam_profile_fk, restaurant_team_role_fk) do update
set is_active = true,
    is_default = true,
    updated_at = excluded.updated_at;

with demo_status as (
  select *
  from (values
    ('20000000-0000-0000-0000-000000000001'::uuid, '50000000-0000-0000-0000-000000000001'::uuid, 'APPROVED'),
    ('20000000-0000-0000-0000-000000000002'::uuid, '50000000-0000-0000-0000-000000000002'::uuid, 'UNDER_REVIEW'),
    ('20000000-0000-0000-0000-000000000003'::uuid, '50000000-0000-0000-0000-000000000003'::uuid, 'REJECTED'),
    ('20000000-0000-0000-0000-000000000004'::uuid, '50000000-0000-0000-0000-000000000004'::uuid, 'PENDING'),
    ('20000000-0000-0000-0000-000000000005'::uuid, '50000000-0000-0000-0000-000000000005'::uuid, 'UNDER_REVIEW')
  ) as value(restaurant_pk, compliance_pk, compliance_status_code)
)
insert into restaurant_compliance (
  restaurant_compliance_pk,
  restaurant_fk,
  fssai_license_number,
  fssai_license_expiry_date,
  gstin,
  pan_number,
  compliance_status_code,
  created_at,
  updated_at
)
select
  compliance_pk,
  restaurant_pk,
  '12345678901234',
  '2028-03-31',
  '36ABCDE1234F1Z5',
  'ABCDE1234F',
  compliance_status_code,
  '2026-05-02T00:00:00Z',
  '2026-05-02T00:00:00Z'
from demo_status
on conflict (restaurant_fk) do update
set compliance_status_code = excluded.compliance_status_code,
    updated_at = excluded.updated_at;

insert into restaurant_public_profile (restaurant_fk, headline, story_markdown, created_at, updated_at)
select restaurant_restaurant_pk, 'Chef-curated BAM Bags, pickup only.', 'Not a deal. A discovery. Premium without pretence.', '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'
from restaurant_restaurant
where restaurant_restaurant_pk::text like '20000000-0000-0000-0000-00000000000%'
on conflict (restaurant_fk) do update
set headline = excluded.headline,
    story_markdown = excluded.story_markdown,
    updated_at = excluded.updated_at;

insert into restaurant_contact (restaurant_fk, contact_type_code, contact_name, email_address, phone_e164, is_primary, created_at, updated_at)
select restaurant_restaurant_pk, 'OWNER', restaurant_name || ' Owner', primary_contact_email, primary_contact_phone_e164, true, '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'
from restaurant_restaurant
where restaurant_restaurant_pk::text like '20000000-0000-0000-0000-00000000000%'
  and not exists (
    select 1
    from restaurant_contact c
    where c.restaurant_fk = restaurant_restaurant.restaurant_restaurant_pk
      and c.contact_type_code = 'OWNER'
      and c.is_primary = true
  );

insert into restaurant_cuisine_map (restaurant_fk, master_cuisine_fk, is_primary, created_at, updated_at)
select r.restaurant_restaurant_pk, c.master_cuisine_pk, true, '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'
from restaurant_restaurant r
join (values
  ('20000000-0000-0000-0000-000000000001'::uuid, 'HYDERABADI'),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'BAKERY'),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'SOUTH_INDIAN'),
  ('20000000-0000-0000-0000-000000000004'::uuid, 'NORTH_INDIAN'),
  ('20000000-0000-0000-0000-000000000005'::uuid, 'MULTI_CUISINE')
) v(restaurant_pk, cuisine_code) on v.restaurant_pk = r.restaurant_restaurant_pk
join master_cuisine c on c.cuisine_code = v.cuisine_code
on conflict (restaurant_fk, master_cuisine_fk) do update
set is_primary = excluded.is_primary,
    updated_at = excluded.updated_at;

insert into restaurant_onboarding_task (restaurant_fk, task_code, task_name, task_status_code, completed_at, created_at, updated_at)
select r.restaurant_restaurant_pk, task_code, task_name,
  case when r.restaurant_status_code = 'ACTIVE' then 'COMPLETED' else task_status_code end,
  case when r.restaurant_status_code = 'ACTIVE' then '2026-05-02T00:00:00Z'::timestamptz else null end,
  '2026-05-02T00:00:00Z',
  '2026-05-02T00:00:00Z'
from restaurant_restaurant r
cross join (values
  ('PROFILE', 'Restaurant basics', 'COMPLETED'),
  ('LOCATION_PICKUP', 'Location and pickup instructions', 'COMPLETED'),
  ('COMPLIANCE_DETAILS', 'Compliance details', 'COMPLETED'),
  ('DOCUMENT_UPLOAD', 'FSSAI/KYC document upload', 'IN_PROGRESS'),
  ('CONTACTS', 'Primary contacts', 'COMPLETED'),
  ('REVIEW_SUBMISSION', 'Submit for admin review', 'PENDING')
) tasks(task_code, task_name, task_status_code)
where r.restaurant_restaurant_pk::text like '20000000-0000-0000-0000-00000000000%'
on conflict (restaurant_fk, task_code) do update
set task_status_code = excluded.task_status_code,
    completed_at = excluded.completed_at,
    updated_at = excluded.updated_at;

with docs as (
  select *
  from (values
    ('20000000-0000-0000-0000-000000000001'::uuid, '60000000-0000-0000-0000-000000000001'::uuid, '70000000-0000-0000-0000-000000000001'::uuid, 'APPROVED', null::text),
    ('20000000-0000-0000-0000-000000000002'::uuid, '60000000-0000-0000-0000-000000000002'::uuid, '70000000-0000-0000-0000-000000000002'::uuid, 'UNDER_REVIEW', null::text),
    ('20000000-0000-0000-0000-000000000003'::uuid, '60000000-0000-0000-0000-000000000003'::uuid, '70000000-0000-0000-0000-000000000003'::uuid, 'REJECTED', 'Uploaded certificate image is unreadable. Please upload a clear PDF or image.'),
    ('20000000-0000-0000-0000-000000000004'::uuid, '60000000-0000-0000-0000-000000000004'::uuid, '70000000-0000-0000-0000-000000000004'::uuid, 'PENDING_REVIEW', null::text),
    ('20000000-0000-0000-0000-000000000005'::uuid, '60000000-0000-0000-0000-000000000005'::uuid, '70000000-0000-0000-0000-000000000005'::uuid, 'PENDING_REVIEW', null::text)
  ) as value(restaurant_pk, storage_object_pk, restaurant_document_pk, document_status_code, rejection_reason)
),
resolved as (
  select d.*, t.master_document_type_pk, s.master_document_status_pk, v.master_storage_visibility_pk, r.owner_profile_fk
  from docs d
  join restaurant_restaurant r on r.restaurant_restaurant_pk = d.restaurant_pk
  join master_document_type t on t.type_code = 'FSSAI_LICENSE'
  join master_document_status s on s.status_code = d.document_status_code
  join master_storage_visibility v on v.visibility_code = 'SERVICE_ONLY'
)
insert into storage_object (storage_object_pk, bucket_name, object_path, original_filename, mime_type, size_bytes, master_storage_visibility_fk, uploaded_by_profile_fk, created_at, updated_at)
select storage_object_pk, 'private-documents', 'restaurants/' || restaurant_pk || '/compliance/FSSAI_LICENSE/demo-fssai.pdf', 'demo-fssai.pdf', 'application/pdf', 1024, master_storage_visibility_pk, owner_profile_fk, '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'
from resolved
on conflict (bucket_name, object_path) do update
set updated_at = excluded.updated_at;

with docs as (
  select *
  from (values
    ('20000000-0000-0000-0000-000000000001'::uuid, '60000000-0000-0000-0000-000000000001'::uuid, '70000000-0000-0000-0000-000000000001'::uuid, 'APPROVED', null::text),
    ('20000000-0000-0000-0000-000000000002'::uuid, '60000000-0000-0000-0000-000000000002'::uuid, '70000000-0000-0000-0000-000000000002'::uuid, 'UNDER_REVIEW', null::text),
    ('20000000-0000-0000-0000-000000000003'::uuid, '60000000-0000-0000-0000-000000000003'::uuid, '70000000-0000-0000-0000-000000000003'::uuid, 'REJECTED', 'Uploaded certificate image is unreadable. Please upload a clear PDF or image.'),
    ('20000000-0000-0000-0000-000000000004'::uuid, '60000000-0000-0000-0000-000000000004'::uuid, '70000000-0000-0000-0000-000000000004'::uuid, 'PENDING_REVIEW', null::text),
    ('20000000-0000-0000-0000-000000000005'::uuid, '60000000-0000-0000-0000-000000000005'::uuid, '70000000-0000-0000-0000-000000000005'::uuid, 'PENDING_REVIEW', null::text)
  ) as value(restaurant_pk, storage_object_pk, restaurant_document_pk, document_status_code, rejection_reason)
)
insert into restaurant_document (restaurant_document_pk, restaurant_fk, master_document_type_fk, master_document_status_fk, storage_object_fk, document_number, expires_at, rejection_reason, uploaded_by_profile_fk, created_at, updated_at)
select d.restaurant_document_pk, d.restaurant_pk, t.master_document_type_pk, s.master_document_status_pk, d.storage_object_pk, '12345678901234', '2028-03-31', d.rejection_reason, r.owner_profile_fk, '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'
from docs d
join restaurant_restaurant r on r.restaurant_restaurant_pk = d.restaurant_pk
join master_document_type t on t.type_code = 'FSSAI_LICENSE'
join master_document_status s on s.status_code = d.document_status_code
on conflict (restaurant_document_pk) do update
set master_document_status_fk = excluded.master_document_status_fk,
    rejection_reason = excluded.rejection_reason,
    updated_at = excluded.updated_at;

insert into dev_demo_seed_registry (seed_key, entity_table, entity_id, slice, created_at)
select 'slice2-restaurant:' || restaurant_restaurant_pk, 'restaurant_restaurant', restaurant_restaurant_pk, 'slice2_restaurant_onboarding', '2026-05-02T00:00:00Z'
from restaurant_restaurant
where restaurant_restaurant_pk::text like '20000000-0000-0000-0000-00000000000%'
on conflict (seed_key) do update set created_at = excluded.created_at;

insert into dev_demo_seed_registry (seed_key, entity_table, entity_id, slice, created_at)
select 'slice2-document:' || restaurant_document_pk, 'restaurant_document', restaurant_document_pk, 'slice2_restaurant_onboarding', '2026-05-02T00:00:00Z'
from restaurant_document
where restaurant_document_pk::text like '70000000-0000-0000-0000-00000000000%'
on conflict (seed_key) do update set created_at = excluded.created_at;

insert into dev_demo_seed_registry (seed_key, entity_table, entity_id, slice, created_at)
select 'slice2-storage:' || storage_object_pk, 'storage_object', storage_object_pk, 'slice2_restaurant_onboarding', '2026-05-02T00:00:00Z'
from storage_object
where storage_object_pk::text like '60000000-0000-0000-0000-00000000000%'
on conflict (seed_key) do update set created_at = excluded.created_at;
