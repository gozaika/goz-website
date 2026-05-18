-- Slice 3 follow-up: template-level defaults for one-click drop publishing.

alter table catalog_bag_template
  add column if not exists default_drop_quantity integer not null default 10,
  add column if not exists default_pickup_start_offset_minutes integer not null default 15,
  add column if not exists default_pickup_duration_minutes integer not null default 90;

alter table catalog_bag_template
  drop constraint if exists ck_catalog_bag_template_default_drop_quantity,
  drop constraint if exists ck_catalog_bag_template_default_pickup_offset,
  drop constraint if exists ck_catalog_bag_template_default_pickup_duration;

alter table catalog_bag_template
  add constraint ck_catalog_bag_template_default_drop_quantity
    check (default_drop_quantity between 1 and 500),
  add constraint ck_catalog_bag_template_default_pickup_offset
    check (default_pickup_start_offset_minutes between 0 and 1440),
  add constraint ck_catalog_bag_template_default_pickup_duration
    check (default_pickup_duration_minutes between 15 and 480);
