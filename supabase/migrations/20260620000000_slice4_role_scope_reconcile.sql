-- Slice 4 (data-driven capabilities): reconcile restaurant_team_role_scope to the
-- reviewed mobile role matrix so the policy can be driven from the DB scopes.
-- Mirrors ROLE_SCOPE_SEED + CAPABILITY_SCOPE in @gozaika/types capabilities.ts.
-- Additive + idempotent: grants the capability scopes each role needs; existing
-- scopes (TEAM_MANAGE, ANALYTICS_VIEW, DROP_PUBLISH, ...) are left intact.

begin;

-- 1. New RESTAURANT-scoped capability scopes used by the mobile role policy.
insert into master_scope (scope_code, scope_name, applies_to, description)
values
  ('DASHBOARD_VIEW',    'View dashboard',    'RESTAURANT', 'View the restaurant dashboard (role-shaped: limited queue / summary).'),
  ('INCIDENT_MANAGE',   'Manage incidents',  'RESTAURANT', 'Create and view order-linked incidents.'),
  ('COMPLIANCE_MANAGE', 'Manage compliance', 'RESTAURANT', 'Manage compliance details and private documents.'),
  ('REVIEW_VIEW',       'View reviews',      'RESTAURANT', 'View restaurant-owned reviews (read-only).'),
  ('REPORTS_VIEW',      'View reports',      'RESTAURANT', 'View ROI / performance reports.')
on conflict (scope_code) do nothing;

-- 2. Grant each role its capability scopes (idempotent). This is the single DB
--    source of truth the mobile BFF resolves; a contract test asserts these grants
--    produce exactly the reviewed matrix.
insert into restaurant_team_role_scope (restaurant_team_role_fk, master_scope_fk)
select r.restaurant_team_role_pk, s.master_scope_pk
from restaurant_team_role r
join (values
  ('OWNER', 'DASHBOARD_VIEW'), ('OWNER', 'ORDER_VIEW'), ('OWNER', 'ORDER_VERIFY_PICKUP'), ('OWNER', 'INCIDENT_MANAGE'),
  ('OWNER', 'DROP_CREATE'), ('OWNER', 'CATALOG_MANAGE'), ('OWNER', 'SETTINGS_MANAGE'), ('OWNER', 'COMPLIANCE_MANAGE'),
  ('OWNER', 'REVIEW_VIEW'), ('OWNER', 'REPORTS_VIEW'), ('OWNER', 'FINANCE_VIEW'),
  ('ADMIN', 'DASHBOARD_VIEW'), ('ADMIN', 'ORDER_VIEW'), ('ADMIN', 'ORDER_VERIFY_PICKUP'), ('ADMIN', 'INCIDENT_MANAGE'),
  ('ADMIN', 'DROP_CREATE'), ('ADMIN', 'CATALOG_MANAGE'), ('ADMIN', 'SETTINGS_MANAGE'), ('ADMIN', 'COMPLIANCE_MANAGE'),
  ('ADMIN', 'REVIEW_VIEW'), ('ADMIN', 'REPORTS_VIEW'), ('ADMIN', 'FINANCE_VIEW'),
  ('OPERATIONS', 'DASHBOARD_VIEW'), ('OPERATIONS', 'ORDER_VIEW'), ('OPERATIONS', 'ORDER_VERIFY_PICKUP'),
  ('OPERATIONS', 'INCIDENT_MANAGE'), ('OPERATIONS', 'DROP_CREATE'), ('OPERATIONS', 'CATALOG_MANAGE'),
  ('OPERATIONS', 'REVIEW_VIEW'), ('OPERATIONS', 'REPORTS_VIEW'),
  ('PICKUP_STAFF', 'DASHBOARD_VIEW'), ('PICKUP_STAFF', 'ORDER_VIEW'), ('PICKUP_STAFF', 'ORDER_VERIFY_PICKUP'),
  ('PICKUP_STAFF', 'INCIDENT_MANAGE'),
  ('FINANCE', 'DASHBOARD_VIEW'), ('FINANCE', 'ORDER_VIEW'), ('FINANCE', 'FINANCE_VIEW'), ('FINANCE', 'REPORTS_VIEW')
) m(role_code, scope_code) on r.role_code = m.role_code
join master_scope s on s.scope_code = m.scope_code
on conflict (restaurant_team_role_fk, master_scope_fk) do nothing;

commit;
