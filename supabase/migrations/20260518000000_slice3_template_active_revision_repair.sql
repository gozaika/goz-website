-- Slice 3 follow-up: repair templates that have a published revision but no
-- active_revision_fk. This can happen when demo SQL is partially applied or
-- an earlier seed run is interrupted.

with latest_published_revision as (
  select distinct on (catalog_bag_template_fk)
    catalog_bag_template_fk,
    catalog_bag_template_revision_pk
  from catalog_bag_template_revision
  where revision_status_code = 'PUBLISHED'
  order by catalog_bag_template_fk, revision_number desc, created_at desc
)
update catalog_bag_template t
set active_revision_fk = r.catalog_bag_template_revision_pk,
    template_status_code = 'ACTIVE',
    updated_at = now()
from latest_published_revision r
where t.catalog_bag_template_pk = r.catalog_bag_template_fk
  and t.active_revision_fk is null;
