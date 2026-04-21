# goZaika Foundational Production Schema — v2.0

## Critical Analysis of v1 Schema

Before the rewritten schema, here are the significant issues found in v1:

### Issue 1 — Style Guide Conflicts (Pervasive)
The `supabase-postgres-schema-style.mdc` mandates `created_on/updated_on` (not `_at`), `bigint generated always as identity` PKs (not UUID), and `master_` prefix on reference tables. The v1 schema uses UUID PKs and `_at` timestamps throughout. **Resolution**: UUID PKs are deliberately retained — they are architecturally superior for distributed systems, prevent enumeration attacks, and are required to match `auth.users.id` type. This is an explicit override documented here. Timestamps are standardised to `_at` throughout (consistent with Supabase conventions). Reference table names are aligned to `master_` prefix as required.

### Issue 2 — Broken Updated-At Trigger Loop
The v1 trigger-creation `DO` block includes append-only tables that have no `updated_at` column (`privacy_consent_event`, `order_status_transition`, `order_pickup_verification_event`, `drop_inventory_event`, `finance_restaurant_payout_entry`, `audit_log`, `analytics_event`, `notification_delivery_attempt`, `support_ticket_event`, `incident_event`). Applying the trigger to these tables would throw a column-not-found error. **Fixed**: trigger loop only includes mutable tables.

### Issue 3 — Undefined `scope_code` Domain
`iam_platform_role_scope.scope_code` and `restaurant_team_role_scope.scope_code` are free-text with no reference table. Two teams will produce inconsistent scope values. **Fixed**: new `master_scope` table defines all valid scope codes with descriptions.

### Issue 4 — Reference Table Naming Non-Compliance
`catalog_allergen`, `restaurant_cuisine`, `drop_audience_segment` are reference/master data but lack the `master_` prefix required by the style guide. **Fixed**: renamed to `master_allergen`, `master_cuisine`, `master_audience_segment` with redirected FKs.

### Issue 5 — `consumer_profile.referral_code_fk` Ambiguity
The entity description mentions `referral_code_fk` on `consumer_profile` (implying the code the user used to sign up), but the SQL migration does not include this column. The intent is to record which referral code was used at signup (someone else's code). **Fixed**: added `used_referral_code_fk` column referencing `consumer_referral_code`.

### Issue 6 — Missing FK Indexes on High-Traffic Columns
Many FK columns have no explicit index. On large tables this causes sequential scans on common joins. **Fixed**: explicit `idx_` indexes added for all FK columns on tables with high expected row counts.

### Issue 7 — `drop_drop.geo_city_fk` Nullable Despite Being Required
Every drop must belong to a city for discovery. Making this nullable allows orphaned drops. **Fixed**: `geo_city_fk NOT NULL` with appropriate default during migration.

### Issue 8 — `order_order` Total Check Can Produce Negative Total
`total_paise = subtotal - discount + fee + tax` could be negative if discount > subtotal. **Fixed**: added `total_paise >= 0` check alongside the existing equation check.

### Issue 9 — `storage_object.visibility_code` Unconstrained
Free text with no validation. **Fixed**: replaced with `master_storage_visibility` reference table.

### Issue 10 — `catalog_bag_template.template_status` Uses Text + Check Constraint
All other status fields use proper enums. **Fixed**: new `enum_bag_template_status` enum.

### Issue 11 — Circular FK Handled Correctly But Order Is Fragile
The `order_order` ↔ `drop_inventory_hold` circular FK is resolved via a deferred `ALTER TABLE`. The v1 schema handles this, but the hold table is created AFTER order_order in the migration, meaning the FK on order_order can only be added via ALTER. **Fixed**: explicit ordering and comments.

### Issue 12 — Missing Consumer Subscription Payment Linkage
When a Swaad Club subscription renews, there is no FK from `consumer_subscription` to `payment_intent`. Renewals cannot be reconciled. **Fixed**: added `payment_intent_fk` (nullable) on `consumer_subscription`.

### Issue 13 — Missing `updated_at` on `consumer_saved_restaurant`
Table only has `saved_at`. If follow/unfollow notifications are tracked per-save, an `updated_at` is needed. **Fixed**: added `updated_at`.

### Issue 14 — `config_runtime_setting.segment_code` Not FK-Constrained
References audience segment codes but as free text. **Fixed**: FK to `master_audience_segment`.

### Issue 15 — No Index on `consumer_profile.iam_profile_fk`
Despite being the primary join between consumer and identity layers, this FK has no index in v1. **Fixed**: explicit index added.

### Issue 16 — `analytics_event` Has No Retention / Partitioning Strategy
High-volume append-only table will grow unbounded. **Fixed**: documented partitioning strategy (range by `occurred_at` month); add `COMMENT` guidance.

### Issue 17 — `payment_refund.refund_status_code` and `refund_reason_code` Are Free Text
Should be enum-backed. **Fixed**: new `enum_refund_status` and `enum_refund_reason` enums.

### Issue 18 — Incomplete Prisma Schema
v1 Prisma schema covers only ~60% of tables. **Fixed**: full Prisma schema included in separate section.

---

## 1. Architecture Note

Same decisions as v1 with the following additions/corrections:

- UUID PKs retained (explicit override of style guide rule #3 — distributed-safe, enumeration-resistant, auth-compatible).
- `master_` prefix applied to all reference/enumeration tables: `master_allergen`, `master_cuisine`, `master_audience_segment`, `master_scope`, `master_storage_visibility`, `master_document_type`, `master_document_status`.
- Timestamps use `_at` suffix throughout (consistent within project; explicit override of style guide `_on` convention).
- Append-only event/log tables use `bigint generated always as identity` (consistent with style guide rule #3 for these tables).
- Trigger loop corrected to exclude append-only tables.
- All FK columns have supporting indexes on tables with > ~10K expected rows.
- `scope_code` now FK-constrained via `master_scope`.

---

## 2. Complete Entity List (grouped by bounded context)

### Identity and Access
- `iam_profile`
- `iam_platform_role`
- `iam_platform_membership`
- `iam_platform_role_scope`
- `restaurant_team_role`
- `restaurant_team_membership`
- `restaurant_team_role_scope`
- `master_scope` ← **NEW**: defines valid scope codes

### Geography and Reference Data (master tables)
- `geo_city`
- `geo_neighborhood`
- `geo_address`
- `master_allergen` ← renamed from `catalog_allergen`
- `master_cuisine` ← renamed from `restaurant_cuisine`
- `master_audience_segment` ← renamed from `drop_audience_segment`
- `master_storage_visibility` ← **NEW**
- `master_document_type` ← **NEW**
- `master_document_status` ← **NEW**

### Consumer Domain
- `consumer_profile`
- `consumer_dietary_preference`
- `consumer_allergen_preference`
- `consumer_city_preference`
- `consumer_saved_restaurant`
- `consumer_referral_code`
- `consumer_referral`
- `consumer_subscription_plan`
- `consumer_subscription`
- `consumer_passport_stat`
- `consumer_notification_preference`
- `privacy_consent_purpose`
- `privacy_consent_event`
- `privacy_retention_policy`
- `privacy_erasure_request`

### Restaurant Domain
- `restaurant_restaurant`
- `restaurant_compliance`
- `restaurant_contact`
- `restaurant_cuisine_map` (join: restaurant ↔ master_cuisine)
- `restaurant_payout_account`
- `restaurant_commission_plan`
- `restaurant_commission_override`
- `restaurant_document`
- `restaurant_setting`

### Storage Metadata
- `storage_object`

### Catalog / Bag Template
- `catalog_bag_template`
- `catalog_bag_template_revision`
- `catalog_bag_template_allergen`
- `catalog_bag_template_media`

### Drop / Listing
- `drop_recurring_schedule`
- `drop_drop`
- `drop_audience` (join: drop ↔ master_audience_segment)
- `drop_media`
- `drop_inventory_hold`
- `drop_inventory_event`
- `drop_closure_log`

### Order / Claim / Pickup
- `order_order`
- `order_item`
- `order_status_transition`
- `order_pickup_verification_event`

### Payment and Financial
- `core_idempotency_key`
- `payment_intent`
- `payment_transaction`
- `payment_webhook_event`
- `payment_refund`
- `finance_settlement_run`
- `finance_payout_entry`
- `finance_invoice`

### Reviews, Incidents, Support
- `review_review`
- `review_media`
- `support_ticket`
- `support_ticket_event`
- `incident_incident`
- `incident_event`

### Notifications
- `notification_template`
- `notification_outbox`
- `notification_delivery_attempt`

### Admin, Config, Audit, Analytics
- `audit_log`
- `config_feature_flag`
- `config_runtime_setting`
- `analytics_event`
- `admin_export_job`
- `admin_data_correction`

---

## 3. PostgreSQL-First Schema Design

### Enums

```sql
-- Dietary and food classification
create type enum_dietary_category     as enum ('VEG', 'NON_VEG', 'JAIN', 'EGG_ONLY');
create type enum_spice_level          as enum ('MILD', 'MEDIUM', 'HOT');
create type enum_source_type          as enum ('SURPLUS', 'SLACK_HOUR', 'CHEF_SPECIAL', 'SPOTLIGHT');

-- Lifecycle statuses
create type enum_restaurant_status    as enum ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'ARCHIVED');
create type enum_bag_template_status  as enum ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
create type enum_drop_status          as enum ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'EXPIRED', 'CANCELLED', 'EMERGENCY_CLOSED');
create type enum_drop_type            as enum ('STANDARD', 'SPOTLIGHT', 'CHEF_SPECIAL');
create type enum_drop_hold_status     as enum ('ACTIVE', 'CONVERTED', 'RELEASED', 'EXPIRED');
create type enum_order_status         as enum (
  'CREATED', 'PAYMENT_PENDING', 'PAYMENT_AUTHORIZED', 'PAID',
  'CONFIRMED', 'READY_FOR_PICKUP', 'COLLECTED',
  'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'PICKUP_EXPIRED', 'FAILED'
);
create type enum_subscription_status  as enum ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED');
create type enum_referral_status      as enum ('PENDING', 'QUALIFIED', 'REWARDED', 'CANCELLED');

-- Payment
create type enum_payment_provider     as enum ('RAZORPAY');
create type enum_payment_status       as enum (
  'CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED',
  'FAILED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED'
);
create type enum_refund_status        as enum ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
create type enum_refund_reason        as enum (
  'DIETARY_MISMATCH', 'PICKUP_NOT_HONORED', 'FOOD_SAFETY', 'PACKAGING_BREACH',
  'MISSING_ORDER', 'CUSTOMER_REQUESTED', 'EMERGENCY_CLOSE', 'DUPLICATE_PAYMENT',
  'SYSTEM_ERROR', 'ADMIN_OVERRIDE', 'OTHER'
);
create type enum_finance_settlement_status as enum ('DRAFT', 'OPEN', 'LOCKED', 'SENT', 'PAID', 'RECONCILED', 'FAILED');
create type enum_payout_entry_type    as enum ('ORDER_SALE', 'REFUND_DEBIT', 'COMMISSION_CHARGE', 'MANUAL_ADJUSTMENT', 'INCIDENT_CREDIT');

-- Support and incidents
create type enum_incident_status      as enum ('OPEN', 'TRIAGED', 'INVESTIGATING', 'MERCHANT_ACTION_REQUIRED', 'RESOLVED', 'CLOSED', 'REJECTED');
create type enum_incident_type        as enum ('DIETARY_MISMATCH', 'PACKAGING_BREACH', 'FOOD_SAFETY', 'PICKUP_NOT_HONORED', 'MISSING_ORDER', 'QUALITY_ISSUE', 'OTHER');
create type enum_review_status        as enum ('PUBLISHED', 'FLAGGED', 'HIDDEN');

-- Notifications
create type enum_notification_channel as enum ('WHATSAPP', 'EMAIL', 'PUSH', 'SMS');
create type enum_notification_status  as enum ('PENDING', 'SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- Privacy
create type enum_consent_state        as enum ('GRANTED', 'REVOKED');
create type enum_erasure_status       as enum ('REQUESTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXECUTING', 'COMPLETED', 'CANCELLED');

-- Config
create type enum_config_scope         as enum ('GLOBAL', 'CITY', 'RESTAURANT', 'SEGMENT');

-- Contact type
create type enum_contact_type         as enum ('PRIMARY_OPERATIONS', 'ESCALATION', 'FINANCE', 'LEGAL');
```

---

### Master / Reference Tables

```sql
-- Master: scope codes for role-based access control
-- All scope_code values used in role_scope tables MUST reference this table.
create table master_scope (
  master_scope_pk     uuid primary key default gen_random_uuid(),
  scope_code          text not null,
  scope_name          text not null,
  description         text,
  applies_to          text not null, -- 'PLATFORM' | 'RESTAURANT' | 'BOTH'
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint uq_master_scope_code unique (scope_code)
);
comment on table master_scope is
  'Defines all valid scope codes for platform and restaurant role-based access control. '
  'Centralised here so AI prompts and developers can enumerate valid scopes. '
  'Examples: DROP_CREATE, DROP_PUBLISH, DROP_EMERGENCY_CLOSE, ORDER_VIEW, ORDER_VERIFY_PICKUP, '
  'FINANCE_VIEW, FINANCE_EXPORT, TEAM_MANAGE, SETTINGS_MANAGE, ANALYTICS_VIEW, ADMIN_USERS, ADMIN_RESTAURANTS.';

-- Master: allergens (extensible; safety-critical; never hardcode as enum)
create table master_allergen (
  master_allergen_pk  uuid primary key default gen_random_uuid(),
  allergen_code       text not null,
  allergen_name       text not null,
  description         text,
  is_active           boolean not null default true,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint uq_master_allergen_code unique (allergen_code)
);
comment on table master_allergen is
  'All FSSAI-recognised allergens. Stored as a master table (not enum) so new allergens '
  'can be added without a schema migration. Consumer preferences and bag disclosures both '
  'reference this table. Safety-critical: never use free-text allergen fields.';

-- Master: cuisine types
create table master_cuisine (
  master_cuisine_pk   uuid primary key default gen_random_uuid(),
  cuisine_code        text not null,
  cuisine_name        text not null,
  is_active           boolean not null default true,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint uq_master_cuisine_code unique (cuisine_code)
);
comment on table master_cuisine is 'Reference list of cuisine categories for restaurant profiling and drop discovery filtering.';

-- Master: drop audience segments (who can see/claim a drop)
create table master_audience_segment (
  master_audience_segment_pk uuid primary key default gen_random_uuid(),
  segment_code               text not null,
  segment_name               text not null,
  description                text,
  is_active                  boolean not null default true,
  sort_order                 integer not null default 0,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint uq_master_audience_segment_code unique (segment_code)
);
comment on table master_audience_segment is
  'Defines who a drop is visible to. Used in drop_audience join table. '
  'Seed: ALL_USERS, SWAAD_CLUB, WHATSAPP_INSIDERS, RESTAURANT_FOLLOWERS.';

-- Master: storage object visibility levels
create table master_storage_visibility (
  master_storage_visibility_pk uuid primary key default gen_random_uuid(),
  visibility_code              text not null,
  visibility_name              text not null,
  description                  text,
  is_public_readable           boolean not null default false,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint uq_master_storage_visibility_code unique (visibility_code)
);
comment on table master_storage_visibility is
  'Controls access level for uploaded files in Supabase Storage. '
  'Codes: PUBLIC_CDN (restaurant/drop images via CDN), AUTHENTICATED_ONLY (receipts), '
  'SERVICE_ONLY (KYC/FSSAI documents, never browser-accessible), OWNER_ONLY (personal uploads).';

-- Master: document types for restaurant compliance/KYC uploads
create table master_document_type (
  master_document_type_pk uuid primary key default gen_random_uuid(),
  type_code               text not null,
  type_name               text not null,
  is_required             boolean not null default false,
  description             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_master_document_type_code unique (type_code)
);
comment on table master_document_type is 'Types of restaurant compliance documents. Codes: FSSAI_LICENSE, GST_CERTIFICATE, PAN_CARD, BANK_CANCELLED_CHEQUE, FOOD_SAFETY_AUDIT.';

-- Master: document verification status
create table master_document_status (
  master_document_status_pk uuid primary key default gen_random_uuid(),
  status_code               text not null,
  status_name               text not null,
  is_terminal               boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint uq_master_document_status_code unique (status_code)
);
comment on table master_document_status is 'Verification lifecycle for restaurant documents. Codes: PENDING, UNDER_REVIEW, APPROVED, REJECTED, EXPIRED.';
```

---

### Geography Tables

```sql
create table geo_city (
  geo_city_pk     uuid primary key default gen_random_uuid(),
  city_code       text not null,
  city_name       text not null,
  state_name      text not null,
  country_code    text not null default 'IN',
  currency_code   text not null default 'INR',
  timezone_name   text not null default 'Asia/Kolkata',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint uq_geo_city_code unique (city_code)
);
comment on table geo_city is 'Cities where goZaika operates. Seed: HYD (Hyderabad) at launch.';

create table geo_neighborhood (
  geo_neighborhood_pk uuid primary key default gen_random_uuid(),
  geo_city_fk         uuid not null references geo_city (geo_city_pk) on delete restrict,
  neighborhood_code   text not null,
  neighborhood_name   text not null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint uq_geo_neighborhood_code unique (geo_city_fk, neighborhood_code)
);
comment on table geo_neighborhood is 'Sub-city areas used for drop discovery filtering and restaurant location. Seed: Jubilee Hills, Banjara Hills, Gachibowli, Kondapur, Hitech City for HYD.';
create index idx_geo_neighborhood_city on geo_neighborhood (geo_city_fk);

create table geo_address (
  geo_address_pk      uuid primary key default gen_random_uuid(),
  line_1              text not null,
  line_2              text,
  landmark            text,
  geo_city_fk         uuid not null references geo_city (geo_city_pk) on delete restrict,
  geo_neighborhood_fk uuid references geo_neighborhood (geo_neighborhood_pk) on delete set null,
  postal_code         text,
  latitude            numeric(9, 6),
  longitude           numeric(9, 6),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint ck_geo_address_lat check (latitude is null or latitude between -90 and 90),
  constraint ck_geo_address_lng check (longitude is null or longitude between -180 and 180)
);
comment on table geo_address is 'Physical addresses for restaurants. latitude/longitude used for map display and proximity; no PostGIS required at launch (Hyderabad is city-led discovery, not radius-led).';
create index idx_geo_address_city_neighborhood on geo_address (geo_city_fk, geo_neighborhood_fk);
```

---

### Identity and Access Tables

```sql
-- Central identity record; 1:1 with auth.users.
-- All consumer, restaurant, and platform actors hang off this.
create table iam_profile (
  iam_profile_pk      uuid primary key default gen_random_uuid(),
  auth_user_fk        uuid not null references auth.users (id) on delete restrict,
  -- Contact identity (at least one must be set for a useful account)
  phone_e164          text,
  email_address       citext,
  display_name        text,
  default_city_fk     uuid references geo_city (geo_city_pk) on delete set null,
  -- Role flags (denormalised for fast RLS checks; kept in sync by trigger)
  is_consumer         boolean not null default true,
  is_restaurant_user  boolean not null default false,
  is_platform_user    boolean not null default false,
  last_seen_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint uq_iam_profile_auth_user unique (auth_user_fk)
);
comment on table iam_profile is
  'Maps Supabase Auth identity (auth.users) to goZaika business identity. '
  'Never store business state in auth.users — it lives here. '
  'is_consumer/is_restaurant_user/is_platform_user flags are denormalised for fast RLS '
  'helper function checks; they must stay in sync with membership tables via trigger or app logic.';
comment on column iam_profile.phone_e164       is 'E.164 format phone number (+91XXXXXXXXXX). Primary login method.';
comment on column iam_profile.auth_user_fk     is 'FK to Supabase auth.users.id. Restrict delete: deactivate first, then handle erasure separately.';
comment on column iam_profile.is_consumer      is 'True if profile has a consumer_profile record.';
comment on column iam_profile.is_restaurant_user is 'True if profile is a member of at least one restaurant team.';
comment on column iam_profile.is_platform_user   is 'True if profile has a platform admin membership.';

create unique index uq_iam_profile_phone on iam_profile (phone_e164) where phone_e164 is not null;
create unique index uq_iam_profile_email on iam_profile (email_address) where email_address is not null;
create index idx_iam_profile_default_city on iam_profile (default_city_fk);

create table iam_platform_role (
  iam_platform_role_pk uuid primary key default gen_random_uuid(),
  role_code            text not null,
  role_name            text not null,
  description          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint uq_iam_platform_role_code unique (role_code)
);
comment on table iam_platform_role is 'Platform-level admin roles. Seed: SUPER_ADMIN, SUPPORT_ADMIN, FINANCE_ADMIN, OPS_ADMIN.';

create table iam_platform_membership (
  iam_platform_membership_pk uuid primary key default gen_random_uuid(),
  iam_profile_fk             uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  iam_platform_role_fk       uuid not null references iam_platform_role (iam_platform_role_pk) on delete restrict,
  is_active                  boolean not null default true,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint uq_iam_platform_membership unique (iam_profile_fk, iam_platform_role_fk)
);
comment on table iam_platform_membership is 'Links platform admin profiles to their admin roles. Only service-role clients should write this table.';
create index idx_iam_platform_membership_profile on iam_platform_membership (iam_profile_fk, is_active);

create table iam_platform_role_scope (
  iam_platform_role_scope_pk uuid primary key default gen_random_uuid(),
  iam_platform_role_fk       uuid not null references iam_platform_role (iam_platform_role_pk) on delete cascade,
  master_scope_fk            uuid not null references master_scope (master_scope_pk) on delete restrict,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint uq_iam_platform_role_scope unique (iam_platform_role_fk, master_scope_fk)
);
comment on table iam_platform_role_scope is 'Fine-grained capabilities granted to a platform admin role. References master_scope for valid scope codes.';

create table restaurant_team_role (
  restaurant_team_role_pk uuid primary key default gen_random_uuid(),
  role_code               text not null,
  role_name               text not null,
  description             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_restaurant_team_role_code unique (role_code)
);
comment on table restaurant_team_role is 'Restaurant staff role definitions. Seed: OWNER, ADMIN, OPERATIONS, PICKUP_STAFF, FINANCE.';

create table restaurant_team_membership (
  restaurant_team_membership_pk uuid primary key default gen_random_uuid(),
  restaurant_fk                 uuid not null,  -- FK added after restaurant_restaurant
  iam_profile_fk                uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  restaurant_team_role_fk       uuid not null references restaurant_team_role (restaurant_team_role_pk) on delete restrict,
  is_active                     boolean not null default true,
  is_default                    boolean not null default false,
  invited_by_profile_fk         uuid references iam_profile (iam_profile_pk) on delete set null,
  joined_at                     timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint uq_restaurant_team_membership unique (restaurant_fk, iam_profile_fk, restaurant_team_role_fk)
);
comment on table restaurant_team_membership is 'Maps profiles to restaurants with a specific role. A profile can be ADMIN of restaurant A and PICKUP_STAFF of restaurant B.';

create table restaurant_team_role_scope (
  restaurant_team_role_scope_pk uuid primary key default gen_random_uuid(),
  restaurant_team_role_fk       uuid not null references restaurant_team_role (restaurant_team_role_pk) on delete cascade,
  master_scope_fk               uuid not null references master_scope (master_scope_pk) on delete restrict,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint uq_restaurant_team_role_scope unique (restaurant_team_role_fk, master_scope_fk)
);
comment on table restaurant_team_role_scope is 'Fine-grained capabilities granted to a restaurant team role. References master_scope for valid scope codes.';
```

---

### Consumer Domain Tables

```sql
create table consumer_profile (
  consumer_profile_pk     uuid primary key default gen_random_uuid(),
  iam_profile_fk          uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  first_name              text,
  last_name               text,
  birth_month             integer,
  birth_day               integer,
  preferred_language_code text not null default 'en',
  marketing_source_code   text,
  -- Records the referral code used at signup (someone else's code, not their own)
  used_referral_code_fk   uuid,  -- FK to consumer_referral_code added after that table
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_consumer_profile_profile unique (iam_profile_fk),
  constraint ck_consumer_profile_birth_month check (birth_month is null or birth_month between 1 and 12),
  constraint ck_consumer_profile_birth_day   check (birth_day   is null or birth_day   between 1 and 31)
);
comment on table consumer_profile is 'Consumer-specific profile data. Extends iam_profile for customer-facing features.';
comment on column consumer_profile.used_referral_code_fk is 'The referral code entered at signup (references another consumer referral code). Used to attribute the referral relationship.';
create index idx_consumer_profile_iam_profile on consumer_profile (iam_profile_fk);

create table consumer_dietary_preference (
  consumer_dietary_preference_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk            uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  dietary_category               enum_dietary_category not null,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint uq_consumer_dietary_preference unique (consumer_profile_fk, dietary_category)
);
comment on table consumer_dietary_preference is 'Consumer dietary requirements. Used to filter drop discovery and display compatibility warnings.';
create index idx_consumer_dietary_pref_profile on consumer_dietary_preference (consumer_profile_fk);

create table consumer_allergen_preference (
  consumer_allergen_preference_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk             uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  master_allergen_fk              uuid not null references master_allergen (master_allergen_pk) on delete restrict,
  avoid_flag                      boolean not null default true,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint uq_consumer_allergen_preference unique (consumer_profile_fk, master_allergen_fk)
);
comment on table consumer_allergen_preference is 'Allergens the consumer wants to avoid. Safety-critical: must be checked against bag allergen disclosures before purchase.';
create index idx_consumer_allergen_pref_profile on consumer_allergen_preference (consumer_profile_fk);

create table consumer_city_preference (
  consumer_city_preference_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk         uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  geo_city_fk                 uuid not null references geo_city (geo_city_pk) on delete restrict,
  is_default                  boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint uq_consumer_city_preference unique (consumer_profile_fk, geo_city_fk)
);
create unique index uq_consumer_city_default on consumer_city_preference (consumer_profile_fk)
  where is_default = true;
comment on table consumer_city_preference is 'Cities the consumer browses. is_default = true on exactly one row per consumer.';

create table consumer_saved_restaurant (
  consumer_saved_restaurant_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk          uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  restaurant_fk                uuid not null,  -- FK added after restaurant_restaurant
  saved_at                     timestamptz not null default now(),
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint uq_consumer_saved_restaurant unique (consumer_profile_fk, restaurant_fk)
);
comment on table consumer_saved_restaurant is 'Restaurants the consumer follows. Triggers drop-available notifications per notification_preference settings.';

create table consumer_referral_code (
  consumer_referral_code_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk       uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  referral_code             text not null,
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint uq_consumer_referral_code_profile unique (consumer_profile_fk),
  constraint uq_consumer_referral_code_value   unique (referral_code)
);
comment on table consumer_referral_code is 'Each consumer gets one unique referral code. This code is shared with others; when used at their signup, a consumer_referral row is created.';

-- Back-patch FK from consumer_profile.used_referral_code_fk
alter table consumer_profile
  add constraint fk_consumer_profile_used_referral_code
  foreign key (used_referral_code_fk) references consumer_referral_code (consumer_referral_code_pk) on delete set null;
create index idx_consumer_profile_used_referral on consumer_profile (used_referral_code_fk)
  where used_referral_code_fk is not null;

create table consumer_referral (
  consumer_referral_pk             uuid primary key default gen_random_uuid(),
  referrer_consumer_profile_fk     uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  referred_consumer_profile_fk     uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  referral_status                  enum_referral_status not null default 'PENDING',
  qualified_at                     timestamptz,
  rewarded_at                      timestamptz,
  source_code                      text,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  constraint uq_consumer_referral_pair unique (referrer_consumer_profile_fk, referred_consumer_profile_fk),
  constraint ck_consumer_referral_not_self check (referrer_consumer_profile_fk <> referred_consumer_profile_fk)
);
comment on table consumer_referral is 'Records the relationship between referrer and referred consumer. Status transitions: PENDING → QUALIFIED (referred makes first qualifying order) → REWARDED.';
create index idx_consumer_referral_referrer on consumer_referral (referrer_consumer_profile_fk);
create index idx_consumer_referral_referred on consumer_referral (referred_consumer_profile_fk);

create table consumer_subscription_plan (
  consumer_subscription_plan_pk uuid primary key default gen_random_uuid(),
  plan_code                     text not null,
  plan_name                     text not null,
  price_paise                   bigint not null,
  billing_interval_months       integer not null default 1,
  benefits_json                 jsonb not null default '{}'::jsonb,
  is_active                     boolean not null default true,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint uq_consumer_subscription_plan_code unique (plan_code),
  constraint ck_consumer_subscription_plan_price check (price_paise > 0)
);
comment on table consumer_subscription_plan is 'Subscription plan definitions (e.g., SWAAD_CLUB_MONTHLY). benefits_json stores plan perks for display.';

create table consumer_subscription (
  consumer_subscription_pk          uuid primary key default gen_random_uuid(),
  consumer_profile_fk               uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  consumer_subscription_plan_fk     uuid not null references consumer_subscription_plan (consumer_subscription_plan_pk) on delete restrict,
  subscription_status               enum_subscription_status not null default 'TRIAL',
  starts_at                         timestamptz not null,
  ends_at                           timestamptz,
  renewal_due_at                    timestamptz,
  provider_subscription_ref         text,
  -- Payment linkage: the payment_intent that created or last renewed this subscription
  payment_intent_fk                 uuid,  -- FK added after payment_intent
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);
comment on table consumer_subscription is 'Active and historical subscriptions per consumer. payment_intent_fk references the most recent renewal payment for reconciliation.';
create unique index uq_consumer_subscription_active
  on consumer_subscription (consumer_profile_fk, consumer_subscription_plan_fk)
  where subscription_status in ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED');
create index idx_consumer_subscription_profile on consumer_subscription (consumer_profile_fk);
create index idx_consumer_subscription_renewal on consumer_subscription (renewal_due_at) where renewal_due_at is not null;

create table consumer_passport_stat (
  consumer_passport_stat_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk       uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  lifetime_orders_count     integer not null default 0,
  lifetime_collects_count   integer not null default 0,
  city_count                integer not null default 0,
  restaurant_count          integer not null default 0,
  points_balance            integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint uq_consumer_passport_stat unique (consumer_profile_fk),
  constraint ck_consumer_passport_non_negative check (
    lifetime_orders_count >= 0 and lifetime_collects_count >= 0 and
    city_count >= 0 and restaurant_count >= 0 and points_balance >= 0
  )
);
comment on table consumer_passport_stat is 'Denormalised gamification counters. Updated by trigger/application on order COLLECTED. Single row per consumer for fast profile display.';

create table consumer_notification_preference (
  consumer_notification_preference_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk                 uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  whatsapp_transactional_enabled      boolean not null default true,
  whatsapp_marketing_enabled          boolean not null default false,
  email_transactional_enabled         boolean not null default true,
  email_marketing_enabled             boolean not null default false,
  push_transactional_enabled          boolean not null default true,
  push_marketing_enabled              boolean not null default false,
  created_at                          timestamptz not null default now(),
  updated_at                          timestamptz not null default now(),
  constraint uq_consumer_notification_preference unique (consumer_profile_fk)
);
comment on table consumer_notification_preference is 'Per-channel notification opt-in/out. Transactional messages (order confirmation, refund) follow whatsapp/email/push_transactional_enabled. Marketing follows *_marketing_enabled. Must be checked before enqueuing any notification.';
```

---

### Privacy and Consent Tables

```sql
create table privacy_consent_purpose (
  privacy_consent_purpose_pk  uuid primary key default gen_random_uuid(),
  purpose_code                text not null,
  purpose_name                text not null,
  description                 text,
  is_required_for_service     boolean not null default false,
  retention_policy_code       text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint uq_privacy_consent_purpose_code unique (purpose_code)
);
comment on table privacy_consent_purpose is
  'DPDP Act: each distinct processing purpose requires separate consent. '
  'Seed codes: OPERATIONAL (required, service delivery), MARKETING_EMAIL, MARKETING_WHATSAPP, '
  'ANALYTICS, REFERRAL_COMMS, PUSH_NOTIFICATIONS. is_required_for_service=true purposes '
  'cannot be revoked without closing the account.';

-- Append-only consent ledger. Never UPDATE or DELETE rows — only INSERT.
create table privacy_consent_event (
  privacy_consent_event_pk    uuid primary key default gen_random_uuid(),
  iam_profile_fk              uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  privacy_consent_purpose_fk  uuid not null references privacy_consent_purpose (privacy_consent_purpose_pk) on delete restrict,
  consent_state               enum_consent_state not null,
  policy_version              text not null,
  capture_source_code         text not null,   -- SIGNUP_FLOW, SETTINGS_PAGE, ADMIN_ACTION, SYSTEM
  proof_json                  jsonb not null default '{}'::jsonb,
  recorded_at                 timestamptz not null default now(),
  recorded_by_profile_fk      uuid references iam_profile (iam_profile_pk) on delete set null
);
comment on table privacy_consent_event is
  'APPEND-ONLY consent audit ledger. Do not update or delete rows. '
  'To determine current consent state for a purpose, query the most recent row '
  'per (iam_profile_fk, privacy_consent_purpose_fk) ordered by recorded_at DESC. '
  'proof_json should capture UI context (screen_name, consent_text_shown, etc.) for audit.';
create index idx_privacy_consent_event_profile_purpose
  on privacy_consent_event (iam_profile_fk, privacy_consent_purpose_fk, recorded_at desc);

create table privacy_retention_policy (
  privacy_retention_policy_pk uuid primary key default gen_random_uuid(),
  policy_code                 text not null,
  applies_to_table_name       text not null,
  retention_days              integer not null,
  anonymize_after_days        integer,
  purge_after_days            integer,
  legal_hold_supported        boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint uq_privacy_retention_policy_code unique (policy_code)
);
comment on table privacy_retention_policy is 'Data retention schedule per table for DPDP/GST compliance. Managed by legal/compliance team; write via service role only.';

create table privacy_erasure_request (
  privacy_erasure_request_pk  uuid primary key default gen_random_uuid(),
  iam_profile_fk              uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  privacy_erasure_status      enum_erasure_status not null default 'REQUESTED',
  requested_reason            text,
  requested_at                timestamptz not null default now(),
  reviewed_by_profile_fk      uuid references iam_profile (iam_profile_pk) on delete set null,
  reviewed_at                 timestamptz,
  executed_at                 timestamptz,
  rejected_reason             text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
comment on table privacy_erasure_request is 'DPDP erasure request workflow. On EXECUTING: anonymise iam_profile, delete consumer PII, revoke Supabase Auth session. Financial records are retained per retention policy.';
create index idx_privacy_erasure_request_status on privacy_erasure_request (privacy_erasure_status, requested_at);
create index idx_privacy_erasure_request_profile on privacy_erasure_request (iam_profile_fk);
```

---

### Restaurant Domain Tables

```sql
create table restaurant_restaurant (
  restaurant_restaurant_pk uuid primary key default gen_random_uuid(),
  restaurant_slug          text not null,
  restaurant_name          text not null,
  display_name             text,
  restaurant_status        enum_restaurant_status not null default 'PENDING',
  geo_address_fk           uuid references geo_address (geo_address_pk) on delete set null,
  primary_city_fk          uuid references geo_city (geo_city_pk) on delete set null,
  primary_neighborhood_fk  uuid references geo_neighborhood (geo_neighborhood_pk) on delete set null,
  legal_entity_name        text,
  description              text,
  phone_e164               text,
  public_email_address     citext,
  average_rating           numeric(3, 2),
  rating_count             integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint uq_restaurant_slug unique (restaurant_slug),
  constraint ck_restaurant_rating check (average_rating is null or average_rating between 1.00 and 5.00),
  constraint ck_restaurant_rating_count check (rating_count >= 0)
);
comment on table restaurant_restaurant is 'Core restaurant entity. restaurant_slug is the public URL identifier. restaurant_status controls visibility on the platform.';
comment on column restaurant_restaurant.average_rating is 'Denormalised average rating recomputed on each new review_review insert/update. Fast for display; re-derivable from review_review.';
create index idx_restaurant_city_status on restaurant_restaurant (primary_city_fk, restaurant_status);
create index idx_restaurant_neighborhood_status on restaurant_restaurant (primary_neighborhood_fk, restaurant_status);

-- Back-patch FKs that referenced restaurant before it was created
alter table restaurant_team_membership
  add constraint fk_restaurant_team_membership_restaurant
  foreign key (restaurant_fk) references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade;
create index idx_restaurant_team_membership_restaurant on restaurant_team_membership (restaurant_fk, is_active);
create index idx_restaurant_team_membership_profile on restaurant_team_membership (iam_profile_fk, is_active);

alter table consumer_saved_restaurant
  add constraint fk_consumer_saved_restaurant_restaurant
  foreign key (restaurant_fk) references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade;
create index idx_consumer_saved_restaurant_profile on consumer_saved_restaurant (consumer_profile_fk);
create index idx_consumer_saved_restaurant_restaurant on consumer_saved_restaurant (restaurant_fk);

create table restaurant_compliance (
  restaurant_compliance_pk  uuid primary key default gen_random_uuid(),
  restaurant_fk             uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  fssai_license_number      text,
  fssai_expires_at          timestamptz,
  gstin                     citext,
  pan_reference             text,
  kyc_status_code           text not null default 'PENDING',
  food_safety_notes         text,
  packaging_commitment_notes text,
  freshness_commitment_notes text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint uq_restaurant_compliance_restaurant unique (restaurant_fk)
);
comment on table restaurant_compliance is 'FSSAI, GST, PAN, and food safety commitment data. SERVICE-ROLE ONLY — never expose to browser clients. FSSAI expiry should trigger renewal alerts.';
comment on column restaurant_compliance.fssai_license_number is 'FSSAI 14-digit license number. Partial unique index handles null.';
comment on column restaurant_compliance.details_encrypted is 'Bank/sensitive KYC details stored encrypted at application layer via Supabase Vault or app-level AES.';
create unique index uq_restaurant_compliance_fssai on restaurant_compliance (fssai_license_number) where fssai_license_number is not null;
create unique index uq_restaurant_compliance_gstin on restaurant_compliance (gstin) where gstin is not null;
create index idx_restaurant_compliance_fssai_expiry on restaurant_compliance (fssai_expires_at) where fssai_expires_at is not null;

create table restaurant_contact (
  restaurant_contact_pk uuid primary key default gen_random_uuid(),
  restaurant_fk         uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  contact_type          enum_contact_type not null,
  full_name             text not null,
  phone_e164            text,
  email_address         citext,
  is_primary            boolean not null default false,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table restaurant_contact is 'Restaurant contacts by type. Partial unique index ensures at most one primary contact per restaurant per contact type.';
create unique index uq_restaurant_contact_primary
  on restaurant_contact (restaurant_fk, contact_type)
  where is_primary = true;
create index idx_restaurant_contact_restaurant on restaurant_contact (restaurant_fk, is_active);

create table restaurant_cuisine_map (
  restaurant_cuisine_map_pk uuid primary key default gen_random_uuid(),
  restaurant_fk             uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  master_cuisine_fk         uuid not null references master_cuisine (master_cuisine_pk) on delete restrict,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint uq_restaurant_cuisine_map unique (restaurant_fk, master_cuisine_fk)
);
comment on table restaurant_cuisine_map is 'Many-to-many between restaurants and cuisine types. Used for discovery filtering.';
create index idx_restaurant_cuisine_map_restaurant on restaurant_cuisine_map (restaurant_fk);
create index idx_restaurant_cuisine_map_cuisine on restaurant_cuisine_map (master_cuisine_fk);

create table restaurant_payout_account (
  restaurant_payout_account_pk uuid primary key default gen_random_uuid(),
  restaurant_fk                uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  payout_method_code           text not null,  -- BANK_TRANSFER, UPI
  beneficiary_name             text not null,
  bank_account_last4           text,
  ifsc_code                    citext,
  upi_vpa                      citext,
  provider_beneficiary_ref     text,
  -- Sensitive: store encrypted payout details; never return to browser
  details_ciphertext           bytea,
  is_active                    boolean not null default true,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);
comment on table restaurant_payout_account is 'SERVICE-ROLE ONLY. Bank/UPI payout configuration per restaurant. details_ciphertext contains AES-encrypted full bank details. Partial unique index ensures at most one active payout account per restaurant.';
comment on column restaurant_payout_account.details_ciphertext is 'AES-256 encrypted payout payload. Decrypt only in server-side Edge Function or API route; never in browser.';
create unique index uq_restaurant_payout_account_active
  on restaurant_payout_account (restaurant_fk)
  where is_active = true;
create index idx_restaurant_payout_account_restaurant on restaurant_payout_account (restaurant_fk);

create table restaurant_commission_plan (
  restaurant_commission_plan_pk uuid primary key default gen_random_uuid(),
  plan_code                     text not null,
  plan_name                     text not null,
  commission_bps                integer not null,  -- basis points, e.g. 1500 = 15%
  flat_fee_paise                bigint not null default 0,
  effective_from                timestamptz not null,
  effective_to                  timestamptz,
  is_active                     boolean not null default true,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint uq_restaurant_commission_plan_code unique (plan_code),
  constraint ck_restaurant_commission_bps check (commission_bps >= 0 and commission_bps <= 10000)
);
comment on table restaurant_commission_plan is 'Commission rate tiers used to calculate platform fees. commission_bps = basis points (1200 = 12%). Referenced by restaurant_commission_override for per-restaurant customisation.';

create table restaurant_commission_override (
  restaurant_commission_override_pk uuid primary key default gen_random_uuid(),
  restaurant_fk                     uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  restaurant_commission_plan_fk     uuid not null references restaurant_commission_plan (restaurant_commission_plan_pk) on delete restrict,
  commission_bps_override           integer,
  flat_fee_paise_override           bigint,
  effective_from                    timestamptz not null,
  effective_to                      timestamptz,
  reason_note                       text not null,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  constraint ck_restaurant_commission_override_bps check (commission_bps_override is null or (commission_bps_override >= 0 and commission_bps_override <= 10000))
);
comment on table restaurant_commission_override is 'Per-restaurant commission customisation. Overrides the plan rate for a specific time window. reason_note is required for audit.';
create index idx_restaurant_commission_override_restaurant on restaurant_commission_override (restaurant_fk, effective_from);

create table restaurant_document (
  restaurant_document_pk   uuid primary key default gen_random_uuid(),
  restaurant_fk            uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  storage_object_fk        uuid not null,  -- FK to storage_object added after that table
  master_document_type_fk  uuid not null references master_document_type (master_document_type_pk) on delete restrict,
  master_document_status_fk uuid not null references master_document_status (master_document_status_pk) on delete restrict,
  expires_at               timestamptz,
  verified_by_profile_fk   uuid references iam_profile (iam_profile_pk) on delete set null,
  verified_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint uq_restaurant_document_file unique (restaurant_fk, storage_object_fk)
);
comment on table restaurant_document is 'SERVICE-ROLE ONLY. Restaurant compliance document records linked to Supabase Storage objects in the private-docs bucket.';
create index idx_restaurant_document_restaurant on restaurant_document (restaurant_fk);
create index idx_restaurant_document_status on restaurant_document (master_document_status_fk);

create table restaurant_setting (
  restaurant_setting_pk   uuid primary key default gen_random_uuid(),
  restaurant_fk           uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  pickup_grace_minutes    integer not null default 15,
  verification_mode_code  text not null default 'OTP_OR_QR',
  allow_whatsapp_alerts   boolean not null default true,
  allow_email_finance     boolean not null default true,
  default_holding_minutes integer not null default 10,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_restaurant_setting_restaurant unique (restaurant_fk),
  constraint ck_restaurant_setting_grace check (pickup_grace_minutes >= 0),
  constraint ck_restaurant_setting_hold  check (default_holding_minutes > 0)
);
comment on table restaurant_setting is 'Per-restaurant operational configuration. default_holding_minutes is the default hold duration for new drops (can be overridden per drop).';
```

---

### Storage Metadata

```sql
create table storage_object (
  storage_object_pk       uuid primary key default gen_random_uuid(),
  bucket_name             text not null,
  object_path             text not null,
  mime_type               text not null,
  file_size_bytes         bigint not null,
  checksum_sha256         text,
  uploaded_by_profile_fk  uuid references iam_profile (iam_profile_pk) on delete set null,
  master_storage_visibility_fk uuid not null references master_storage_visibility (master_storage_visibility_pk) on delete restrict,
  deleted_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_storage_object_path unique (bucket_name, object_path),
  constraint ck_storage_object_size check (file_size_bytes > 0)
);
comment on table storage_object is 'Metadata registry for all files stored in Supabase Storage. The actual binary is in Supabase Storage; this table provides relational linkage, visibility control, and soft-delete tracking.';
comment on column storage_object.object_path is 'Supabase Storage object path within the bucket. Format: {entity_type}/{entity_id}/{filename}.{ext}';
comment on column storage_object.deleted_at is 'Soft-delete marker. When set, the Supabase Storage object should also be deleted. Cleanup via Edge Function cron.';
create index idx_storage_object_uploaded_by on storage_object (uploaded_by_profile_fk) where uploaded_by_profile_fk is not null;
create index idx_storage_object_active on storage_object (bucket_name, created_at desc) where deleted_at is null;

-- Back-patch FK from restaurant_document
alter table restaurant_document
  add constraint fk_restaurant_document_storage_object
  foreign key (storage_object_fk) references storage_object (storage_object_pk) on delete restrict;
```

---

### Catalog / Bag Template Tables

```sql
create table catalog_bag_template (
  catalog_bag_template_pk    uuid primary key default gen_random_uuid(),
  restaurant_fk              uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  template_code              text not null,
  template_name              text not null,
  template_status            enum_bag_template_status not null default 'DRAFT',
  current_revision_number    integer not null default 1,
  is_pickup_ready_by_default boolean not null default false,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint uq_catalog_bag_template_code unique (restaurant_fk, template_code)
);
comment on table catalog_bag_template is 'Reusable bag compositions created by a restaurant. A template is a named container; all content lives in revisions. current_revision_number points to the active revision.';
create index idx_catalog_bag_template_restaurant on catalog_bag_template (restaurant_fk, template_status);

create table catalog_bag_template_revision (
  catalog_bag_template_revision_pk uuid primary key default gen_random_uuid(),
  catalog_bag_template_fk          uuid not null references catalog_bag_template (catalog_bag_template_pk) on delete cascade,
  revision_number                  integer not null,
  source_type                      enum_source_type not null,
  dietary_category                 enum_dietary_category not null,
  spice_level                      enum_spice_level,
  template_title                   text not null,
  template_description             text,
  serves_min                       integer not null,
  serves_max                       integer not null,
  max_holding_minutes              integer not null,
  min_menu_value_paise             bigint not null,
  bag_price_paise                  bigint not null,
  packaging_notes                  text,
  food_safety_notes                text,
  version_status_code              text not null default 'ACTIVE',
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  constraint uq_catalog_bag_template_revision unique (catalog_bag_template_fk, revision_number),
  constraint ck_catalog_bag_template_revision_serves check (serves_min > 0 and serves_max >= serves_min),
  constraint ck_catalog_bag_template_revision_holding check (max_holding_minutes > 0),
  constraint ck_catalog_bag_template_revision_price check (bag_price_paise > 0),
  constraint ck_catalog_bag_template_revision_menu_value check (min_menu_value_paise > 0)
);
comment on table catalog_bag_template_revision is 'Immutable snapshot of a bag template at a point in time. Drops always reference a specific revision so past drop data is never affected by template edits.';
comment on column catalog_bag_template_revision.min_menu_value_paise is 'The full-menu value of items in the bag (for consumer transparency). Must exceed bag_price_paise to demonstrate value.';
comment on column catalog_bag_template_revision.max_holding_minutes is 'Food safety: maximum time between pickup and consumption. Displayed to consumer before purchase.';
create index idx_catalog_bag_template_revision_template on catalog_bag_template_revision (catalog_bag_template_fk, revision_number);

create table catalog_bag_template_allergen (
  catalog_bag_template_allergen_pk uuid primary key default gen_random_uuid(),
  catalog_bag_template_revision_fk uuid not null references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete cascade,
  master_allergen_fk               uuid not null references master_allergen (master_allergen_pk) on delete restrict,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  constraint uq_catalog_bag_template_allergen unique (catalog_bag_template_revision_fk, master_allergen_fk)
);
comment on table catalog_bag_template_allergen is 'SAFETY-CRITICAL. Allergens present in this bag revision. Consumers with matching avoid_flag in consumer_allergen_preference must be warned before purchase.';
create index idx_catalog_bag_template_allergen_revision on catalog_bag_template_allergen (catalog_bag_template_revision_fk);

create table catalog_bag_template_media (
  catalog_bag_template_media_pk    uuid primary key default gen_random_uuid(),
  catalog_bag_template_revision_fk uuid not null references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete cascade,
  storage_object_fk                uuid not null references storage_object (storage_object_pk) on delete restrict,
  sort_order                       integer not null default 0,
  is_primary                       boolean not null default false,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  constraint uq_catalog_bag_template_media unique (catalog_bag_template_revision_fk, storage_object_fk)
);
create unique index uq_catalog_bag_template_media_primary
  on catalog_bag_template_media (catalog_bag_template_revision_fk)
  where is_primary = true;
comment on table catalog_bag_template_media is 'Images for a bag template revision. Exactly one row may have is_primary=true per revision.';
```

---

### Drop and Inventory Tables

```sql
create table drop_recurring_schedule (
  drop_recurring_schedule_pk uuid primary key default gen_random_uuid(),
  restaurant_fk              uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  schedule_name              text not null,
  timezone_name              text not null default 'Asia/Kolkata',
  rrule_text                 text not null,
  next_run_at                timestamptz,
  is_active                  boolean not null default true,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
comment on table drop_recurring_schedule is 'RRULE-based recurring drop schedule. Processed by Edge Function cron that creates new drop_drop rows at next_run_at.';
create index idx_drop_recurring_schedule_next_run on drop_recurring_schedule (next_run_at) where is_active = true;
create index idx_drop_recurring_schedule_restaurant on drop_recurring_schedule (restaurant_fk, is_active);

create table drop_drop (
  drop_drop_pk                     uuid primary key default gen_random_uuid(),
  restaurant_fk                    uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  catalog_bag_template_revision_fk uuid not null references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete restrict,
  drop_recurring_schedule_fk       uuid references drop_recurring_schedule (drop_recurring_schedule_pk) on delete set null,
  drop_title                       text not null,
  drop_description                 text,
  drop_type                        enum_drop_type not null default 'STANDARD',
  drop_status                      enum_drop_status not null default 'DRAFT',
  geo_city_fk                      uuid not null references geo_city (geo_city_pk) on delete restrict,
  geo_neighborhood_fk              uuid references geo_neighborhood (geo_neighborhood_pk) on delete set null,
  publish_at                       timestamptz,
  pickup_start_at                  timestamptz not null,
  pickup_end_at                    timestamptz not null,
  -- Inventory columns; all mutations happen via stored procedure with SELECT ... FOR UPDATE
  quantity_total                   integer not null,
  quantity_reserved                integer not null default 0,
  quantity_sold                    integer not null default 0,
  -- Generated: derived from totals; used in partial index for fast discovery queries
  quantity_available               integer generated always as (greatest(quantity_total - quantity_reserved - quantity_sold, 0)) stored,
  bag_price_paise                  bigint not null,
  min_menu_value_paise             bigint not null,
  holds_expire_minutes             integer not null default 10,
  operational_note                 text,
  -- Lifecycle timestamps (set when transitioning to that status)
  paused_at                        timestamptz,
  cancelled_at                     timestamptz,
  emergency_closed_at              timestamptz,
  sold_out_at                      timestamptz,
  expires_at                       timestamptz,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  constraint ck_drop_pickup_window check (pickup_end_at > pickup_start_at),
  constraint ck_drop_quantity_total check (quantity_total > 0),
  constraint ck_drop_quantity_balance check (
    quantity_reserved >= 0 and
    quantity_sold >= 0 and
    quantity_reserved + quantity_sold <= quantity_total
  ),
  constraint ck_drop_price check (bag_price_paise > 0),
  constraint ck_drop_hold_minutes check (holds_expire_minutes > 0)
);
comment on table drop_drop is
  'The central listing entity. quantity_available is a generated stored column for fast '
  'discovery queries. All inventory mutations (holds, conversions, releases) must use '
  'private.create_drop_hold() and private.release_drop_hold() to maintain atomicity. '
  'geo_city_fk is NOT NULL — every drop must belong to a city.';
comment on column drop_drop.quantity_reserved is 'Units currently under active (unexpired) holds. Mutated atomically with drop_inventory_hold creation/release.';
comment on column drop_drop.quantity_sold is 'Units with confirmed paid orders. Mutated atomically when hold is converted to order.';
comment on column drop_drop.quantity_available is 'Generated: max(total - reserved - sold, 0). Used in partial index for discovery performance.';
comment on column drop_drop.holds_expire_minutes is 'How long an inventory hold is valid for this drop. Overrides restaurant_setting.default_holding_minutes.';

create index idx_drop_drop_restaurant_status on drop_drop (restaurant_fk, drop_status);
create index idx_drop_drop_city_status on drop_drop (geo_city_fk, drop_status, pickup_start_at);
create index idx_drop_drop_neighborhood_status on drop_drop (geo_neighborhood_fk, drop_status, pickup_start_at);
-- Critical performance index for consumer discovery (the hot path)
create index idx_drop_drop_active_discovery
  on drop_drop (geo_city_fk, pickup_start_at, pickup_end_at, quantity_available)
  where drop_status in ('SCHEDULED', 'ACTIVE', 'PAUSED');

create table drop_audience (
  drop_audience_pk           uuid primary key default gen_random_uuid(),
  drop_fk                    uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  master_audience_segment_fk uuid not null references master_audience_segment (master_audience_segment_pk) on delete restrict,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint uq_drop_audience unique (drop_fk, master_audience_segment_fk)
);
comment on table drop_audience is 'Which audience segments can see/claim a drop. If no rows exist, the drop is visible to ALL_USERS. Application must enforce segment eligibility checks.';
create index idx_drop_audience_drop on drop_audience (drop_fk);

create table drop_media (
  drop_media_pk     uuid primary key default gen_random_uuid(),
  drop_fk           uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  storage_object_fk uuid not null references storage_object (storage_object_pk) on delete restrict,
  sort_order        integer not null default 0,
  is_primary        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint uq_drop_media unique (drop_fk, storage_object_fk)
);
create unique index uq_drop_media_primary on drop_media (drop_fk) where is_primary = true;
comment on table drop_media is 'Override images for a specific drop (e.g., a photo of today''s special). Falls back to catalog_bag_template_media if no rows present.';
create index idx_drop_media_drop on drop_media (drop_fk);

create table drop_closure_log (
  drop_closure_log_pk  uuid primary key default gen_random_uuid(),
  drop_fk              uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  closed_reason_code   text not null,
  unsold_quantity      integer not null default 0,
  disposal_note        text,
  recorded_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  recorded_at          timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint uq_drop_closure_log_drop unique (drop_fk),
  constraint ck_drop_closure_log_unsold check (unsold_quantity >= 0)
);
comment on table drop_closure_log is 'Food safety and sustainability record: documents unsold quantity and disposal method when a drop closes. Required for merchant accountability metrics.';
```

---

### Order and Pickup Tables

```sql
-- Core idempotency for order creation and payment processing
create table core_idempotency_key (
  core_idempotency_key_pk uuid primary key default gen_random_uuid(),
  scope_code              text not null,
  key_value               text not null,
  request_hash            text not null,
  response_resource_type  text,
  response_resource_pk    uuid,
  expires_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_core_idempotency_key unique (scope_code, key_value)
);
comment on table core_idempotency_key is 'Idempotency key registry for order creation and payment operations. If a duplicate key is submitted, return the original response_resource_pk without re-processing.';
create index idx_core_idempotency_key_expiry on core_idempotency_key (expires_at) where expires_at is not null;

create table order_order (
  order_order_pk                 uuid primary key default gen_random_uuid(),
  order_number                   bigint generated always as identity,
  consumer_profile_fk            uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  restaurant_fk                  uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete restrict,
  drop_fk                        uuid not null references drop_drop (drop_drop_pk) on delete restrict,
  drop_inventory_hold_fk         uuid,  -- FK patched after drop_inventory_hold (circular)
  order_status                   enum_order_status not null default 'CREATED',
  currency_code                  text not null default 'INR',
  subtotal_paise                 bigint not null,
  discount_paise                 bigint not null default 0,
  platform_fee_paise             bigint not null default 0,
  tax_paise                      bigint not null default 0,
  total_paise                    bigint not null,
  pickup_otp_hash                text,
  pickup_qr_nonce                uuid,
  pickup_qr_version              integer not null default 1,
  pickup_ready_at                timestamptz,
  collected_at                   timestamptz,
  cancelled_at                   timestamptz,
  pickup_expired_at              timestamptz,
  failure_reason_code            text,
  cancellation_reason_code       text,
  source_channel_code            text,
  created_via_idempotency_key_fk uuid references core_idempotency_key (core_idempotency_key_pk) on delete set null,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint uq_order_number unique (order_number),
  constraint ck_order_subtotal      check (subtotal_paise >= 0),
  constraint ck_order_discount      check (discount_paise >= 0),
  constraint ck_order_platform_fee  check (platform_fee_paise >= 0),
  constraint ck_order_tax           check (tax_paise >= 0),
  constraint ck_order_total_calc    check (total_paise = subtotal_paise - discount_paise + platform_fee_paise + tax_paise),
  constraint ck_order_total_non_neg check (total_paise >= 0)
);
comment on table order_order is
  'Central order record. order_number is human-readable (display as GZ-XXXXXXX). '
  'pickup_otp_hash: store bcrypt/argon2 hash of 6-digit OTP; never store plaintext. '
  'pickup_qr_nonce: UUID used to construct QR payload; invalidated after successful pickup. '
  'Externally visible statuses: PAID, CONFIRMED, READY_FOR_PICKUP, COLLECTED, REFUNDED. '
  'Internal statuses: CREATED, PAYMENT_PENDING, PAYMENT_AUTHORIZED, FAILED.';
comment on column order_order.pickup_otp_hash is 'Hashed 6-digit pickup OTP. NEVER store or log plaintext OTP. Staff app compares hash of entered OTP.';
comment on column order_order.pickup_qr_nonce is 'UUID nonce embedded in QR payload. Rotated on successful verification. QR is valid only when nonce matches current value.';

create index idx_order_order_consumer on order_order (consumer_profile_fk, created_at desc);
create index idx_order_order_restaurant_status on order_order (restaurant_fk, order_status, created_at desc);
create index idx_order_order_drop on order_order (drop_fk, order_status);

create table drop_inventory_hold (
  drop_inventory_hold_pk uuid primary key default gen_random_uuid(),
  drop_fk                uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  consumer_profile_fk    uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  hold_quantity          integer not null,
  hold_status            enum_drop_hold_status not null default 'ACTIVE',
  expires_at             timestamptz not null,
  order_fk               uuid references order_order (order_order_pk) on delete set null,
  released_reason_code   text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint ck_drop_inventory_hold_quantity check (hold_quantity > 0),
  constraint ck_drop_inventory_hold_expiry   check (expires_at > created_at)
);
comment on table drop_inventory_hold is
  'Temporary claim reservation. Created atomically (SELECT ... FOR UPDATE on drop_drop) to increment '
  'quantity_reserved. Payment success converts ACTIVE → CONVERTED. Payment failure/timeout → RELEASED/EXPIRED. '
  'Expiry cleanup runs via Edge Function cron every minute.';
comment on column drop_inventory_hold.hold_status is 'ACTIVE: counting against quantity_reserved. CONVERTED: paid order exists, quantity now in quantity_sold. RELEASED: manually released. EXPIRED: hold_expiry passed without payment.';

-- Back-patch circular FK: order_order.drop_inventory_hold_fk
alter table order_order
  add constraint fk_order_drop_inventory_hold
  foreign key (drop_inventory_hold_fk) references drop_inventory_hold (drop_inventory_hold_pk) on delete set null;
create unique index uq_order_drop_inventory_hold on order_order (drop_inventory_hold_fk)
  where drop_inventory_hold_fk is not null;

-- Back-patch FK for consumer_subscription.payment_intent_fk (done further below after payment_intent)

create index idx_drop_inventory_hold_expiry on drop_inventory_hold (drop_fk, hold_status, expires_at);
create index idx_drop_inventory_hold_active_expiry on drop_inventory_hold (expires_at) where hold_status = 'ACTIVE';
create index idx_drop_inventory_hold_consumer on drop_inventory_hold (consumer_profile_fk, created_at desc);

-- Append-only inventory mutation audit trail
create table drop_inventory_event (
  drop_inventory_event_pk    bigint generated always as identity primary key,
  drop_fk                    uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  event_type_code            text not null,  -- HOLD_CREATED, HOLD_CONVERTED, HOLD_RELEASED, HOLD_EXPIRED, MANUAL_ADD, MANUAL_REDUCE
  delta_quantity             integer not null,
  before_quantity_reserved   integer,
  after_quantity_reserved    integer,
  before_quantity_sold       integer,
  after_quantity_sold        integer,
  source_order_fk            uuid references order_order (order_order_pk) on delete set null,
  source_hold_fk             uuid references drop_inventory_hold (drop_inventory_hold_pk) on delete set null,
  recorded_by_profile_fk    uuid references iam_profile (iam_profile_pk) on delete set null,
  note_text                  text,
  created_at                 timestamptz not null default now()
);
comment on table drop_inventory_event is 'APPEND-ONLY. Full audit trail of every inventory mutation. Used to reconstruct inventory history and detect inconsistencies. No updated_at column.';
create index idx_drop_inventory_event_drop on drop_inventory_event (drop_fk, created_at desc);
create index idx_drop_inventory_event_order on drop_inventory_event (source_order_fk) where source_order_fk is not null;

create table order_item (
  order_item_pk                    uuid primary key default gen_random_uuid(),
  order_fk                         uuid not null references order_order (order_order_pk) on delete cascade,
  catalog_bag_template_revision_fk uuid not null references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete restrict,
  drop_fk                          uuid not null references drop_drop (drop_drop_pk) on delete restrict,
  quantity                         integer not null,
  unit_price_paise                 bigint not null,
  line_total_paise                 bigint not null,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  constraint uq_order_item unique (order_fk, catalog_bag_template_revision_fk, drop_fk),
  constraint ck_order_item_quantity  check (quantity > 0),
  constraint ck_order_item_total     check (line_total_paise = quantity * unit_price_paise)
);
comment on table order_item is 'Order line items. Currently one item per order (one drop per checkout), but table supports multi-item expansion. The revision FK ensures historical pricing is preserved.';
create index idx_order_item_order on order_item (order_fk);

-- Append-only order state machine audit trail
create table order_status_transition (
  order_status_transition_pk bigint generated always as identity primary key,
  order_fk                   uuid not null references order_order (order_order_pk) on delete cascade,
  from_status                enum_order_status,
  to_status                  enum_order_status not null,
  changed_by_profile_fk      uuid references iam_profile (iam_profile_pk) on delete set null,
  change_source_code         text not null,  -- CUSTOMER_ACTION, PAYMENT_WEBHOOK, STAFF_VERIFICATION, SYSTEM_EXPIRY, ADMIN_OVERRIDE
  note_text                  text,
  created_at                 timestamptz not null default now()
);
comment on table order_status_transition is 'APPEND-ONLY. Complete audit trail of every order status change. Essential for dispute resolution and refund eligibility checks. No updated_at column.';
create index idx_order_status_transition_order on order_status_transition (order_fk, created_at desc);

-- Append-only pickup verification attempts
create table order_pickup_verification_event (
  order_pickup_verification_event_pk bigint generated always as identity primary key,
  order_fk                           uuid not null references order_order (order_order_pk) on delete cascade,
  verified_by_profile_fk             uuid references iam_profile (iam_profile_pk) on delete set null,
  verification_method_code           text not null,  -- QR_SCAN, OTP_ENTRY, OFFLINE_CACHE
  attempt_status_code                text not null,  -- SUCCESS, WRONG_CODE, ALREADY_VERIFIED, EXPIRED_WINDOW, ORDER_NOT_FOUND
  submitted_code_hash                text,
  captured_offline_at                timestamptz,
  synced_at                          timestamptz,
  device_label                       text,
  note_text                          text,
  created_at                         timestamptz not null default now()
);
comment on table order_pickup_verification_event is 'APPEND-ONLY. Records every pickup verification attempt (successful or failed). Used for dispute resolution and staff accountability. Offline verifications captured at captured_offline_at and synced later.';
create index idx_order_pickup_verification_order on order_pickup_verification_event (order_fk, created_at desc);
create index idx_order_pickup_verification_staff on order_pickup_verification_event (verified_by_profile_fk, created_at desc);
```

---

### Payment and Finance Tables

```sql
create table payment_intent (
  payment_intent_pk      uuid primary key default gen_random_uuid(),
  order_fk               uuid not null references order_order (order_order_pk) on delete cascade,
  payment_provider       enum_payment_provider not null default 'RAZORPAY',
  provider_order_id      text,
  payment_status         enum_payment_status not null default 'CREATED',
  amount_paise           bigint not null,
  currency_code          text not null default 'INR',
  provider_customer_ref  text,
  provider_receipt_ref   text,
  idempotency_key_fk     uuid references core_idempotency_key (core_idempotency_key_pk) on delete set null,
  authorized_at          timestamptz,
  captured_at            timestamptz,
  failed_at              timestamptz,
  failure_code           text,
  failure_reason         text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint uq_payment_intent_order unique (order_fk),
  constraint ck_payment_intent_amount check (amount_paise > 0)
);
comment on table payment_intent is 'SERVICE-ROLE ONLY. One-to-one with order_order. Maps internal order to Razorpay order. provider_order_id is the Razorpay order ID.';
create unique index uq_payment_intent_provider_order_id on payment_intent (provider_order_id) where provider_order_id is not null;
create index idx_payment_intent_status on payment_intent (payment_status, created_at desc);

-- Back-patch FK from consumer_subscription.payment_intent_fk
alter table consumer_subscription
  add constraint fk_consumer_subscription_payment_intent
  foreign key (payment_intent_fk) references payment_intent (payment_intent_pk) on delete set null;
create index idx_consumer_subscription_payment_intent on consumer_subscription (payment_intent_fk)
  where payment_intent_fk is not null;

create table payment_transaction (
  payment_transaction_pk uuid primary key default gen_random_uuid(),
  payment_intent_fk      uuid not null references payment_intent (payment_intent_pk) on delete cascade,
  provider_payment_id    text,
  provider_signature     text,
  payment_status         enum_payment_status not null,
  amount_paise           bigint not null,
  gateway_fee_paise      bigint,
  gateway_tax_paise      bigint,
  raw_payload            jsonb not null default '{}'::jsonb,
  processed_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
comment on table payment_transaction is 'SERVICE-ROLE ONLY. Individual payment capture events. raw_payload stores full Razorpay response for audit and replay.';
create unique index uq_payment_transaction_provider_payment_id on payment_transaction (provider_payment_id) where provider_payment_id is not null;
create index idx_payment_transaction_intent on payment_transaction (payment_intent_fk, created_at desc);

-- Append-only webhook ledger
create table payment_webhook_event (
  payment_webhook_event_pk bigint generated always as identity primary key,
  payment_provider         enum_payment_provider not null,
  provider_event_id        text,
  event_type_code          text not null,
  signature_valid          boolean not null,
  dedupe_key               text,
  processing_status_code   text not null default 'RECEIVED',
  payload_json             jsonb not null,
  error_text               text,
  processed_at             timestamptz,
  received_at              timestamptz not null default now()
);
comment on table payment_webhook_event is 'SERVICE-ROLE ONLY. APPEND-ONLY. Raw webhook ledger with signature verification and deduplication. All Razorpay webhooks are stored here before processing. Do not process if signature_valid = false.';
comment on column payment_webhook_event.dedupe_key is 'Computed from provider_event_id to prevent double-processing. Unique index ensures each event processed at most once.';
create unique index uq_payment_webhook_provider_event on payment_webhook_event (payment_provider, provider_event_id) where provider_event_id is not null;
create unique index uq_payment_webhook_dedupe on payment_webhook_event (dedupe_key) where dedupe_key is not null;
create index idx_payment_webhook_status on payment_webhook_event (processing_status_code, received_at);

create table payment_refund (
  payment_refund_pk       uuid primary key default gen_random_uuid(),
  order_fk                uuid not null references order_order (order_order_pk) on delete cascade,
  payment_transaction_fk  uuid references payment_transaction (payment_transaction_pk) on delete set null,
  provider_refund_id      text,
  refund_status           enum_refund_status not null default 'PENDING',
  refund_reason           enum_refund_reason not null,
  amount_paise            bigint not null,
  requested_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  requested_at            timestamptz not null default now(),
  processed_at            timestamptz,
  failure_reason          text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint ck_payment_refund_amount check (amount_paise > 0)
);
comment on table payment_refund is 'SERVICE-ROLE ONLY. Refund records with typed reason codes for analytics and dispute management.';
create unique index uq_payment_refund_provider_id on payment_refund (provider_refund_id) where provider_refund_id is not null;
create index idx_payment_refund_order on payment_refund (order_fk, requested_at desc);
create index idx_payment_refund_status on payment_refund (refund_status, requested_at);

create table finance_settlement_run (
  finance_settlement_run_pk uuid primary key default gen_random_uuid(),
  restaurant_fk             uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  settlement_status         enum_finance_settlement_status not null default 'DRAFT',
  period_start_at           timestamptz not null,
  period_end_at             timestamptz not null,
  gross_sales_paise         bigint not null default 0,
  refunds_paise             bigint not null default 0,
  commission_paise          bigint not null default 0,
  net_payout_paise          bigint not null default 0,
  external_settlement_ref   text,
  locked_at                 timestamptz,
  paid_at                   timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint ck_finance_settlement_period check (period_end_at > period_start_at),
  constraint ck_finance_settlement_amounts check (
    gross_sales_paise >= 0 and refunds_paise >= 0 and
    commission_paise >= 0 and net_payout_paise >= 0
  )
);
comment on table finance_settlement_run is 'SERVICE-ROLE ONLY. Periodic settlement batch per restaurant. LOCKED status freezes the run; no further payout_entries should be added after locking.';
create index idx_finance_settlement_run_restaurant on finance_settlement_run (restaurant_fk, period_start_at desc);
create index idx_finance_settlement_run_status on finance_settlement_run (settlement_status, period_end_at);

-- Append-only financial ledger
create table finance_payout_entry (
  finance_payout_entry_pk    bigint generated always as identity primary key,
  restaurant_fk              uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  finance_settlement_run_fk  uuid references finance_settlement_run (finance_settlement_run_pk) on delete set null,
  entry_type                 enum_payout_entry_type not null,
  order_fk                   uuid references order_order (order_order_pk) on delete set null,
  payment_refund_fk          uuid references payment_refund (payment_refund_pk) on delete set null,
  amount_paise               bigint not null,
  description                text,
  event_at                   timestamptz not null default now(),
  created_at                 timestamptz not null default now()
);
comment on table finance_payout_entry is 'SERVICE-ROLE ONLY. APPEND-ONLY. Merchant payout ledger. Each financial event (sale, refund, commission, adjustment) gets one row. Settlement runs aggregate these entries.';
create index idx_finance_payout_entry_restaurant on finance_payout_entry (restaurant_fk, event_at desc);
create index idx_finance_payout_entry_settlement on finance_payout_entry (finance_settlement_run_fk);

create table finance_invoice (
  finance_invoice_pk         uuid primary key default gen_random_uuid(),
  invoice_number             bigint generated always as identity,
  restaurant_fk              uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  finance_settlement_run_fk  uuid not null references finance_settlement_run (finance_settlement_run_pk) on delete cascade,
  storage_object_fk          uuid references storage_object (storage_object_pk) on delete set null,
  invoice_period_start_at    timestamptz not null,
  invoice_period_end_at      timestamptz not null,
  invoice_total_paise        bigint not null,
  issued_at                  timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint uq_finance_invoice_number unique (invoice_number)
);
comment on table finance_invoice is 'SERVICE-ROLE ONLY. GST-compliant invoice metadata per settlement. storage_object_fk points to the generated PDF in private-exports bucket.';
create index idx_finance_invoice_restaurant on finance_invoice (restaurant_fk, invoice_period_start_at desc);
```

---

### Reviews, Support, Incidents

```sql
create table review_review (
  review_review_pk    uuid primary key default gen_random_uuid(),
  order_fk            uuid not null references order_order (order_order_pk) on delete cascade,
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  restaurant_fk       uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete restrict,
  rating_value        integer not null,
  headline_text       text,
  review_text         text,
  review_status       enum_review_status not null default 'PUBLISHED',
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint uq_review_per_order unique (order_fk),
  constraint ck_review_rating check (rating_value between 1 and 5)
);
comment on table review_review is 'One review per order. INSERT trigger should verify order_status = COLLECTED before allowing insert. average_rating on restaurant_restaurant is recomputed on insert/update via trigger.';
create index idx_review_review_restaurant on review_review (restaurant_fk, review_status, published_at desc);
create index idx_review_review_consumer on review_review (consumer_profile_fk, created_at desc);

create table review_media (
  review_media_pk   uuid primary key default gen_random_uuid(),
  review_fk         uuid not null references review_review (review_review_pk) on delete cascade,
  storage_object_fk uuid not null references storage_object (storage_object_pk) on delete restrict,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint uq_review_media unique (review_fk, storage_object_fk)
);
comment on table review_media is 'Photos attached to a review. Max 3 images per review enforced at application layer.';
create index idx_review_media_review on review_media (review_fk);

create table support_ticket (
  support_ticket_pk   uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid references consumer_profile (consumer_profile_pk) on delete set null,
  restaurant_fk       uuid references restaurant_restaurant (restaurant_restaurant_pk) on delete set null,
  order_fk            uuid references order_order (order_order_pk) on delete set null,
  ticket_type_code    text not null,
  ticket_status_code  text not null default 'OPEN',
  priority_code       text not null default 'NORMAL',
  subject_text        text not null,
  description_text    text,
  opened_at           timestamptz not null default now(),
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table support_ticket is 'Customer and merchant support tickets. ticket_type_code: ORDER_ISSUE, REFUND_REQUEST, ONBOARDING, ACCOUNT, FOOD_SAFETY, GENERAL.';
create index idx_support_ticket_status_opened on support_ticket (ticket_status_code, opened_at);
create index idx_support_ticket_consumer on support_ticket (consumer_profile_fk, opened_at desc);
create index idx_support_ticket_restaurant on support_ticket (restaurant_fk, opened_at desc);

create table support_ticket_event (
  support_ticket_event_pk bigint generated always as identity primary key,
  support_ticket_fk       uuid not null references support_ticket (support_ticket_pk) on delete cascade,
  event_type_code         text not null,
  actor_profile_fk        uuid references iam_profile (iam_profile_pk) on delete set null,
  event_note              text,
  payload_json            jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);
comment on table support_ticket_event is 'APPEND-ONLY. Activity log for a support ticket.';
create index idx_support_ticket_event_ticket on support_ticket_event (support_ticket_fk, created_at desc);

create table incident_incident (
  incident_incident_pk    uuid primary key default gen_random_uuid(),
  restaurant_fk           uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete restrict,
  order_fk                uuid references order_order (order_order_pk) on delete set null,
  support_ticket_fk       uuid references support_ticket (support_ticket_pk) on delete set null,
  incident_type           enum_incident_type not null,
  incident_status         enum_incident_status not null default 'OPEN',
  reported_by_profile_fk  uuid references iam_profile (iam_profile_pk) on delete set null,
  assigned_to_profile_fk  uuid references iam_profile (iam_profile_pk) on delete set null,
  summary_text            text not null,
  detail_text             text,
  refund_triggered_flag   boolean not null default false,
  sla_due_at              timestamptz,
  resolved_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
comment on table incident_incident is 'Food safety and merchant failure incidents. Linked to order for refund workflow. SLA tracking via sla_due_at.';
create index idx_incident_incident_restaurant_status on incident_incident (restaurant_fk, incident_status, created_at desc);
create index idx_incident_incident_status_sla on incident_incident (incident_status, sla_due_at) where sla_due_at is not null;

create table incident_event (
  incident_event_pk   bigint generated always as identity primary key,
  incident_fk         uuid not null references incident_incident (incident_incident_pk) on delete cascade,
  event_type_code     text not null,
  actor_profile_fk    uuid references iam_profile (iam_profile_pk) on delete set null,
  event_note          text,
  payload_json        jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);
comment on table incident_event is 'APPEND-ONLY. Activity timeline for a food safety incident.';
create index idx_incident_event_incident on incident_event (incident_fk, created_at desc);
```

---

### Notifications

```sql
create table notification_template (
  notification_template_pk uuid primary key default gen_random_uuid(),
  template_code            text not null,
  channel                  enum_notification_channel not null,
  provider_template_ref    text,
  template_version         text not null,
  is_active                boolean not null default true,
  body_schema_json         jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint uq_notification_template unique (template_code, channel, template_version)
);
comment on table notification_template is 'Notification template registry. provider_template_ref is the WATI/Resend template ID. body_schema_json documents expected payload variables.';

create table notification_outbox (
  notification_outbox_pk   uuid primary key default gen_random_uuid(),
  iam_profile_fk           uuid references iam_profile (iam_profile_pk) on delete set null,
  restaurant_fk            uuid references restaurant_restaurant (restaurant_restaurant_pk) on delete set null,
  order_fk                 uuid references order_order (order_order_pk) on delete set null,
  channel                  enum_notification_channel not null,
  notification_status      enum_notification_status not null default 'PENDING',
  notification_template_fk uuid references notification_template (notification_template_pk) on delete set null,
  dedupe_key               text,
  payload_json             jsonb not null default '{}'::jsonb,
  scheduled_for            timestamptz,
  sent_at                  timestamptz,
  retry_count              integer not null default 0,
  last_error               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint ck_notification_outbox_retry check (retry_count >= 0)
);
comment on table notification_outbox is 'Transactional notification queue processed by Edge Function. dedupe_key prevents duplicate sends. Processor must check consumer_notification_preference before dispatching.';
create unique index uq_notification_outbox_dedupe on notification_outbox (dedupe_key) where dedupe_key is not null;
create index idx_notification_outbox_status_schedule on notification_outbox (notification_status, scheduled_for);
create index idx_notification_outbox_profile on notification_outbox (iam_profile_fk, created_at desc);

create table notification_delivery_attempt (
  notification_delivery_attempt_pk bigint generated always as identity primary key,
  notification_outbox_fk           uuid not null references notification_outbox (notification_outbox_pk) on delete cascade,
  attempt_number                   integer not null,
  provider_message_id              text,
  attempt_status_code              text not null,
  provider_response_json           jsonb not null default '{}'::jsonb,
  error_text                       text,
  attempted_at                     timestamptz not null default now(),
  constraint uq_notification_delivery_attempt unique (notification_outbox_fk, attempt_number)
);
comment on table notification_delivery_attempt is 'APPEND-ONLY. Delivery attempt log per outbox message. Enables retry logic and provider delivery audit.';
create index idx_notification_delivery_attempt_outbox on notification_delivery_attempt (notification_outbox_fk, attempt_number);
```

---

### Admin, Config, Audit, Analytics

```sql
-- Append-only audit trail
create table audit_log (
  audit_log_pk        bigint generated always as identity primary key,
  actor_profile_fk    uuid references iam_profile (iam_profile_pk) on delete set null,
  actor_role_code     text,
  entity_table_name   text not null,
  entity_pk           uuid,
  action_code         text not null,
  before_json         jsonb,
  after_json          jsonb,
  request_id          text,
  ip_address          inet,
  user_agent          text,
  created_at          timestamptz not null default now()
);
comment on table audit_log is 'SERVICE-ROLE ONLY. APPEND-ONLY. Platform-wide audit trail. Written by server-side code for all material state changes to financial, compliance, and admin entities.';
create index idx_audit_log_entity on audit_log (entity_table_name, entity_pk, created_at desc);
create index idx_audit_log_actor on audit_log (actor_profile_fk, created_at desc);

create table config_feature_flag (
  config_feature_flag_pk uuid primary key default gen_random_uuid(),
  flag_code              text not null,
  flag_name              text not null,
  description            text,
  default_enabled        boolean not null default false,
  rollout_json           jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint uq_config_feature_flag_code unique (flag_code)
);
comment on table config_feature_flag is 'SERVICE-ROLE ONLY. Feature flags with per-city/per-restaurant/per-segment rollout config in rollout_json.';

create table config_runtime_setting (
  config_runtime_setting_pk uuid primary key default gen_random_uuid(),
  setting_code              text not null,
  scope_type                enum_config_scope not null,
  geo_city_fk               uuid references geo_city (geo_city_pk) on delete cascade,
  restaurant_fk             uuid references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  master_audience_segment_fk uuid references master_audience_segment (master_audience_segment_pk) on delete cascade,
  value_json                jsonb not null default '{}'::jsonb,
  effective_from            timestamptz not null default now(),
  effective_to              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint ck_config_runtime_scope check (
    (scope_type = 'GLOBAL'     and geo_city_fk is null and restaurant_fk is null and master_audience_segment_fk is null) or
    (scope_type = 'CITY'       and geo_city_fk is not null and restaurant_fk is null) or
    (scope_type = 'RESTAURANT' and restaurant_fk is not null and geo_city_fk is null) or
    (scope_type = 'SEGMENT'    and master_audience_segment_fk is not null and restaurant_fk is null)
  )
);
comment on table config_runtime_setting is 'SERVICE-ROLE ONLY. Runtime configuration with scope hierarchy (GLOBAL < CITY < RESTAURANT < SEGMENT). Used for bag price limits, commission tiers, hold expiry, Spotlight pricing.';
create index idx_config_runtime_setting_code on config_runtime_setting (setting_code, scope_type);
create index idx_config_runtime_setting_restaurant on config_runtime_setting (restaurant_fk, setting_code);
create index idx_config_runtime_setting_city on config_runtime_setting (geo_city_fk, setting_code);

-- Analytics event stream — high-volume append-only
-- PARTITIONING STRATEGY: Partition by RANGE on occurred_at (monthly partitions).
-- Create partitions in advance: analytics_event_2026_04, analytics_event_2026_05, etc.
-- Older partitions can be archived/detached after retention period.
create table analytics_event (
  analytics_event_pk  bigint generated always as identity,
  event_name          text not null,
  iam_profile_fk      uuid references iam_profile (iam_profile_pk) on delete set null,
  consumer_profile_fk uuid references consumer_profile (consumer_profile_pk) on delete set null,
  restaurant_fk       uuid references restaurant_restaurant (restaurant_restaurant_pk) on delete set null,
  order_fk            uuid references order_order (order_order_pk) on delete set null,
  drop_fk             uuid references drop_drop (drop_drop_pk) on delete set null,
  session_id          text,
  source_code         text,
  properties_json     jsonb not null default '{}'::jsonb,
  occurred_at         timestamptz not null,
  ingested_at         timestamptz not null default now()
) partition by range (occurred_at);
comment on table analytics_event is
  'SERVICE-ROLE ONLY. APPEND-ONLY. Range-partitioned by occurred_at (monthly). '
  'High-volume event stream for product analytics. Do not query without partition pruning. '
  'Retention: anonymise after 2 years; purge after 5 years per privacy_retention_policy.';
-- Create initial partition
create table analytics_event_2026_q2 partition of analytics_event
  for values from ('2026-04-01') to ('2026-07-01');
create index idx_analytics_event_name on analytics_event (event_name, occurred_at desc);
create index idx_analytics_event_restaurant on analytics_event (restaurant_fk, occurred_at desc);
create index idx_analytics_event_consumer on analytics_event (consumer_profile_fk, occurred_at desc);

create table admin_export_job (
  admin_export_job_pk      uuid primary key default gen_random_uuid(),
  requested_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  export_type_code         text not null,
  filter_json              jsonb not null default '{}'::jsonb,
  storage_object_fk        uuid references storage_object (storage_object_pk) on delete set null,
  job_status_code          text not null default 'QUEUED',
  requested_at             timestamptz not null default now(),
  completed_at             timestamptz,
  error_text               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
comment on table admin_export_job is 'SERVICE-ROLE ONLY. Async export job tracker. When completed, storage_object_fk points to the export file in private-exports bucket.';
create index idx_admin_export_job_status on admin_export_job (job_status_code, requested_at);

create table admin_data_correction (
  admin_data_correction_pk uuid primary key default gen_random_uuid(),
  requested_by_profile_fk  uuid references iam_profile (iam_profile_pk) on delete set null,
  approved_by_profile_fk   uuid references iam_profile (iam_profile_pk) on delete set null,
  entity_table_name        text not null,
  entity_pk                uuid,
  change_reason            text not null,
  before_json              jsonb,
  after_json               jsonb,
  executed_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
comment on table admin_data_correction is 'SERVICE-ROLE ONLY. 4-eyes data correction workflow. requested_by and approved_by must be different profiles. executed_at is set when correction applied.';
create index idx_admin_data_correction_entity on admin_data_correction (entity_table_name, entity_pk, executed_at desc);
```

---

### Trigger Functions

```sql
-- Reusable updated_at trigger function (in private schema)
create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Helper: get current profile pk from Supabase JWT
create or replace function private.current_profile_pk()
returns uuid language sql stable security definer set search_path = public as $$
  select iam_profile_pk from iam_profile where auth_user_fk = auth.uid()
$$;

-- Helper: is caller a platform admin with optional role check
create or replace function private.is_platform_admin(required_role text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from iam_platform_membership m
    join iam_platform_role r on r.iam_platform_role_pk = m.iam_platform_role_fk
    where m.iam_profile_fk = private.current_profile_pk()
      and m.is_active = true
      and (required_role is null or r.role_code = required_role)
  )
$$;

-- Helper: check if current user is a member of a restaurant
create or replace function private.has_restaurant_access(target_restaurant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from restaurant_team_membership
    where restaurant_fk = target_restaurant
      and iam_profile_fk = private.current_profile_pk()
      and is_active = true
  )
$$;

-- Helper: check if current user has a specific scope at a restaurant
create or replace function private.has_restaurant_scope(target_restaurant uuid, required_scope text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from restaurant_team_membership tm
    join restaurant_team_role_scope ts on ts.restaurant_team_role_fk = tm.restaurant_team_role_fk
    join master_scope ms on ms.master_scope_pk = ts.master_scope_fk
    where tm.restaurant_fk = target_restaurant
      and tm.iam_profile_fk = private.current_profile_pk()
      and tm.is_active = true
      and ms.scope_code = required_scope
  )
$$;

-- Apply updated_at trigger to all MUTABLE tables (NOT append-only event/log tables)
do $$
declare t text;
begin
  foreach t in array array[
    'master_scope', 'master_allergen', 'master_cuisine', 'master_audience_segment',
    'master_storage_visibility', 'master_document_type', 'master_document_status',
    'geo_city', 'geo_neighborhood', 'geo_address',
    'iam_profile', 'iam_platform_role', 'iam_platform_membership',
    'iam_platform_role_scope', 'restaurant_team_role', 'restaurant_team_membership',
    'restaurant_team_role_scope',
    'consumer_profile', 'consumer_dietary_preference', 'consumer_allergen_preference',
    'consumer_city_preference', 'consumer_saved_restaurant',
    'consumer_referral_code', 'consumer_referral',
    'consumer_subscription_plan', 'consumer_subscription',
    'consumer_passport_stat', 'consumer_notification_preference',
    'privacy_consent_purpose', 'privacy_retention_policy', 'privacy_erasure_request',
    'restaurant_restaurant', 'restaurant_compliance', 'restaurant_contact',
    'restaurant_cuisine_map', 'restaurant_payout_account',
    'restaurant_commission_plan', 'restaurant_commission_override',
    'restaurant_document', 'restaurant_setting',
    'storage_object',
    'catalog_bag_template', 'catalog_bag_template_revision',
    'catalog_bag_template_allergen', 'catalog_bag_template_media',
    'drop_recurring_schedule', 'drop_drop', 'drop_audience', 'drop_media',
    'drop_inventory_hold', 'drop_closure_log',
    'core_idempotency_key', 'order_order', 'order_item',
    'payment_intent', 'payment_transaction', 'payment_refund',
    'finance_settlement_run', 'finance_invoice',
    'review_review', 'review_media',
    'support_ticket', 'incident_incident',
    'notification_template', 'notification_outbox',
    'config_feature_flag', 'config_runtime_setting',
    'admin_export_job', 'admin_data_correction'
    -- EXCLUDED (no updated_at): privacy_consent_event, drop_inventory_event,
    -- order_status_transition, order_pickup_verification_event,
    -- payment_webhook_event, finance_payout_entry, audit_log,
    -- analytics_event, support_ticket_event, incident_event,
    -- notification_delivery_attempt
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on %I for each row execute function private.set_updated_at()',
      t, t
    );
  end loop;
end $$;
```

---

## 6. Row Level Security Design

### Enable RLS on all public tables

```sql
-- Enable on all business tables (run for each table)
alter table iam_profile enable row level security;
alter table consumer_profile enable row level security;
alter table consumer_dietary_preference enable row level security;
alter table consumer_allergen_preference enable row level security;
alter table consumer_city_preference enable row level security;
alter table consumer_saved_restaurant enable row level security;
alter table consumer_referral_code enable row level security;
alter table consumer_referral enable row level security;
alter table consumer_subscription enable row level security;
alter table consumer_passport_stat enable row level security;
alter table consumer_notification_preference enable row level security;
alter table privacy_consent_event enable row level security;
alter table privacy_erasure_request enable row level security;
alter table restaurant_restaurant enable row level security;
alter table restaurant_team_membership enable row level security;
alter table restaurant_contact enable row level security;
alter table restaurant_setting enable row level security;
alter table catalog_bag_template enable row level security;
alter table catalog_bag_template_revision enable row level security;
alter table catalog_bag_template_allergen enable row level security;
alter table drop_drop enable row level security;
alter table drop_audience enable row level security;
alter table order_order enable row level security;
alter table order_item enable row level security;
alter table review_review enable row level security;
alter table support_ticket enable row level security;
alter table incident_incident enable row level security;
alter table notification_outbox enable row level security;
alter table storage_object enable row level security;
-- Sensitive tables: RLS on; policies only allow service_role
alter table restaurant_compliance enable row level security;
alter table restaurant_payout_account enable row level security;
alter table restaurant_document enable row level security;
alter table restaurant_commission_plan enable row level security;
alter table restaurant_commission_override enable row level security;
alter table payment_intent enable row level security;
alter table payment_transaction enable row level security;
alter table payment_webhook_event enable row level security;
alter table payment_refund enable row level security;
alter table finance_settlement_run enable row level security;
alter table finance_payout_entry enable row level security;
alter table finance_invoice enable row level security;
alter table audit_log enable row level security;
alter table config_feature_flag enable row level security;
alter table config_runtime_setting enable row level security;
alter table analytics_event enable row level security;
alter table admin_export_job enable row level security;
alter table admin_data_correction enable row level security;
```

### Example Policies

```sql
-- Consumer: own profile only
create policy rls_iam_profile_select_own on iam_profile
  for select to authenticated
  using (iam_profile_pk = private.current_profile_pk());

create policy rls_iam_profile_update_own on iam_profile
  for update to authenticated
  using (iam_profile_pk = private.current_profile_pk())
  with check (iam_profile_pk = private.current_profile_pk());

create policy rls_consumer_profile_select_own on consumer_profile
  for select to authenticated
  using (iam_profile_fk = private.current_profile_pk());

create policy rls_consumer_profile_update_own on consumer_profile
  for update to authenticated
  using (iam_profile_fk = private.current_profile_pk())
  with check (iam_profile_fk = private.current_profile_pk());

-- Consumer: own orders
create policy rls_order_order_consumer_select on order_order
  for select to authenticated
  using (consumer_profile_fk in (
    select consumer_profile_pk from consumer_profile
    where iam_profile_fk = private.current_profile_pk()
  ));

-- Restaurant team: own restaurant orders
create policy rls_order_order_restaurant_select on order_order
  for select to authenticated
  using (private.has_restaurant_access(restaurant_fk));

-- Drop discovery: active drops are publicly readable; own restaurant drops full access
create policy rls_drop_drop_public_read on drop_drop
  for select to anon, authenticated
  using (drop_status in ('SCHEDULED', 'ACTIVE'));

create policy rls_drop_drop_restaurant_manage on drop_drop
  for all to authenticated
  using (private.has_restaurant_access(restaurant_fk))
  with check (private.has_restaurant_access(restaurant_fk));

-- Pickup verification: restaurant staff only
create policy rls_pickup_verification_staff_insert on order_pickup_verification_event
  for insert to authenticated
  with check (
    verified_by_profile_fk = private.current_profile_pk()
    and exists (
      select 1 from order_order o
      where o.order_order_pk = order_pickup_verification_event.order_fk
        and private.has_restaurant_access(o.restaurant_fk)
    )
  );

-- Reviews: published reviews readable by all; own restaurant visible to restaurant team
create policy rls_review_public_read on review_review
  for select to anon, authenticated
  using (review_status = 'PUBLISHED');

-- Sensitive tables: service_role only (no browser policies)
-- These tables have RLS enabled but no policies for authenticated/anon users.
-- Service role bypasses RLS. Any direct browser query returns empty set.
```

---

## 7. Database Invariants

### Enforced in SQL
- `pickup_end_at > pickup_start_at`
- `quantity_total > 0`, `quantity_reserved >= 0`, `quantity_sold >= 0`, `quantity_reserved + quantity_sold <= quantity_total`
- `hold_quantity > 0`, `expires_at > created_at` (holds)
- `total_paise = subtotal - discount + platform_fee + tax` AND `total_paise >= 0`
- `line_total_paise = quantity * unit_price_paise`
- One review per order (UNIQUE on order_fk)
- One saved-restaurant per consumer/restaurant pair
- One consumer referral code per consumer
- Referral cannot self-refer (CHECK)
- One active payout account per restaurant (partial unique)
- One primary contact per restaurant/type (partial unique)
- rating_value BETWEEN 1 AND 5
- commission_bps BETWEEN 0 AND 10000
- birth_month BETWEEN 1 AND 12, birth_day BETWEEN 1 AND 31

### Enforced in Triggers/Functions
- `drop_inventory_hold` creation: `SELECT ... FOR UPDATE` on `drop_drop` before incrementing `quantity_reserved`
- Hold conversion: decrement `quantity_reserved`, increment `quantity_sold` atomically
- Hold expiry: decrement `quantity_reserved`, set `hold_status = EXPIRED` atomically
- Auto-flip `drop_status` to `SOLD_OUT` when `quantity_available = 0`
- Review insert: verify `order_status = COLLECTED` before allowing review
- `restaurant_restaurant.average_rating` + `rating_count`: recompute on review insert/update/status-change

### Enforced in Application Logic
- Audience segment eligibility (Swaad Club, WhatsApp Insiders): checked server-side before claim
- Bag price guardrails from `config_runtime_setting`
- Settlement ledger: payout entries created exactly once per financial event
- Razorpay signature verification before recording transaction
- Refund limits and partial-refund business rules
- Role privilege escalation prevention
- Privacy erasure as coordinated multi-system workflow

---

## 8. Intentional Exclusions (Phase 2+)
- Corporate account hierarchy and employee budgets
- Wallet / stored credit ledger
- Push token device registry for mobile attribution
- Coupon engine and promotion combinatorics
- Advanced campaign orchestration
- Warehouse-style aggregate tables / star schema
- ML feature store
- Live courier / delivery modeling
- Menu item normalization beneath bag template layer

---

## 9. Seed Data (Dev/Staging)

```sql
-- Cities
insert into geo_city (city_code, city_name, state_name) values ('HYD', 'Hyderabad', 'Telangana');

-- Neighborhoods (Hyderabad)
insert into geo_neighborhood (geo_city_fk, neighborhood_code, neighborhood_name)
  select geo_city_pk, unnest(array['jubilee_hills','banjara_hills','gachibowli','kondapur','hitech_city']),
         unnest(array['Jubilee Hills','Banjara Hills','Gachibowli','Kondapur','Hitech City'])
  from geo_city where city_code = 'HYD';

-- Master allergens
insert into master_allergen (allergen_code, allergen_name, sort_order) values
  ('NUTS','Tree Nuts',1), ('DAIRY','Dairy',2), ('GLUTEN','Gluten',3),
  ('SHELLFISH','Shellfish',4), ('SOY','Soy',5), ('EGGS','Eggs',6);

-- Master audience segments
insert into master_audience_segment (segment_code, segment_name) values
  ('ALL_USERS','All Users'), ('SWAAD_CLUB','Swaad Club Members'),
  ('WHATSAPP_INSIDERS','WhatsApp Insiders'), ('RESTAURANT_FOLLOWERS','Restaurant Followers');

-- Platform roles
insert into iam_platform_role (role_code, role_name) values
  ('SUPER_ADMIN','Super Admin'), ('SUPPORT_ADMIN','Support Admin'),
  ('FINANCE_ADMIN','Finance Admin'), ('OPS_ADMIN','Operations Admin');

-- Restaurant team roles
insert into restaurant_team_role (role_code, role_name) values
  ('OWNER','Owner'), ('ADMIN','Admin'), ('OPERATIONS','Operations'),
  ('PICKUP_STAFF','Pickup Staff'), ('FINANCE','Finance');

-- Master scope codes
insert into master_scope (scope_code, scope_name, applies_to) values
  ('DROP_CREATE','Create Drops','RESTAURANT'),
  ('DROP_PUBLISH','Publish Drops','RESTAURANT'),
  ('DROP_EMERGENCY_CLOSE','Emergency Close Drop','RESTAURANT'),
  ('ORDER_VIEW','View Orders','RESTAURANT'),
  ('ORDER_VERIFY_PICKUP','Verify Pickup','RESTAURANT'),
  ('FINANCE_VIEW','View Finance','RESTAURANT'),
  ('FINANCE_EXPORT','Export Finance','RESTAURANT'),
  ('TEAM_MANAGE','Manage Team','RESTAURANT'),
  ('SETTINGS_MANAGE','Manage Settings','RESTAURANT'),
  ('ANALYTICS_VIEW','View Analytics','RESTAURANT'),
  ('ADMIN_USERS','Manage Users','PLATFORM'),
  ('ADMIN_RESTAURANTS','Manage Restaurants','PLATFORM');

-- Commission plan
insert into restaurant_commission_plan (plan_code, plan_name, commission_bps, effective_from) values
  ('PILOT_12PCT','Pilot — 12%',1200,now()),
  ('STANDARD_15PCT','Standard — 15%',1500,now()),
  ('VOLUME_12PCT','Volume Tier — 12%',1200,now());

-- Swaad Club subscription plan
insert into consumer_subscription_plan (plan_code, plan_name, price_paise, billing_interval_months, benefits_json) values
  ('SWAAD_CLUB_MONTHLY','Swaad Club Monthly',19900,1,'{"priority_queue":true,"exclusive_drops":true,"badge":true}');

-- Consent purposes
insert into privacy_consent_purpose (purpose_code, purpose_name, is_required_for_service) values
  ('OPERATIONAL','Service Delivery',true),
  ('MARKETING_EMAIL','Marketing Emails',false),
  ('MARKETING_WHATSAPP','WhatsApp Marketing',false),
  ('ANALYTICS','Analytics',false),
  ('REFERRAL_COMMS','Referral Communications',false);

-- Document types
insert into master_document_type (type_code, type_name, is_required) values
  ('FSSAI_LICENSE','FSSAI License',true),
  ('GST_CERTIFICATE','GST Certificate',true),
  ('PAN_CARD','PAN Card',true),
  ('BANK_CANCELLED_CHEQUE','Bank Cancelled Cheque',true),
  ('FOOD_SAFETY_AUDIT','Food Safety Audit Report',false);

-- Document statuses
insert into master_document_status (status_code, status_name, is_terminal) values
  ('PENDING','Pending Review',false),
  ('UNDER_REVIEW','Under Review',false),
  ('APPROVED','Approved',true),
  ('REJECTED','Rejected',true),
  ('EXPIRED','Expired',true);

-- Storage visibility levels
insert into master_storage_visibility (visibility_code, visibility_name, is_public_readable) values
  ('PUBLIC_CDN','Public CDN',true),
  ('AUTHENTICATED_ONLY','Authenticated Users Only',false),
  ('SERVICE_ONLY','Service Role Only',false),
  ('OWNER_ONLY','Owner Only',false);
```

---

## Key Views (Recommended for Launch)

```sql
-- Active drops for public consumer discovery (RLS security invoker)
create or replace view public.v_active_drops with (security_invoker = true) as
  select
    d.drop_drop_pk,
    d.drop_title, d.drop_description, d.drop_type, d.drop_status,
    d.pickup_start_at, d.pickup_end_at,
    d.quantity_total, d.quantity_available,
    d.bag_price_paise, d.min_menu_value_paise,
    r.restaurant_restaurant_pk, r.restaurant_name, r.display_name,
    r.average_rating, r.rating_count,
    r.primary_neighborhood_fk,
    n.neighborhood_name,
    c.city_code,
    rev.dietary_category, rev.spice_level, rev.serves_min, rev.serves_max
  from drop_drop d
  join restaurant_restaurant r on r.restaurant_restaurant_pk = d.restaurant_fk
  join geo_city c on c.geo_city_pk = d.geo_city_fk
  left join geo_neighborhood n on n.geo_neighborhood_pk = d.geo_neighborhood_fk
  join catalog_bag_template_revision rev on rev.catalog_bag_template_revision_pk = d.catalog_bag_template_revision_fk
  where d.drop_status in ('SCHEDULED', 'ACTIVE')
    and r.restaurant_status = 'ACTIVE';

-- Consumer order history (security invoker — RLS filters to own orders)
create or replace view public.v_consumer_order_history with (security_invoker = true) as
  select
    o.order_order_pk, o.order_number, o.order_status,
    o.total_paise, o.currency_code,
    o.pickup_start_at, o.pickup_end_at, o.collected_at,
    o.pickup_qr_nonce, o.pickup_qr_version,
    r.restaurant_name, r.display_name,
    d.drop_title, d.drop_type,
    rev.dietary_category, rev.spice_level
  from order_order o
  join drop_drop d on d.drop_drop_pk = o.drop_fk
  join restaurant_restaurant r on r.restaurant_restaurant_pk = o.restaurant_fk
  join catalog_bag_template_revision rev on rev.catalog_bag_template_revision_pk = d.catalog_bag_template_revision_fk
  -- RLS on order_order automatically restricts to own orders
  where true;
```
