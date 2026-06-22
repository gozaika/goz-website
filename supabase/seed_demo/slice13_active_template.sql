-- Slice 13 demo: activate Bawarchi's BAM Bag template so drops can be published
-- from it (the base seed leaves it DRAFT with no active revision). Idempotent.
update catalog_bag_template t
set template_status_code = 'ACTIVE',
    active_revision_fk = (
      select r.catalog_bag_template_revision_pk
      from catalog_bag_template_revision r
      where r.catalog_bag_template_fk = t.catalog_bag_template_pk
      order by r.created_at desc
      limit 1
    ),
    updated_at = now()
where t.restaurant_fk = '20000000-0000-0000-0000-300000000001'
  and t.active_revision_fk is null;
