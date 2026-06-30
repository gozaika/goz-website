alter table media_upload_session
  add column if not exists catalog_bag_template_revision_fk uuid
    references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete cascade;

alter table media_upload_session drop constraint ck_media_upload_session_target;
alter table media_upload_session add constraint ck_media_upload_session_target
  check (target_code in ('RESTAURANT_HERO', 'RESTAURANT_LOGO', 'DROP_PRIMARY', 'TEMPLATE_PRIMARY'));

alter table media_upload_session drop constraint ck_media_upload_session_target_entity;
alter table media_upload_session add constraint ck_media_upload_session_target_entity check (
  (target_code in ('RESTAURANT_HERO', 'RESTAURANT_LOGO') and drop_fk is null and catalog_bag_template_revision_fk is null)
  or (target_code = 'DROP_PRIMARY' and drop_fk is not null and catalog_bag_template_revision_fk is null)
  or (target_code = 'TEMPLATE_PRIMARY' and drop_fk is null and catalog_bag_template_revision_fk is not null)
);
