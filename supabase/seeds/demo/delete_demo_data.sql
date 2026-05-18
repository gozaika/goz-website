-- Idempotent demo cleanup across completed slices.
-- Deletes only rows registered as demo-owned. Reference/config rows are preserved.

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice3_drop_publishing'
    and entity_table = 'drop_drop'
)
delete from drop_drop d
using registered r
where d.drop_drop_pk = r.entity_id;

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice3_drop_publishing'
    and entity_table = 'catalog_bag_template'
)
delete from catalog_bag_template t
using registered r
where t.catalog_bag_template_pk = r.entity_id;

delete from dev_demo_seed_registry
where slice = 'slice3_drop_publishing';

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice2_restaurant_onboarding'
    and entity_table = 'restaurant_document'
)
delete from restaurant_document d
using registered r
where d.restaurant_document_pk = r.entity_id;

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice2_restaurant_onboarding'
    and entity_table = 'restaurant_restaurant'
)
delete from restaurant_restaurant rr
using registered r
where rr.restaurant_restaurant_pk = r.entity_id;

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice2_restaurant_onboarding'
    and entity_table = 'storage_object'
)
delete from storage_object so
using registered r
where so.storage_object_pk = r.entity_id;

delete from dev_demo_seed_registry
where slice = 'slice2_restaurant_onboarding';

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice2_admin_auth'
    and entity_table = 'iam_platform_membership'
)
delete from iam_platform_membership m
using registered r
where m.iam_platform_membership_pk = r.entity_id;

delete from dev_demo_seed_registry
where slice = 'slice2_admin_auth'
  and entity_table = 'iam_platform_membership';

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice1_auth_profile'
    and entity_table = 'privacy_consent_event'
)
delete from privacy_consent_event e
using registered r
where e.privacy_consent_event_pk = r.entity_id;

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice1_auth_profile'
    and entity_table = 'consumer_referral_code'
)
delete from consumer_referral_code c
using registered r
where c.consumer_referral_code_pk = r.entity_id;

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice1_auth_profile'
    and entity_table = 'consumer_profile'
)
delete from consumer_profile c
using registered r
where c.consumer_profile_pk = r.entity_id;

with registered as (
  select entity_id
  from dev_demo_seed_registry
  where slice = 'slice1_auth_profile'
    and entity_table = 'iam_profile'
)
delete from iam_profile p
using registered r
where p.iam_profile_pk = r.entity_id;

delete from dev_demo_seed_registry
where slice = 'slice1_auth_profile';
