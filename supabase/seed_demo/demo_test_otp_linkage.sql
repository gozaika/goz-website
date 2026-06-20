-- =============================================================================
-- demo_test_otp_linkage.sql  —  Mobile Slice 5 phone/OTP linkage
-- -----------------------------------------------------------------------------
-- Makes phone-OTP login resolve to the RICH demo seed (demo_seed.sql, *.demo@gozaika.dev),
-- and adds non-owner staff so the restaurant role matrix is testable.
--
-- LOCAL / TEST ONLY. The matching fixed OTP codes live in supabase/config.toml
-- under [auth.sms.test_otp]. test_otp has no effect on hosted Supabase.
--
-- Idempotent: scoped to the demo UUID space (20000000-...), ON CONFLICT DO NOTHING,
-- guarded UPDATEs. Safe to re-run. Run AFTER demo_seed.sql parts 1-4.
--
-- NOTE on phone format: Supabase GoTrue stores auth.users.phone WITHOUT the leading
-- '+' (E.164 digits only). config.toml test_otp keys use the '+' form. iam_profile.phone_e164
-- keeps the '+' form to match the app's normalizeIndianPhone() output.
--
-- See: docs/mobile/demo-identity-reconciliation.md
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Backfill phones on rich CONSUMER auth.users (8) + iam_profile
-- -----------------------------------------------------------------------------
update auth.users u
set phone              = m.digits,
    phone_confirmed_at = coalesce(u.phone_confirmed_at, now())
from (values
  ('20000000-0000-0000-0000-100000000001', '919876510001'),
  ('20000000-0000-0000-0000-100000000002', '919876510002'),
  ('20000000-0000-0000-0000-100000000003', '919876510003'),
  ('20000000-0000-0000-0000-100000000004', '919876510004'),
  ('20000000-0000-0000-0000-100000000005', '919876510005'),
  ('20000000-0000-0000-0000-100000000006', '919876510006'),
  ('20000000-0000-0000-0000-100000000007', '919876510007'),
  ('20000000-0000-0000-0000-100000000008', '919876510008')
) m(id, digits)
where u.id = m.id::uuid
  and (u.phone is null or u.phone = m.digits);   -- never clobber a different real phone

update iam_profile p
set phone_e164 = '+' || m.digits,
    updated_at = now()
from (values
  ('20000000-0000-0000-0000-110000000001', '919876510001'),
  ('20000000-0000-0000-0000-110000000002', '919876510002'),
  ('20000000-0000-0000-0000-110000000003', '919876510003'),
  ('20000000-0000-0000-0000-110000000004', '919876510004'),
  ('20000000-0000-0000-0000-110000000005', '919876510005'),
  ('20000000-0000-0000-0000-110000000006', '919876510006'),
  ('20000000-0000-0000-0000-110000000007', '919876510007'),
  ('20000000-0000-0000-0000-110000000008', '919876510008')
) m(pk, digits)
where p.iam_profile_pk = m.pk::uuid;

-- -----------------------------------------------------------------------------
-- 2. Backfill phones on rich RESTAURANT OWNER auth.users (5) + iam_profile
-- -----------------------------------------------------------------------------
update auth.users u
set phone              = m.digits,
    phone_confirmed_at = coalesce(u.phone_confirmed_at, now())
from (values
  ('20000000-0000-0000-0000-200000000001', '919876520001'),
  ('20000000-0000-0000-0000-200000000002', '919876520002'),
  ('20000000-0000-0000-0000-200000000003', '919876520003'),
  ('20000000-0000-0000-0000-200000000004', '919876520004'),
  ('20000000-0000-0000-0000-200000000005', '919876520005')
) m(id, digits)
where u.id = m.id::uuid
  and (u.phone is null or u.phone = m.digits);

update iam_profile p
set phone_e164 = '+' || m.digits,
    updated_at = now()
from (values
  ('20000000-0000-0000-0000-210000000001', '919876520001'),
  ('20000000-0000-0000-0000-210000000002', '919876520002'),
  ('20000000-0000-0000-0000-210000000003', '919876520003'),
  ('20000000-0000-0000-0000-210000000004', '919876520004'),
  ('20000000-0000-0000-0000-210000000005', '919876520005')
) m(pk, digits)
where p.iam_profile_pk = m.pk::uuid;

-- -----------------------------------------------------------------------------
-- 3. Role-matrix staff on Bawarchi (ADMIN / OPERATIONS / PICKUP_STAFF / FINANCE)
--    auth.users 23.. , iam_profile 13.. (new blocks, no collision)
-- -----------------------------------------------------------------------------
insert into auth.users
  (id, aud, role, email, phone, phone_confirmed_at,
   email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('20000000-0000-0000-0000-230000000001','authenticated','authenticated',
   'bawarchi.admin@gozaika.dev','919876530001', now(), now(),
   '{"provider":"phone","providers":["phone"],"role":"restaurant"}','{"full_name":"Bawarchi Admin"}', now(), now()),
  ('20000000-0000-0000-0000-230000000002','authenticated','authenticated',
   'bawarchi.ops@gozaika.dev','919876530002', now(), now(),
   '{"provider":"phone","providers":["phone"],"role":"restaurant"}','{"full_name":"Bawarchi Ops"}', now(), now()),
  ('20000000-0000-0000-0000-230000000003','authenticated','authenticated',
   'bawarchi.counter@gozaika.dev','919876530003', now(), now(),
   '{"provider":"phone","providers":["phone"],"role":"restaurant"}','{"full_name":"Bawarchi Counter"}', now(), now()),
  ('20000000-0000-0000-0000-230000000004','authenticated','authenticated',
   'bawarchi.finance@gozaika.dev','919876530004', now(), now(),
   '{"provider":"phone","providers":["phone"],"role":"restaurant"}','{"full_name":"Bawarchi Finance"}', now(), now())
on conflict (id) do nothing;

insert into iam_profile
  (iam_profile_pk, auth_user_fk, email_address, phone_e164, display_name,
   default_city_fk, is_consumer, is_restaurant_user, is_platform_user, created_at, updated_at)
select
  pk, auth_fk, email::citext, phone, dname,
  (select geo_city_pk from geo_city where city_code='HYD'),
  false, true, false, now(), now()
from (values
  ('20000000-0000-0000-0000-130000000001'::uuid,'20000000-0000-0000-0000-230000000001'::uuid,
   'bawarchi.admin@gozaika.dev','+919876530001','Bawarchi Admin'),
  ('20000000-0000-0000-0000-130000000002'::uuid,'20000000-0000-0000-0000-230000000002'::uuid,
   'bawarchi.ops@gozaika.dev','+919876530002','Bawarchi Ops'),
  ('20000000-0000-0000-0000-130000000003'::uuid,'20000000-0000-0000-0000-230000000003'::uuid,
   'bawarchi.counter@gozaika.dev','+919876530003','Bawarchi Counter'),
  ('20000000-0000-0000-0000-130000000004'::uuid,'20000000-0000-0000-0000-230000000004'::uuid,
   'bawarchi.finance@gozaika.dev','+919876530004','Bawarchi Finance')
) t(pk, auth_fk, email, phone, dname)
on conflict (iam_profile_pk) do nothing;

-- Non-owner memberships on Bawarchi (restaurant 300...001), is_default=false
insert into restaurant_team_membership
  (restaurant_fk, iam_profile_fk, restaurant_team_role_fk, is_active, is_default, joined_at)
select '20000000-0000-0000-0000-300000000001'::uuid, m.iam::uuid, rtr.restaurant_team_role_pk,
       true, false, now()-interval '30 days'
from (values
  ('20000000-0000-0000-0000-130000000001','ADMIN'),
  ('20000000-0000-0000-0000-130000000002','OPERATIONS'),
  ('20000000-0000-0000-0000-130000000003','PICKUP_STAFF'),
  ('20000000-0000-0000-0000-130000000004','FINANCE')
) m(iam, rolecode)
join restaurant_team_role rtr on rtr.role_code = m.rolecode
on conflict (restaurant_fk, iam_profile_fk, restaurant_team_role_fk) do nothing;

-- -----------------------------------------------------------------------------
-- 3b. GoTrue compatibility for SQL-seeded auth.users.
-- Raw INSERTs leave instance_id NULL and token columns NULL, which makes GoTrue
-- fail to find/scan the user during phone-OTP ("Database error finding user" /
-- the user looking absent). Set the default instance and empty-string the token
-- columns GoTrue scans into non-nullable Go strings. Verified necessary for
-- local phone-OTP sign-in (2026-06-20).
-- -----------------------------------------------------------------------------
update auth.users
set instance_id                = coalesce(instance_id, '00000000-0000-0000-0000-000000000000'),
    confirmation_token         = coalesce(confirmation_token, ''),
    recovery_token             = coalesce(recovery_token, ''),
    email_change               = coalesce(email_change, ''),
    email_change_token_new     = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change               = coalesce(phone_change, ''),
    phone_change_token         = coalesce(phone_change_token, ''),
    reauthentication_token     = coalesce(reauthentication_token, '')
where id::text like '20000000-0000-0000-0000-1%'
   or id::text like '20000000-0000-0000-0000-2%';

commit;

-- -----------------------------------------------------------------------------
-- 4. Verification (run manually; should return 17 phone-linked demo users)
-- -----------------------------------------------------------------------------
-- select u.phone, p.display_name, p.is_consumer, p.is_restaurant_user
-- from auth.users u join iam_profile p on p.auth_user_fk = u.id
-- where u.id::text like '20000000-0000-0000-0000-1%'
--    or u.id::text like '20000000-0000-0000-0000-2%'
-- order by u.phone;
