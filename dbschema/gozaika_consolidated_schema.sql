-- =============================================================================
-- goZaika Foundational Database Schema
-- Supabase PostgreSQL 16  |  v4.1 repaired  |  April 2026
-- =============================================================================
--
-- BUSINESS CONTEXT
-- ----------------
-- goZaika is a premium-access, pickup-only BAM Bag marketplace for India.
-- Restaurants release chef-curated "BAM Bags" — allergen-disclosed, dietary-
-- categorised, surprise-content packages — through time-limited "drops".
-- Consumers discover, claim, pay, and collect bags directly from the kitchen.
-- This is NOT a discount app, delivery platform, or leftover rescue service.
-- It is a controlled-access, off-menu discovery layer: "Great food. No menu.
-- No algorithm." Launching in Hyderabad; city-led expansion model.
--
-- PLATFORM SURFACES
-- -----------------
--   Consumer Web App           Next.js 14, Vercel (PWA)
--   Consumer Mobile App        React Native / Expo (iOS + Android)
--   Restaurant Staff App       React Native / Expo (pickup verification only)
--   Restaurant Mgmt Portal     Next.js 14, Vercel (Zayka Pro)
--   Admin Portal               Next.js 14, Vercel (restricted, IP-allowlisted)
--
-- INFRASTRUCTURE
-- --------------
--   Supabase Postgres 16 (Singapore ap-southeast-1)
--   Supabase Auth (Phone OTP primary, Google OAuth)
--   Supabase Storage (media, KYC docs, exports)
--   Supabase Realtime (live inventory counts)
--   Vercel Edge Network (India)
--   Razorpay (UPI, cards, wallets, webhooks, settlements)
--   WATI (WhatsApp transactional messaging)
--   Resend (transactional email)
--   Upstash Redis (rate-limiting, idempotency)
--
-- SCHEMA CONVENTIONS
-- ------------------
--   PKs          : <table_name>_pk  |  UUID  |  default gen_random_uuid()
--   FKs          : <descriptive>_fk  |  UUID  |  explicitly named constraints
--   Timestamps   : timestamptz  |  *_at naming  |  Asia/Kolkata display layer
--   Money        : bigint paise  (100 paise = 1 INR; no float arithmetic)
--   Booleans     : boolean  |  explicit default  |  is_* or *_flag naming
--   Master data  : master_ prefix  |  controlled reference, never user-content
--   Bounded ctx  : table prefix matches bounded context
--   Computed     : COMPUTED_ prefix on maintained denormalised columns
--   Append-only  : immutability triggers guard event/audit/ledger tables
--   Comments     : COMMENT ON TABLE and COMMENT ON COLUMN on every object
--
-- AI CODE-GENERATION CONTRACT
-- ----------------------------
-- COMMENT ON TABLE and COMMENT ON COLUMN are the primary documentation
-- contract for AI code generators (Claude Code, Cursor, Codex). They describe:
--   - valid value sets for text status/code columns
--   - state machine transitions
--   - flow context and cross-table dependencies
--   - write rules (who can write, when, from which surface)
--   - safety-critical disclosures
-- All generated API middleware, Edge Functions, and Prisma queries MUST stay
-- consistent with the intent documented in these comments.
--
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;
comment on extension pgcrypto is 'Provides gen_random_uuid() for UUID PKs and digest() for hash operations (OTP, QR nonce hashing).';

create extension if not exists citext;
comment on extension citext is 'Case-insensitive text type used for email_address columns across all tables to prevent duplicate accounts due to case variation.';

-- =============================================================================
-- SECTION 0 — Shared helper functions
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
comment on function public.set_updated_at() is
  'Reusable BEFORE UPDATE trigger function. Automatically maintains updated_at = now() on every mutable business table. Applied via the bulk trigger loop at the end of this file. Never call directly from application code.';

create or replace function public.raise_immutable_error()
returns trigger language plpgsql as $$
begin
  raise exception
    'Table "%" is append-only. UPDATE and DELETE are not permitted. '
    'Insert a new row to record a state change.',
    TG_TABLE_NAME;
end;
$$;
comment on function public.raise_immutable_error() is
  'Immutability guard for append-only event, ledger, and audit tables. '
  'Applied as BEFORE UPDATE/DELETE trigger on: '
  'privacy_consent_event, drop_inventory_event, order_status_transition, '
  'order_pickup_verification_event, payment_webhook_event, '
  'billing_subscription_event, support_ticket_event, incident_event, '
  'analytics_event, audit_log. '
  'Prevents mutation of the historical record even by service-role clients.';

-- =============================================================================
-- SECTION 1 — Master / Reference tables  (master_)
-- =============================================================================
-- Controlled enumeration data managed by the goZaika ops team. These tables
-- behave like application-managed enums but remain extensible without schema
-- migrations. All master tables follow the same pattern: UUID PK, unique code,
-- display name, optional description, is_active, sort_order, audit timestamps.
-- WRITE RULE: Only service-role or platform admin writes. Never user-generated.
-- =============================================================================

create table master_scope (
  master_scope_pk   uuid        not null default gen_random_uuid(),
  scope_code        text        not null,
  scope_name        text        not null,
  description       text,
  applies_to        text        not null default 'BOTH',
  is_active         boolean     not null default true,
  sort_order        integer     not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint master_scope_pk         primary key (master_scope_pk),
  constraint uq_master_scope_code    unique      (scope_code),
  constraint ck_master_scope_applies check (applies_to in ('PLATFORM','RESTAURANT','BOTH'))
);
comment on table  master_scope is
  'Controlled registry of permission scope codes. Every scope_code referenced '
  'anywhere in iam_platform_role_scope or restaurant_team_role_scope MUST exist '
  'here first. Seed (PLATFORM): ADMIN_USERS, ADMIN_RESTAURANTS, ADMIN_FINANCE, '
  'ADMIN_CONFIG, ADMIN_INCIDENTS, ADMIN_SUPPORT. '
  'Seed (RESTAURANT): DROP_CREATE, DROP_PUBLISH, DROP_PAUSE, DROP_EMERGENCY_CLOSE, '
  'ORDER_VIEW, ORDER_VERIFY_PICKUP, FINANCE_VIEW, FINANCE_EXPORT, '
  'TEAM_MANAGE, SETTINGS_MANAGE, ANALYTICS_VIEW, CATALOG_MANAGE.';
comment on column master_scope.scope_code    is 'UPPER_SNAKE_CASE identifier used in role-scope tables and middleware checks. Immutable once referenced by a role.';
comment on column master_scope.applies_to    is 'PLATFORM = valid only in iam_platform_role_scope. RESTAURANT = valid only in restaurant_team_role_scope. BOTH = either.';
comment on column master_scope.sort_order    is 'Display order in role permissions management screens. Lower value first.';

create table master_allergen (
  master_allergen_pk  uuid        not null default gen_random_uuid(),
  allergen_code       text        not null,
  allergen_name       text        not null,
  description         text,
  is_active           boolean     not null default true,
  sort_order          integer     not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint master_allergen_pk        primary key (master_allergen_pk),
  constraint uq_master_allergen_code   unique      (allergen_code)
);
comment on table  master_allergen is
  'SAFETY-CRITICAL. Controlled allergen registry. Referenced by: '
  'consumer_allergen_preference (what a consumer wants to avoid) and '
  'catalog_bag_template_allergen (what a bag contains). '
  'Stored as a master table NOT as an enum — new allergens added without schema migrations. '
  'The drop detail page and order confirmation MUST cross-reference these two tables '
  'and surface a prominent warning if the consumer avoids any allergen present in the bag. '
  'Seed (FSSAI-listed 14): DAIRY, EGGS, FISH, SHELLFISH, PEANUTS, NUTS, WHEAT_GLUTEN, '
  'SOY, SESAME, MUSTARD, CELERY, LUPIN, MOLLUSCS, SULPHITES.';
comment on column master_allergen.allergen_code is 'UPPER_SNAKE_CASE. Referenced by both consumer preference and bag disclosure tables. Example: DAIRY, GLUTEN, NUTS.';
comment on column master_allergen.sort_order    is 'Controls display order on allergen chips and preference screens. Common allergens (DAIRY, WHEAT_GLUTEN) get low sort_order.';

create table master_cuisine (
  master_cuisine_pk   uuid        not null default gen_random_uuid(),
  cuisine_code        text        not null,
  cuisine_name        text        not null,
  description         text,
  is_active           boolean     not null default true,
  sort_order          integer     not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint master_cuisine_pk       primary key (master_cuisine_pk),
  constraint uq_master_cuisine_code  unique      (cuisine_code)
);
comment on table  master_cuisine is
  'Cuisine type reference used by restaurant_cuisine_map (restaurant tagging) '
  'and drop discovery filter API. '
  'Seed: SOUTH_INDIAN, NORTH_INDIAN, BIRYANI, HYDERABADI, CHINESE, CONTINENTAL, '
  'SEAFOOD, ITALIAN, MUGHLAI, STREET_FOOD, DESSERTS, BAKERY, MULTI_CUISINE.';
comment on column master_cuisine.cuisine_code is 'UPPER_SNAKE_CASE. Used as filter value in /drops discovery API. Example: SOUTH_INDIAN, BIRYANI.';

create table master_audience_segment (
  master_audience_segment_pk  uuid        not null default gen_random_uuid(),
  segment_code                text        not null,
  segment_name                text        not null,
  description                 text,
  is_active                   boolean     not null default true,
  sort_order                  integer     not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint master_audience_segment_pk       primary key (master_audience_segment_pk),
  constraint uq_master_audience_segment_code  unique      (segment_code)
);
comment on table  master_audience_segment is
  'Drop audience targeting segments. Rows in drop_audience link a drop to one or more segments. '
  'If a drop has NO drop_audience rows it is visible to ALL_USERS with no eligibility check. '
  'When segments exist, middleware MUST enforce eligibility before allowing claim: '
  'SWAAD_CLUB → active consumer_subscription required; '
  'RESTAURANT_FOLLOWERS → consumer_saved_restaurant row required; '
  'WHATSAPP_INSIDERS → consumer in a marketing WhatsApp group (app-managed flag). '
  'Seed: ALL_USERS, SWAAD_CLUB, WHATSAPP_INSIDERS, RESTAURANT_FOLLOWERS, EARLY_ACCESS.';
comment on column master_audience_segment.segment_code is 'UPPER_SNAKE_CASE. Eligibility enforcement logic per code documented in api-and-middleware-guidelines.md.';

create table master_storage_visibility (
  master_storage_visibility_pk  uuid        not null default gen_random_uuid(),
  visibility_code               text        not null,
  visibility_name               text        not null,
  description                   text,
  is_public_readable            boolean     not null default false,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint master_storage_visibility_pk       primary key (master_storage_visibility_pk),
  constraint uq_master_storage_visibility_code  unique      (visibility_code)
);
comment on table  master_storage_visibility is
  'Access posture for files tracked in storage_object. Drives Supabase Storage bucket policy. '
  'Seed: '
  'PUBLIC_CDN (restaurant/drop images; served via CDN without auth; is_public_readable=true), '
  'AUTHENTICATED_ONLY (receipts, order exports; presigned URL, owner only), '
  'SERVICE_ONLY (KYC/FSSAI/payout docs; NEVER browser-accessible; presigned from service role only), '
  'OWNER_ONLY (personal consumer uploads; owner only).';
comment on column master_storage_visibility.is_public_readable is 'When true, Supabase Storage policy allows anonymous CDN read. API MUST NOT require auth for download URLs of these objects.';

create table master_document_type (
  master_document_type_pk   uuid        not null default gen_random_uuid(),
  type_code                 text        not null,
  type_name                 text        not null,
  description               text,
  is_required               boolean     not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint master_document_type_pk       primary key (master_document_type_pk),
  constraint uq_master_document_type_code  unique      (type_code)
);
comment on table  master_document_type is
  'Classifies compliance documents in restaurant_document. '
  'is_required=true → restaurant_onboarding_task auto-created; '
  'restaurant cannot transition to ACTIVE status without all required docs APPROVED. '
  'Seed (required): FSSAI_LICENSE, GST_CERTIFICATE, PAN_CARD, BANK_CANCELLED_CHEQUE. '
  'Seed (optional): FOOD_SAFETY_AUDIT, MENU_CARD, IDENTITY_PROOF.';
comment on column master_document_type.is_required is 'When true, this document is mandatory before restaurant_restaurant.restaurant_status_code can advance to ACTIVE.';

create table master_document_status (
  master_document_status_pk   uuid        not null default gen_random_uuid(),
  status_code                 text        not null,
  status_name                 text        not null,
  description                 text,
  is_terminal                 boolean     not null default false,
  sort_order                  integer     not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint master_document_status_pk       primary key (master_document_status_pk),
  constraint uq_master_document_status_code  unique      (status_code)
);
comment on table  master_document_status is
  'Document verification lifecycle for restaurant_document rows. '
  'Seed: PENDING_REVIEW (default, newly uploaded), UNDER_REVIEW (admin reviewing), '
  'APPROVED (terminal, verified), REJECTED (terminal, rejection_reason required), '
  'EXPIRED (terminal, document past expiry date).';
comment on column master_document_status.is_terminal is 'When true, no further transitions expected. Used to filter open vs closed document reviews in admin queue.';

create table master_support_ticket_type (
  master_support_ticket_type_pk   uuid        not null default gen_random_uuid(),
  type_code                       text        not null,
  type_name                       text        not null,
  description                     text,
  is_active                       boolean     not null default true,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint master_support_ticket_type_pk       primary key (master_support_ticket_type_pk),
  constraint uq_master_support_ticket_type_code  unique      (type_code)
);
comment on table  master_support_ticket_type is
  'Support ticket classification for routing and SLA assignment. '
  'Seed: ORDER_ISSUE, REFUND_REQUEST, FOOD_SAFETY, PACKAGING_COMPLAINT, '
  'DIETARY_MISMATCH, MISSING_PICKUP, ACCOUNT_ISSUE, RESTAURANT_ONBOARDING, '
  'BILLING_QUERY, GENERAL.';

create table master_support_ticket_status (
  master_support_ticket_status_pk   uuid        not null default gen_random_uuid(),
  status_code                       text        not null,
  status_name                       text        not null,
  description                       text,
  is_terminal                       boolean     not null default false,
  sort_order                        integer     not null default 0,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  constraint master_support_ticket_status_pk       primary key (master_support_ticket_status_pk),
  constraint uq_master_support_ticket_status_code  unique      (status_code)
);
comment on table  master_support_ticket_status is
  'Support ticket lifecycle states. '
  'Seed: OPEN (default, awaiting agent), IN_PROGRESS (assigned), '
  'PENDING_CUSTOMER (waiting on consumer response), PENDING_MERCHANT (waiting on restaurant), '
  'RESOLVED (terminal), CLOSED (terminal, post-resolution confirmation), '
  'REJECTED (terminal, not a valid ticket).';

create table master_support_ticket_priority (
  master_support_ticket_priority_pk   uuid        not null default gen_random_uuid(),
  priority_code                       text        not null,
  priority_name                       text        not null,
  description                         text,
  sla_first_response_minutes          integer,
  sort_order                          integer     not null default 0,
  created_at                          timestamptz not null default now(),
  updated_at                          timestamptz not null default now(),
  constraint master_support_ticket_priority_pk       primary key (master_support_ticket_priority_pk),
  constraint uq_master_support_ticket_priority_code  unique      (priority_code)
);
comment on table  master_support_ticket_priority is
  'Support ticket priority levels with SLA targets. '
  'Seed: CRITICAL (30 min, food safety incidents), HIGH (120 min, payment failures), '
  'NORMAL (480 min, standard), LOW (2880 min, general queries). '
  'sla_first_response_minutes used to compute support_ticket.sla_due_at at ticket creation.';
comment on column master_support_ticket_priority.sla_first_response_minutes is 'Target minutes to first agent response from ticket creation. NULL = no SLA defined. Used to set support_ticket.sla_due_at.';

create table master_incident_type (
  master_incident_type_pk   uuid        not null default gen_random_uuid(),
  type_code                 text        not null,
  type_name                 text        not null,
  description               text,
  is_active                 boolean     not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint master_incident_type_pk       primary key (master_incident_type_pk),
  constraint uq_master_incident_type_code  unique      (type_code)
);
comment on table  master_incident_type is
  'Food safety and operational incident classification. '
  'Seed: DIETARY_MISMATCH (wrong dietary category served), '
  'FOOD_SAFETY (contamination/illness risk), PACKAGING_BREACH (damaged packaging), '
  'PICKUP_NOT_HONORED (restaurant refused pickup), MISSING_ORDER (no record at restaurant), '
  'QUALITY_ISSUE (below stated standard), PLATFORM_ERROR (system caused issue).';

create table master_incident_status (
  master_incident_status_pk   uuid        not null default gen_random_uuid(),
  status_code                 text        not null,
  status_name                 text        not null,
  description                 text,
  is_terminal                 boolean     not null default false,
  sort_order                  integer     not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint master_incident_status_pk       primary key (master_incident_status_pk),
  constraint uq_master_incident_status_code  unique      (status_code)
);
comment on table  master_incident_status is
  'Incident lifecycle states. '
  'Seed: OPEN (newly filed), TRIAGED (severity assessed), INVESTIGATING (active), '
  'MERCHANT_ACTION_REQUIRED (waiting on restaurant), RESOLVED (terminal, root cause identified), '
  'CLOSED (terminal, post-resolution review complete), REJECTED (terminal, invalid incident).';

create table master_incident_severity (
  master_incident_severity_pk   uuid        not null default gen_random_uuid(),
  severity_code                 text        not null,
  severity_name                 text        not null,
  description                   text,
  sort_order                    integer     not null default 0,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint master_incident_severity_pk       primary key (master_incident_severity_pk),
  constraint uq_master_incident_severity_code  unique      (severity_code)
);
comment on table  master_incident_severity is
  'Incident severity for escalation and SLA. '
  'Seed: P1 (food safety risk, immediate escalation), P2 (payment or dietary issue, urgent), '
  'P3 (quality complaint, standard handling), P4 (minor, informational).';

-- =============================================================================
-- SECTION 2 — Geography  (geo_)
-- =============================================================================

create table geo_city (
  geo_city_pk     uuid        not null default gen_random_uuid(),
  city_code       text        not null,
  city_name       text        not null,
  state_name      text        not null,
  country_code    text        not null default 'IN',
  currency_code   text        not null default 'INR',
  timezone_name   text        not null default 'Asia/Kolkata',
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint geo_city_pk       primary key (geo_city_pk),
  constraint uq_geo_city_code  unique      (city_code)
);
comment on table  geo_city is
  'Cities where goZaika operates or plans to operate. '
  'First launch city: HYD (Hyderabad). New cities configured here '
  'before any restaurant or drop can be associated with them. '
  'is_active=false means city is configured but not yet publicly launched; '
  'drops in this city are excluded from consumer discovery. '
  'city_code used as URL segment (/cities/hyd) and in config_runtime_setting scope filtering.';
comment on column geo_city.city_code      is 'Short UPPER_CASE code. Immutable once drops or restaurants exist. Seed: HYD. Future: BLR, MUM, DEL.';
comment on column geo_city.is_active      is 'false = city pre-configured but not yet launched. Flip to true at city launch event.';
comment on column geo_city.timezone_name  is 'IANA timezone. Used to interpret pickup windows and schedule notifications. Default: Asia/Kolkata.';

create table geo_neighborhood (
  geo_neighborhood_pk   uuid        not null default gen_random_uuid(),
  geo_city_fk           uuid        not null,
  neighborhood_code     text        not null,
  neighborhood_name     text        not null,
  is_active             boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint geo_neighborhood_pk              primary key (geo_neighborhood_pk),
  constraint uq_geo_neighborhood_city_code    unique      (geo_city_fk, neighborhood_code),
  constraint fk_geo_neighborhood_city         foreign key (geo_city_fk)
                                              references  geo_city (geo_city_pk)
                                              on delete   restrict
);
comment on table  geo_neighborhood is
  'Sub-city areas for drop discovery filtering. '
  'Primary consumer discovery path: city → neighborhood → drops. '
  'Seed HYD: JUBILEE_HILLS, BANJARA_HILLS, GACHIBOWLI, KONDAPUR, HITECH_CITY, '
  'MADHAPUR, BEGUMPET, AMEERPET, SECUNDERABAD, TOLICHOWKI, KUKATPALLY.';
comment on column geo_neighborhood.neighborhood_code is 'UPPER_SNAKE_CASE unique within a city. Used as /drops filter parameter.';
create index idx_geo_neighborhood_city on geo_neighborhood (geo_city_fk);

create table geo_address (
  geo_address_pk        uuid          not null default gen_random_uuid(),
  line_1                text          not null,
  line_2                text,
  landmark              text,
  geo_city_fk           uuid          not null,
  geo_neighborhood_fk   uuid,
  postal_code           text,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  google_place_id       text,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  constraint geo_address_pk             primary key (geo_address_pk),
  constraint fk_geo_address_city        foreign key (geo_city_fk)
                                        references  geo_city (geo_city_pk)
                                        on delete   restrict,
  constraint fk_geo_address_neighborhood foreign key (geo_neighborhood_fk)
                                         references  geo_neighborhood (geo_neighborhood_pk)
                                         on delete   set null,
  constraint ck_geo_address_lat         check (latitude  is null or latitude  between -90  and 90),
  constraint ck_geo_address_lng         check (longitude is null or longitude between -180 and 180)
);
comment on table  geo_address is
  'Physical addresses for restaurant locations. PostGIS not used at launch — '
  'Hyderabad discovery is city/neighborhood-led. latitude/longitude support map pin display. '
  'Referenced by restaurant_restaurant.geo_address_fk. One address per restaurant location.';
comment on column geo_address.landmark        is 'Human-readable nearby landmark for pickup instructions. Example: "Near Inorbit Mall gate 2". Displayed on drop detail page and order confirmation QR screen.';
comment on column geo_address.latitude        is 'WGS-84 decimal degrees. Required for Google Maps pin on drop detail and restaurant profile pages. Validated -90 to +90.';
comment on column geo_address.longitude       is 'WGS-84 decimal degrees. Required for Google Maps pin. Validated -180 to +180.';
comment on column geo_address.google_place_id is 'Google Places API place_id for the restaurant location. Enables rich map integration and future directions feature.';
create index idx_geo_address_city         on geo_address (geo_city_fk);
create index idx_geo_address_neighborhood on geo_address (geo_neighborhood_fk) where geo_neighborhood_fk is not null;

-- =============================================================================
-- SECTION 3 — Identity and Access Management  (iam_)
-- =============================================================================

create table iam_profile (
  iam_profile_pk        uuid        not null default gen_random_uuid(),
  auth_user_fk          uuid        not null,
  phone_e164            text,
  email_address         citext,
  display_name          text,
  default_city_fk       uuid,
  is_consumer           boolean     not null default true,
  is_restaurant_user    boolean     not null default false,
  is_platform_user      boolean     not null default false,
  last_seen_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint iam_profile_pk              primary key (iam_profile_pk),
  constraint uq_iam_profile_auth_user    unique      (auth_user_fk),
  constraint fk_iam_profile_auth_user    foreign key (auth_user_fk)
                                         references  auth.users (id)
                                         on delete   restrict,
  constraint fk_iam_profile_default_city foreign key (default_city_fk)
                                          references  geo_city (geo_city_pk)
                                          on delete   set null
);
comment on table  iam_profile is
  'Central identity record. Every actor (consumer, restaurant staff, platform admin) '
  'maps auth.users → iam_profile 1:1. Business state NEVER lives in auth.users. '
  'is_consumer / is_restaurant_user / is_platform_user are denormalised from membership tables '
  'for fast RLS checks — MUST be kept in sync by application code on any membership change. '
  'Created immediately after first successful Supabase Auth OTP verification.';
comment on column iam_profile.auth_user_fk       is 'FK to auth.users.id (Supabase Auth UUID). Used in RLS (auth.uid() = auth_user_fk). RESTRICT delete: only removed via DPDP privacy_erasure_request workflow.';
comment on column iam_profile.phone_e164         is 'E.164 format (+91XXXXXXXXXX). Primary login for consumers. Partial unique index prevents duplicates. Set at OTP signup.';
comment on column iam_profile.email_address      is 'citext (case-insensitive). Login for restaurant admins and platform staff. Also captured for consumers who add email. Partial unique index.';
comment on column iam_profile.is_consumer        is 'Denormalised: true when consumer_profile exists. Set by app on consumer_profile creation. Used in RLS helper current_is_consumer().';
comment on column iam_profile.is_restaurant_user is 'Denormalised: true when ≥1 active restaurant_team_membership. Maintained on membership changes. Gates restaurant portal access.';
comment on column iam_profile.is_platform_user   is 'Denormalised: true when ≥1 active iam_platform_membership. Maintained on membership changes. Gates admin portal access.';
comment on column iam_profile.last_seen_at       is 'Updated by auth middleware on each authenticated API call. Used for DAU/MAU analytics. Not a security field — not used for session expiry decisions.';
create unique index uq_iam_profile_phone on iam_profile (phone_e164)    where phone_e164    is not null;
create unique index uq_iam_profile_email on iam_profile (email_address)  where email_address is not null;
create        index idx_iam_profile_city  on iam_profile (default_city_fk) where default_city_fk is not null;
create table iam_platform_role (
  iam_platform_role_pk    uuid        not null default gen_random_uuid(),
  role_code               text        not null,
  role_name               text        not null,
  description             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint iam_platform_role_pk       primary key (iam_platform_role_pk),
  constraint uq_iam_platform_role_code  unique      (role_code)
);
comment on table  iam_platform_role is
  'Platform admin role definitions. Assigned via iam_platform_membership. '
  'Capabilities granted via iam_platform_role_scope. '
  'Seed: SUPER_ADMIN (unrestricted), SUPPORT_ADMIN (consumer/merchant support + refunds), '
  'FINANCE_ADMIN (settlements, invoices, reconciliation), '
  'OPS_ADMIN (restaurant onboarding, configuration, incidents).';

create table iam_platform_membership (
  iam_platform_membership_pk    uuid        not null default gen_random_uuid(),
  iam_profile_fk                uuid        not null,
  iam_platform_role_fk          uuid        not null,
  is_active                     boolean     not null default true,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint iam_platform_membership_pk       primary key (iam_platform_membership_pk),
  constraint uq_iam_platform_membership       unique      (iam_profile_fk, iam_platform_role_fk),
  constraint fk_iam_platform_membership_profile foreign key (iam_profile_fk)
                                                references  iam_profile (iam_profile_pk)
                                                on delete   cascade,
  constraint fk_iam_platform_membership_role    foreign key (iam_platform_role_fk)
                                                references  iam_platform_role (iam_platform_role_pk)
                                                on delete   restrict
);
comment on table  iam_platform_membership is
  'SERVICE-ROLE WRITE ONLY. Assigns platform admin roles to iam_profiles. '
  'Browser clients must never create or modify. '
  'When membership created: set iam_profile.is_platform_user = true. '
  'When all memberships deactivated: set is_platform_user = false and revoke Supabase session. '
  'CASCADE on iam_profile ensures DPDP erasure removes memberships cleanly.';
comment on column iam_platform_membership.is_active is 'Soft-disable: false = access suspended without deleting audit trail. Revoke Supabase session when last active membership is deactivated.';
create index idx_iam_platform_membership_profile on iam_platform_membership (iam_profile_fk, is_active);

create table iam_platform_role_scope (
  iam_platform_role_scope_pk    uuid        not null default gen_random_uuid(),
  iam_platform_role_fk          uuid        not null,
  master_scope_fk               uuid        not null,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint iam_platform_role_scope_pk       primary key (iam_platform_role_scope_pk),
  constraint uq_iam_platform_role_scope       unique      (iam_platform_role_fk, master_scope_fk),
  constraint fk_iam_platform_role_scope_role  foreign key (iam_platform_role_fk)
                                              references  iam_platform_role (iam_platform_role_pk)
                                              on delete   cascade,
  constraint fk_iam_platform_role_scope_scope foreign key (master_scope_fk)
                                              references  master_scope (master_scope_pk)
                                              on delete   restrict
);
comment on table  iam_platform_role_scope is
  'Fine-grained capability grants for platform admin roles. '
  'Middleware has_platform_scope(scope_code) checks via join: '
  'iam_platform_membership → iam_platform_role_scope → master_scope. '
  'CASCADE on role keeps rows clean when a role is deleted.';

create table restaurant_team_role (
  restaurant_team_role_pk   uuid        not null default gen_random_uuid(),
  role_code                 text        not null,
  role_name                 text        not null,
  description               text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint restaurant_team_role_pk       primary key (restaurant_team_role_pk),
  constraint uq_restaurant_team_role_code  unique      (role_code)
);
comment on table  restaurant_team_role is
  'Restaurant staff role definitions. Capabilities via restaurant_team_role_scope. '
  'Seed: OWNER (full access, billing, team management), '
  'ADMIN (drops + analytics + team), OPERATIONS (drop create/manage, order view), '
  'PICKUP_STAFF (pickup verification only — staff app only), '
  'FINANCE (financial reports and invoice access, read-only).';

create table restaurant_team_role_scope (
  restaurant_team_role_scope_pk   uuid        not null default gen_random_uuid(),
  restaurant_team_role_fk         uuid        not null,
  master_scope_fk                 uuid        not null,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint restaurant_team_role_scope_pk       primary key (restaurant_team_role_scope_pk),
  constraint uq_restaurant_team_role_scope        unique      (restaurant_team_role_fk, master_scope_fk),
  constraint fk_restaurant_team_role_scope_role   foreign key (restaurant_team_role_fk)
                                                  references  restaurant_team_role (restaurant_team_role_pk)
                                                  on delete   cascade,
  constraint fk_restaurant_team_role_scope_scope  foreign key (master_scope_fk)
                                                  references  master_scope (master_scope_pk)
                                                  on delete   restrict
);
comment on table  restaurant_team_role_scope is
  'Fine-grained capability grants for restaurant team roles. '
  'Middleware has_restaurant_scope(restaurant_id, scope_code) checks via join: '
  'restaurant_team_membership → restaurant_team_role_scope → master_scope. '
  'CASCADE on role keeps rows clean.';

-- restaurant_team_membership declared here (IAM section) but FK to
-- restaurant_restaurant is deferred; added via ALTER TABLE in Section 6.
create table restaurant_team_membership (
  restaurant_team_membership_pk   uuid        not null default gen_random_uuid(),
  restaurant_fk                   uuid        not null,
  iam_profile_fk                  uuid        not null,
  restaurant_team_role_fk         uuid        not null,
  is_active                       boolean     not null default true,
  is_default                      boolean     not null default false,
  invited_by_profile_fk           uuid,
  joined_at                       timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint restaurant_team_membership_pk        primary key (restaurant_team_membership_pk),
  constraint uq_restaurant_team_membership        unique      (restaurant_fk, iam_profile_fk, restaurant_team_role_fk),
  constraint fk_restaurant_team_membership_profile foreign key (iam_profile_fk)
                                                    references  iam_profile (iam_profile_pk)
                                                    on delete   cascade,
  constraint fk_restaurant_team_membership_role    foreign key (restaurant_team_role_fk)
                                                    references  restaurant_team_role (restaurant_team_role_pk)
                                                    on delete   restrict,
  constraint fk_restaurant_team_membership_inviter foreign key (invited_by_profile_fk)
                                                    references  iam_profile (iam_profile_pk)
                                                    on delete   set null
  -- FK to restaurant_restaurant added via ALTER TABLE after Section 6
);
comment on table  restaurant_team_membership is
  'Maps iam_profiles to restaurants with a role. A profile can hold memberships at multiple restaurants. '
  'RLS helper has_restaurant_access(restaurant_id) checks is_active=true here. '
  'On membership create: set iam_profile.is_restaurant_user = true. '
  'On last active membership deactivated: set false. '
  'CASCADE on iam_profile means DPDP erasure removes all memberships.';
comment on column restaurant_team_membership.is_default          is 'Primary restaurant for profiles who manage multiple restaurants. Determines portal landing. One is_default=true per iam_profile recommended (app-enforced).';
comment on column restaurant_team_membership.joined_at           is 'When invited member accepted their invitation. NULL until accepted.';
comment on column restaurant_team_membership.invited_by_profile_fk is 'The profile who sent the team invitation. SET NULL if that profile is later deleted.';
create index idx_restaurant_team_membership_restaurant on restaurant_team_membership (restaurant_fk, iam_profile_fk, is_active);
create index idx_restaurant_team_membership_profile    on restaurant_team_membership (iam_profile_fk, is_active);

-- =============================================================================
-- SECTION 4 — Marketing  (marketing_)
-- =============================================================================

create table marketing_waitlist_lead (
  marketing_waitlist_lead_pk      uuid        not null default gen_random_uuid(),
  full_name                       text        not null,
  email_address                   citext      not null,
  city_text                       text,
  geo_city_fk                     uuid,
  lead_type_code                  text        not null default 'CONSUMER',
  consent_captured_flag           boolean     not null default true,
  source_page_code                text        not null,
  source_campaign_code            text,
  converted_consumer_profile_fk   uuid,
  submitted_at                    timestamptz not null default now(),
  qualified_at                    timestamptz,
  notes                           text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint marketing_waitlist_lead_pk       primary key (marketing_waitlist_lead_pk),
  constraint ck_marketing_waitlist_lead_type  check (lead_type_code in ('CONSUMER','RESTAURANT')),
  constraint fk_marketing_waitlist_lead_city  foreign key (geo_city_fk)
                                              references  geo_city (geo_city_pk)
                                              on delete   set null
  -- FK converted_consumer_profile_fk patched after consumer_profile
);
comment on table  marketing_waitlist_lead is
  'Anonymous consumer interest from the website waitlist form (/). '
  'No auth identity or business profile is created at this stage. '
  'API writes here without authentication; rate-limited at edge. '
  'consent_captured_flag MUST be true before any outbound communication. '
  'When lead converts to consumer, converted_consumer_profile_fk is set for attribution. '
  'DPDP: this record IS consent evidence for launch notifications.';
comment on column marketing_waitlist_lead.consent_captured_flag          is 'DPDP compliance: true = consent checkbox was checked at form submission. Must be true before sending any notification. Immutable after set.';
comment on column marketing_waitlist_lead.source_page_code               is 'Which page/CTA submitted the form. Example: HOME_HERO, CITIES_PAGE. Used for conversion funnel analytics.';
comment on column marketing_waitlist_lead.converted_consumer_profile_fk  is 'Set when this lead later creates a consumer_profile. Enables acquisition attribution and launch-invite priority.';
create index idx_marketing_waitlist_lead_city   on marketing_waitlist_lead (geo_city_fk) where geo_city_fk is not null;
create index idx_marketing_waitlist_lead_status on marketing_waitlist_lead (qualified_at) where qualified_at is not null;

create table marketing_partner_lead (
  marketing_partner_lead_pk       uuid        not null default gen_random_uuid(),
  restaurant_name                 text        not null,
  contact_name                    text        not null,
  email_address                   citext      not null,
  phone_e164                      text,
  city_text                       text,
  geo_city_fk                     uuid,
  cuisine_text                    text,
  estimated_daily_covers_text     text,
  message_text                    text,
  consent_captured_flag           boolean     not null default true,
  source_page_code                text        not null,
  source_campaign_code            text,
  qualification_status_code       text        not null default 'NEW',
  assigned_to_profile_fk          uuid,
  converted_restaurant_fk         uuid,
  converted_support_ticket_fk     uuid,
  submitted_at                    timestamptz not null default now(),
  qualified_at                    timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint marketing_partner_lead_pk              primary key (marketing_partner_lead_pk),
  constraint fk_marketing_partner_lead_city         foreign key (geo_city_fk)
                                                    references  geo_city (geo_city_pk)
                                                    on delete   set null,
  constraint fk_marketing_partner_lead_assigned     foreign key (assigned_to_profile_fk)
                                                    references  iam_profile (iam_profile_pk)
                                                    on delete   set null
  -- converted_restaurant_fk FK patched after restaurant_restaurant
  -- converted_support_ticket_fk FK patched after support_ticket
);
comment on table  marketing_partner_lead is
  'Restaurant partner interest from /for-restaurants page. '
  'No restaurant_restaurant row created immediately. '
  'Ops team qualifies lead, creates onboarding support ticket, then creates restaurant. '
  'qualification_status_code drives admin lead queue.';
comment on column marketing_partner_lead.qualification_status_code is 'NEW: submitted. REVIEWED: admin assessed. QUALIFIED: onboarding started. DISQUALIFIED: not a fit. CONVERTED: restaurant created.';
comment on column marketing_partner_lead.consent_captured_flag     is 'DPDP: consent checkbox checked at submission. Immutable after set.';
create index idx_marketing_partner_lead_status on marketing_partner_lead (qualification_status_code);
create index idx_marketing_partner_lead_city   on marketing_partner_lead (geo_city_fk) where geo_city_fk is not null;

-- =============================================================================
-- SECTION 5 — Privacy  (privacy_)
-- =============================================================================

create table privacy_consent_purpose (
  privacy_consent_purpose_pk    uuid        not null default gen_random_uuid(),
  purpose_code                  text        not null,
  purpose_name                  text        not null,
  description                   text,
  is_required_for_service       boolean     not null default false,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint privacy_consent_purpose_pk       primary key (privacy_consent_purpose_pk),
  constraint uq_privacy_consent_purpose_code  unique      (purpose_code)
);
comment on table  privacy_consent_purpose is
  'DPDP Act: each distinct processing purpose requires separate consent. '
  'is_required_for_service=true means the purpose cannot be revoked without closing the account. '
  'Seed: OPERATIONAL (required, service delivery), MARKETING_EMAIL (optional), '
  'MARKETING_WHATSAPP (optional), ANALYTICS (optional), '
  'REFERRAL_COMMS (optional), PUSH_NOTIFICATIONS (optional).';
comment on column privacy_consent_purpose.is_required_for_service is 'When true, this consent is essential to provide the goZaika service and cannot be independently revoked. Displayed to user as mandatory at signup.';

-- APPEND-ONLY. Never UPDATE or DELETE rows from this table.
create table privacy_consent_event (
  privacy_consent_event_pk      uuid        not null default gen_random_uuid(),
  iam_profile_fk                uuid        not null,
  privacy_consent_purpose_fk    uuid        not null,
  consent_state_code            text        not null,
  policy_version                text        not null,
  capture_source_code           text        not null,
  proof_json                    jsonb       not null default '{}'::jsonb,
  recorded_at                   timestamptz not null default now(),
  recorded_by_profile_fk        uuid,
  constraint privacy_consent_event_pk             primary key (privacy_consent_event_pk),
  constraint fk_privacy_consent_event_profile     foreign key (iam_profile_fk)
                                                  references  iam_profile (iam_profile_pk)
                                                  on delete   cascade,
  constraint fk_privacy_consent_event_purpose     foreign key (privacy_consent_purpose_fk)
                                                  references  privacy_consent_purpose (privacy_consent_purpose_pk)
                                                  on delete   restrict,
  constraint fk_privacy_consent_event_recorder    foreign key (recorded_by_profile_fk)
                                                  references  iam_profile (iam_profile_pk)
                                                  on delete   set null,
  constraint ck_privacy_consent_state             check (consent_state_code in ('GRANTED','REVOKED'))
);
comment on table  privacy_consent_event is
  'APPEND-ONLY. DPDP consent audit ledger. Never UPDATE or DELETE rows. '
  'To determine current consent: query latest row per (iam_profile_fk, privacy_consent_purpose_fk) '
  'ordered by recorded_at DESC. '
  'proof_json stores UI context (screen_name, consent_text_shown, policy_version_text) for legal audit. '
  'Immutability enforced by trigger raise_immutable_error.';
comment on column privacy_consent_event.consent_state_code   is 'GRANTED or REVOKED. Append a REVOKED row to record withdrawal; never delete the GRANTED row.';
comment on column privacy_consent_event.policy_version       is 'Version of the Privacy Policy shown when consent was captured. Example: v1.2, 2024-01-15.';
comment on column privacy_consent_event.capture_source_code  is 'Context of capture. Example: SIGNUP_FLOW, SETTINGS_PAGE, ADMIN_ACTION, SYSTEM_GRANT.';
comment on column privacy_consent_event.proof_json           is 'UI audit context: { "screen_name": "signup_consent", "consent_text_shown": "...", "checkbox_label": "..." }.';
create index idx_privacy_consent_event_profile_purpose on privacy_consent_event (iam_profile_fk, privacy_consent_purpose_fk, recorded_at desc);

create table privacy_retention_policy (
  privacy_retention_policy_pk   uuid        not null default gen_random_uuid(),
  policy_code                   text        not null,
  applies_to_table_name         text        not null,
  retention_days                integer,
  anonymize_after_days          integer,
  purge_after_days              integer,
  legal_hold_supported          boolean     not null default true,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint privacy_retention_policy_pk       primary key (privacy_retention_policy_pk),
  constraint uq_privacy_retention_policy_code  unique      (policy_code)
);
comment on table  privacy_retention_policy is
  'SERVICE-ROLE ONLY. Data retention schedule per table. '
  'Managed by legal/compliance. Enforced by scheduled Edge Function jobs. '
  'Seed policies: ORDER_7Y (order data, 7yr GST), FINANCE_7Y (financial entries, 7yr), '
  'CONSENT_PERMANENT (privacy_consent_event, permanent), AUDIT_3Y (audit_log, 3yr), '
  'ANALYTICS_2Y_5Y (anonymise at 2yr, purge at 5yr), '
  'KYC_5Y_POST_DEACT (restaurant_document, 5yr post-deactivation), '
  'NOTIFICATION_90D (delivery attempts, 90 days).';
comment on column privacy_retention_policy.retention_days       is 'Days to retain row before action. NULL = indefinite.';
comment on column privacy_retention_policy.anonymize_after_days is 'Days after which PII fields are nulled/hashed. Used for analytics_event anonymisation.';
comment on column privacy_retention_policy.purge_after_days     is 'Days after which the row is hard-deleted. Applies after legal_hold expires.';

create table privacy_erasure_request (
  privacy_erasure_request_pk    uuid        not null default gen_random_uuid(),
  iam_profile_fk                uuid        not null,
  erasure_status_code           text        not null default 'REQUESTED',
  requested_reason              text,
  requested_at                  timestamptz not null default now(),
  reviewed_by_profile_fk        uuid,
  reviewed_at                   timestamptz,
  executed_at                   timestamptz,
  rejected_reason               text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint privacy_erasure_request_pk           primary key (privacy_erasure_request_pk),
  constraint fk_privacy_erasure_request_profile   foreign key (iam_profile_fk)
                                                  references  iam_profile (iam_profile_pk)
                                                  on delete   restrict,
  constraint fk_privacy_erasure_request_reviewer  foreign key (reviewed_by_profile_fk)
                                                  references  iam_profile (iam_profile_pk)
                                                  on delete   set null,
  constraint ck_privacy_erasure_status            check (erasure_status_code in
                                                   ('REQUESTED','IN_REVIEW','APPROVED','REJECTED','EXECUTING','COMPLETED','CANCELLED'))
);
comment on table  privacy_erasure_request is
  'DPDP erasure right-to-be-forgotten workflow. '
  'Status machine: REQUESTED → IN_REVIEW → APPROVED | REJECTED → EXECUTING → COMPLETED | CANCELLED. '
  'On EXECUTING: anonymise iam_profile (null phone/email/name), delete consumer PII, '
  'revoke Supabase Auth session, purge Supabase Storage personal uploads. '
  'RETAIN: financial records per retention_policy, consent events (legal proof), audit_log. '
  'RESTRICT on iam_profile delete: profile must remain until erasure is COMPLETED.';
comment on column privacy_erasure_request.erasure_status_code is 'REQUESTED → IN_REVIEW → APPROVED or REJECTED → EXECUTING → COMPLETED. CANCELLED if user withdraws request or admin determines not applicable.';
create index idx_privacy_erasure_status  on privacy_erasure_request (erasure_status_code, requested_at);
create index idx_privacy_erasure_profile on privacy_erasure_request (iam_profile_fk);

-- =============================================================================
-- SECTION 6 — Consumer Domain  (consumer_)
-- =============================================================================

create table consumer_profile (
  consumer_profile_pk       uuid        not null default gen_random_uuid(),
  iam_profile_fk            uuid        not null,
  first_name                text,
  last_name                 text,
  preferred_language_code   text        not null default 'en',
  marketing_source_code     text,
  used_referral_code_fk     uuid,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint consumer_profile_pk         primary key (consumer_profile_pk),
  constraint uq_consumer_profile_iam     unique      (iam_profile_fk),
  constraint fk_consumer_profile_iam     foreign key (iam_profile_fk)
                                         references  iam_profile (iam_profile_pk)
                                         on delete   cascade
  -- used_referral_code_fk FK patched after consumer_referral_code
);
comment on table  consumer_profile is
  'Consumer-specific profile extending iam_profile. Created after first successful OTP login. '
  '1:1 with iam_profile (unique constraint). All preferences are in child tables for extensibility. '
  'used_referral_code_fk records the signup referral for attribution and rewards.';
comment on column consumer_profile.preferred_language_code is 'BCP 47 code. Supported at launch: en, hi. Controls notification language and in-app bilingual content.';
comment on column consumer_profile.marketing_source_code   is 'Acquisition source. Set at signup from UTM params. Immutable. Values: REFERRAL, INSTAGRAM, GOOGLE, APP_STORE, ORGANIC. Used for funnel analytics.';
comment on column consumer_profile.used_referral_code_fk   is 'Another consumer''s referral code used at this consumer''s signup. Set once; never changed. Used to create consumer_referral row. FK patched below.';
create index idx_consumer_profile_iam on consumer_profile (iam_profile_fk);

alter table marketing_waitlist_lead
  add constraint fk_marketing_waitlist_lead_consumer
  foreign key (converted_consumer_profile_fk)
  references consumer_profile (consumer_profile_pk)
  on delete set null;

create table consumer_saved_restaurant (
  consumer_saved_restaurant_pk    uuid        not null default gen_random_uuid(),
  consumer_profile_fk             uuid        not null,
  restaurant_fk                   uuid        not null,
  saved_at                        timestamptz not null default now(),
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint consumer_saved_restaurant_pk       primary key (consumer_saved_restaurant_pk),
  constraint uq_consumer_saved_restaurant       unique      (consumer_profile_fk, restaurant_fk),
  constraint fk_consumer_saved_restaurant_consumer foreign key (consumer_profile_fk)
                                                    references  consumer_profile (consumer_profile_pk)
                                                    on delete   cascade
  -- FK to restaurant_restaurant patched after Section 7
);
comment on table  consumer_saved_restaurant is
  'Consumer follows a restaurant to receive new-drop notifications. '
  'When a drop is published, notification system queries this table to target '
  'consumers who follow the restaurant (respecting consumer_notification_preference). '
  'RESTAURANT_FOLLOWERS audience segment eligibility checked here.';
comment on column consumer_saved_restaurant.saved_at is 'Canonical follow timestamp. Equal to created_at at creation and never changes.';
create index idx_consumer_saved_restaurant_profile    on consumer_saved_restaurant (consumer_profile_fk);
create index idx_consumer_saved_restaurant_restaurant on consumer_saved_restaurant (restaurant_fk);

create table consumer_dietary_preference (
  consumer_dietary_preference_pk    uuid        not null default gen_random_uuid(),
  consumer_profile_fk               uuid        not null,
  dietary_category_code             text        not null,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  constraint consumer_dietary_preference_pk       primary key (consumer_dietary_preference_pk),
  constraint uq_consumer_dietary_preference       unique      (consumer_profile_fk, dietary_category_code),
  constraint fk_consumer_dietary_preference_profile foreign key (consumer_profile_fk)
                                                    references  consumer_profile (consumer_profile_pk)
                                                    on delete   cascade
);
comment on table  consumer_dietary_preference is
  'Consumer dietary requirements. Primary drop discovery filter (/drops page). '
  'A consumer may hold multiple preferences (e.g., VEG and JAIN). '
  'Matched against catalog_bag_template_revision.dietary_category_code for compatibility. '
  'API MUST validate dietary_category_code against: VEG, NON_VEG, JAIN, EGG_ONLY.';
comment on column consumer_dietary_preference.dietary_category_code is 'Valid values: VEG, NON_VEG, JAIN, EGG_ONLY. Text (not enum) for extensibility. Validated at API layer.';

create table consumer_allergen_preference (
  consumer_allergen_preference_pk   uuid        not null default gen_random_uuid(),
  consumer_profile_fk               uuid        not null,
  master_allergen_fk                uuid        not null,
  avoid_flag                        boolean     not null default true,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  constraint consumer_allergen_preference_pk       primary key (consumer_allergen_preference_pk),
  constraint uq_consumer_allergen_preference        unique      (consumer_profile_fk, master_allergen_fk),
  constraint fk_consumer_allergen_pref_profile      foreign key (consumer_profile_fk)
                                                    references  consumer_profile (consumer_profile_pk)
                                                    on delete   cascade,
  constraint fk_consumer_allergen_pref_allergen     foreign key (master_allergen_fk)
                                                    references  master_allergen (master_allergen_pk)
                                                    on delete   restrict
);
comment on table  consumer_allergen_preference is
  'SAFETY-CRITICAL. Allergens a consumer wants to avoid. '
  'The drop detail page and checkout flow MUST cross-reference this against '
  'catalog_bag_template_allergen. A matching allergen MUST display a prominent warning. '
  'goZaika does NOT block purchase (consumer decision) but MUST warn clearly. '
  'avoid_flag always true at launch (no tolerance level feature yet).';
comment on column consumer_allergen_preference.avoid_flag is 'Always true at launch. Reserved for future "I can tolerate small amounts" feature.';

create table consumer_city_preference (
  consumer_city_preference_pk   uuid        not null default gen_random_uuid(),
  consumer_profile_fk           uuid        not null,
  geo_city_fk                   uuid        not null,
  is_default                    boolean     not null default false,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint consumer_city_preference_pk       primary key (consumer_city_preference_pk),
  constraint uq_consumer_city_preference        unique      (consumer_profile_fk, geo_city_fk),
  constraint fk_consumer_city_pref_profile      foreign key (consumer_profile_fk)
                                                references  consumer_profile (consumer_profile_pk)
                                                on delete   cascade,
  constraint fk_consumer_city_pref_city         foreign key (geo_city_fk)
                                                references  geo_city (geo_city_pk)
                                                on delete   restrict
);
comment on table  consumer_city_preference is
  'Cities a consumer browses for drops. is_default=true determines app-open city. '
  'Partial unique index enforces single default per consumer. '
  'UPDATE RULE: within one transaction, SET old default false THEN set new default true.';
comment on column consumer_city_preference.is_default is 'Marks primary city for app-open discovery. Partial unique index enforces at most one default per consumer.';
create unique index uq_consumer_city_preference_default on consumer_city_preference (consumer_profile_fk) where is_default = true;

create table consumer_referral_code (
  consumer_referral_code_pk   uuid        not null default gen_random_uuid(),
  consumer_profile_fk         uuid        not null,
  referral_code               text        not null,
  is_active                   boolean     not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint consumer_referral_code_pk           primary key (consumer_referral_code_pk),
  constraint uq_consumer_referral_code_profile   unique      (consumer_profile_fk),
  constraint uq_consumer_referral_code_value     unique      (referral_code),
  constraint fk_consumer_referral_code_profile   foreign key (consumer_profile_fk)
                                                 references  consumer_profile (consumer_profile_pk)
                                                 on delete   cascade
);
comment on table  consumer_referral_code is
  'One unique referral code per consumer. Auto-generated at consumer_profile creation. '
  'Shared externally (e.g., GZ-A3X9K). When a new consumer signs up using this code, '
  'consumer_profile.used_referral_code_fk is set and a consumer_referral row is created. '
  'is_active=false retires the code (fraud/abuse response).';
comment on column consumer_referral_code.referral_code is 'Short alphanumeric, platform-wide unique. Auto-generated at consumer_profile creation. Example format: GZ-A3X9K.';

alter table consumer_profile
  add constraint fk_consumer_profile_used_referral
  foreign key (used_referral_code_fk)
  references consumer_referral_code (consumer_referral_code_pk)
  on delete set null;
create index idx_consumer_profile_used_referral on consumer_profile (used_referral_code_fk) where used_referral_code_fk is not null;

create table consumer_referral (
  consumer_referral_pk              uuid        not null default gen_random_uuid(),
  referrer_consumer_profile_fk      uuid        not null,
  referred_consumer_profile_fk      uuid        not null,
  referral_status_code              text        not null default 'PENDING',
  qualified_at                      timestamptz,
  rewarded_at                       timestamptz,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  constraint consumer_referral_pk           primary key (consumer_referral_pk),
  constraint uq_consumer_referral_pair       unique      (referrer_consumer_profile_fk, referred_consumer_profile_fk),
  constraint fk_consumer_referral_referrer  foreign key (referrer_consumer_profile_fk)
                                            references  consumer_profile (consumer_profile_pk)
                                            on delete   cascade,
  constraint fk_consumer_referral_referred  foreign key (referred_consumer_profile_fk)
                                            references  consumer_profile (consumer_profile_pk)
                                            on delete   cascade,
  constraint ck_consumer_referral_not_self  check       (referrer_consumer_profile_fk <> referred_consumer_profile_fk),
  constraint ck_consumer_referral_status    check       (referral_status_code in ('PENDING','QUALIFIED','REWARDED','REJECTED'))
);
comment on table  consumer_referral is
  'Referral relationship and reward state. '
  'PENDING when referred user signs up. QUALIFIED after first paid order collected. '
  'REWARDED after credit issued. REJECTED for fraud, self-referral, or cancelled order. '
  'Rewards are intentionally NOT modelled as money here; future wallet/credit ledger will reference this row.';
comment on column consumer_referral.referral_status_code is 'PENDING → QUALIFIED → REWARDED, or REJECTED. QUALIFIED triggered when referred consumer has first COLLECTED paid order.';

create table consumer_subscription_plan (
  consumer_subscription_plan_pk   uuid        not null default gen_random_uuid(),
  plan_code                       text        not null,
  plan_name                       text        not null,
  description                     text,
  billing_interval_code           text        not null,
  price_paise                     bigint      not null,
  currency_code                   text        not null default 'INR',
  is_active                       boolean     not null default true,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint consumer_subscription_plan_pk       primary key (consumer_subscription_plan_pk),
  constraint uq_consumer_subscription_plan_code  unique      (plan_code),
  constraint ck_consumer_subscription_interval   check       (billing_interval_code in ('MONTHLY','QUARTERLY','YEARLY')),
  constraint ck_consumer_subscription_price      check       (price_paise >= 0)
);
comment on table  consumer_subscription_plan is
  'Swaad Club subscription plans. Separate from order payments. '
  'Billing handled via billing_subscription_charge and Razorpay recurring/payment links. '
  'Plan changes create new plan rows or future-dated price changes — do not rewrite historical plan terms.';
comment on column consumer_subscription_plan.price_paise is 'Plan price in paise. 9900 = ₹99. Money stored as integer only.';

create table consumer_subscription (
  consumer_subscription_pk        uuid        not null default gen_random_uuid(),
  consumer_profile_fk             uuid        not null,
  consumer_subscription_plan_fk    uuid        not null,
  subscription_status_code         text        not null default 'ACTIVE',
  started_at                       timestamptz not null default now(),
  current_period_start_at          timestamptz not null,
  current_period_end_at            timestamptz not null,
  cancel_at_period_end_flag        boolean     not null default false,
  cancelled_at                     timestamptz,
  provider_customer_ref            text,
  provider_subscription_ref        text,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  constraint consumer_subscription_pk            primary key (consumer_subscription_pk),
  constraint fk_consumer_subscription_consumer   foreign key (consumer_profile_fk)
                                                 references  consumer_profile (consumer_profile_pk)
                                                 on delete   cascade,
  constraint fk_consumer_subscription_plan       foreign key (consumer_subscription_plan_fk)
                                                 references  consumer_subscription_plan (consumer_subscription_plan_pk)
                                                 on delete   restrict,
  constraint ck_consumer_subscription_status     check       (subscription_status_code in ('ACTIVE','PAST_DUE','CANCELLED','EXPIRED'))
);
comment on table  consumer_subscription is
  'Current and historical Swaad Club subscriptions. '
  'Active benefits exist when subscription_status_code=ACTIVE and now() between current_period_start_at and current_period_end_at. '
  'DO NOT join this into order payment flows; subscription billing is intentionally separate. '
  'cancel_at_period_end_flag indicates user has requested cancellation but still has access until period end.';
comment on column consumer_subscription.provider_subscription_ref is 'Razorpay subscription/payment-link reference. Unique per provider subscription when present.';
create unique index uq_consumer_subscription_provider on consumer_subscription (provider_subscription_ref) where provider_subscription_ref is not null;
create index idx_consumer_subscription_active on consumer_subscription (consumer_profile_fk, subscription_status_code, current_period_end_at);

create table consumer_passport_stat (
  consumer_passport_stat_pk      uuid        not null default gen_random_uuid(),
  consumer_profile_fk            uuid        not null,
  total_bags_collected           integer     not null default 0,
  total_restaurants_visited      integer     not null default 0,
  total_neighborhoods_visited    integer     not null default 0,
  current_tier_code              text        not null default 'BRONZE',
  last_calculated_at             timestamptz not null default now(),
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint consumer_passport_stat_pk        primary key (consumer_passport_stat_pk),
  constraint uq_consumer_passport_stat_cons   unique      (consumer_profile_fk),
  constraint fk_consumer_passport_stat_cons   foreign key (consumer_profile_fk)
                                               references  consumer_profile (consumer_profile_pk)
                                               on delete   cascade,
  constraint ck_consumer_passport_tier        check       (current_tier_code in ('BRONZE','SILVER','GOLD','PLATINUM'))
);
comment on table  consumer_passport_stat is
  'Zayka Passport gamification rollup. Maintained by background job when orders transition to COLLECTED. '
  'This table is a denormalized read model; canonical history remains in order_order and order_status_transition. '
  'Do not use for financial or operational decisions.';
comment on column consumer_passport_stat.total_bags_collected        is 'Number of order items collected, not just order count. Updated after order status COLLECTED.';
comment on column consumer_passport_stat.total_restaurants_visited  is 'Distinct restaurants where this consumer has at least one COLLECTED order.';
comment on column consumer_passport_stat.current_tier_code           is 'Gamification tier. Logic in app/background job. Current values: BRONZE, SILVER, GOLD, PLATINUM.';

create table consumer_notification_preference (
  consumer_notification_preference_pk   uuid        not null default gen_random_uuid(),
  consumer_profile_fk                   uuid        not null,
  channel_code                          text        not null,
  is_enabled                            boolean     not null default true,
  quiet_hours_start_local               time,
  quiet_hours_end_local                 time,
  created_at                            timestamptz not null default now(),
  updated_at                            timestamptz not null default now(),
  constraint consumer_notification_preference_pk      primary key (consumer_notification_preference_pk),
  constraint uq_consumer_notification_preference      unique      (consumer_profile_fk, channel_code),
  constraint fk_consumer_notification_preference_cons foreign key (consumer_profile_fk)
                                                       references  consumer_profile (consumer_profile_pk)
                                                       on delete   cascade,
  constraint ck_consumer_notification_channel         check       (channel_code in ('PUSH','EMAIL','WHATSAPP','SMS'))
);
comment on table  consumer_notification_preference is
  'Per-consumer notification channel preference. Consent still controlled by privacy_consent_event. '
  'To send notification: (1) check latest consent for purpose; (2) check this preference; '
  '(3) resolve destination from iam_profile / notification_device. '
  'Operational messages may override preference only if legally required and consent purpose is OPERATIONAL.';
comment on column consumer_notification_preference.quiet_hours_start_local is 'Local time in the consumer default city. If NULL no quiet-hours suppression.';
comment on column consumer_notification_preference.quiet_hours_end_local   is 'Local time in the consumer default city. Quiet window may cross midnight.';

-- =============================================================================
-- SECTION 7 — Restaurant Domain  (restaurant_)
-- =============================================================================

create table restaurant_restaurant (
  restaurant_restaurant_pk       uuid        not null default gen_random_uuid(),
  restaurant_name                text        not null,
  restaurant_slug                text        not null,
  legal_entity_name              text,
  restaurant_status_code         text        not null default 'PENDING',
  geo_city_fk                    uuid        not null,
  geo_neighborhood_fk            uuid,
  geo_address_fk                 uuid,
  owner_profile_fk               uuid,
  primary_contact_email          citext,
  primary_contact_phone_e164     text,
  pickup_instructions            text,
  COMPUTED_active_drop_count     integer     not null default 0,
  COMPUTED_total_collected_count integer     not null default 0,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint restaurant_restaurant_pk              primary key (restaurant_restaurant_pk),
  constraint uq_restaurant_restaurant_slug         unique      (restaurant_slug),
  constraint fk_restaurant_city                    foreign key (geo_city_fk)
                                                   references  geo_city (geo_city_pk)
                                                   on delete   restrict,
  constraint fk_restaurant_neighborhood            foreign key (geo_neighborhood_fk)
                                                   references  geo_neighborhood (geo_neighborhood_pk)
                                                   on delete   set null,
  constraint fk_restaurant_address                 foreign key (geo_address_fk)
                                                   references  geo_address (geo_address_pk)
                                                   on delete   set null,
  constraint fk_restaurant_owner_profile           foreign key (owner_profile_fk)
                                                   references  iam_profile (iam_profile_pk)
                                                   on delete   set null,
  constraint ck_restaurant_status                  check       (restaurant_status_code in
                                                    ('PENDING','ONBOARDING','ACTIVE','PAUSED','SUSPENDED','OFFBOARDED'))
);
comment on table  restaurant_restaurant is
  'Core restaurant partner record. One row per physical restaurant location. '
  'restaurant_status_code controls operational access: '
  'PENDING = partner lead converted but not onboarded; '
  'ONBOARDING = docs/tasks in progress; '
  'ACTIVE = can publish drops; '
  'PAUSED = restaurant temporarily inactive by choice/ops; '
  'SUSPENDED = platform block, cannot publish/collect; '
  'OFFBOARDED = relationship ended. '
  'pickup-only: no delivery zone, courier, or shipping fields exist by design.';
comment on column restaurant_restaurant.restaurant_slug              is 'URL slug for public profile (/restaurants/[slug]). Stable once public. Must be lowercase-kebab-case, enforced by API.';
comment on column restaurant_restaurant.pickup_instructions          is 'Displayed to consumers on drop detail and order QR screen. Example: "Show QR at billing counter. Pickup from side window."';
comment on column restaurant_restaurant.COMPUTED_active_drop_count   is 'Denormalized count of ACTIVE/SCHEDULED drops. Maintained by COMPUTED_refresh_restaurant_counts trigger. Used for discovery cards.';
comment on column restaurant_restaurant.COMPUTED_total_collected_count is 'Denormalized lifetime collected order count. Maintained by order status transition job/trigger. Used on public profile.';
create index idx_restaurant_city_status         on restaurant_restaurant (geo_city_fk, restaurant_status_code);
create index idx_restaurant_neighborhood_status on restaurant_restaurant (geo_neighborhood_fk, restaurant_status_code) where geo_neighborhood_fk is not null;
create index idx_restaurant_owner_profile       on restaurant_restaurant (owner_profile_fk) where owner_profile_fk is not null;

alter table restaurant_team_membership
  add constraint fk_restaurant_team_membership_restaurant
  foreign key (restaurant_fk)
  references restaurant_restaurant (restaurant_restaurant_pk)
  on delete cascade;

alter table marketing_partner_lead
  add constraint fk_marketing_partner_lead_restaurant
  foreign key (converted_restaurant_fk)
  references restaurant_restaurant (restaurant_restaurant_pk)
  on delete set null;

alter table consumer_saved_restaurant
  add constraint fk_consumer_saved_restaurant_restaurant
  foreign key (restaurant_fk)
  references restaurant_restaurant (restaurant_restaurant_pk)
  on delete cascade;

create table restaurant_public_profile (
  restaurant_public_profile_pk   uuid        not null default gen_random_uuid(),
  restaurant_fk                  uuid        not null,
  headline                       text,
  story_markdown                 text,
  hero_storage_object_fk         uuid,
  logo_storage_object_fk         uuid,
  is_featured                    boolean     not null default false,
  published_at                   timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint restaurant_public_profile_pk        primary key (restaurant_public_profile_pk),
  constraint uq_restaurant_public_profile        unique      (restaurant_fk),
  constraint fk_restaurant_public_profile_rest   foreign key (restaurant_fk)
                                                  references  restaurant_restaurant (restaurant_restaurant_pk)
                                                  on delete   cascade
  -- storage FKs patched after storage_object
);
comment on table restaurant_public_profile is
  'Public-facing restaurant profile content: story, hero image, logo, feature flag. '
  'Published only when restaurant_status_code=ACTIVE and published_at is not null. '
  'Used by /restaurants/[slug] and SEO city pages. '
  'This separates editorial/marketing content from operational restaurant_restaurant data.';
comment on column restaurant_public_profile.story_markdown is 'Markdown story shown on public profile. Sanitise server-side before rendering. Restaurant dignity matters: copy should not frame bags as leftovers.';
comment on column restaurant_public_profile.is_featured    is 'When true, eligible for homepage/city page featured restaurant carousel. Final placement controlled by CMS rules.';

create table restaurant_compliance (
  restaurant_compliance_pk        uuid        not null default gen_random_uuid(),
  restaurant_fk                   uuid        not null,
  fssai_license_number            text,
  fssai_license_expiry_date       date,
  gstin                           text,
  pan_number                      text,
  compliance_status_code          text        not null default 'PENDING',
  last_reviewed_by_profile_fk     uuid,
  last_reviewed_at                timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint restaurant_compliance_pk         primary key (restaurant_compliance_pk),
  constraint uq_restaurant_compliance_rest    unique      (restaurant_fk),
  constraint fk_restaurant_compliance_rest    foreign key (restaurant_fk)
                                                references  restaurant_restaurant (restaurant_restaurant_pk)
                                                on delete   cascade,
  constraint fk_restaurant_compliance_reviewer foreign key (last_reviewed_by_profile_fk)
                                                references  iam_profile (iam_profile_pk)
                                                on delete   set null,
  constraint ck_restaurant_compliance_status  check (compliance_status_code in
                                               ('PENDING','UNDER_REVIEW','APPROVED','REJECTED','EXPIRED'))
);
comment on table restaurant_compliance is
  'Compliance summary for a restaurant. Underlying documents are in restaurant_document. '
  'Admin onboarding flow updates this row. Restaurant cannot become ACTIVE until '
  'compliance_status_code=APPROVED and required documents are APPROVED. '
  'FSSAI license is food-safety critical and surfaced in admin portal.';
comment on column restaurant_compliance.fssai_license_number      is 'FSSAI license number. Required before ACTIVE. Validate format in API where possible.';
comment on column restaurant_compliance.fssai_license_expiry_date is 'If date < current_date, compliance_status_code should become EXPIRED by scheduled job.';
comment on column restaurant_compliance.gstin                     is 'GSTIN for invoices and settlement tax reporting.';
comment on column restaurant_compliance.pan_number                is 'PAN for payout/KYC. Access limited to finance/admin service-role paths.';

create table restaurant_contact (
  restaurant_contact_pk      uuid        not null default gen_random_uuid(),
  restaurant_fk              uuid        not null,
  contact_type_code          text        not null,
  contact_name               text        not null,
  email_address              citext,
  phone_e164                 text,
  is_primary                 boolean     not null default false,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint restaurant_contact_pk       primary key (restaurant_contact_pk),
  constraint fk_restaurant_contact_rest  foreign key (restaurant_fk)
                                         references  restaurant_restaurant (restaurant_restaurant_pk)
                                         on delete   cascade,
  constraint ck_restaurant_contact_type  check (contact_type_code in ('OWNER','MANAGER','FINANCE','PICKUP','SUPPORT','LEGAL'))
);
comment on table restaurant_contact is
  'Operational and legal contacts for a restaurant. '
  'Not all contacts need auth accounts. Contacts differ from restaurant_team_membership: '
  'team_membership grants system access; contact is just communication metadata. '
  'is_primary=true is app-enforced at most one per contact_type_code per restaurant.';
comment on column restaurant_contact.contact_type_code is 'OWNER, MANAGER, FINANCE, PICKUP, SUPPORT, LEGAL. Used for routing notifications and admin escalation.';
create index idx_restaurant_contact_restaurant on restaurant_contact (restaurant_fk, contact_type_code);

create table restaurant_cuisine_map (
  restaurant_cuisine_map_pk   uuid        not null default gen_random_uuid(),
  restaurant_fk               uuid        not null,
  master_cuisine_fk           uuid        not null,
  is_primary                  boolean     not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint restaurant_cuisine_map_pk       primary key (restaurant_cuisine_map_pk),
  constraint uq_restaurant_cuisine_map       unique      (restaurant_fk, master_cuisine_fk),
  constraint fk_restaurant_cuisine_map_rest  foreign key (restaurant_fk)
                                             references  restaurant_restaurant (restaurant_restaurant_pk)
                                             on delete   cascade,
  constraint fk_restaurant_cuisine_map_cuisine foreign key (master_cuisine_fk)
                                               references  master_cuisine (master_cuisine_pk)
                                               on delete   restrict
);
comment on table restaurant_cuisine_map is
  'Cuisine tags for restaurant discovery and filtering. '
  'A restaurant may have multiple cuisines; is_primary=true controls primary badge on cards. '
  'Do not infer bag-specific cuisine from this table — individual bag templates may differ.';
comment on column restaurant_cuisine_map.is_primary is 'Primary cuisine shown on restaurant card. API enforces at most one primary cuisine per restaurant.';
create index idx_restaurant_cuisine_map_cuisine on restaurant_cuisine_map (master_cuisine_fk);

create table restaurant_document (
  restaurant_document_pk        uuid        not null default gen_random_uuid(),
  restaurant_fk                 uuid        not null,
  master_document_type_fk       uuid        not null,
  master_document_status_fk     uuid        not null,
  storage_object_fk             uuid,
  document_number               text,
  issued_at                     date,
  expires_at                    date,
  rejection_reason              text,
  uploaded_by_profile_fk        uuid,
  reviewed_by_profile_fk        uuid,
  reviewed_at                   timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint restaurant_document_pk       primary key (restaurant_document_pk),
  constraint fk_restaurant_document_rest  foreign key (restaurant_fk)
                                           references  restaurant_restaurant (restaurant_restaurant_pk)
                                           on delete   cascade,
  constraint fk_restaurant_document_type  foreign key (master_document_type_fk)
                                           references  master_document_type (master_document_type_pk)
                                           on delete   restrict,
  constraint fk_restaurant_document_status foreign key (master_document_status_fk)
                                            references  master_document_status (master_document_status_pk)
                                            on delete   restrict,
  constraint fk_restaurant_document_uploader foreign key (uploaded_by_profile_fk)
                                              references  iam_profile (iam_profile_pk)
                                              on delete   set null,
  constraint fk_restaurant_document_reviewer foreign key (reviewed_by_profile_fk)
                                              references  iam_profile (iam_profile_pk)
                                              on delete   set null
  -- storage_object_fk FK patched after storage_object
);
comment on table restaurant_document is
  'Compliance/KYC document metadata for a restaurant. File stored in Supabase Storage '
  'and tracked by storage_object_fk. SERVICE_ONLY visibility for KYC/FSSAI/PAN/bank docs. '
  'Admin review updates master_document_status_fk and reviewed_at/by. '
  'Rejected docs require rejection_reason. Expired docs set status EXPIRED by scheduled job.';
comment on column restaurant_document.storage_object_fk is 'FK to storage_object storing the actual document. SERVICE_ONLY visibility expected. Patched after storage_object table.';
comment on column restaurant_document.expires_at        is 'Used by scheduled compliance job to flag EXPIRED document status and pause restaurant if required.';
create index idx_restaurant_document_rest_status on restaurant_document (restaurant_fk, master_document_status_fk);

create table restaurant_payout_account (
  restaurant_payout_account_pk    uuid        not null default gen_random_uuid(),
  restaurant_fk                   uuid        not null,
  account_holder_name             text        not null,
  bank_name                       text,
  masked_account_number           text        not null,
  ifsc_code                       text        not null,
  razorpay_fund_account_ref       text,
  payout_account_status_code      text        not null default 'PENDING',
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint restaurant_payout_account_pk       primary key (restaurant_payout_account_pk),
  constraint uq_restaurant_payout_account_rest  unique      (restaurant_fk),
  constraint fk_restaurant_payout_account_rest  foreign key (restaurant_fk)
                                                 references  restaurant_restaurant (restaurant_restaurant_pk)
                                                 on delete   cascade,
  constraint ck_restaurant_payout_account_status check (payout_account_status_code in
                                                  ('PENDING','VERIFIED','REJECTED','DISABLED'))
);
comment on table restaurant_payout_account is
  'Payout destination for restaurant settlements. Full account number is NOT stored; '
  'only masked_account_number and provider fund-account ref. '
  'SERVICE-ROLE/finance-admin only. Restaurant portal can read masked details, not modify directly after verification.';
comment on column restaurant_payout_account.masked_account_number     is 'Display-safe masked account number only, e.g. XXXX1234. Never store full bank account number in database.';
comment on column restaurant_payout_account.razorpay_fund_account_ref is 'Razorpay fund account identifier used for payouts. Unique when present.';
create unique index uq_restaurant_payout_account_provider on restaurant_payout_account (razorpay_fund_account_ref) where razorpay_fund_account_ref is not null;

create table restaurant_commission_plan (
  restaurant_commission_plan_pk   uuid        not null default gen_random_uuid(),
  plan_code                       text        not null,
  plan_name                       text        not null,
  commission_bps                  integer     not null,
  platform_fee_paise              bigint      not null default 0,
  is_active                       boolean     not null default true,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint restaurant_commission_plan_pk       primary key (restaurant_commission_plan_pk),
  constraint uq_restaurant_commission_plan_code  unique      (plan_code),
  constraint ck_restaurant_commission_bps        check       (commission_bps between 0 and 10000),
  constraint ck_restaurant_platform_fee          check       (platform_fee_paise >= 0)
);
comment on table restaurant_commission_plan is
  'Default commission plans for restaurants. bps = basis points (10000 = 100%). '
  'Used by settlement calculations unless restaurant_commission_override applies. '
  'Example: STANDARD_15 = 1500 bps (15%).';
comment on column restaurant_commission_plan.commission_bps is 'Commission in basis points. 1500 = 15%. Used to compute finance_restaurant_payout_entry commission amounts.';
create table restaurant_commission_override (
  restaurant_commission_override_pk   uuid        not null default gen_random_uuid(),
  restaurant_fk                       uuid        not null,
  restaurant_commission_plan_fk       uuid,
  override_commission_bps             integer,
  override_platform_fee_paise         bigint,
  effective_from_at                   timestamptz not null,
  effective_until_at                  timestamptz,
  reason_text                         text,
  created_by_profile_fk               uuid,
  created_at                          timestamptz not null default now(),
  updated_at                          timestamptz not null default now(),
  constraint restaurant_commission_override_pk      primary key (restaurant_commission_override_pk),
  constraint fk_restaurant_commission_override_rest foreign key (restaurant_fk)
                                                     references restaurant_restaurant (restaurant_restaurant_pk)
                                                     on delete cascade,
  constraint fk_restaurant_commission_override_plan foreign key (restaurant_commission_plan_fk)
                                                     references restaurant_commission_plan (restaurant_commission_plan_pk)
                                                     on delete set null,
  constraint fk_restaurant_commission_override_creator foreign key (created_by_profile_fk)
                                                        references iam_profile (iam_profile_pk)
                                                        on delete set null,
  constraint ck_restaurant_commission_override_bps check (override_commission_bps is null or override_commission_bps between 0 and 10000),
  constraint ck_restaurant_commission_override_fee check (override_platform_fee_paise is null or override_platform_fee_paise >= 0),
  constraint ck_restaurant_commission_override_window check (effective_until_at is null or effective_until_at > effective_from_at)
);
comment on table restaurant_commission_override is
  'Restaurant-specific commission override, time-bounded. '
  'Settlement logic selects active override for order.created_at; if none, uses default plan. '
  'Never edit historical override rows after settlements are locked; create new override.';
comment on column restaurant_commission_override.override_commission_bps is 'If non-null, overrides plan commission_bps for the effective window.';
comment on column restaurant_commission_override.effective_from_at       is 'Inclusive start timestamp. Settlement engine uses order.created_at within [from, until).';
create index idx_restaurant_commission_override_rest_window on restaurant_commission_override (restaurant_fk, effective_from_at, effective_until_at);

create table restaurant_setting (
  restaurant_setting_pk    uuid        not null default gen_random_uuid(),
  restaurant_fk            uuid        not null,
  setting_key              text        not null,
  setting_value_json       jsonb       not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint restaurant_setting_pk       primary key (restaurant_setting_pk),
  constraint uq_restaurant_setting       unique      (restaurant_fk, setting_key),
  constraint fk_restaurant_setting_rest  foreign key (restaurant_fk)
                                         references restaurant_restaurant (restaurant_restaurant_pk)
                                         on delete cascade
);
comment on table restaurant_setting is
  'Per-restaurant configuration overrides. '
  'Examples: default_hold_minutes, pickup_grace_minutes, auto_publish_enabled, '
  'default_pickup_instruction_text, staff_sound_alert_enabled. '
  'Do not store secrets here. setting_value_json shape is validated in API.';
comment on column restaurant_setting.setting_key        is 'Stable snake_case key. Validate against application allowlist to prevent arbitrary config sprawl.';
comment on column restaurant_setting.setting_value_json is 'JSON value for this setting. API owns schema validation.';

create table restaurant_onboarding_task (
  restaurant_onboarding_task_pk   uuid        not null default gen_random_uuid(),
  restaurant_fk                   uuid        not null,
  task_code                       text        not null,
  task_name                       text        not null,
  task_status_code                text        not null default 'PENDING',
  due_at                          timestamptz,
  completed_at                    timestamptz,
  completed_by_profile_fk         uuid,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint restaurant_onboarding_task_pk          primary key (restaurant_onboarding_task_pk),
  constraint uq_restaurant_onboarding_task          unique      (restaurant_fk, task_code),
  constraint fk_restaurant_onboarding_task_rest     foreign key (restaurant_fk)
                                                    references restaurant_restaurant (restaurant_restaurant_pk)
                                                    on delete cascade,
  constraint fk_restaurant_onboarding_task_completed foreign key (completed_by_profile_fk)
                                                     references iam_profile (iam_profile_pk)
                                                     on delete set null,
  constraint ck_restaurant_onboarding_task_status   check (task_status_code in ('PENDING','IN_PROGRESS','BLOCKED','COMPLETED','WAIVED'))
);
comment on table restaurant_onboarding_task is
  'Operational onboarding checklist shown in admin portal and restaurant management portal. '
  'Tasks drive readiness to publish first drop. '
  'Seed per restaurant: UPLOAD_FSSAI, VERIFY_BANK_ACCOUNT, CREATE_FIRST_TEMPLATE, '
  'PUBLISH_FIRST_DROP, TRAIN_PICKUP_STAFF, SET_PICKUP_INSTRUCTIONS.';
comment on column restaurant_onboarding_task.task_status_code is 'PENDING → IN_PROGRESS → COMPLETED, or BLOCKED/WAIVED by admin. Restaurant cannot publish until required tasks complete/waived.';

-- =============================================================================
-- SECTION 8 — Storage Metadata  (storage_)
-- =============================================================================

create table storage_object (
  storage_object_pk              uuid        not null default gen_random_uuid(),
  bucket_name                    text        not null,
  object_path                    text        not null,
  original_filename              text,
  mime_type                      text,
  size_bytes                     bigint,
  checksum_sha256_hex            text,
  master_storage_visibility_fk   uuid        not null,
  uploaded_by_profile_fk         uuid,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint storage_object_pk       primary key (storage_object_pk),
  constraint uq_storage_object_path  unique      (bucket_name, object_path),
  constraint fk_storage_object_visibility foreign key (master_storage_visibility_fk)
                                           references master_storage_visibility (master_storage_visibility_pk)
                                           on delete restrict,
  constraint fk_storage_object_uploader foreign key (uploaded_by_profile_fk)
                                         references iam_profile (iam_profile_pk)
                                         on delete set null,
  constraint ck_storage_object_size check (size_bytes is null or size_bytes >= 0)
);
comment on table storage_object is
  'Metadata pointer to Supabase Storage objects. The binary file lives in Storage; '
  'this row tracks visibility, uploader, filename, checksum, and relationship targets. '
  'Supabase Storage bucket policies MUST mirror master_storage_visibility. '
  'Public images use PUBLIC_CDN. KYC, FSSAI, bank docs use SERVICE_ONLY.';
comment on column storage_object.bucket_name                 is 'Supabase Storage bucket. Launch buckets: public-media, private-documents, exports.';
comment on column storage_object.object_path                 is 'Object key/path in bucket. Unique within bucket. Use stable prefixed paths: restaurants/{id}/hero.jpg, drops/{id}/primary.jpg.';
comment on column storage_object.checksum_sha256_hex         is 'Optional SHA-256 checksum for duplicate detection and tamper audit.';
comment on column storage_object.master_storage_visibility_fk is 'Visibility policy FK. Drives URL-generation logic and Storage RLS.';
create index idx_storage_object_visibility on storage_object (master_storage_visibility_fk);
create index idx_storage_object_uploader   on storage_object (uploaded_by_profile_fk) where uploaded_by_profile_fk is not null;

alter table restaurant_public_profile
  add constraint fk_restaurant_public_profile_hero
  foreign key (hero_storage_object_fk)
  references storage_object (storage_object_pk)
  on delete set null;

alter table restaurant_public_profile
  add constraint fk_restaurant_public_profile_logo
  foreign key (logo_storage_object_fk)
  references storage_object (storage_object_pk)
  on delete set null;

alter table restaurant_document
  add constraint fk_restaurant_document_storage
  foreign key (storage_object_fk)
  references storage_object (storage_object_pk)
  on delete set null;

-- =============================================================================
-- SECTION 9 — Catalog / BAM Bag Templates  (catalog_)
-- =============================================================================

create table catalog_bag_template (
  catalog_bag_template_pk     uuid        not null default gen_random_uuid(),
  restaurant_fk               uuid        not null,
  template_name               text        not null,
  template_status_code        text        not null default 'DRAFT',
  active_revision_fk          uuid,
  created_by_profile_fk       uuid,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint catalog_bag_template_pk       primary key (catalog_bag_template_pk),
  constraint fk_catalog_bag_template_rest  foreign key (restaurant_fk)
                                           references restaurant_restaurant (restaurant_restaurant_pk)
                                           on delete cascade,
  constraint fk_catalog_bag_template_creator foreign key (created_by_profile_fk)
                                             references iam_profile (iam_profile_pk)
                                             on delete set null,
  constraint ck_catalog_bag_template_status check (template_status_code in ('DRAFT','ACTIVE','INACTIVE','ARCHIVED'))
  -- active_revision_fk patched after revision table
);
comment on table catalog_bag_template is
  'Mutable container for a restaurant''s reusable BAM Bag definition. '
  'Actual customer-facing content lives in immutable catalog_bag_template_revision rows. '
  'Publishing a template creates a revision and updates active_revision_fk. '
  'Drops always reference a specific revision to preserve historical disclosure.';
comment on column catalog_bag_template.template_status_code is 'DRAFT: editable. ACTIVE: can be used in drops. INACTIVE: hidden from new drops but history remains. ARCHIVED: retired.';
create index idx_catalog_bag_template_rest_status on catalog_bag_template (restaurant_fk, template_status_code);

create table catalog_bag_template_revision (
  catalog_bag_template_revision_pk  uuid        not null default gen_random_uuid(),
  catalog_bag_template_fk           uuid        not null,
  revision_number                   integer     not null,
  display_name                      text        not null,
  short_description                 text,
  dietary_category_code             text        not null,
  spice_level_code                  text,
  serves_min                        integer,
  serves_max                        integer,
  max_holding_minutes               integer,
  holding_guidance_text             text,
  min_menu_value_paise              bigint,
  suggested_price_paise             bigint,
  allergen_summary_text             text,
  included_item_hint_text           text,
  revision_status_code              text        not null default 'DRAFT',
  published_at                      timestamptz,
  created_by_profile_fk             uuid,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  constraint catalog_bag_template_revision_pk primary key (catalog_bag_template_revision_pk),
  constraint uq_catalog_bag_template_revision unique      (catalog_bag_template_fk, revision_number),
  constraint fk_catalog_bag_template_revision_template foreign key (catalog_bag_template_fk)
                                                        references catalog_bag_template (catalog_bag_template_pk)
                                                        on delete cascade,
  constraint fk_catalog_bag_template_revision_creator  foreign key (created_by_profile_fk)
                                                        references iam_profile (iam_profile_pk)
                                                        on delete set null,
  constraint ck_catalog_bag_revision_dietary check (dietary_category_code in ('VEG','NON_VEG','JAIN','EGG_ONLY')),
  constraint ck_catalog_bag_revision_spice   check (spice_level_code is null or spice_level_code in ('MILD','MEDIUM','HOT','EXTRA_HOT')),
  constraint ck_catalog_bag_revision_serves  check (serves_min is null or serves_max is null or serves_min <= serves_max),
  constraint ck_catalog_bag_revision_value   check (min_menu_value_paise is null or min_menu_value_paise >= 0),
  constraint ck_catalog_bag_revision_price   check (suggested_price_paise is null or suggested_price_paise >= 0),
  constraint ck_catalog_bag_revision_status  check (revision_status_code in ('DRAFT','PUBLISHED','RETIRED'))
);
comment on table catalog_bag_template_revision is
  'IMMUTABLE AFTER PUBLISHED in application logic. Customer-facing BAM Bag disclosure. '
  'Drops reference this exact revision to preserve what was promised at purchase time. '
  'Surprise model: included_item_hint_text may be broad ("chef''s selection of rice + curry") '
  'but allergen_summary_text and catalog_bag_template_allergen MUST be truthful and complete. '
  'No exact menu item list is required, but safety disclosure is non-negotiable.';
comment on column catalog_bag_template_revision.display_name           is 'Customer-facing bag title. Example: "Biryani BAM Bag", "Chef''s Veg Surprise". Snapshotted onto order_order.';
comment on column catalog_bag_template_revision.short_description      is 'Short card/detail copy. Must not say "leftover" or "discount". Should preserve premium/off-menu positioning.';
comment on column catalog_bag_template_revision.dietary_category_code  is 'VEG, NON_VEG, JAIN, EGG_ONLY. Drives dietary badges and filters. Snapshotted onto order_order.';
comment on column catalog_bag_template_revision.max_holding_minutes    is 'Maximum recommended time between preparation and consumption. Used in food-safety display and internal checks.';
comment on column catalog_bag_template_revision.holding_guidance_text  is 'Food-safety guidance shown to restaurants/admins and optionally consumers. Example: "Consume within 2 hours of pickup; keep chilled if not eaten immediately."';
comment on column catalog_bag_template_revision.allergen_summary_text  is 'Human-readable allergen disclosure shown on drop detail and order confirmation. Must match catalog_bag_template_allergen rows.';
comment on column catalog_bag_template_revision.included_item_hint_text is 'Surprise-safe description. Example: "Includes a rice item and chef-selected side." Never promises exact items unless restaurant guarantees them.';
create index idx_catalog_bag_revision_template_status on catalog_bag_template_revision (catalog_bag_template_fk, revision_status_code);

alter table catalog_bag_template
  add constraint fk_catalog_bag_template_active_revision
  foreign key (active_revision_fk)
  references catalog_bag_template_revision (catalog_bag_template_revision_pk)
  on delete set null;

create table catalog_bag_template_allergen (
  catalog_bag_template_allergen_pk  uuid        not null default gen_random_uuid(),
  catalog_bag_template_revision_fk  uuid        not null,
  master_allergen_fk                uuid        not null,
  contains_flag                     boolean     not null default true,
  may_contain_flag                  boolean     not null default false,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  constraint catalog_bag_template_allergen_pk primary key (catalog_bag_template_allergen_pk),
  constraint uq_catalog_bag_template_allergen unique      (catalog_bag_template_revision_fk, master_allergen_fk),
  constraint fk_catalog_bag_allergen_revision foreign key (catalog_bag_template_revision_fk)
                                               references catalog_bag_template_revision (catalog_bag_template_revision_pk)
                                               on delete cascade,
  constraint fk_catalog_bag_allergen_allergen foreign key (master_allergen_fk)
                                               references master_allergen (master_allergen_pk)
                                               on delete restrict
);
comment on table catalog_bag_template_allergen is
  'SAFETY-CRITICAL allergen disclosure per published bag revision. '
  'contains_flag=true means allergen is intentionally present. '
  'may_contain_flag=true means cross-contact risk. '
  'Consumers with matching consumer_allergen_preference MUST see a prominent warning at detail and checkout.';
comment on column catalog_bag_template_allergen.contains_flag    is 'Ingredient intentionally contains this allergen.';
comment on column catalog_bag_template_allergen.may_contain_flag is 'Possible cross-contact / kitchen handling risk. Display as "may contain".';
create index idx_catalog_bag_allergen_allergen on catalog_bag_template_allergen (master_allergen_fk);

create table catalog_bag_template_media (
  catalog_bag_template_media_pk      uuid        not null default gen_random_uuid(),
  catalog_bag_template_revision_fk   uuid        not null,
  storage_object_fk                  uuid        not null,
  media_role_code                    text        not null default 'GALLERY',
  display_order                      integer     not null default 0,
  created_at                         timestamptz not null default now(),
  updated_at                         timestamptz not null default now(),
  constraint catalog_bag_template_media_pk       primary key (catalog_bag_template_media_pk),
  constraint fk_catalog_bag_media_revision       foreign key (catalog_bag_template_revision_fk)
                                                   references catalog_bag_template_revision (catalog_bag_template_revision_pk)
                                                   on delete cascade,
  constraint fk_catalog_bag_media_storage        foreign key (storage_object_fk)
                                                   references storage_object (storage_object_pk)
                                                   on delete restrict,
  constraint ck_catalog_bag_media_role           check (media_role_code in ('PRIMARY','GALLERY','THUMBNAIL'))
);
comment on table catalog_bag_template_media is
  'Images for BAM Bag template revisions. Usually PUBLIC_CDN storage objects. '
  'PRIMARY image shown on drop cards; GALLERY images on detail page. '
  'Media belongs to a revision to avoid changing historical representation of past drops.';
comment on column catalog_bag_template_media.media_role_code is 'PRIMARY, GALLERY, THUMBNAIL. API enforces at most one PRIMARY per revision.';
create index idx_catalog_bag_media_revision_order on catalog_bag_template_media (catalog_bag_template_revision_fk, display_order);

-- =============================================================================
-- SECTION 10 — Drops / Live Inventory  (drop_)
-- =============================================================================

create table drop_recurring_schedule (
  drop_recurring_schedule_pk      uuid        not null default gen_random_uuid(),
  restaurant_fk                   uuid        not null,
  catalog_bag_template_fk         uuid        not null,
  schedule_status_code            text        not null default 'ACTIVE',
  rrule_text                      text        not null,
  default_quantity_total          integer     not null,
  default_price_paise             bigint      not null,
  default_pickup_window_minutes   integer     not null,
  next_run_at                     timestamptz,
  created_by_profile_fk           uuid,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint drop_recurring_schedule_pk       primary key (drop_recurring_schedule_pk),
  constraint fk_drop_recurring_schedule_rest  foreign key (restaurant_fk)
                                              references restaurant_restaurant (restaurant_restaurant_pk)
                                              on delete cascade,
  constraint fk_drop_recurring_schedule_template foreign key (catalog_bag_template_fk)
                                                 references catalog_bag_template (catalog_bag_template_pk)
                                                 on delete restrict,
  constraint fk_drop_recurring_schedule_creator foreign key (created_by_profile_fk)
                                                references iam_profile (iam_profile_pk)
                                                on delete set null,
  constraint ck_drop_recurring_schedule_status check (schedule_status_code in ('ACTIVE','PAUSED','ARCHIVED')),
  constraint ck_drop_recurring_schedule_qty    check (default_quantity_total > 0),
  constraint ck_drop_recurring_schedule_price  check (default_price_paise >= 0),
  constraint ck_drop_recurring_pickup_window   check (default_pickup_window_minutes > 0)
);
comment on table drop_recurring_schedule is
  'Optional RRULE-based automation for future drops. '
  'Background job reads ACTIVE schedules with next_run_at <= now(), creates drop_drop in DRAFT/SCHEDULED, '
  'then advances next_run_at. Restaurants can pause/archive schedules. '
  'RRULE is stored as text because recurrence semantics live in application scheduler.';
comment on column drop_recurring_schedule.rrule_text is 'RFC 5545 RRULE text. Example: FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=17. Validate in application.';

create table drop_drop (
  drop_drop_pk                     uuid        not null default gen_random_uuid(),
  restaurant_fk                    uuid        not null,
  catalog_bag_template_revision_fk uuid        not null,
  drop_recurring_schedule_fk        uuid,
  drop_title                       text        not null,
  drop_status_code                 text        not null default 'DRAFT',
  drop_type_code                   text        not null default 'STANDARD',
  geo_city_fk                      uuid        not null,
  geo_neighborhood_fk              uuid,
  quantity_total                   integer     not null,
  quantity_reserved                integer     not null default 0,
  quantity_sold                    integer     not null default 0,
  quantity_collected               integer     not null default 0,
  price_paise                      bigint      not null,
  currency_code                    text        not null default 'INR',
  publish_at                       timestamptz,
  pickup_start_at                  timestamptz not null,
  pickup_end_at                    timestamptz not null,
  hold_duration_minutes            integer     not null default 10,
  visibility_code                  text        not null default 'PUBLIC',
  created_by_profile_fk            uuid,
  published_by_profile_fk          uuid,
  published_at                     timestamptz,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  constraint drop_drop_pk       primary key (drop_drop_pk),
  constraint fk_drop_restaurant  foreign key (restaurant_fk)
                                 references restaurant_restaurant (restaurant_restaurant_pk)
                                 on delete cascade,
  constraint fk_drop_revision    foreign key (catalog_bag_template_revision_fk)
                                 references catalog_bag_template_revision (catalog_bag_template_revision_pk)
                                 on delete restrict,
  constraint fk_drop_schedule    foreign key (drop_recurring_schedule_fk)
                                 references drop_recurring_schedule (drop_recurring_schedule_pk)
                                 on delete set null,
  constraint fk_drop_city        foreign key (geo_city_fk)
                                 references geo_city (geo_city_pk)
                                 on delete restrict,
  constraint fk_drop_neighborhood foreign key (geo_neighborhood_fk)
                                  references geo_neighborhood (geo_neighborhood_pk)
                                  on delete set null,
  constraint fk_drop_creator     foreign key (created_by_profile_fk)
                                 references iam_profile (iam_profile_pk)
                                 on delete set null,
  constraint fk_drop_publisher   foreign key (published_by_profile_fk)
                                 references iam_profile (iam_profile_pk)
                                 on delete set null,
  constraint ck_drop_status      check (drop_status_code in
                                ('DRAFT','SCHEDULED','ACTIVE','PAUSED','SOLD_OUT','PICKUP_CLOSED','EMERGENCY_CLOSED','CANCELLED')),
  constraint ck_drop_type        check (drop_type_code in ('STANDARD','SPOTLIGHT','CHEF_SPECIAL')),
  constraint ck_drop_visibility  check (visibility_code in ('PUBLIC','PRIVATE_LINK','INTERNAL_ONLY')),
  constraint ck_drop_quantity_total check (quantity_total > 0),
  constraint ck_drop_quantities_nonneg check (quantity_reserved >= 0 and quantity_sold >= 0 and quantity_collected >= 0),
  constraint ck_drop_quantities_bounds check (quantity_reserved + quantity_sold <= quantity_total and quantity_collected <= quantity_sold),
  constraint ck_drop_price       check (price_paise >= 0),
  constraint ck_drop_window      check (pickup_end_at > pickup_start_at),
  constraint ck_drop_hold_minutes check (hold_duration_minutes between 1 and 60)
);
comment on table drop_drop is
  'Live BAM Bag drop/listing. This is the high-contention inventory table. '
  'Consumer claim flow MUST lock this row SELECT ... FOR UPDATE before modifying quantity_reserved/sold. '
  'Status machine: DRAFT → SCHEDULED → ACTIVE → SOLD_OUT/PICKUP_CLOSED. '
  'PAUSED temporarily blocks new holds. EMERGENCY_CLOSED triggers refund workflow for affected orders. '
  'Pickup-only: no delivery fields exist. Realtime subscription publishes quantity changes.';
comment on column drop_drop.quantity_total      is 'Total bags available for this drop. Admin-only adjustment after publish must append drop_inventory_event.';
comment on column drop_drop.quantity_reserved   is 'Temporary held quantity awaiting payment. Incremented on hold create; decremented on payment success or hold expiry.';
comment on column drop_drop.quantity_sold       is 'Paid orders count. Incremented only after payment confirmation converts hold to order.';
comment on column drop_drop.quantity_collected  is 'Collected order count. Incremented on successful pickup verification.';
comment on column drop_drop.price_paise         is 'Consumer-facing price in paise. Snapshotted into order_order/order_item at checkout.';
comment on column drop_drop.hold_duration_minutes is 'Minutes a claim hold remains valid while user completes Razorpay checkout. Default 10.';
create index idx_drop_city_status_pickup         on drop_drop (geo_city_fk, drop_status_code, pickup_start_at);
create index idx_drop_rest_status_pickup         on drop_drop (restaurant_fk, drop_status_code, pickup_start_at);
create index idx_drop_public_active              on drop_drop (geo_city_fk, pickup_start_at) where drop_status_code in ('SCHEDULED','ACTIVE') and visibility_code='PUBLIC';

create table drop_audience (
  drop_audience_pk             uuid        not null default gen_random_uuid(),
  drop_fk                      uuid        not null,
  master_audience_segment_fk   uuid        not null,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint drop_audience_pk       primary key (drop_audience_pk),
  constraint uq_drop_audience       unique      (drop_fk, master_audience_segment_fk),
  constraint fk_drop_audience_drop  foreign key (drop_fk)
                                    references drop_drop (drop_drop_pk)
                                    on delete cascade,
  constraint fk_drop_audience_seg   foreign key (master_audience_segment_fk)
                                    references master_audience_segment (master_audience_segment_pk)
                                    on delete restrict
);
comment on table drop_audience is
  'Audience segment restrictions for a drop. No rows = visible and claimable by all users. '
  'Rows present = user must match at least one segment before claiming. '
  'Visibility filtering and claim eligibility are enforced in API/RLS helper logic.';
create index idx_drop_audience_segment on drop_audience (master_audience_segment_fk);

create table drop_media (
  drop_media_pk        uuid        not null default gen_random_uuid(),
  drop_fk              uuid        not null,
  storage_object_fk    uuid        not null,
  media_role_code      text        not null default 'GALLERY',
  display_order        integer     not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint drop_media_pk       primary key (drop_media_pk),
  constraint fk_drop_media_drop  foreign key (drop_fk)
                                 references drop_drop (drop_drop_pk)
                                 on delete cascade,
  constraint fk_drop_media_storage foreign key (storage_object_fk)
                                   references storage_object (storage_object_pk)
                                   on delete restrict,
  constraint ck_drop_media_role check (media_role_code in ('PRIMARY','GALLERY','THUMBNAIL'))
);
comment on table drop_media is
  'Optional drop-specific images. Overrides or supplements template media. '
  'PRIMARY image used on drop card. Usually PUBLIC_CDN storage. '
  'If absent, API falls back to catalog_bag_template_media for the revision.';
comment on column drop_media.media_role_code is 'PRIMARY, GALLERY, THUMBNAIL. API enforces at most one PRIMARY per drop.';
create index idx_drop_media_drop_order on drop_media (drop_fk, display_order);

create table drop_inventory_hold (
  drop_inventory_hold_pk      uuid        not null default gen_random_uuid(),
  drop_fk                     uuid        not null,
  consumer_profile_fk         uuid        not null,
  hold_status_code            text        not null default 'ACTIVE',
  quantity                    integer     not null default 1,
  idempotency_key             text,
  expires_at                  timestamptz not null,
  converted_order_fk          uuid,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint drop_inventory_hold_pk       primary key (drop_inventory_hold_pk),
  constraint fk_drop_inventory_hold_drop  foreign key (drop_fk)
                                          references drop_drop (drop_drop_pk)
                                          on delete cascade,
  constraint fk_drop_inventory_hold_cons  foreign key (consumer_profile_fk)
                                          references consumer_profile (consumer_profile_pk)
                                          on delete cascade,
  constraint ck_drop_inventory_hold_status check (hold_status_code in ('ACTIVE','CONVERTED','EXPIRED','RELEASED')),
  constraint ck_drop_inventory_hold_qty    check (quantity > 0)
  -- converted_order_fk patched after order_order
);
comment on table drop_inventory_hold is
  'Temporary inventory reservation created when consumer taps Claim. '
  'High-contention write path: API MUST create hold in the same DB transaction that locks drop_drop row and increments quantity_reserved. '
  'hold_status_code: ACTIVE → CONVERTED after payment success/order creation; ACTIVE → EXPIRED by cleanup job; ACTIVE → RELEASED if user cancels. '
  'expires_at is calculated from drop_drop.hold_duration_minutes.';
comment on column drop_inventory_hold.idempotency_key is 'Client/API retry key for hold creation. Unique per consumer when present. Prevents duplicate active holds on network retry.';
comment on column drop_inventory_hold.expires_at      is 'Cleanup job expires ACTIVE holds where expires_at < now(), decrements drop.quantity_reserved, appends inventory event.';
create index idx_drop_inventory_hold_drop_status    on drop_inventory_hold (drop_fk, hold_status_code, expires_at);
create index idx_drop_inventory_hold_consumer       on drop_inventory_hold (consumer_profile_fk, created_at desc);
create unique index uq_drop_inventory_hold_idempotency on drop_inventory_hold (consumer_profile_fk, idempotency_key) where idempotency_key is not null;

-- APPEND-ONLY. Never UPDATE or DELETE.
create table drop_inventory_event (
  drop_inventory_event_pk    uuid        not null default gen_random_uuid(),
  drop_fk                    uuid        not null,
  drop_inventory_hold_fk     uuid,
  order_fk                   uuid,
  event_type_code            text        not null,
  quantity_delta             integer     not null,
  reason_text                text,
  actor_profile_fk           uuid,
  recorded_at                timestamptz not null default now(),
  constraint drop_inventory_event_pk       primary key (drop_inventory_event_pk),
  constraint fk_drop_inventory_event_drop  foreign key (drop_fk)
                                           references drop_drop (drop_drop_pk)
                                           on delete cascade,
  constraint fk_drop_inventory_event_hold  foreign key (drop_inventory_hold_fk)
                                           references drop_inventory_hold (drop_inventory_hold_pk)
                                           on delete set null,
  constraint fk_drop_inventory_event_actor foreign key (actor_profile_fk)
                                           references iam_profile (iam_profile_pk)
                                           on delete set null,
  constraint ck_drop_inventory_event_type  check (event_type_code in
                                           ('HOLD_CREATED','HOLD_EXPIRED','HOLD_RELEASED','HOLD_CONVERTED','ORDER_CANCELLED','PICKUP_COLLECTED','MANUAL_ADJUSTMENT','DROP_CLOSED'))
  -- order_fk patched after order_order
);
comment on table drop_inventory_event is
  'APPEND-ONLY inventory ledger. Every inventory-affecting action writes one row here. '
  'Canonical audit trail for oversell investigations. Do not update/delete. '
  'quantity_delta is signed from available inventory perspective: negative for hold/sale, positive for release/cancel/manual add. '
  'drop_drop counters are denormalized hot-path values; this ledger is the audit source.';
comment on column drop_inventory_event.event_type_code is 'HOLD_CREATED, HOLD_EXPIRED, HOLD_RELEASED, HOLD_CONVERTED, ORDER_CANCELLED, PICKUP_COLLECTED, MANUAL_ADJUSTMENT, DROP_CLOSED.';
comment on column drop_inventory_event.quantity_delta  is 'Signed quantity. Example: HOLD_CREATED = -1, HOLD_EXPIRED = +1, HOLD_CONVERTED = 0 (reserved→sold transfer), MANUAL_ADJUSTMENT may be positive/negative.';
create index idx_drop_inventory_event_drop_time on drop_inventory_event (drop_fk, recorded_at desc);

create table drop_closure_log (
  drop_closure_log_pk     uuid        not null default gen_random_uuid(),
  drop_fk                 uuid        not null,
  closure_type_code       text        not null,
  reason_text             text,
  closed_by_profile_fk    uuid,
  closed_at               timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint drop_closure_log_pk       primary key (drop_closure_log_pk),
  constraint fk_drop_closure_log_drop  foreign key (drop_fk)
                                       references drop_drop (drop_drop_pk)
                                       on delete cascade,
  constraint fk_drop_closure_log_actor foreign key (closed_by_profile_fk)
                                       references iam_profile (iam_profile_pk)
                                       on delete set null,
  constraint ck_drop_closure_type check (closure_type_code in ('SOLD_OUT','PICKUP_WINDOW_ENDED','EMERGENCY','MANUAL_CANCEL','SYSTEM_EXPIRED'))
);
comment on table drop_closure_log is
  'Audit trail for drop closures. Created when drop moves to SOLD_OUT, PICKUP_CLOSED, EMERGENCY_CLOSED, or CANCELLED. '
  'Emergency closures are operationally important: trigger refund workflow and incident review.';
comment on column drop_closure_log.closure_type_code is 'SOLD_OUT, PICKUP_WINDOW_ENDED, EMERGENCY, MANUAL_CANCEL, SYSTEM_EXPIRED.';

-- =============================================================================
-- SECTION 11 — Orders / Pickup  (order_)
-- =============================================================================

create table order_order (
  order_order_pk                 uuid        not null default gen_random_uuid(),
  order_number                   text        not null,
  consumer_profile_fk             uuid        not null,
  restaurant_fk                   uuid        not null,
  drop_fk                         uuid        not null,
  drop_inventory_hold_fk          uuid,
  order_status_code               text        not null default 'CREATED',
  payment_status_code             text        not null default 'PENDING',
  pickup_qr_nonce_hash            text,
  pickup_otp_hash                 text,
  pickup_window_start_at          timestamptz not null,
  pickup_window_end_at            timestamptz not null,
  collected_at                    timestamptz,
  cancelled_at                    timestamptz,
  cancellation_reason             text,
  subtotal_paise                  bigint      not null,
  discount_paise                  bigint      not null default 0,
  tax_paise                       bigint      not null default 0,
  total_paise                     bigint      not null,
  currency_code                   text        not null default 'INR',
  snapshot_restaurant_name        text        not null,
  snapshot_restaurant_slug        text        not null,
  snapshot_drop_title             text        not null,
  snapshot_bag_display_name       text        not null,
  snapshot_dietary_category_code  text        not null,
  snapshot_spice_level_code       text,
  snapshot_allergen_summary_text  text,
  snapshot_serves_text            text,
  snapshot_pickup_instructions    text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint order_order_pk       primary key (order_order_pk),
  constraint uq_order_number      unique      (order_number),
  constraint fk_order_consumer    foreign key (consumer_profile_fk)
                                  references consumer_profile (consumer_profile_pk)
                                  on delete restrict,
  constraint fk_order_restaurant  foreign key (restaurant_fk)
                                  references restaurant_restaurant (restaurant_restaurant_pk)
                                  on delete restrict,
  constraint fk_order_drop        foreign key (drop_fk)
                                  references drop_drop (drop_drop_pk)
                                  on delete restrict,
  constraint fk_order_hold        foreign key (drop_inventory_hold_fk)
                                  references drop_inventory_hold (drop_inventory_hold_pk)
                                  on delete set null,
  constraint ck_order_status      check (order_status_code in
                                  ('CREATED','PAID','CONFIRMED','READY_FOR_PICKUP','COLLECTED','PICKUP_EXPIRED','CANCELLED','REFUNDED')),
  constraint ck_order_payment_status check (payment_status_code in ('PENDING','AUTHORIZED','CAPTURED','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
  constraint ck_order_pickup_window check (pickup_window_end_at > pickup_window_start_at),
  constraint ck_order_amounts_nonneg check (subtotal_paise >= 0 and discount_paise >= 0 and tax_paise >= 0 and total_paise >= 0)
);
comment on table order_order is
  'Customer order created after successful payment confirmation. '
  'Order history reads from snapshot_* columns, NOT mutable restaurant/drop/catalog joins. '
  'Status machine: CREATED → PAID → CONFIRMED → READY_FOR_PICKUP → COLLECTED. '
  'Alternate terminal states: PICKUP_EXPIRED, CANCELLED, REFUNDED. '
  'pickup_qr_nonce_hash and pickup_otp_hash are used by staff app verification; raw QR/OTP values are never stored.';
comment on column order_order.order_number                  is 'Human-friendly unique order ID shown to consumers and staff. Example: GZ-HYD-202604-000123.';
comment on column order_order.pickup_qr_nonce_hash          is 'Hash of nonce embedded in QR. Raw nonce is generated once and shown/cached to consumer; never stored in plaintext.';
comment on column order_order.pickup_otp_hash               is 'Hash of 6-digit OTP fallback. Raw OTP shown to consumer; never stored plaintext.';
comment on column order_order.snapshot_allergen_summary_text is 'Purchase-time allergen disclosure. Never overwritten if template changes later.';
comment on column order_order.snapshot_pickup_instructions   is 'Purchase-time pickup instruction text shown on QR/order screen.';
create index idx_order_consumer_created      on order_order (consumer_profile_fk, created_at desc);
create index idx_order_restaurant_status     on order_order (restaurant_fk, order_status_code, pickup_window_start_at);
create index idx_order_drop_status           on order_order (drop_fk, order_status_code);

alter table drop_inventory_hold
  add constraint fk_drop_inventory_hold_order
  foreign key (converted_order_fk)
  references order_order (order_order_pk)
  on delete set null;

alter table drop_inventory_event
  add constraint fk_drop_inventory_event_order
  foreign key (order_fk)
  references order_order (order_order_pk)
  on delete set null;

create table order_item (
  order_item_pk                   uuid        not null default gen_random_uuid(),
  order_fk                        uuid        not null,
  drop_fk                         uuid        not null,
  catalog_bag_template_revision_fk uuid       not null,
  quantity                        integer     not null default 1,
  unit_price_paise                bigint      not null,
  line_total_paise                bigint      not null,
  snapshot_bag_display_name       text        not null,
  snapshot_dietary_category_code  text        not null,
  snapshot_allergen_summary_text  text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint order_item_pk       primary key (order_item_pk),
  constraint fk_order_item_order foreign key (order_fk)
                                  references order_order (order_order_pk)
                                  on delete cascade,
  constraint fk_order_item_drop  foreign key (drop_fk)
                                  references drop_drop (drop_drop_pk)
                                  on delete restrict,
  constraint fk_order_item_revision foreign key (catalog_bag_template_revision_fk)
                                     references catalog_bag_template_revision (catalog_bag_template_revision_pk)
                                     on delete restrict,
  constraint ck_order_item_qty    check (quantity > 0),
  constraint ck_order_item_price  check (unit_price_paise >= 0 and line_total_paise >= 0)
);
comment on table order_item is
  'Order line items. Launch model is one BAM Bag per order, but table supports future multi-bag checkout. '
  'Snapshot fields preserve purchase-time representation. '
  'line_total_paise should equal quantity * unit_price_paise (application enforced).';
comment on column order_item.snapshot_bag_display_name      is 'Purchase-time bag name copied from catalog_bag_template_revision.display_name.';
comment on column order_item.snapshot_allergen_summary_text is 'Purchase-time allergen disclosure copied from revision.';

-- APPEND-ONLY. Never UPDATE or DELETE.
create table order_status_transition (
  order_status_transition_pk  uuid        not null default gen_random_uuid(),
  order_fk                    uuid        not null,
  from_status_code            text,
  to_status_code              text        not null,
  transition_reason_code      text,
  actor_profile_fk            uuid,
  metadata_json               jsonb       not null default '{}'::jsonb,
  recorded_at                 timestamptz not null default now(),
  constraint order_status_transition_pk       primary key (order_status_transition_pk),
  constraint fk_order_status_transition_order foreign key (order_fk)
                                               references order_order (order_order_pk)
                                               on delete cascade,
  constraint fk_order_status_transition_actor foreign key (actor_profile_fk)
                                               references iam_profile (iam_profile_pk)
                                               on delete set null
);
comment on table order_status_transition is
  'APPEND-ONLY order status audit trail. Each order_order.order_status_code change MUST append one row. '
  'Used for consumer order timeline, support investigations, and audit. '
  'metadata_json may include payment_intent_fk, webhook_event_fk, pickup_verification_event_fk, refund_fk.';
comment on column order_status_transition.transition_reason_code is 'Machine code for why transition happened. Example: PAYMENT_CAPTURED, STAFF_QR_VERIFIED, PICKUP_WINDOW_EXPIRED, ADMIN_CANCELLED.';

-- APPEND-ONLY. Never UPDATE or DELETE.
create table order_pickup_verification_event (
  order_pickup_verification_event_pk uuid        not null default gen_random_uuid(),
  order_fk                           uuid        not null,
  restaurant_fk                      uuid        not null,
  verifying_profile_fk               uuid,
  verification_method_code           text        not null,
  verification_result_code           text        not null,
  idempotency_key                    text,
  device_label                       text,
  failure_reason_text                text,
  recorded_at                        timestamptz not null default now(),
  constraint order_pickup_verification_event_pk       primary key (order_pickup_verification_event_pk),
  constraint fk_pickup_verification_order             foreign key (order_fk)
                                                         references order_order (order_order_pk)
                                                       on delete cascade,
  constraint fk_pickup_verification_restaurant        foreign key (restaurant_fk)
                                                       references restaurant_restaurant (restaurant_restaurant_pk)
                                                       on delete restrict,
  constraint fk_pickup_verification_profile           foreign key (verifying_profile_fk)
                                                       references iam_profile (iam_profile_pk)
                                                       on delete set null,
  constraint ck_pickup_verification_method            check (verification_method_code in ('QR_SCAN','OTP_ENTRY','OFFLINE_SYNC','ADMIN_OVERRIDE')),
  constraint ck_pickup_verification_result            check (verification_result_code in ('SUCCESS','INVALID_CODE','WRONG_RESTAURANT','ALREADY_COLLECTED','EXPIRED_WINDOW','ORDER_NOT_READY','OFFLINE_PENDING'))
);
comment on table order_pickup_verification_event is
  'APPEND-ONLY. Every pickup verification attempt, successful or failed. '
  'Staff app writes one row per QR/OTP scan. Successful verification transitions order to COLLECTED '
  'and increments drop.quantity_collected. Failed attempts are retained for fraud/support investigation. '
  'OFFLINE_SYNC records cached verification replay when staff app reconnects.';
comment on column order_pickup_verification_event.verification_method_code is 'QR_SCAN, OTP_ENTRY, OFFLINE_SYNC, ADMIN_OVERRIDE.';
comment on column order_pickup_verification_event.verification_result_code is 'SUCCESS, INVALID_CODE, WRONG_RESTAURANT, ALREADY_COLLECTED, EXPIRED_WINDOW, ORDER_NOT_READY, OFFLINE_PENDING.';
comment on column order_pickup_verification_event.idempotency_key          is 'Retry/offline sync idempotency key. Unique per order when present. Prevents duplicate collection from staff app retries.';
create index idx_pickup_verification_order_time on order_pickup_verification_event (order_fk, recorded_at desc);
create index idx_pickup_verification_rest_time  on order_pickup_verification_event (restaurant_fk, recorded_at desc);
create unique index uq_pickup_verification_idempotency on order_pickup_verification_event (order_fk, idempotency_key) where idempotency_key is not null;

-- =============================================================================
-- SECTION 12 — Payment, Billing, Finance
-- =============================================================================

create table payment_order_intent (
  payment_order_intent_pk       uuid        not null default gen_random_uuid(),
  order_fk                      uuid,
  drop_inventory_hold_fk        uuid        not null,
  consumer_profile_fk            uuid        not null,
  provider_code                 text        not null default 'RAZORPAY',
  provider_order_ref             text,
  payment_intent_status_code     text        not null default 'CREATED',
  amount_paise                  bigint      not null,
  currency_code                 text        not null default 'INR',
  idempotency_key                text,
  expires_at                    timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint payment_order_intent_pk       primary key (payment_order_intent_pk),
  constraint fk_payment_order_intent_order foreign key (order_fk)
                                            references order_order (order_order_pk)
                                            on delete set null,
  constraint fk_payment_order_intent_hold  foreign key (drop_inventory_hold_fk)
                                            references drop_inventory_hold (drop_inventory_hold_pk)
                                            on delete restrict,
  constraint fk_payment_order_intent_cons  foreign key (consumer_profile_fk)
                                            references consumer_profile (consumer_profile_pk)
                                            on delete restrict,
  constraint ck_payment_order_intent_provider check (provider_code in ('RAZORPAY')),
  constraint ck_payment_order_intent_status check (payment_intent_status_code in
                                           ('CREATED','AUTHORIZED','CAPTURED','FAILED','EXPIRED','CANCELLED')),
  constraint ck_payment_order_intent_amount check (amount_paise >= 0)
);
comment on table payment_order_intent is
  'Order payment intent tied to an inventory hold. '
  'Created before Razorpay checkout opens. order_fk is NULL until payment success creates order_order. '
  'Payment success webhook must atomically set order_fk and payment_intent_status_code=CAPTURED. '
  'idempotency_key protects client retries creating the provider order.';
comment on column payment_order_intent.provider_order_ref is 'Razorpay order_id. Unique when present. Used to correlate webhooks.';
comment on column payment_order_intent.idempotency_key    is 'Client/server retry key for creating payment intent. Unique per consumer when present.';
create unique index uq_payment_order_intent_provider_ref on payment_order_intent (provider_code, provider_order_ref) where provider_order_ref is not null;
create unique index uq_payment_order_intent_idempotency  on payment_order_intent (consumer_profile_fk, idempotency_key) where idempotency_key is not null;

create table payment_transaction (
  payment_transaction_pk       uuid        not null default gen_random_uuid(),
  payment_order_intent_fk      uuid        not null,
  provider_code                text        not null default 'RAZORPAY',
  provider_payment_ref          text        not null,
  transaction_status_code       text        not null,
  amount_paise                 bigint      not null,
  fee_paise                    bigint      not null default 0,
  tax_paise                    bigint      not null default 0,
  payment_method_code           text,
  captured_at                  timestamptz,
  provider_payload_json         jsonb       not null default '{}'::jsonb,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint payment_transaction_pk       primary key (payment_transaction_pk),
  constraint fk_payment_transaction_intent foreign key (payment_order_intent_fk)
                                           references payment_order_intent (payment_order_intent_pk)
                                           on delete cascade,
  constraint uq_payment_transaction_provider unique (provider_code, provider_payment_ref),
  constraint ck_payment_transaction_status check (transaction_status_code in ('AUTHORIZED','CAPTURED','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
  constraint ck_payment_transaction_amount check (amount_paise >= 0 and fee_paise >= 0 and tax_paise >= 0)
);
comment on table payment_transaction is
  'Concrete Razorpay payment transaction. Written from webhook or verified callback. '
  'provider_payload_json stores provider details needed for reconciliation; do not expose to consumers. '
  'A payment_order_intent may have multiple transactions if retries/failures occur.';
comment on column payment_transaction.provider_payment_ref is 'Razorpay payment_id. Unique with provider_code.';
comment on column payment_transaction.payment_method_code  is 'UPI, CARD, NETBANKING, WALLET, etc. Stored from provider payload.';

-- APPEND-ONLY. Never UPDATE or DELETE.
create table payment_webhook_event (
  payment_webhook_event_pk     uuid        not null default gen_random_uuid(),
  provider_code                text        not null default 'RAZORPAY',
  provider_event_id            text        not null,
  event_type_code              text        not null,
  signature_verified_flag      boolean     not null default false,
  raw_payload_json             jsonb       not null,
  processing_status_code       text        not null default 'RECEIVED',
  processed_at                 timestamptz,
  processing_error_text        text,
  received_at                  timestamptz not null default now(),
  constraint payment_webhook_event_pk       primary key (payment_webhook_event_pk),
  constraint uq_payment_webhook_event       unique (provider_code, provider_event_id),
  constraint ck_payment_webhook_status      check (processing_status_code in ('RECEIVED','PROCESSING','PROCESSED','FAILED','IGNORED'))
);
comment on table payment_webhook_event is
  'APPEND-ONLY raw payment provider webhook ledger. '
  'Webhook handler MUST insert this row before mutating payment/order state. '
  'Unique provider_event_id provides idempotency for webhook replays. '
  'signature_verified_flag must be true before processing business effects. '
  'Do not delete; retained for financial audit.';
comment on column payment_webhook_event.raw_payload_json is 'Raw provider payload. May contain PII/provider metadata; service-role only.';
comment on column payment_webhook_event.processing_status_code is 'RECEIVED → PROCESSING → PROCESSED or FAILED/IGNORED. Stored here for operational reconciliation.';

create table payment_refund (
  payment_refund_pk            uuid        not null default gen_random_uuid(),
  order_fk                     uuid        not null,
  payment_transaction_fk       uuid,
  provider_code                text        not null default 'RAZORPAY',
  provider_refund_ref           text,
  refund_status_code            text        not null default 'REQUESTED',
  refund_reason_code            text        not null,
  amount_paise                 bigint      not null,
  idempotency_key              text,
  requested_by_profile_fk       uuid,
  requested_at                 timestamptz not null default now(),
  processed_at                 timestamptz,
  provider_payload_json         jsonb       not null default '{}'::jsonb,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint payment_refund_pk       primary key (payment_refund_pk),
  constraint fk_payment_refund_order foreign key (order_fk)
                                      references order_order (order_order_pk)
                                      on delete restrict,
  constraint fk_payment_refund_txn   foreign key (payment_transaction_fk)
                                      references payment_transaction (payment_transaction_pk)
                                      on delete set null,
  constraint fk_payment_refund_requester foreign key (requested_by_profile_fk)
                                          references iam_profile (iam_profile_pk)
                                          on delete set null,
  constraint ck_payment_refund_status check (refund_status_code in ('REQUESTED','PROCESSING','SUCCEEDED','FAILED','CANCELLED')),
  constraint ck_payment_refund_amount check (amount_paise > 0)
);
comment on table payment_refund is
  'Refund request and provider result. '
  'Refund initiation does NOT directly mutate settlement records. Finance effects are recorded separately '
  'after provider confirmation. Refunds may be linked to support_ticket or incident via their FK fields. '
  'idempotency_key prevents duplicate refund requests from admin/support retries.';
comment on column payment_refund.refund_reason_code is 'Machine reason. Examples: EMERGENCY_CLOSED, RESTAURANT_NO_SHOW, CUSTOMER_SUPPORT, PAYMENT_DUPLICATE, ADMIN_OVERRIDE.';
comment on column payment_refund.idempotency_key    is 'Retry key for refund initiation. Unique per order when present.';
create unique index uq_payment_refund_provider_ref on payment_refund (provider_code, provider_refund_ref) where provider_refund_ref is not null;
create unique index uq_payment_refund_idempotency  on payment_refund (order_fk, idempotency_key) where idempotency_key is not null;

create table billing_subscription_charge (
  billing_subscription_charge_pk  uuid        not null default gen_random_uuid(),
  consumer_subscription_fk        uuid        not null,
  provider_code                   text        not null default 'RAZORPAY',
  provider_payment_ref             text,
  charge_status_code               text        not null default 'PENDING',
  amount_paise                    bigint      not null,
  currency_code                   text        not null default 'INR',
  billing_period_start_at          timestamptz not null,
  billing_period_end_at            timestamptz not null,
  charged_at                      timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint billing_subscription_charge_pk primary key (billing_subscription_charge_pk),
  constraint fk_billing_subscription_charge_sub foreign key (consumer_subscription_fk)
                                                 references consumer_subscription (consumer_subscription_pk)
                                                 on delete cascade,
  constraint ck_billing_subscription_charge_status check (charge_status_code in ('PENDING','PAID','FAILED','REFUNDED')),
  constraint ck_billing_subscription_charge_amount check (amount_paise >= 0),
  constraint ck_billing_subscription_charge_period check (billing_period_end_at > billing_period_start_at)
);
comment on table billing_subscription_charge is
  'Subscription billing charge for Swaad Club. Deliberately separate from payment_order_intent. '
  'Do not reuse order payment flow for subscription charges. '
  'Each paid charge extends/renews consumer_subscription.current_period_end_at.';
comment on column billing_subscription_charge.provider_payment_ref is 'Razorpay payment id for subscription charge. Unique when present.';
create unique index uq_billing_subscription_charge_provider on billing_subscription_charge (provider_code, provider_payment_ref) where provider_payment_ref is not null;

-- APPEND-ONLY. Never UPDATE or DELETE.
create table billing_subscription_event (
  billing_subscription_event_pk   uuid        not null default gen_random_uuid(),
  consumer_subscription_fk        uuid        not null,
  event_type_code                 text        not null,
  event_payload_json              jsonb       not null default '{}'::jsonb,
  recorded_at                     timestamptz not null default now(),
  constraint billing_subscription_event_pk primary key (billing_subscription_event_pk),
  constraint fk_billing_subscription_event_sub foreign key (consumer_subscription_fk)
                                                references consumer_subscription (consumer_subscription_pk)
                                                on delete cascade
);
comment on table billing_subscription_event is
  'APPEND-ONLY event trail for Swaad Club subscription lifecycle. '
  'Events: CREATED, RENEWED, PAYMENT_FAILED, CANCEL_REQUESTED, CANCELLED, EXPIRED, PLAN_CHANGED. '
  'Used for account timeline and support investigations.';
comment on column billing_subscription_event.event_type_code is 'CREATED, RENEWED, PAYMENT_FAILED, CANCEL_REQUESTED, CANCELLED, EXPIRED, PLAN_CHANGED.';

create table finance_settlement_run (
  finance_settlement_run_pk      uuid        not null default gen_random_uuid(),
  restaurant_fk                  uuid        not null,
  period_start_at                timestamptz not null,
  period_end_at                  timestamptz not null,
  settlement_status_code          text        not null default 'DRAFT',
  gross_sales_paise              bigint      not null default 0,
  refund_paise                   bigint      not null default 0,
  commission_paise               bigint      not null default 0,
  tax_paise                      bigint      not null default 0,
  net_payout_paise               bigint      not null default 0,
  locked_by_profile_fk           uuid,
  locked_at                      timestamptz,
  paid_at                        timestamptz,
  reconciled_at                  timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint finance_settlement_run_pk      primary key (finance_settlement_run_pk),
  constraint fk_finance_settlement_rest     foreign key (restaurant_fk)
                                             references restaurant_restaurant (restaurant_restaurant_pk)
                                             on delete restrict,
  constraint fk_finance_settlement_locker   foreign key (locked_by_profile_fk)
                                             references iam_profile (iam_profile_pk)
                                             on delete set null,
  constraint ck_finance_settlement_status   check (settlement_status_code in ('DRAFT','OPEN','LOCKED','SENT','PAID','RECONCILED','CANCELLED')),
  constraint ck_finance_settlement_period   check (period_end_at > period_start_at),
  constraint ck_finance_settlement_amounts  check (gross_sales_paise >= 0 and refund_paise >= 0 and commission_paise >= 0 and tax_paise >= 0 and net_payout_paise >= 0)
);
comment on table finance_settlement_run is
  'Restaurant settlement batch for a time period. '
  'DRAFT calculated → OPEN reviewed → LOCKED immutable → SENT payout initiated → PAID → RECONCILED. '
  'LOCKED rows must not be recalculated; corrections are represented by adjustment payout entries in a later run. '
  'Restaurant portal can read own settlement runs; finance admin/service writes.';
comment on column finance_settlement_run.net_payout_paise is 'Gross sales minus refunds, commission, tax, and adjustments. Money stored in paise.';
create index idx_finance_settlement_rest_period on finance_settlement_run (restaurant_fk, period_start_at, period_end_at);

create table finance_restaurant_payout_entry (
  finance_restaurant_payout_entry_pk uuid        not null default gen_random_uuid(),
  finance_settlement_run_fk          uuid        not null,
  restaurant_fk                      uuid        not null,
  order_fk                           uuid,
  payment_refund_fk                  uuid,
  entry_type_code                    text        not null,
  amount_paise                       bigint      not null,
  description_text                   text,
  created_at                         timestamptz not null default now(),
  updated_at                         timestamptz not null default now(),
  constraint finance_payout_entry_pk       primary key (finance_restaurant_payout_entry_pk),
  constraint fk_finance_payout_entry_run   foreign key (finance_settlement_run_fk)
                                           references finance_settlement_run (finance_settlement_run_pk)
                                           on delete cascade,
  constraint fk_finance_payout_entry_rest  foreign key (restaurant_fk)
                                           references restaurant_restaurant (restaurant_restaurant_pk)
                                           on delete restrict,
  constraint fk_finance_payout_entry_order foreign key (order_fk)
                                           references order_order (order_order_pk)
                                           on delete set null,
  constraint fk_finance_payout_entry_refund foreign key (payment_refund_fk)
                                            references payment_refund (payment_refund_pk)
                                            on delete set null,
  constraint ck_finance_payout_entry_type check (entry_type_code in ('ORDER_GROSS','COMMISSION','TAX','REFUND','ADJUSTMENT','PAYOUT')),
  constraint ck_finance_payout_entry_amount check (amount_paise <> 0)
);
comment on table finance_restaurant_payout_entry is
  'Line-level settlement ledger. Each order/refund/commission/tax/adjustment creates entries. '
  'Amounts are signed: positive increases restaurant payout; negative decreases payout. '
  'Used for restaurant finance detail screen and CSV export.';
comment on column finance_restaurant_payout_entry.entry_type_code is 'ORDER_GROSS, COMMISSION, TAX, REFUND, ADJUSTMENT, PAYOUT.';
create index idx_finance_payout_entry_rest_order on finance_restaurant_payout_entry (restaurant_fk, order_fk);
create index idx_finance_payout_entry_run        on finance_restaurant_payout_entry (finance_settlement_run_fk);

create table finance_invoice (
  finance_invoice_pk           uuid        not null default gen_random_uuid(),
  finance_settlement_run_fk    uuid        not null,
  restaurant_fk                uuid        not null,
  invoice_number               text        not null,
  invoice_status_code           text        not null default 'DRAFT',
  invoice_amount_paise         bigint      not null,
  storage_object_fk            uuid,
  issued_at                    timestamptz,
  paid_at                      timestamptz,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint finance_invoice_pk primary key (finance_invoice_pk),
  constraint uq_finance_invoice_number unique (invoice_number),
  constraint fk_finance_invoice_run foreign key (finance_settlement_run_fk)
                                      references finance_settlement_run (finance_settlement_run_pk)
                                    on delete cascade,
  constraint fk_finance_invoice_rest foreign key (restaurant_fk)
                                      references restaurant_restaurant (restaurant_restaurant_pk)
                                      on delete restrict,
  constraint fk_finance_invoice_storage foreign key (storage_object_fk)
                                         references storage_object (storage_object_pk)
                                         on delete set null,
  constraint ck_finance_invoice_status check (invoice_status_code in ('DRAFT','ISSUED','PAID','VOID')),
  constraint ck_finance_invoice_amount check (invoice_amount_paise >= 0)
);
comment on table finance_invoice is
  'Invoice document for a settlement run. PDF stored in Supabase Storage via storage_object_fk. '
  'Restaurant portal can download own issued invoices. Finance admin/service creates and marks paid.';
comment on column finance_invoice.invoice_number is 'GST-compliant invoice number generated by finance service. Unique.';
create index idx_finance_invoice_rest_status on finance_invoice (restaurant_fk, invoice_status_code);

-- =============================================================================
-- SECTION 13 — Notifications  (notification_)
-- =============================================================================

create table notification_template (
  notification_template_pk    uuid        not null default gen_random_uuid(),
  template_code               text        not null,
  channel_code                text        not null,
  locale_code                 text        not null default 'en',
  subject_template            text,
  body_template               text        not null,
  provider_template_ref       text,
  is_active                   boolean     not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint notification_template_pk primary key (notification_template_pk),
  constraint uq_notification_template unique (template_code, channel_code, locale_code),
  constraint ck_notification_template_channel check (channel_code in ('PUSH','EMAIL','WHATSAPP','SMS'))
);
comment on table notification_template is
  'Notification templates by channel and locale. '
  'Examples: DROP_PUBLISHED, HOLD_EXPIRING, ORDER_CONFIRMED, PICKUP_REMINDER, REFUND_PROCESSED. '
  'WhatsApp templates must map to approved WATI provider_template_ref. '
  'Do not send notifications inline from business APIs; enqueue notification_outbox.';
comment on column notification_template.provider_template_ref is 'Provider-side template identifier. Required for WhatsApp/WATI pre-approved template messages.';

create table notification_outbox (
  notification_outbox_pk       uuid        not null default gen_random_uuid(),
  notification_template_fk     uuid,
  channel_code                 text        not null,
  recipient_profile_fk         uuid,
  resolved_destination_text    text        not null,
  business_context_type_code   text,
  business_context_fk          uuid,
  payload_json                 jsonb       not null default '{}'::jsonb,
  send_status_code             text        not null default 'QUEUED',
  scheduled_at                 timestamptz not null default now(),
  sent_at                      timestamptz,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint notification_outbox_pk primary key (notification_outbox_pk),
  constraint fk_notification_outbox_template foreign key (notification_template_fk)
                                               references notification_template (notification_template_pk)
                                               on delete set null,
  constraint fk_notification_outbox_profile foreign key (recipient_profile_fk)
                                             references iam_profile (iam_profile_pk)
                                             on delete set null,
  constraint ck_notification_outbox_channel check (channel_code in ('PUSH','EMAIL','WHATSAPP','SMS')),
  constraint ck_notification_outbox_status check (send_status_code in ('QUEUED','SENDING','SENT','FAILED','CANCELLED','SUPPRESSED'))
);
comment on table notification_outbox is
  'Queued notification messages. Business APIs enqueue rows; workers send asynchronously. '
  'resolved_destination_text snapshots email/phone/device token at enqueue time. '
  'Before enqueue: check privacy_consent_event and consumer_notification_preference. '
  'send_status_code SUPPRESSED records consent/preference suppression instead of silently skipping.';
comment on column notification_outbox.business_context_type_code is 'Context type: DROP, ORDER, REFUND, SUPPORT_TICKET, INCIDENT, SUBSCRIPTION, MARKETING. business_context_fk points to matching table but no DB FK for polymorphic context.';
comment on column notification_outbox.resolved_destination_text  is 'Actual destination used at send time: email, E.164 phone, or push token. Stored for delivery audit.';
create index idx_notification_outbox_status_sched on notification_outbox (send_status_code, scheduled_at);
create index idx_notification_outbox_profile_time on notification_outbox (recipient_profile_fk, created_at desc);

create table notification_delivery_attempt (
  notification_delivery_attempt_pk  uuid        not null default gen_random_uuid(),
  notification_outbox_fk            uuid        not null,
  provider_code                     text,
  provider_message_ref              text,
  attempt_status_code               text        not null,
  attempt_number                    integer     not null default 1,
  error_code                        text,
  error_text                        text,
  attempted_at                      timestamptz not null default now(),
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  constraint notification_delivery_attempt_pk primary key (notification_delivery_attempt_pk),
  constraint fk_notification_attempt_outbox foreign key (notification_outbox_fk)
                                             references notification_outbox (notification_outbox_pk)
                                             on delete cascade,
  constraint ck_notification_attempt_status check (attempt_status_code in ('SENT','FAILED','RETRYING','DROPPED'))
);
comment on table notification_delivery_attempt is
  'Delivery attempt log for notification_outbox. '
  'One outbox row may have multiple attempts. Retain for 90 days per privacy_retention_policy. '
  'provider_message_ref supports provider reconciliation/debugging.';
comment on column notification_delivery_attempt.attempt_number is '1-based attempt counter. Worker increments per retry.';
create index idx_notification_attempt_outbox_time on notification_delivery_attempt (notification_outbox_fk, attempted_at desc);

create table notification_device (
  notification_device_pk    uuid        not null default gen_random_uuid(),
  iam_profile_fk            uuid        not null,
  device_platform_code      text        not null,
  push_token                text        not null,
  device_label              text,
  is_active                 boolean     not null default true,
  last_seen_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint notification_device_pk primary key (notification_device_pk),
  constraint uq_notification_device_token unique (push_token),
  constraint fk_notification_device_profile foreign key (iam_profile_fk)
                                             references iam_profile (iam_profile_pk)
                                             on delete cascade,
  constraint ck_notification_device_platform check (device_platform_code in ('IOS','ANDROID','WEB'))
);
comment on table notification_device is
  'Push device registry for Expo/FCM/APNs tokens. '
  'When app refreshes token, update/insert active row. '
  'is_active=false when provider reports token invalid or user logs out. '
  'Required for BAM Bag drop push notifications and pickup reminders.';
comment on column notification_device.push_token is 'Expo/FCM/APNs push token. Unique. Treat as sensitive; never expose to other users.';
create index idx_notification_device_profile_active on notification_device (iam_profile_fk, is_active);

-- =============================================================================
-- SECTION 14 — Reviews / Support / Incident
-- =============================================================================

create table review_review (
  review_review_pk        uuid        not null default gen_random_uuid(),
  order_fk                uuid        not null,
  consumer_profile_fk      uuid        not null,
  restaurant_fk            uuid        not null,
  rating_value             integer     not null,
  review_text              text,
  is_public                boolean     not null default true,
  moderation_status_code   text        not null default 'PENDING',
  moderated_by_profile_fk  uuid,
  moderated_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint review_review_pk primary key (review_review_pk),
  constraint uq_review_order unique (order_fk),
  constraint fk_review_order foreign key (order_fk)
                              references order_order (order_order_pk)
                              on delete cascade,
  constraint fk_review_consumer foreign key (consumer_profile_fk)
                                 references consumer_profile (consumer_profile_pk)
                                 on delete cascade,
  constraint fk_review_restaurant foreign key (restaurant_fk)
                                   references restaurant_restaurant (restaurant_restaurant_pk)
                                   on delete cascade,
  constraint fk_review_moderator foreign key (moderated_by_profile_fk)
                                  references iam_profile (iam_profile_pk)
                                  on delete set null,
  constraint ck_review_rating check (rating_value between 1 and 5),
  constraint ck_review_moderation_status check (moderation_status_code in ('PENDING','APPROVED','REJECTED','HIDDEN'))
);
comment on table review_review is
  'One review per collected order. Reviews are moderated before public display. '
  'Only consumers who placed the order can create. Restaurant can read public/own reviews, not edit.';
comment on column review_review.moderation_status_code is 'PENDING by default. APPROVED visible publicly if is_public=true. REJECTED/HIDDEN not shown.';

create table review_media (
  review_media_pk       uuid        not null default gen_random_uuid(),
  review_fk             uuid        not null,
  storage_object_fk     uuid        not null,
  display_order         integer     not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint review_media_pk primary key (review_media_pk),
  constraint fk_review_media_review foreign key (review_fk)
                                    references review_review (review_review_pk)
                                    on delete cascade,
  constraint fk_review_media_storage foreign key (storage_object_fk)
                                     references storage_object (storage_object_pk)
                                     on delete restrict
);
comment on table review_media is
  'Optional review images. Public display only after parent review is APPROVED and is_public=true. '
  'Images are usually OWNER_ONLY until moderation, then may be served through controlled public URL.';
create index idx_review_media_review_order on review_media (review_fk, display_order);

create table support_ticket (
  support_ticket_pk              uuid        not null default gen_random_uuid(),
  requester_profile_fk           uuid,
  restaurant_fk                  uuid,
  order_fk                       uuid,
  marketing_partner_lead_fk      uuid,
  master_support_ticket_type_fk  uuid        not null,
  master_support_ticket_status_fk uuid       not null,
  master_support_ticket_priority_fk uuid     not null,
  requester_idempotency_key      text,
  subject_text                   text        not null,
  description_text               text,
  assigned_to_profile_fk         uuid,
  sla_due_at                     timestamptz,
  resolved_at                    timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint support_ticket_pk primary key (support_ticket_pk),
  constraint fk_support_ticket_requester foreign key (requester_profile_fk)
                                          references iam_profile (iam_profile_pk)
                                          on delete set null,
  constraint fk_support_ticket_restaurant foreign key (restaurant_fk)
                                           references restaurant_restaurant (restaurant_restaurant_pk)
                                           on delete set null,
  constraint fk_support_ticket_order foreign key (order_fk)
                                      references order_order (order_order_pk)
                                      on delete set null,
  constraint fk_support_ticket_partner_lead foreign key (marketing_partner_lead_fk)
                                             references marketing_partner_lead (marketing_partner_lead_pk)
                                             on delete set null,
  constraint fk_support_ticket_type foreign key (master_support_ticket_type_fk)
                                     references master_support_ticket_type (master_support_ticket_type_pk)
                                     on delete restrict,
  constraint fk_support_ticket_status foreign key (master_support_ticket_status_fk)
                                       references master_support_ticket_status (master_support_ticket_status_pk)
                                       on delete restrict,
  constraint fk_support_ticket_priority foreign key (master_support_ticket_priority_fk)
                                         references master_support_ticket_priority (master_support_ticket_priority_pk)
                                         on delete restrict,
  constraint fk_support_ticket_assignee foreign key (assigned_to_profile_fk)
                                         references iam_profile (iam_profile_pk)
                                         on delete set null
);
comment on table support_ticket is
  'Support queue item. May be linked to consumer, restaurant, order, or anonymous partner lead. '
  'Status/type/priority are master-data FKs, not free text. '
  'All status changes/comments are recorded in support_ticket_event append-only table.';
comment on column support_ticket.requester_idempotency_key is 'Optional public/API retry key. Unique per requester when requester_profile_fk is present. Prevents duplicate tickets on retry.';
comment on column support_ticket.sla_due_at is 'Computed at creation from priority SLA. Used by admin support queue.';
create index idx_support_ticket_status_priority on support_ticket (master_support_ticket_status_fk, master_support_ticket_priority_fk, created_at);
create index idx_support_ticket_order           on support_ticket (order_fk) where order_fk is not null;
create unique index uq_support_ticket_requester_idempotency on support_ticket (requester_profile_fk, requester_idempotency_key) where requester_profile_fk is not null and requester_idempotency_key is not null;

alter table marketing_partner_lead
  add constraint fk_marketing_partner_lead_ticket
  foreign key (converted_support_ticket_fk)
  references support_ticket (support_ticket_pk)
  on delete set null;

-- APPEND-ONLY. Never UPDATE or DELETE.
create table support_ticket_event (
  support_ticket_event_pk   uuid        not null default gen_random_uuid(),
  support_ticket_fk         uuid        not null,
  event_type_code           text        not null,
  from_status_fk            uuid,
  to_status_fk              uuid,
  comment_text              text,
  is_internal_note          boolean     not null default false,
  actor_profile_fk          uuid,
  recorded_at               timestamptz not null default now(),
  constraint support_ticket_event_pk primary key (support_ticket_event_pk),
  constraint fk_support_event_ticket foreign key (support_ticket_fk)
                                      references support_ticket (support_ticket_pk)
                                      on delete cascade,
  constraint fk_support_event_from_status foreign key (from_status_fk)
                                           references master_support_ticket_status (master_support_ticket_status_pk)
                                           on delete set null,
  constraint fk_support_event_to_status foreign key (to_status_fk)
                                         references master_support_ticket_status (master_support_ticket_status_pk)
                                         on delete set null,
  constraint fk_support_event_actor foreign key (actor_profile_fk)
                                     references iam_profile (iam_profile_pk)
                                     on delete set null
);
comment on table support_ticket_event is
  'APPEND-ONLY support timeline. Events: CREATED, ASSIGNED, STATUS_CHANGED, COMMENT_ADDED, REFUND_LINKED, INCIDENT_LINKED, RESOLVED, CLOSED. '
  'is_internal_note=true hides comment from consumer/restaurant portals.';
comment on column support_ticket_event.is_internal_note is 'true = visible only to platform admins/support agents. false = visible to requester/restaurant if policy permits.';
create index idx_support_event_ticket_time on support_ticket_event (support_ticket_fk, recorded_at desc);

create table incident_incident (
  incident_incident_pk             uuid        not null default gen_random_uuid(),
  restaurant_fk                    uuid,
  order_fk                         uuid,
  support_ticket_fk                uuid,
  master_incident_type_fk          uuid        not null,
  master_incident_status_fk        uuid        not null,
  master_incident_severity_fk      uuid        not null,
  title_text                       text        not null,
  description_text                 text,
  assigned_to_profile_fk           uuid,
  reported_by_profile_fk           uuid,
  occurred_at                      timestamptz,
  resolved_at                      timestamptz,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  constraint incident_incident_pk primary key (incident_incident_pk),
  constraint fk_incident_restaurant foreign key (restaurant_fk)
                                     references restaurant_restaurant (restaurant_restaurant_pk)
                                     on delete set null,
  constraint fk_incident_order foreign key (order_fk)
                                references order_order (order_order_pk)
                                on delete set null,
  constraint fk_incident_support_ticket foreign key (support_ticket_fk)
                                         references support_ticket (support_ticket_pk)
                                         on delete set null,
  constraint fk_incident_type foreign key (master_incident_type_fk)
                               references master_incident_type (master_incident_type_pk)
                               on delete restrict,
  constraint fk_incident_status foreign key (master_incident_status_fk)
                                 references master_incident_status (master_incident_status_pk)
                                 on delete restrict,
  constraint fk_incident_severity foreign key (master_incident_severity_fk)
                                   references master_incident_severity (master_incident_severity_pk)
                                   on delete restrict,
  constraint fk_incident_assignee foreign key (assigned_to_profile_fk)
                                   references iam_profile (iam_profile_pk)
                                   on delete set null,
  constraint fk_incident_reporter foreign key (reported_by_profile_fk)
                                   references iam_profile (iam_profile_pk)
                                   on delete set null
);
comment on table incident_incident is
  'Food safety and operational incident case. Incidents are distinct from support tickets: '
  'support handles communication; incident tracks root cause, severity, mitigation, and compliance. '
  'Any FOOD_SAFETY or DIETARY_MISMATCH support ticket should create/link an incident.';
comment on column incident_incident.master_incident_severity_fk is 'P1/P2/P3/P4 severity via master_incident_severity. P1 triggers immediate admin escalation.';
create index idx_incident_status_severity on incident_incident (master_incident_status_fk, master_incident_severity_fk, created_at);

-- APPEND-ONLY. Never UPDATE or DELETE.
create table incident_event (
  incident_event_pk       uuid        not null default gen_random_uuid(),
  incident_fk             uuid        not null,
  event_type_code         text        not null,
  from_status_fk          uuid,
  to_status_fk            uuid,
  comment_text            text,
  actor_profile_fk        uuid,
  recorded_at             timestamptz not null default now(),
  constraint incident_event_pk primary key (incident_event_pk),
  constraint fk_incident_event_incident foreign key (incident_fk)
                                        references incident_incident (incident_incident_pk)
                                        on delete cascade,
  constraint fk_incident_event_from_status foreign key (from_status_fk)
                                            references master_incident_status (master_incident_status_pk)
                                            on delete set null,
  constraint fk_incident_event_to_status foreign key (to_status_fk)
                                          references master_incident_status (master_incident_status_pk)
                                          on delete set null,
  constraint fk_incident_event_actor foreign key (actor_profile_fk)
                                      references iam_profile (iam_profile_pk)
                                      on delete set null
);
comment on table incident_event is
  'APPEND-ONLY incident timeline. Events: CREATED, TRIAGED, ASSIGNED, STATUS_CHANGED, RESTAURANT_CONTACTED, ROOT_CAUSE_ADDED, RESOLVED, CLOSED. '
  'Retained for compliance and food-safety audit.';
create index idx_incident_event_incident_time on incident_event (incident_fk, recorded_at desc);

-- =============================================================================
-- SECTION 15 — CMS / Content  (cms_)
-- =============================================================================
-- SECTION 19 — CMS Domain  (cms_)
-- =============================================================================

create table cms_page (
  cms_page_pk             uuid        not null default gen_random_uuid(),
  page_code               text        not null,
  page_title              text        not null,
  page_status_code        text        not null default 'DRAFT',
  body_markdown           text,
  published_at            timestamptz,
  created_by_profile_fk   uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint cms_page_pk              primary key (cms_page_pk),
  constraint uq_cms_page_code          unique      (page_code),
  constraint fk_cms_page_creator       foreign key (created_by_profile_fk)
                                       references  iam_profile (iam_profile_pk)
                                       on delete   set null
);
comment on table  cms_page is
  'Static informational pages managed via admin CMS. '
  'page_code is the URL path identifier. '
  'Seed: PRIVACY_POLICY, TERMS_OF_SERVICE, REFUND_POLICY, FOOD_SAFETY_POLICY, '
  'GRIEVANCE_REDRESSAL, HOW_IT_WORKS, ABOUT, FAQ.';
comment on column cms_page.page_status_code is 'DRAFT: not public. PUBLISHED: live. ARCHIVED: removed from navigation but URL preserved.';

create table cms_city_page (
  cms_city_page_pk    uuid        not null default gen_random_uuid(),
  geo_city_fk         uuid        not null,
  city_page_title     text        not null,
  hero_text           text,
  body_markdown       text,
  is_published        boolean     not null default false,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint cms_city_page_pk          primary key (cms_city_page_pk),
  constraint uq_cms_city_page_city      unique      (geo_city_fk),
  constraint fk_cms_city_page_city      foreign key (geo_city_fk)
                                        references  geo_city (geo_city_pk)
                                        on delete   cascade
);
comment on table  cms_city_page is
  'SEO landing page per city (/cities/hyd). One page per city. '
  'Contains: city hero text, neighborhood guide, launch narrative, restaurant teasers. '
  'Published at city launch.';

create table cms_post (
  cms_post_pk           uuid        not null default gen_random_uuid(),
  post_slug             text        not null,
  post_title            text        not null,
  excerpt_text          text,
  body_markdown         text,
  post_status_code      text        not null default 'DRAFT',
  published_at          timestamptz,
  author_profile_fk     uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint cms_post_pk             primary key (cms_post_pk),
  constraint uq_cms_post_slug         unique      (post_slug),
  constraint fk_cms_post_author       foreign key (author_profile_fk)
                                      references  iam_profile (iam_profile_pk)
                                      on delete   set null
);
comment on table  cms_post is
  'Blog/editorial posts at /blog/[slug]. '
  'Content types: restaurant feature stories, food culture, city launch announcements. '
  'post_status_code: DRAFT, PUBLISHED, ARCHIVED.';

create table cms_banner (
  cms_banner_pk     uuid        not null default gen_random_uuid(),
  banner_code       text        not null,
  banner_title      text        not null,
  banner_body_text  text,
  target_url        text,
  placement_code    text        not null,
  is_active         boolean     not null default true,
  starts_at         timestamptz,
  ends_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint cms_banner_pk         primary key (cms_banner_pk),
  constraint uq_cms_banner_code     unique      (banner_code)
);
comment on table  cms_banner is
  'Promotional or informational banners for consumer-facing pages. '
  'placement_code: CONSUMER_HOME_TOP, DROP_DISCOVERY_TOP, CHECKOUT_SIDEBAR, RESTAURANT_PORTAL_DASHBOARD.';
comment on column cms_banner.placement_code is 'Controls where banner renders. Possible values: CONSUMER_HOME_TOP, DROP_DISCOVERY_TOP, CHECKOUT_SIDEBAR, RESTAURANT_PORTAL_DASHBOARD.';

create table cms_restaurant_feature (
  cms_restaurant_feature_pk   uuid        not null default gen_random_uuid(),
  restaurant_fk               uuid        not null,
  feature_title               text        not null,
  feature_body_markdown       text,
  is_published                boolean     not null default false,
  published_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint cms_restaurant_feature_pk            primary key (cms_restaurant_feature_pk),
  constraint fk_cms_restaurant_feature_restaurant foreign key (restaurant_fk)
                                                  references  restaurant_restaurant (restaurant_restaurant_pk)
                                                  on delete   cascade
);
comment on table  cms_restaurant_feature is
  'Editorial spotlight feature for a restaurant. Appears on /blog and restaurant profile page. '
  'Written by goZaika team to highlight the restaurant''s story, chef, and philosophy.';

create table cms_seo_metadata (
  cms_seo_metadata_pk         uuid        not null default gen_random_uuid(),
  entity_type_code            text        not null,
  entity_pk                   uuid        not null,
  seo_title                   text,
  seo_description             text,
  canonical_url               text,
  og_image_storage_object_fk  uuid,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint cms_seo_metadata_pk          primary key (cms_seo_metadata_pk),
  constraint uq_cms_seo_metadata_entity    unique      (entity_type_code, entity_pk),
  constraint fk_cms_seo_metadata_og_image  foreign key (og_image_storage_object_fk)
                                           references  storage_object (storage_object_pk)
                                           on delete   set null
);
comment on table  cms_seo_metadata is
  'SEO and OG metadata for CMS entities. entity_type_code identifies the owning entity: '
  'CMS_PAGE, CMS_POST, CMS_CITY_PAGE, RESTAURANT, GEO_CITY.';
comment on column cms_seo_metadata.entity_type_code is 'Entity class. Valid values: CMS_PAGE, CMS_POST, CMS_CITY_PAGE, RESTAURANT, GEO_CITY.';

-- =============================================================================
-- SECTION 20 — Analytics  (analytics_)
-- =============================================================================

-- Partitioned by month for performance. Always include created_at in partition key queries.
create table analytics_event (
  analytics_event_pk    uuid        not null default gen_random_uuid(),
  event_name            text        not null,
  actor_profile_fk      uuid,
  session_ref           text,
  entity_type_code      text,
  entity_pk             uuid,
  event_payload_json    jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  primary key (analytics_event_pk, created_at)
) partition by range (created_at);
comment on table  analytics_event is
  'SERVICE-ROLE ONLY. APPEND-ONLY. High-volume product and operational analytics. '
  'Never UPDATE or DELETE. Immutability enforced by trigger. '
  'Range-partitioned by created_at (monthly). ALWAYS include created_at in WHERE clauses. '
  'Retention per privacy_retention_policy: anonymise_after_days=730, purge_after_days=1825. '
  'event_name examples: drop_viewed, drop_claimed, order_created, pickup_completed, '
  'search_performed, swaad_club_subscribed.';
comment on column analytics_event.event_name       is 'Business event identifier. dot.case naming. Examples: drop.viewed, order.created, pickup.completed.';
comment on column analytics_event.entity_type_code is 'Entity the event relates to: DROP, ORDER, RESTAURANT, CONSUMER. Used with entity_pk for event attribution.';
comment on column analytics_event.event_payload_json is 'Freeform event properties. Keep lean — avoid PII. Example: {"city_code":"HYD","drop_type":"SPOTLIGHT","price_paise":14900}.';

-- Create initial partitions. Add new partitions monthly via cron/migration.
create table analytics_event_2026_q2 partition of analytics_event
  for values from ('2026-04-01 00:00:00+00') to ('2026-07-01 00:00:00+00');

create table analytics_event_2026_q3 partition of analytics_event
  for values from ('2026-07-01 00:00:00+00') to ('2026-10-01 00:00:00+00');

create table analytics_event_default partition of analytics_event default;
comment on table  analytics_event_default is 'Catch-all partition for analytics_event rows outside defined range partitions. Monitor and add quarterly partitions before this fills up.';

-- =============================================================================
-- SECTION 21 — Configuration  (config_)
-- =============================================================================

create table config_feature_flag (
  config_feature_flag_pk  uuid        not null default gen_random_uuid(),
  flag_code               text        not null,
  flag_name               text        not null,
  description             text,
  is_enabled              boolean     not null default false,
  scope_code              text        not null default 'GLOBAL',
  scope_entity_pk         uuid,
  config_json             jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint config_feature_flag_pk     primary key (config_feature_flag_pk),
  constraint uq_config_feature_flag      unique      (flag_code, scope_code, scope_entity_pk)
);
comment on table  config_feature_flag is
  'SERVICE-ROLE ONLY. Feature flags with optional scope. '
  'scope_code: GLOBAL, CITY, RESTAURANT, SEGMENT. '
  'scope_entity_pk: geo_city_pk | restaurant_restaurant_pk | master_audience_segment_pk | NULL (GLOBAL). '
  'Config examples: SWAAD_CLUB_ENABLED, SPOTLIGHT_DROPS_ENABLED, NEW_CLAIM_FLOW_V2.';
comment on column config_feature_flag.scope_code    is 'GLOBAL: applies everywhere. CITY: specific city. RESTAURANT: specific restaurant. SEGMENT: specific audience.';
comment on column config_feature_flag.config_json   is 'Additional flag configuration. Example: {"rollout_percentage": 50, "allowlist_profiles": ["uuid1"]}.';

create table config_runtime_setting (
  config_runtime_setting_pk   uuid        not null default gen_random_uuid(),
  setting_code                text        not null,
  scope_code                  text        not null default 'GLOBAL',
  scope_entity_pk             uuid,
  setting_value_json          jsonb       not null default '{}'::jsonb,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint config_runtime_setting_pk    primary key (config_runtime_setting_pk),
  constraint uq_config_runtime_setting     unique      (setting_code, scope_code, scope_entity_pk)
);
comment on table  config_runtime_setting is
  'SERVICE-ROLE ONLY. Runtime operational settings. '
  'Examples: DEFAULT_HOLD_EXPIRY_MINUTES, MAX_BAGS_PER_DROP, RAZORPAY_KEY_ID, '
  'WHATSAPP_TEMPLATE_NAMESPACE, SPOTLIGHT_PRICE_MULTIPLIER_BPS.';
comment on column config_runtime_setting.setting_value_json is 'Type-free value container. Example: {"minutes": 10} or {"key": "rzp_live_xxxx"}.';

-- =============================================================================
-- SECTION 22 — Admin Domain  (admin_)
-- =============================================================================

create table admin_export_job (
  admin_export_job_pk           uuid        not null default gen_random_uuid(),
  export_type_code              text        not null,
  export_status_code            text        not null default 'QUEUED',
  requested_by_profile_fk       uuid,
  idempotency_key               text,
  filters_json                  jsonb       not null default '{}'::jsonb,
  result_storage_object_fk      uuid,
  requested_at                  timestamptz not null default now(),
  completed_at                  timestamptz,
  error_text                    text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint admin_export_job_pk              primary key (admin_export_job_pk),
  constraint fk_admin_export_job_requester    foreign key (requested_by_profile_fk)
                                              references  iam_profile (iam_profile_pk)
                                              on delete   set null,
  constraint fk_admin_export_job_result       foreign key (result_storage_object_fk)
                                              references  storage_object (storage_object_pk)
                                              on delete   set null,
  constraint ck_admin_export_status           check (export_status_code in
                                               ('QUEUED','PROCESSING','COMPLETED','FAILED'))
);
comment on table  admin_export_job is
  'SERVICE-ROLE ONLY. Async export job tracker for large data exports. '
  'Processing runs as background Edge Function. '
  'result_storage_object_fk points to the output file in private-exports bucket. '
  'export_type_code: ORDERS_CSV, SETTLEMENTS_CSV, CONSUMER_LIST, RESTAURANT_COMPLIANCE, '
  'ANALYTICS_REPORT, WAITLIST_EXPORT.';
comment on column admin_export_job.filters_json is 'Filter parameters for the export. Example: {"restaurant_fk": "uuid", "date_from": "2026-01-01", "date_to": "2026-03-31"}.';

create table admin_data_correction (
  admin_data_correction_pk      uuid        not null default gen_random_uuid(),
  correction_type_code          text        not null,
  correction_status_code        text        not null default 'REQUESTED',
  target_entity_type_code       text        not null,
  target_entity_pk              uuid        not null,
  requested_by_profile_fk       uuid,
  approved_by_profile_fk        uuid,
  executed_by_profile_fk        uuid,
  reason_text                   text        not null,
  before_snapshot_json          jsonb,
  after_snapshot_json           jsonb,
  requested_at                  timestamptz not null default now(),
  approved_at                   timestamptz,
  executed_at                   timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint admin_data_correction_pk             primary key (admin_data_correction_pk),
  constraint fk_admin_data_correction_requester   foreign key (requested_by_profile_fk)
                                                  references  iam_profile (iam_profile_pk)
                                                  on delete   set null,
  constraint fk_admin_data_correction_approver    foreign key (approved_by_profile_fk)
                                                  references  iam_profile (iam_profile_pk)
                                                  on delete   set null,
  constraint fk_admin_data_correction_executor    foreign key (executed_by_profile_fk)
                                                  references  iam_profile (iam_profile_pk)
                                                  on delete   set null,
  constraint ck_admin_data_correction_status      check (correction_status_code in
                                                   ('REQUESTED','APPROVED','REJECTED','EXECUTING','COMPLETED','CANCELLED'))
);
comment on table  admin_data_correction is
  'SERVICE-ROLE ONLY. 4-eyes data correction workflow for sensitive manual fixes. '
  'requested_by and approved_by MUST be different profiles (enforced at API layer). '
  'before_snapshot_json / after_snapshot_json provide audit trail for corrections. '
  'All sensitive admin operations MUST go through this table — never silent direct edits.';
comment on column admin_data_correction.correction_type_code is 'ORDER_STATUS_CORRECTION, INVENTORY_RESYNC, FINANCIAL_ADJUSTMENT, PROFILE_ANONYMISATION, REFERRAL_STATUS_FIX.';

-- =============================================================================
-- SECTION 23 — Audit Log  (audit_)
-- =============================================================================

-- APPEND-ONLY audit trail for all privileged operations
create table audit_log (
  audit_log_pk              uuid        not null default gen_random_uuid(),
  actor_profile_fk          uuid,
  actor_role_code           text,
  action_code               text        not null,
  target_entity_type_code   text,
  target_entity_pk          uuid,
  audit_payload_json        jsonb       not null default '{}'::jsonb,
  ip_address                inet,
  user_agent                text,
  created_at                timestamptz not null default now(),
  constraint audit_log_pk              primary key (audit_log_pk),
  constraint fk_audit_log_actor        foreign key (actor_profile_fk)
                                       references  iam_profile (iam_profile_pk)
                                       on delete   set null
);
comment on table  audit_log is
  'SERVICE-ROLE ONLY. APPEND-ONLY. Platform-wide privileged action audit trail. '
  'Never UPDATE or DELETE. Immutability enforced by trigger. '
  'Written by server-side code for all material state changes to: '
  'financial records, compliance docs, restaurant status, team memberships, '
  'admin data corrections, erasure requests, config changes. '
  'Retained per privacy_retention_policy AUDIT_3Y (3 years).';
comment on column audit_log.action_code             is 'UPPER_SNAKE_CASE action identifier. Examples: RESTAURANT_ACTIVATED, ORDER_REFUNDED, ERASURE_EXECUTED, SETTLEMENT_LOCKED, ADMIN_DATA_CORRECTION_APPROVED.';
comment on column audit_log.audit_payload_json      is 'Action context: {"before": {...}, "after": {...}, "reason": "..."}. Never include plaintext credentials or full PAN/bank numbers.';
comment on column audit_log.ip_address              is 'Requester IP at action time. For security audit and fraud investigation.';
create index idx_audit_log_entity on audit_log (target_entity_type_code, target_entity_pk, created_at desc);
create index idx_audit_log_actor  on audit_log (actor_profile_fk, created_at desc);
create index idx_audit_log_action on audit_log (action_code, created_at desc);

-- =============================================================================
-- SECTION 24 — updated_at triggers  (all mutable tables)
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    -- master
    'master_scope','master_allergen','master_cuisine','master_audience_segment',
    'master_storage_visibility','master_document_type','master_document_status',
    'master_support_ticket_type','master_support_ticket_status','master_support_ticket_priority',
    'master_incident_type','master_incident_status','master_incident_severity',
    -- geo
    'geo_city','geo_neighborhood','geo_address',
    -- iam
    'iam_profile','iam_platform_role','iam_platform_membership','iam_platform_role_scope',
    'restaurant_team_role','restaurant_team_role_scope','restaurant_team_membership',
    -- marketing
    'marketing_waitlist_lead','marketing_partner_lead',
    -- privacy
    'privacy_consent_purpose','privacy_retention_policy','privacy_erasure_request',
    -- consumer
    'consumer_profile','consumer_saved_restaurant','consumer_dietary_preference',
    'consumer_allergen_preference','consumer_city_preference',
    'consumer_referral_code','consumer_referral',
    'consumer_subscription_plan','consumer_subscription',
    'consumer_passport_stat','consumer_notification_preference',
    -- restaurant
    'restaurant_restaurant','restaurant_public_profile','restaurant_compliance',
    'restaurant_contact','restaurant_cuisine_map','restaurant_document',
    'restaurant_payout_account','restaurant_commission_plan','restaurant_commission_override',
    'restaurant_setting','restaurant_onboarding_task',
    -- storage
    'storage_object',
    -- catalog
    'catalog_bag_template','catalog_bag_template_revision',
    'catalog_bag_template_allergen','catalog_bag_template_media',
    -- drop
    'drop_recurring_schedule','drop_drop','drop_audience','drop_media','drop_inventory_hold',
    -- order
    'order_order','order_item',
    -- payment/billing/finance
    'payment_order_intent','payment_refund',
    'billing_subscription_charge',
    'finance_settlement_run','finance_invoice',
    -- notifications
    'notification_template','notification_device','notification_outbox',
    -- review/support/incident
    'review_review','review_media',
    'support_ticket','incident_incident',
    -- cms
    'cms_page','cms_city_page','cms_post','cms_banner','cms_restaurant_feature','cms_seo_metadata',
    -- config/admin
    'config_feature_flag','config_runtime_setting',
    'admin_export_job','admin_data_correction'
  ] loop
    execute format(
      'drop trigger if exists %I_set_updated_at on %I; '
      'create trigger %I_set_updated_at '
      'before update on %I '
      'for each row execute function public.set_updated_at()',
      t, t, t, t
    );
  end loop;
end $$;

-- =============================================================================
-- SECTION 25 — Immutability guards on append-only tables
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'privacy_consent_event',
    'drop_inventory_event',
    'order_status_transition',
    'order_pickup_verification_event',
    'payment_webhook_event',
    'billing_subscription_event',
    'support_ticket_event',
    'incident_event',
    'analytics_event',
    'audit_log'
  ] loop
    execute format(
      'drop trigger if exists %I_immutable on %I; '
      'create trigger %I_immutable '
      'before update or delete on %I '
      'for each row execute function public.raise_immutable_error()',
      t, t, t, t
    );
  end loop;
end $$;

-- =============================================================================
-- SECTION 25B — v4.1 structural repair / computed columns
-- =============================================================================

alter table restaurant_restaurant
  add column if not exists COMPUTED_orders_pending_pickup_count integer not null default 0,
  add column if not exists average_rating numeric(3,2),
  add column if not exists rating_count integer not null default 0;

comment on column restaurant_restaurant.COMPUTED_orders_pending_pickup_count is
  'COMPUTED: count of PAID/CONFIRMED/READY_FOR_PICKUP orders for this restaurant. Maintained by COMPUTED_refresh_restaurant_counts.';

comment on column restaurant_restaurant.average_rating is
  'COMPUTED: public average of moderation-approved public review ratings. Maintained by COMPUTED_refresh_restaurant_rating.';

comment on column restaurant_restaurant.rating_count is
  'COMPUTED: count of public approved reviews contributing to average_rating. Maintained by COMPUTED_refresh_restaurant_rating.';

alter table drop_drop
  add column if not exists COMPUTED_quantity_available integer
    generated always as (greatest(quantity_total - quantity_reserved - quantity_sold, 0)) stored,
  add column if not exists COMPUTED_sell_through_bps integer not null default 0;

comment on column drop_drop.COMPUTED_quantity_available is
  'GENERATED STORED: max(quantity_total - quantity_reserved - quantity_sold, 0). Used by Realtime and inventory-claim guard.';

comment on column drop_drop.COMPUTED_sell_through_bps is
  'COMPUTED: quantity_sold / quantity_total * 10000. Maintained by COMPUTED_refresh_drop_sell_through.';

alter table order_order
  add column if not exists COMPUTED_pickup_ready_flag boolean not null default false;

comment on column order_order.COMPUTED_pickup_ready_flag is
  'COMPUTED: true when order_status_code in (CONFIRMED, READY_FOR_PICKUP). Used by restaurant pickup queue view.';

create index if not exists idx_drop_active_discovery
  on drop_drop (geo_city_fk, pickup_start_at, pickup_end_at, COMPUTED_quantity_available)
  where drop_status_code in ('SCHEDULED','ACTIVE') and visibility_code = 'PUBLIC';

create index if not exists idx_order_pickup_ready
  on order_order (restaurant_fk, COMPUTED_pickup_ready_flag)
  where COMPUTED_pickup_ready_flag = true;

-- =============================================================================
-- SECTION 26 — COMPUTED_ maintenance triggers
-- =============================================================================

-- COMPUTED_sell_through_bps on drop_drop
create or replace function public.COMPUTED_refresh_drop_sell_through()
returns trigger language plpgsql as $$
begin
  new.COMPUTED_sell_through_bps :=
    case
      when new.quantity_total <= 0 then 0
      else floor((new.quantity_sold::numeric / new.quantity_total::numeric) * 10000)::integer
    end;
  return new;
end; $$;
comment on function public.COMPUTED_refresh_drop_sell_through() is
  'BEFORE INSERT/UPDATE trigger on drop_drop. Maintains COMPUTED_sell_through_bps '
  'as (quantity_sold/quantity_total) * 10000 basis points. Prefixed COMPUTED_ per style guide.';

drop trigger if exists drop_drop_COMPUTED_sell_through on drop_drop;
create trigger drop_drop_COMPUTED_sell_through
  before insert or update of quantity_total, quantity_sold
  on drop_drop
  for each row execute function public.COMPUTED_refresh_drop_sell_through();

-- COMPUTED_active_drop_count and COMPUTED_orders_pending_pickup_count on restaurant_restaurant
create or replace function public.COMPUTED_refresh_restaurant_counts()
returns trigger language plpgsql as $$
declare
  v_restaurant_pk uuid;
begin
  -- DELETE triggers do not have a usable NEW record. Resolve the restaurant_fk
  -- from OLD/NEW based on TG_OP to avoid runtime errors on delete.
  if TG_TABLE_NAME = 'drop_drop' then
    v_restaurant_pk := case when TG_OP = 'DELETE' then old.restaurant_fk else new.restaurant_fk end;
  elsif TG_TABLE_NAME = 'order_order' then
    v_restaurant_pk := case when TG_OP = 'DELETE' then old.restaurant_fk else new.restaurant_fk end;
  end if;

  if v_restaurant_pk is null then
    return null;
  end if;

  update restaurant_restaurant r
  set
    COMPUTED_active_drop_count = (
      select count(*) from drop_drop d
      where d.restaurant_fk = r.restaurant_restaurant_pk
        and d.drop_status_code in ('SCHEDULED','ACTIVE')
    ),
    COMPUTED_orders_pending_pickup_count = (
      select count(*) from order_order o
      where o.restaurant_fk = r.restaurant_restaurant_pk
        and o.order_status_code in ('PAID','CONFIRMED','READY_FOR_PICKUP')
    )
  where r.restaurant_restaurant_pk = v_restaurant_pk;
  return null;
end; $$;
comment on function public.COMPUTED_refresh_restaurant_counts() is
  'AFTER INSERT/UPDATE/DELETE trigger on drop_drop and order_order. '
  'Maintains restaurant_restaurant.COMPUTED_active_drop_count and '
  'COMPUTED_orders_pending_pickup_count for O(1) dashboard and staff app reads. Prefixed COMPUTED_.';

drop trigger if exists drop_drop_COMPUTED_restaurant_counts on drop_drop;
create trigger drop_drop_COMPUTED_restaurant_counts
  after insert or update of drop_status_code or delete
  on drop_drop
  for each row execute function public.COMPUTED_refresh_restaurant_counts();

drop trigger if exists order_order_COMPUTED_restaurant_counts on order_order;
create trigger order_order_COMPUTED_restaurant_counts
  after insert or update of order_status_code or delete
  on order_order
  for each row execute function public.COMPUTED_refresh_restaurant_counts();

-- COMPUTED_pickup_ready_flag on order_order
create or replace function public.COMPUTED_refresh_order_pickup_flag()
returns trigger language plpgsql as $$
begin
  new.COMPUTED_pickup_ready_flag :=
    new.order_status_code in ('CONFIRMED','READY_FOR_PICKUP');
  return new;
end; $$;
comment on function public.COMPUTED_refresh_order_pickup_flag() is
  'BEFORE INSERT/UPDATE trigger on order_order. '
  'Maintains COMPUTED_pickup_ready_flag for fast indexed staff-app pickup queue reads. '
  'Prefixed COMPUTED_ per style guide.';

drop trigger if exists order_order_COMPUTED_pickup_ready on order_order;
create trigger order_order_COMPUTED_pickup_ready
  before insert or update of order_status_code
  on order_order
  for each row execute function public.COMPUTED_refresh_order_pickup_flag();

-- COMPUTED average_rating on restaurant_restaurant (via review_review)
create or replace function public.COMPUTED_refresh_restaurant_rating()
returns trigger language plpgsql as $$
declare
  v_restaurant_pk uuid;
begin
  v_restaurant_pk := coalesce(new.restaurant_fk, old.restaurant_fk);

  update restaurant_restaurant
  set
    average_rating = (
      select round(avg(rating_value)::numeric, 2)
      from review_review
      where restaurant_fk = v_restaurant_pk
        and moderation_status_code = 'APPROVED'
        and is_public = true
    ),
    rating_count = (
      select count(*)
      from review_review
      where restaurant_fk = v_restaurant_pk
        and moderation_status_code = 'APPROVED'
        and is_public = true
    )
  where restaurant_restaurant_pk = v_restaurant_pk;

  return null;
end; $$;

comment on function public.COMPUTED_refresh_restaurant_rating() is
  'AFTER INSERT/UPDATE on review_review. Maintains restaurant_restaurant.average_rating and rating_count. Prefixed COMPUTED_.';

drop trigger if exists review_review_COMPUTED_restaurant_rating on review_review;

create trigger review_review_COMPUTED_restaurant_rating
  after insert or update of rating_value, moderation_status_code, is_public
  on review_review
  for each row execute function public.COMPUTED_refresh_restaurant_rating();
-- =============================================================================
-- =============================================================================
-- SECTION 27 — Row Level Security
-- =============================================================================

-- Enable RLS on all consumer-accessible and restaurant-accessible tables
alter table iam_profile                         enable row level security;
alter table consumer_profile                    enable row level security;
alter table consumer_dietary_preference         enable row level security;
alter table consumer_allergen_preference        enable row level security;
alter table consumer_city_preference            enable row level security;
alter table consumer_saved_restaurant           enable row level security;
alter table consumer_referral_code              enable row level security;
alter table consumer_referral                   enable row level security;
alter table consumer_subscription               enable row level security;
alter table consumer_passport_stat              enable row level security;
alter table consumer_notification_preference    enable row level security;
alter table restaurant_team_membership          enable row level security;
alter table restaurant_restaurant               enable row level security;
alter table restaurant_public_profile           enable row level security;
alter table restaurant_contact                  enable row level security;
alter table restaurant_cuisine_map              enable row level security;
alter table restaurant_document                 enable row level security;
alter table restaurant_compliance               enable row level security;
alter table restaurant_payout_account           enable row level security;
alter table restaurant_setting                  enable row level security;
alter table restaurant_onboarding_task          enable row level security;
alter table catalog_bag_template                enable row level security;
alter table catalog_bag_template_revision       enable row level security;
alter table catalog_bag_template_allergen       enable row level security;
alter table catalog_bag_template_media          enable row level security;
alter table drop_drop                           enable row level security;
alter table drop_audience                       enable row level security;
alter table drop_media                          enable row level security;
alter table drop_inventory_hold                 enable row level security;
alter table order_order                         enable row level security;
alter table order_item                          enable row level security;
alter table order_pickup_verification_event     enable row level security;
alter table payment_order_intent                enable row level security;
alter table payment_transaction                 enable row level security;
alter table payment_refund                      enable row level security;
alter table billing_subscription_charge         enable row level security;
alter table finance_settlement_run              enable row level security;
alter table finance_restaurant_payout_entry     enable row level security;
alter table finance_invoice                     enable row level security;
alter table notification_device                 enable row level security;
alter table notification_outbox                 enable row level security;
alter table review_review                       enable row level security;
alter table review_media                        enable row level security;
alter table support_ticket                      enable row level security;
alter table support_ticket_event                enable row level security;
alter table incident_incident                   enable row level security;
alter table incident_event                      enable row level security;

-- Public read RLS for discovery/reference tables
alter table geo_city                         enable row level security;
alter table geo_neighborhood                 enable row level security;
alter table master_allergen                  enable row level security;
alter table master_cuisine                   enable row level security;
alter table cms_page                         enable row level security;
alter table cms_city_page                    enable row level security;
alter table cms_post                         enable row level security;
alter table cms_banner                       enable row level security;
alter table cms_restaurant_feature           enable row level security;

-- Service role owns back-office-only tables. RLS enabled where direct browser access
-- could otherwise leak operational data.
alter table marketing_waitlist_lead          enable row level security;
alter table marketing_partner_lead           enable row level security;
alter table privacy_consent_event            enable row level security;
alter table privacy_erasure_request          enable row level security;
alter table admin_export_job                 enable row level security;
alter table admin_data_correction            enable row level security;
alter table audit_log                        enable row level security;

-- Helper: profile for current Supabase Auth user.
create or replace function public.rls_current_profile_pk()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select iam_profile_pk
  from iam_profile
  where auth_user_fk = auth.uid()
  limit 1
$$;
comment on function public.rls_current_profile_pk() is
  'RLS helper. Resolves current Supabase auth.uid() to iam_profile. SECURITY DEFINER so policies can evaluate even when caller cannot directly scan iam_profile.';

create or replace function public.rls_is_platform_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from iam_profile p
    where p.auth_user_fk = auth.uid()
      and p.is_platform_user = true
  )
$$;
comment on function public.rls_is_platform_user() is
  'RLS helper. True when current profile is a platform admin/support/ops/finance user. Detailed scope checks remain in middleware; RLS provides coarse DB guard.';

create or replace function public.rls_has_restaurant_access(p_restaurant_pk uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from restaurant_team_membership m
    join iam_profile p on p.iam_profile_pk = m.iam_profile_fk
    where p.auth_user_fk = auth.uid()
      and m.restaurant_fk = p_restaurant_pk
      and m.is_active = true
  )
$$;
comment on function public.rls_has_restaurant_access(uuid) is
  'RLS helper. True when current profile has active membership on the restaurant. Role/scope granularity is checked in API middleware.';

create or replace function public.rls_is_consumer_profile(p_consumer_profile_pk uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from consumer_profile c
    join iam_profile p on p.iam_profile_pk = c.iam_profile_fk
    where p.auth_user_fk = auth.uid()
      and c.consumer_profile_pk = p_consumer_profile_pk
  )
$$;
comment on function public.rls_is_consumer_profile(uuid) is
  'RLS helper. True when the consumer_profile belongs to the authenticated Supabase user.';


create or replace function public.rls_current_consumer_profile_pk()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.consumer_profile_pk
  from consumer_profile c
  join iam_profile p on p.iam_profile_pk = c.iam_profile_fk
  where p.auth_user_fk = auth.uid()
  limit 1
$$;

comment on function public.rls_current_consumer_profile_pk() is
  'RLS helper. Resolves current Supabase auth.uid() to the owning consumer_profile_pk, or null when the user is not a consumer.';

create or replace function public.rls_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rls_is_platform_user()
$$;

comment on function public.rls_is_platform_admin() is
  'RLS helper alias used by the platform-admin policy loop. Scope-specific authorization remains in API middleware.';

create or replace function public.rls_restaurant_is_public(p_restaurant_pk uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from restaurant_restaurant r
    left join restaurant_public_profile rp
      on rp.restaurant_fk = r.restaurant_restaurant_pk
    where r.restaurant_restaurant_pk = p_restaurant_pk
      and r.restaurant_status_code = 'ACTIVE'
      and (
        rp.restaurant_public_profile_pk is null
        or rp.published_at is not null
      )
  )
$$;

comment on function public.rls_restaurant_is_public(uuid) is
  'RLS helper. True for ACTIVE restaurants with no profile row yet or a published public profile.';

create or replace function public.rls_drop_is_public(p_drop_pk uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from drop_drop d
    join restaurant_restaurant r
      on r.restaurant_restaurant_pk = d.restaurant_fk
    where d.drop_drop_pk = p_drop_pk
      and d.visibility_code = 'PUBLIC'
      and d.drop_status_code in ('SCHEDULED','ACTIVE','SOLD_OUT','PICKUP_CLOSED')
      and (d.publish_at is null or d.publish_at <= now())
      and r.restaurant_status_code = 'ACTIVE'
  )
$$;

comment on function public.rls_drop_is_public(uuid) is
  'RLS helper. True for public, published, consumer-visible drops owned by ACTIVE restaurants.';


-- Public reference/discovery policies.
create policy p_geo_city_public_read on geo_city
  for select to anon, authenticated
  using (is_active = true);

create policy p_geo_neighborhood_public_read on geo_neighborhood
  for select to anon, authenticated
  using (is_active = true);

create policy p_master_allergen_public_read on master_allergen
  for select to anon, authenticated
  using (is_active = true);

create policy p_master_cuisine_public_read on master_cuisine
  for select to anon, authenticated
  using (is_active = true);

create policy p_cms_page_public_read on cms_page
  for select to anon, authenticated
  using (page_status_code = 'PUBLISHED');

create policy p_cms_city_page_public_read on cms_city_page
  for select to anon, authenticated
  using (is_published = true);

create policy p_cms_post_public_read on cms_post
  for select to anon, authenticated
  using (post_status_code = 'PUBLISHED');

create policy p_cms_banner_public_read on cms_banner
  for select to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy p_cms_restaurant_feature_public_read on cms_restaurant_feature
  for select to anon, authenticated
  using (is_published = true);

-- Public restaurant/drop read. Claim/order mutations are service/API paths.
create policy p_restaurant_public_read on restaurant_restaurant
  for select to anon, authenticated
  using (restaurant_status_code = 'ACTIVE');

create policy p_restaurant_public_profile_read on restaurant_public_profile
  for select to anon, authenticated
  using (published_at is not null);

create policy p_catalog_template_public_read on catalog_bag_template
  for select to anon, authenticated
  using (template_status_code = 'ACTIVE');

create policy p_catalog_revision_public_read on catalog_bag_template_revision
  for select to anon, authenticated
  using (revision_status_code = 'PUBLISHED');

create policy p_catalog_allergen_public_read on catalog_bag_template_allergen
  for select to anon, authenticated
  using (true);

create policy p_catalog_media_public_read on catalog_bag_template_media
  for select to anon, authenticated
  using (true);

create policy p_drop_public_read on drop_drop
  for select to anon, authenticated
  using (
    visibility_code = 'PUBLIC'
    and drop_status_code in ('SCHEDULED','ACTIVE','SOLD_OUT','PICKUP_CLOSED')
  );

create policy p_drop_audience_authenticated_read on drop_audience
  for select to authenticated
  using (true);

create policy p_drop_media_public_read on drop_media
  for select to anon, authenticated
  using (true);

-- Own-profile policies.
create policy p_iam_profile_self_select on iam_profile
  for select to authenticated
  using (auth_user_fk = auth.uid() or public.rls_is_platform_user());

create policy p_iam_profile_self_update on iam_profile
  for update to authenticated
  using (auth_user_fk = auth.uid())
  with check (auth_user_fk = auth.uid());

create policy p_consumer_profile_self on consumer_profile
  for all to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_pk) or public.rls_is_platform_user())
  with check (public.rls_is_consumer_profile(consumer_profile_pk) or public.rls_is_platform_user());

create policy p_consumer_dietary_self on consumer_dietary_preference
  for all to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user())
  with check (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

create policy p_consumer_allergen_self on consumer_allergen_preference
  for all to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user())
  with check (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

create policy p_consumer_city_self on consumer_city_preference
  for all to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user())
  with check (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

create policy p_consumer_saved_restaurant_self on consumer_saved_restaurant
  for all to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user())
  with check (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

create policy p_consumer_referral_code_self on consumer_referral_code
  for select to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

create policy p_consumer_referral_self on consumer_referral
  for select to authenticated
  using (
    public.rls_is_consumer_profile(referrer_consumer_profile_fk)
    or public.rls_is_consumer_profile(referred_consumer_profile_fk)
    or public.rls_is_platform_user()
  );

create policy p_consumer_subscription_self on consumer_subscription
  for select to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

create policy p_consumer_passport_self on consumer_passport_stat
  for select to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

create policy p_consumer_notification_pref_self on consumer_notification_preference
  for all to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user())
  with check (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

-- Consumer order/payment policies.
create policy p_order_consumer_select on order_order
  for select to authenticated
  using (
    public.rls_is_consumer_profile(consumer_profile_fk)
    or public.rls_has_restaurant_access(restaurant_fk)
    or public.rls_is_platform_user()
  );

create policy p_order_item_consumer_select on order_item
  for select to authenticated
  using (
    exists (
      select 1
      from order_order o
      where o.order_order_pk = order_item.order_fk
        and (
          public.rls_is_consumer_profile(o.consumer_profile_fk)
          or public.rls_has_restaurant_access(o.restaurant_fk)
          or public.rls_is_platform_user()
        )
    )
  );

create policy p_drop_inventory_hold_consumer_select on drop_inventory_hold
  for select to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

create policy p_payment_order_intent_consumer_select on payment_order_intent
  for select to authenticated
  using (public.rls_is_consumer_profile(consumer_profile_fk) or public.rls_is_platform_user());

create policy p_payment_transaction_consumer_select on payment_transaction
  for select to authenticated
  using (
    exists (
      select 1
      from payment_order_intent i
      where i.payment_order_intent_pk = payment_transaction.payment_order_intent_fk
        and (public.rls_is_consumer_profile(i.consumer_profile_fk) or public.rls_is_platform_user())
    )
  );

create policy p_payment_refund_consumer_select on payment_refund
  for select to authenticated
  using (
    exists (
      select 1
      from order_order o
      where o.order_order_pk = payment_refund.order_fk
        and (
          public.rls_is_consumer_profile(o.consumer_profile_fk)
          or public.rls_has_restaurant_access(o.restaurant_fk)
          or public.rls_is_platform_user()
        )
    )
  );

create policy p_billing_subscription_charge_self on billing_subscription_charge
  for select to authenticated
  using (
    exists (
      select 1
      from consumer_subscription s
      where s.consumer_subscription_pk = billing_subscription_charge.consumer_subscription_fk
        and (public.rls_is_consumer_profile(s.consumer_profile_fk) or public.rls_is_platform_user())
    )
  );

-- Restaurant portal policy coverage not present in Team B base script.
create policy p_restaurant_self_select on restaurant_restaurant
  for select to authenticated
  using (public.rls_has_restaurant_access(restaurant_restaurant_pk));

create policy p_restaurant_public_profile_team on restaurant_public_profile
  for all to authenticated
  using (public.rls_has_restaurant_access(restaurant_fk))
  with check (public.rls_has_restaurant_access(restaurant_fk));

create policy p_restaurant_contact_team on restaurant_contact
  for all to authenticated
  using (public.rls_has_restaurant_access(restaurant_fk))
  with check (public.rls_has_restaurant_access(restaurant_fk));

create policy p_restaurant_cuisine_map_team on restaurant_cuisine_map
  for all to authenticated
  using (public.rls_has_restaurant_access(restaurant_fk))
  with check (public.rls_has_restaurant_access(restaurant_fk));
create policy p_restaurant_document_team_select on restaurant_document
  for select to authenticated
  using (public.rls_has_restaurant_access(restaurant_fk));

create policy p_restaurant_payout_account_team_select on restaurant_payout_account
  for select to authenticated
  using (public.rls_has_restaurant_access(restaurant_fk));

create policy p_restaurant_onboarding_task_team on restaurant_onboarding_task
  for select to authenticated
  using (public.rls_has_restaurant_access(restaurant_fk));

create policy p_catalog_template_team on catalog_bag_template
  for all to authenticated
  using (public.rls_has_restaurant_access(restaurant_fk))
  with check (public.rls_has_restaurant_access(restaurant_fk));

create policy p_catalog_revision_team on catalog_bag_template_revision
  for all to authenticated
  using (exists (
    select 1 from catalog_bag_template t
    where t.catalog_bag_template_pk = catalog_bag_template_revision.catalog_bag_template_fk
      and public.rls_has_restaurant_access(t.restaurant_fk)
  ))
  with check (exists (
    select 1 from catalog_bag_template t
    where t.catalog_bag_template_pk = catalog_bag_template_revision.catalog_bag_template_fk
      and public.rls_has_restaurant_access(t.restaurant_fk)
  ));

create policy p_catalog_allergen_team on catalog_bag_template_allergen
  for all to authenticated
  using (exists (
    select 1
    from catalog_bag_template_revision r
    join catalog_bag_template t on t.catalog_bag_template_pk = r.catalog_bag_template_fk
    where r.catalog_bag_template_revision_pk = catalog_bag_template_allergen.catalog_bag_template_revision_fk
      and public.rls_has_restaurant_access(t.restaurant_fk)
  ))
  with check (exists (
    select 1
    from catalog_bag_template_revision r
    join catalog_bag_template t on t.catalog_bag_template_pk = r.catalog_bag_template_fk
    where r.catalog_bag_template_revision_pk = catalog_bag_template_allergen.catalog_bag_template_revision_fk
      and public.rls_has_restaurant_access(t.restaurant_fk)
  ));

create policy p_catalog_media_team on catalog_bag_template_media
  for all to authenticated
  using (exists (
    select 1
    from catalog_bag_template_revision r
    join catalog_bag_template t on t.catalog_bag_template_pk = r.catalog_bag_template_fk
    where r.catalog_bag_template_revision_pk = catalog_bag_template_media.catalog_bag_template_revision_fk
      and public.rls_has_restaurant_access(t.restaurant_fk)
  ))
  with check (exists (
    select 1
    from catalog_bag_template_revision r
    join catalog_bag_template t on t.catalog_bag_template_pk = r.catalog_bag_template_fk
    where r.catalog_bag_template_revision_pk = catalog_bag_template_media.catalog_bag_template_revision_fk
      and public.rls_has_restaurant_access(t.restaurant_fk)
  ));

create policy p_drop_media_team on drop_media
  for all to authenticated
  using (exists (select 1 from drop_drop d where d.drop_drop_pk = drop_media.drop_fk and public.rls_has_restaurant_access(d.restaurant_fk)))
  with check (exists (select 1 from drop_drop d where d.drop_drop_pk = drop_media.drop_fk and public.rls_has_restaurant_access(d.restaurant_fk)));

create policy p_drop_audience_team on drop_audience
  for all to authenticated
  using (exists (select 1 from drop_drop d where d.drop_drop_pk = drop_audience.drop_fk and public.rls_has_restaurant_access(d.restaurant_fk)))
  with check (exists (select 1 from drop_drop d where d.drop_drop_pk = drop_audience.drop_fk and public.rls_has_restaurant_access(d.restaurant_fk)));

create policy p_drop_inventory_event_team_select on drop_inventory_event
  for select to authenticated
  using (exists (select 1 from drop_drop d where d.drop_drop_pk = drop_inventory_event.drop_fk and public.rls_has_restaurant_access(d.restaurant_fk)));

create policy p_drop_closure_log_team_select on drop_closure_log
  for select to authenticated
  using (exists (select 1 from drop_drop d where d.drop_drop_pk = drop_closure_log.drop_fk and public.rls_has_restaurant_access(d.restaurant_fk)));

create policy p_order_item_restaurant_select on order_item
  for select to authenticated
  using (exists (
    select 1 from order_order o
    where o.order_order_pk = order_item.order_fk
      and public.rls_has_restaurant_access(o.restaurant_fk)
  ));

create policy p_order_status_transition_restaurant_select on order_status_transition
  for select to authenticated
  using (exists (
    select 1 from order_order o
    where o.order_order_pk = order_status_transition.order_fk
      and public.rls_has_restaurant_access(o.restaurant_fk)
  ));

create policy p_pickup_ver_event_consumer_select on order_pickup_verification_event
  for select to authenticated
  using (exists (
    select 1 from order_order o
    where o.order_order_pk = order_pickup_verification_event.order_fk
      and o.consumer_profile_fk = public.rls_current_consumer_profile_pk()
  ));

create policy p_billing_subscription_charge_consumer_select on billing_subscription_charge
  for select to authenticated
  using (exists (
    select 1 from consumer_subscription cs
    where cs.consumer_subscription_pk = billing_subscription_charge.consumer_subscription_fk
      and cs.consumer_profile_fk = public.rls_current_consumer_profile_pk()
  ));

create policy p_billing_subscription_event_consumer_select on billing_subscription_event
  for select to authenticated
  using (exists (
    select 1 from consumer_subscription cs
    where cs.consumer_subscription_pk = billing_subscription_event.consumer_subscription_fk
      and cs.consumer_profile_fk = public.rls_current_consumer_profile_pk()
  ));

create policy p_finance_payout_entry_restaurant_select on finance_restaurant_payout_entry
  for select to authenticated
  using (public.rls_has_restaurant_access(restaurant_fk));

create policy p_finance_invoice_restaurant_select on finance_invoice
  for select to authenticated
  using (public.rls_has_restaurant_access(restaurant_fk));

-- Platform admin policy. Admin users are authenticated users with an active
-- iam_platform_membership. Service-role continues to bypass RLS for Edge jobs.
do $$
declare
  r record;
begin
  for r in
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r','p')
      and not exists (select 1 from pg_inherits i where i.inhrelid = c.oid)
  loop
    execute format(
      'create policy p_platform_admin_all on %I.%I for all to authenticated using (public.rls_is_platform_admin()) with check (public.rls_is_platform_admin())',
      r.nspname,
      r.relname
    );
  end loop;
end $$;

-- Hot-path inventory RPC. Keeps the high-concurrency claim operation atomic in
-- Postgres rather than splitting lock/update/insert across API middleware.
create or replace function public.api_create_inventory_hold(
  p_drop_pk uuid,
  p_idempotency_key text,
  p_quantity integer default 1,
  p_hold_minutes integer default 10
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumer_profile_pk uuid;
  v_existing_hold_pk uuid;
  v_hold_pk uuid;
  v_before_reserved integer;
  v_after_reserved integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  if p_hold_minutes is null or p_hold_minutes < 1 or p_hold_minutes > 60 then
    raise exception 'hold minutes must be between 1 and 60';
  end if;

  v_consumer_profile_pk := public.rls_current_consumer_profile_pk();
  if v_consumer_profile_pk is null then
    raise exception 'authenticated consumer profile required';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
    select drop_inventory_hold_pk into v_existing_hold_pk
    from drop_inventory_hold
    where idempotency_key = p_idempotency_key
      and consumer_profile_fk = v_consumer_profile_pk
    limit 1;

    if v_existing_hold_pk is not null then
      return v_existing_hold_pk;
    end if;
  end if;

  select quantity_reserved into v_before_reserved
  from drop_drop
  where drop_drop_pk = p_drop_pk
  for update;

  if not found then
    raise exception 'drop not found';
  end if;

  update drop_drop
  set quantity_reserved = quantity_reserved + p_quantity
  where drop_drop_pk = p_drop_pk
    and drop_status_code = 'ACTIVE'
    and (publish_at is null or publish_at <= now())
    and pickup_end_at > now()
    and COMPUTED_quantity_available >= p_quantity
  returning quantity_reserved into v_after_reserved;

  if not found then
    raise exception 'drop is unavailable or insufficient quantity';
  end if;

  insert into drop_inventory_hold (
    drop_fk,
    consumer_profile_fk,
    idempotency_key,
    hold_status_code,
    quantity,
    expires_at
  ) values (
    p_drop_pk,
    v_consumer_profile_pk,
    p_idempotency_key,
    'ACTIVE',
    p_quantity,
    now() + make_interval(mins => p_hold_minutes)
  ) returning drop_inventory_hold_pk into v_hold_pk;

insert into drop_inventory_event (
  drop_fk,
  drop_inventory_hold_fk,
  event_type_code,
  quantity_delta,
  reason_text
) values (
  p_drop_pk,
  v_hold_pk,
  'HOLD_CREATED',
  -p_quantity,
  concat(
    'api_create_inventory_hold before_reserved=',
    v_before_reserved,
    ' after_reserved=',
    v_after_reserved
  )
);

  return v_hold_pk;
end;
$$;
comment on function public.api_create_inventory_hold(uuid,text,integer,integer) is
  'Authenticated consumer RPC. Atomically reserves drop inventory, creates a hold, and appends an inventory event. Uses idempotency key and row lock for retry/concurrency safety.';

create or replace function public.api_release_expired_inventory_holds(p_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select h.drop_inventory_hold_pk, h.drop_fk, h.quantity
    from drop_inventory_hold h
    where h.hold_status_code = 'ACTIVE'
      and h.expires_at <= now()
    order by h.expires_at
    limit greatest(1, least(coalesce(p_limit, 500), 5000))
    for update skip locked
  loop
    update drop_inventory_hold
    set hold_status_code = 'EXPIRED', updated_at = now()
    where drop_inventory_hold_pk = r.drop_inventory_hold_pk;

    update drop_drop
    set quantity_reserved = greatest(quantity_reserved - r.quantity, 0)
    where drop_drop_pk = r.drop_fk;

    insert into drop_inventory_event (
      drop_fk,
      drop_inventory_hold_fk,
      event_type_code,
      quantity_delta,
      reason_text
    ) values (
      r.drop_fk,
      r.drop_inventory_hold_pk,
      'HOLD_EXPIRED',
      r.quantity,
      'api_release_expired_inventory_holds'
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
comment on function public.api_release_expired_inventory_holds(integer) is
  'Cron/service RPC. Releases expired ACTIVE holds, decrements reserved quantity, and appends inventory events using SKIP LOCKED for safe concurrent workers.';

revoke all on function public.api_create_inventory_hold(uuid,text,integer,integer) from public;
grant execute on function public.api_create_inventory_hold(uuid,text,integer,integer) to authenticated;

revoke all on function public.api_release_expired_inventory_holds(integer) from public;
grant execute on function public.api_release_expired_inventory_holds(integer) to service_role;

-- Browser/API read models. These views expose safe shapes for public discovery,
-- consumer history, and restaurant pickup queues without requiring clients to
-- know internal joins or sensitive columns.
create or replace view api_public_drop_card
with (security_barrier = true) as
select
  d.drop_drop_pk,
  d.drop_title,
  d.drop_status_code,
  d.drop_type_code,
  d.COMPUTED_quantity_available,
  d.price_paise,
  d.pickup_start_at,
  d.pickup_end_at,
  d.geo_city_fk,
  gc.city_code,
  gc.city_name,
  gn.neighborhood_name,
  r.restaurant_restaurant_pk,
  r.restaurant_slug,
  r.restaurant_name,
  rp.headline as restaurant_headline,
  rp.hero_storage_object_fk
from drop_drop d
join restaurant_restaurant r
  on r.restaurant_restaurant_pk = d.restaurant_fk
join geo_city gc
  on gc.geo_city_pk = d.geo_city_fk
left join restaurant_public_profile rp
  on rp.restaurant_fk = r.restaurant_restaurant_pk
left join geo_neighborhood gn
  on gn.geo_neighborhood_pk = d.geo_neighborhood_fk
where public.rls_drop_is_public(d.drop_drop_pk);

comment on view api_public_drop_card is
  'Safe public discovery card shape for /drops and home feed. Excludes operational/internal columns.';

create or replace view api_public_restaurant_profile
with (security_barrier = true) as
select
  r.restaurant_restaurant_pk,
  r.restaurant_slug,
  r.restaurant_name,
  r.average_rating,
  r.rating_count,
  r.geo_city_fk,
  gc.city_name,
  r.geo_neighborhood_fk,
  gn.neighborhood_name,
  r.pickup_instructions,
  rp.headline,
  rp.story_markdown,
  rp.hero_storage_object_fk,
  rp.logo_storage_object_fk,
  rp.is_featured,
  rp.published_at
from restaurant_restaurant r
left join restaurant_public_profile rp
  on rp.restaurant_fk = r.restaurant_restaurant_pk
left join geo_city gc
  on gc.geo_city_pk = r.geo_city_fk
left join geo_neighborhood gn
  on gn.geo_neighborhood_pk = r.geo_neighborhood_fk
where public.rls_restaurant_is_public(r.restaurant_restaurant_pk);

comment on view api_public_restaurant_profile is
  'Safe public restaurant profile for /restaurants/[slug]. Excludes private contact, legal, compliance, payout, and team data.';

create or replace view api_consumer_order_history
with (security_barrier = true) as
select
  o.order_order_pk,
  o.order_number,
  o.order_status_code,
  o.payment_status_code,
  o.snapshot_restaurant_name,
  o.snapshot_restaurant_slug,
  o.snapshot_drop_title,
  o.pickup_window_start_at,
  o.pickup_window_end_at,
  o.snapshot_dietary_category_code,
  o.snapshot_spice_level_code,
  o.snapshot_allergen_summary_text,
  o.total_paise,
  o.pickup_qr_nonce_hash is not null as has_pickup_qr,
  o.COMPUTED_pickup_ready_flag,
  o.created_at,
  o.updated_at
from order_order o
where o.consumer_profile_fk = public.rls_current_consumer_profile_pk();

comment on view api_consumer_order_history is
  'Authenticated consumer order history/read model for app and PWA account pages.';

create or replace view api_restaurant_pickup_queue
with (security_barrier = true) as
select
  o.order_order_pk,
  o.order_number,
  o.order_status_code,
  o.payment_status_code,
  o.restaurant_fk,
  o.drop_fk,
  o.snapshot_drop_title,
  o.pickup_window_start_at,
  o.pickup_window_end_at,
  o.COMPUTED_pickup_ready_flag,
  o.created_at,
  o.updated_at
from order_order o
where o.COMPUTED_pickup_ready_flag = true
  and public.rls_has_restaurant_access(o.restaurant_fk);

comment on view api_restaurant_pickup_queue is
  'Restaurant staff app queue. Returns only pickup-ready orders for restaurants accessible to the current staff user.';

grant usage on schema public to anon, authenticated;
grant select on api_public_drop_card, api_public_restaurant_profile to anon, authenticated;
grant select on api_consumer_order_history, api_restaurant_pickup_queue to authenticated;

-- Table privileges are intentionally broad and row-scoped by RLS. Tables without
-- a permissive policy remain unreadable/unwritable to anon/authenticated roles.
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- FK indexes generated from the validated schema to avoid table scans on common
-- joins and parent deletes/updates. These are ordinary btree indexes on the FK
-- columns not already covered as a left-prefix by a PK/unique/index.
-- FK indexes generated from the validated schema to avoid table scans on common
-- joins and parent deletes/updates. These are ordinary btree indexes on the FK
-- columns not already covered as a left-prefix by a PK/unique/index.

create index idxfk_iam_platform_membership_iam_platform_role_fk
  on iam_platform_membership (iam_platform_role_fk);

create index idxfk_iam_platform_role_scope_master_scope_fk
  on iam_platform_role_scope (master_scope_fk);

create index idxfk_restaurant_team_role_scope_master_scope_fk
  on restaurant_team_role_scope (master_scope_fk);

create index idxfk_restaurant_team_membership_restaurant_team_role_fk
  on restaurant_team_membership (restaurant_team_role_fk);

create index idxfk_restaurant_team_membership_invited_by_profile_fk
  on restaurant_team_membership (invited_by_profile_fk);

create index idxfk_marketing_partner_lead_assigned_to_profile_fk
  on marketing_partner_lead (assigned_to_profile_fk);

create index idxfk_privacy_consent_event_privacy_consent_purpose_fk
  on privacy_consent_event (privacy_consent_purpose_fk);

create index idxfk_privacy_consent_event_recorded_by_profile_fk
  on privacy_consent_event (recorded_by_profile_fk);

create index idxfk_privacy_erasure_request_reviewed_by_profile_fk
  on privacy_erasure_request (reviewed_by_profile_fk);

create index idxfk_consumer_allergen_preference_master_allergen_fk
  on consumer_allergen_preference (master_allergen_fk);

create index idxfk_consumer_city_preference_geo_city_fk
  on consumer_city_preference (geo_city_fk);

create index idxfk_consumer_subscription_consumer_subscription_plan_fk
  on consumer_subscription (consumer_subscription_plan_fk);

create index idxfk_restaurant_restaurant_geo_address_fk
  on restaurant_restaurant (geo_address_fk);

create index idxfk_restaurant_compliance_last_reviewed_by_profile_fk
  on restaurant_compliance (last_reviewed_by_profile_fk);

create index idxfk_restaurant_document_master_document_type_fk
  on restaurant_document (master_document_type_fk);

create index idxfk_restaurant_document_reviewed_by_profile_fk
  on restaurant_document (reviewed_by_profile_fk);

create index idxfk_restaurant_commission_override_restaurant_commission_plan_fk
  on restaurant_commission_override (restaurant_commission_plan_fk);

create index idxfk_restaurant_onboarding_task_completed_by_profile_fk
  on restaurant_onboarding_task (completed_by_profile_fk);

create index idxfk_storage_object_master_storage_visibility_fk
  on storage_object (master_storage_visibility_fk);

create index idxfk_catalog_bag_template_created_by_profile_fk
  on catalog_bag_template (created_by_profile_fk);

create index idxfk_catalog_bag_template_allergen_master_allergen_fk
  on catalog_bag_template_allergen (master_allergen_fk);

create index idxfk_catalog_bag_template_media_storage_object_fk
  on catalog_bag_template_media (storage_object_fk);

create index idxfk_drop_drop_catalog_bag_template_revision_fk
  on drop_drop (catalog_bag_template_revision_fk);

create index idxfk_drop_drop_drop_recurring_schedule_fk
  on drop_drop (drop_recurring_schedule_fk);

create index idxfk_drop_drop_created_by_profile_fk
  on drop_drop (created_by_profile_fk);

create index idxfk_drop_audience_master_audience_segment_fk
  on drop_audience (master_audience_segment_fk);

create index idxfk_drop_media_storage_object_fk
  on drop_media (storage_object_fk);

create index idxfk_drop_inventory_event_drop_inventory_hold_fk
  on drop_inventory_event (drop_inventory_hold_fk);

create index idxfk_drop_closure_log_closed_by_profile_fk
  on drop_closure_log (closed_by_profile_fk);

create index idxfk_order_item_catalog_bag_template_revision_fk
  on order_item (catalog_bag_template_revision_fk);

create index idxfk_order_status_transition_actor_profile_fk
  on order_status_transition (actor_profile_fk);

create index idxfk_order_pickup_verification_event_verifying_profile_fk
  on order_pickup_verification_event (verifying_profile_fk);

create index idxfk_payment_refund_requested_by_profile_fk
  on payment_refund (requested_by_profile_fk);

create index idxfk_billing_subscription_charge_consumer_subscription_fk
  on billing_subscription_charge (consumer_subscription_fk);

create index idxfk_finance_settlement_run_locked_by_profile_fk
  on finance_settlement_run (locked_by_profile_fk);

create index idxfk_finance_restaurant_payout_entry_order_fk
  on finance_restaurant_payout_entry (order_fk);

create index idxfk_finance_restaurant_payout_entry_payment_refund_fk
  on finance_restaurant_payout_entry (payment_refund_fk);

create index idxfk_finance_invoice_finance_settlement_run_fk
  on finance_invoice (finance_settlement_run_fk);

create index idxfk_finance_invoice_storage_object_fk
  on finance_invoice (storage_object_fk);

create index idxfk_notification_outbox_notification_template_fk
  on notification_outbox (notification_template_fk);

create index idx_notification_outbox_business_context
  on notification_outbox (business_context_type_code, business_context_fk);

create index idxfk_review_media_storage_object_fk
  on review_media (storage_object_fk);

create index idxfk_support_ticket_master_support_ticket_type_fk
  on support_ticket (master_support_ticket_type_fk);

create index idxfk_support_ticket_master_support_ticket_priority_fk
  on support_ticket (master_support_ticket_priority_fk);

create index idxfk_support_ticket_order_fk
  on support_ticket (order_fk);

create index idxfk_support_ticket_marketing_partner_lead_fk
  on support_ticket (marketing_partner_lead_fk);

create index idxfk_support_ticket_event_actor_profile_fk
  on support_ticket_event (actor_profile_fk);

create index idxfk_incident_incident_master_incident_type_fk
  on incident_incident (master_incident_type_fk);

create index idxfk_incident_incident_master_incident_severity_fk
  on incident_incident (master_incident_severity_fk);

create index idxfk_incident_incident_order_fk
  on incident_incident (order_fk);

create index idxfk_incident_incident_support_ticket_fk
  on incident_incident (support_ticket_fk);

create index idxfk_incident_incident_assigned_to_profile_fk
  on incident_incident (assigned_to_profile_fk);

create index idxfk_incident_event_actor_profile_fk
  on incident_event (actor_profile_fk);

create index idxfk_cms_page_created_by_profile_fk
  on cms_page (created_by_profile_fk);

create index idxfk_cms_post_author_profile_fk
  on cms_post (author_profile_fk);

create index idxfk_cms_restaurant_feature_restaurant_fk
  on cms_restaurant_feature (restaurant_fk);

create index idxfk_cms_seo_metadata_og_image_storage_object_fk
  on cms_seo_metadata (og_image_storage_object_fk);

create index idxfk_admin_export_job_requested_by_profile_fk
  on admin_export_job (requested_by_profile_fk);

create index idxfk_admin_export_job_result_storage_object_fk
  on admin_export_job (result_storage_object_fk);

create index idxfk_admin_data_correction_requested_by_profile_fk
  on admin_data_correction (requested_by_profile_fk);

create index idxfk_admin_data_correction_approved_by_profile_fk
  on admin_data_correction (approved_by_profile_fk);

create index idxfk_admin_data_correction_executed_by_profile_fk
  on admin_data_correction (executed_by_profile_fk);

create index idxfk_marketing_waitlist_lead_converted_consumer_profile_fk
  on marketing_waitlist_lead (converted_consumer_profile_fk);

create index idxfk_marketing_partner_lead_converted_restaurant_fk
  on marketing_partner_lead (converted_restaurant_fk);

create index idxfk_restaurant_public_profile_hero_storage_object_fk
  on restaurant_public_profile (hero_storage_object_fk);

create index idxfk_drop_inventory_hold_converted_order_fk
  on drop_inventory_hold (converted_order_fk);

create index idxfk_order_order_drop_inventory_hold_fk
  on order_order (drop_inventory_hold_fk);

create index idxfk_marketing_partner_lead_converted_support_ticket_fk
  on marketing_partner_lead (converted_support_ticket_fk);

-- =============================================================================
-- SECTION 28 — Seed / reference data
-- =============================================================================

-- Privacy consent purposes
insert into privacy_consent_purpose (purpose_code, purpose_name, description, is_required_for_service)
values
  ('OPERATIONAL',          'Operational',              'Core service: orders, account management, pickup coordination.',         true),
  ('MARKETING_EMAIL',      'Marketing Email',           'Product updates, promotions, and new drop announcements via email.',     false),
  ('MARKETING_WHATSAPP',   'Marketing WhatsApp',        'Promotional and campaign messages via WhatsApp.',                       false),
  ('ANALYTICS',            'Analytics',                 'Behaviour analytics for product improvement and personalisation.',      false),
  ('REFERRAL_COMMS',       'Referral Communications',   'Notifications about referral status and rewards.',                      false),
  ('PUSH_NOTIFICATIONS',   'Push Notifications',        'Push alerts for drop availability, order status, and reminders.',      false)
on conflict (purpose_code) do nothing;

-- Data retention policies
insert into privacy_retention_policy (policy_code, applies_to_table_name, retention_days, anonymize_after_days, purge_after_days, legal_hold_supported)
values
  ('ORDER_7Y',          'order_order',                        2555, null, null, true),
  ('FINANCE_7Y',        'finance_restaurant_payout_entry',    2555, null, null, true),
  ('CONSENT_PERMANENT', 'privacy_consent_event',              null, null, null, true),
  ('AUDIT_3Y',          'audit_log',                          1095, null, 1095, true),
  ('ANALYTICS_2Y_5Y',   'analytics_event',                    1825,  730, 1825, false),
  ('KYC_5Y',            'restaurant_document',                1825, null, 1825, true),
  ('NOTIFICATION_90D',  'notification_delivery_attempt',        90, null,   90, false)
on conflict (policy_code) do nothing;

-- Launch city
insert into geo_city (city_code, city_name, state_name, is_active)
values ('HYD', 'Hyderabad', 'Telangana', true)
on conflict (city_code) do nothing;

-- HYD neighborhoods
insert into geo_neighborhood (geo_city_fk, neighborhood_code, neighborhood_name)
select g.geo_city_pk, v.code, v.name
from geo_city g,
(values
  ('JUBILEE_HILLS',  'Jubilee Hills'),
  ('BANJARA_HILLS',  'Banjara Hills'),
  ('GACHIBOWLI',     'Gachibowli'),
  ('KONDAPUR',       'Kondapur'),
  ('HITECH_CITY',    'Hitech City'),
  ('MADHAPUR',       'Madhapur'),
  ('BEGUMPET',       'Begumpet'),
  ('AMEERPET',       'Ameerpet'),
  ('SECUNDERABAD',   'Secunderabad'),
  ('TOLICHOWKI',     'Tolichowki'),
  ('KUKATPALLY',     'Kukatpally')
) v(code, name)
where g.city_code = 'HYD'
on conflict (geo_city_fk, neighborhood_code) do nothing;

-- Allergens (FSSAI 14)
insert into master_allergen (allergen_code, allergen_name, sort_order)
values
  ('DAIRY',       'Dairy',                    1),
  ('WHEAT_GLUTEN','Wheat / Gluten',            2),
  ('NUTS',        'Tree Nuts',                3),
  ('PEANUTS',     'Peanuts',                  4),
  ('EGGS',        'Eggs',                     5),
  ('SOY',         'Soy',                      6),
  ('FISH',        'Fish',                     7),
  ('SHELLFISH',   'Shellfish / Crustaceans',  8),
  ('SESAME',      'Sesame',                   9),
  ('MUSTARD',     'Mustard',                 10),
  ('CELERY',      'Celery',                  11),
  ('LUPIN',       'Lupin',                   12),
  ('MOLLUSCS',    'Molluscs',                13),
  ('SULPHITES',   'Sulphites / Sulphur Dioxide', 14)
on conflict (allergen_code) do nothing;

-- Cuisine types
insert into master_cuisine (cuisine_code, cuisine_name, sort_order)
values
  ('SOUTH_INDIAN',  'South Indian',    1),
  ('NORTH_INDIAN',  'North Indian',    2),
  ('HYDERABADI',    'Hyderabadi',      3),
  ('BIRYANI',       'Biryani',         4),
  ('CHINESE',       'Chinese',         5),
  ('CONTINENTAL',   'Continental',     6),
  ('SEAFOOD',       'Seafood',         7),
  ('MUGHLAI',       'Mughlai',         8),
  ('ITALIAN',       'Italian',         9),
  ('STREET_FOOD',   'Street Food',    10),
  ('DESSERTS',      'Desserts',       11),
  ('BAKERY',        'Bakery',         12),
  ('MULTI_CUISINE', 'Multi-Cuisine',  13)
on conflict (cuisine_code) do nothing;

-- Audience segments
insert into master_audience_segment (segment_code, segment_name, description, sort_order)
values
  ('ALL_USERS',            'All Users',              'No eligibility check. Visible to everyone.',                          1),
  ('SWAAD_CLUB',           'Swaad Club Members',     'Active consumer_subscription required.',                             2),
  ('WHATSAPP_INSIDERS',    'WhatsApp Insiders',       'Members of the goZaika WhatsApp insider group.',                    3),
  ('RESTAURANT_FOLLOWERS', 'Restaurant Followers',   'Consumers who have saved/followed this restaurant.',                 4),
  ('EARLY_ACCESS',         'Early Access',            'Early-access list managed by ops for pre-launch priority claims.',  5)
on conflict (segment_code) do nothing;

-- Storage visibility
insert into master_storage_visibility (visibility_code, visibility_name, description, is_public_readable)
values
  ('PUBLIC_CDN',          'Public CDN',             'Served without auth via CDN. Restaurant/drop images.',               true),
  ('AUTHENTICATED_ONLY',  'Authenticated Only',     'Requires valid session. Receipts, exports.',                         false),
  ('SERVICE_ONLY',        'Service Role Only',      'Never accessible from browser. KYC, payout docs.',                  false),
  ('OWNER_ONLY',          'Owner Only',             'Owner''s own uploads only.',                                          false)
on conflict (visibility_code) do nothing;

-- Document types
insert into master_document_type (type_code, type_name, description, is_required)
values
  ('FSSAI_LICENSE',           'FSSAI License',              'FSSAI food safety license number and certificate.',        true),
  ('GST_CERTIFICATE',         'GST Certificate',            'GST registration certificate.',                             true),
  ('PAN_CARD',                'PAN Card',                   'PAN card of the legal entity.',                             true),
  ('BANK_CANCELLED_CHEQUE',   'Bank Cancelled Cheque',      'Cancelled cheque for payout bank account verification.',   true),
  ('FOOD_SAFETY_AUDIT',       'Food Safety Audit Report',   'Third-party food safety audit report.',                    false),
  ('MENU_CARD',               'Menu Card',                  'Current restaurant menu for reference.',                   false)
on conflict (type_code) do nothing;

-- Document statuses
insert into master_document_status (status_code, status_name, description, is_terminal, sort_order)
values
  ('PENDING_REVIEW', 'Pending Review', 'Newly uploaded, awaiting admin review.',           false, 1),
  ('UNDER_REVIEW',   'Under Review',   'Admin is actively reviewing this document.',        false, 2),
  ('APPROVED',       'Approved',       'Document verified and accepted.',                   true,  3),
  ('REJECTED',       'Rejected',       'Document rejected. rejection_reason populated.',    true,  4),
  ('EXPIRED',        'Expired',        'Document validity period has lapsed.',              true,  5)
on conflict (status_code) do nothing;

-- Support ticket types
insert into master_support_ticket_type (type_code, type_name)
values
  ('ORDER_ISSUE',           'Order Issue'),
  ('REFUND_REQUEST',        'Refund Request'),
  ('FOOD_SAFETY',           'Food Safety Complaint'),
  ('PACKAGING_COMPLAINT',   'Packaging Complaint'),
  ('DIETARY_MISMATCH',      'Dietary Mismatch'),
  ('MISSING_PICKUP',        'Missing / Refused Pickup'),
  ('ACCOUNT_ISSUE',         'Account Issue'),
  ('RESTAURANT_ONBOARDING', 'Restaurant Onboarding'),
  ('BILLING_QUERY',         'Billing Query'),
  ('GENERAL',               'General Inquiry')
on conflict (type_code) do nothing;

-- Support ticket statuses
insert into master_support_ticket_status (status_code, status_name, is_terminal, sort_order)
values
  ('OPEN',              'Open',                false, 1),
  ('IN_PROGRESS',       'In Progress',         false, 2),
  ('PENDING_CUSTOMER',  'Pending Customer',    false, 3),
  ('PENDING_MERCHANT',  'Pending Merchant',    false, 4),
  ('RESOLVED',          'Resolved',            true,  5),
  ('CLOSED',            'Closed',              true,  6),
  ('REJECTED',          'Rejected',            true,  7)
on conflict (status_code) do nothing;

-- Support ticket priorities
insert into master_support_ticket_priority (priority_code, priority_name, description, sla_first_response_minutes, sort_order)
values
  ('CRITICAL', 'Critical', 'Food safety incident. Immediate escalation.',          30,   1),
  ('HIGH',     'High',     'Payment failure, dietary mismatch.',                  120,   2),
  ('NORMAL',   'Normal',   'Standard issues.',                                    480,   3),
  ('LOW',      'Low',      'General queries, non-urgent.',                       2880,   4)
on conflict (priority_code) do nothing;

-- Incident types
insert into master_incident_type (type_code, type_name, description)
values
  ('DIETARY_MISMATCH',    'Dietary Mismatch',     'Bag contained items not matching disclosed dietary category.'),
  ('FOOD_SAFETY',         'Food Safety',          'Potential contamination, foreign object, or illness report.'),
  ('PACKAGING_BREACH',    'Packaging Breach',     'Bag was unsealed, damaged, or improperly packaged.'),
  ('PICKUP_NOT_HONORED',  'Pickup Not Honored',   'Restaurant refused or was unable to honor a confirmed order.'),
  ('MISSING_ORDER',       'Missing Order',        'Restaurant has no record of the order at pickup time.'),
  ('QUALITY_ISSUE',       'Quality Issue',        'Food quality significantly below reasonable expectation.'),
  ('PLATFORM_ERROR',      'Platform Error',       'goZaika system error caused a customer-facing issue.')
on conflict (type_code) do nothing;

-- Incident statuses
insert into master_incident_status (status_code, status_name, is_terminal, sort_order)
values
  ('OPEN',                       'Open',                        false, 1),
  ('TRIAGED',                    'Triaged',                     false, 2),
  ('INVESTIGATING',              'Investigating',               false, 3),
  ('MERCHANT_ACTION_REQUIRED',   'Merchant Action Required',    false, 4),
  ('RESOLVED',                   'Resolved',                    true,  5),
  ('CLOSED',                     'Closed',                      true,  6),
  ('REJECTED',                   'Rejected',                    true,  7)
on conflict (status_code) do nothing;

-- Incident severities
insert into master_incident_severity (severity_code, severity_name, description, sort_order)
values
  ('P1', 'P1 — Critical',  'Food safety risk. Immediate escalation. 30-min SLA.',  1),
  ('P2', 'P2 — High',      'Payment or dietary issue. 4-hr SLA.',                   2),
  ('P3', 'P3 — Standard',  'Quality complaint. 24-hr SLA.',                         3),
  ('P4', 'P4 — Low',       'Minor or informational. 72-hr SLA.',                    4)
on conflict (severity_code) do nothing;

-- Master scopes
insert into master_scope (scope_code, scope_name, applies_to, sort_order)
values
  -- Platform scopes
  ('ADMIN_USERS',           'Manage Users',            'PLATFORM', 10),
  ('ADMIN_RESTAURANTS',     'Manage Restaurants',      'PLATFORM', 20),
  ('ADMIN_FINANCE',         'Manage Finance',          'PLATFORM', 30),
  ('ADMIN_CONFIG',          'Manage Config',           'PLATFORM', 40),
  ('ADMIN_INCIDENTS',       'Manage Incidents',        'PLATFORM', 50),
  ('ADMIN_SUPPORT',         'Manage Support',          'PLATFORM', 60),
  -- Restaurant scopes
  ('DROP_CREATE',           'Create Drops',            'RESTAURANT', 10),
  ('DROP_PUBLISH',          'Publish Drops',           'RESTAURANT', 20),
  ('DROP_PAUSE',            'Pause Drops',             'RESTAURANT', 30),
  ('DROP_EMERGENCY_CLOSE',  'Emergency Close Drop',    'RESTAURANT', 40),
  ('ORDER_VIEW',            'View Orders',             'RESTAURANT', 50),
  ('ORDER_VERIFY_PICKUP',   'Verify Pickup',           'RESTAURANT', 60),
  ('FINANCE_VIEW',          'View Financials',         'RESTAURANT', 70),
  ('FINANCE_EXPORT',        'Export Financials',       'RESTAURANT', 80),
  ('TEAM_MANAGE',           'Manage Team',             'RESTAURANT', 90),
  ('SETTINGS_MANAGE',       'Manage Settings',         'RESTAURANT', 100),
  ('ANALYTICS_VIEW',        'View Analytics',          'RESTAURANT', 110),
  ('CATALOG_MANAGE',        'Manage Bag Templates',    'RESTAURANT', 120)
on conflict (scope_code) do nothing;

-- Platform admin roles
insert into iam_platform_role (role_code, role_name, description)
values
  ('SUPER_ADMIN',    'Super Admin',    'Unrestricted platform access.'),
  ('SUPPORT_ADMIN',  'Support Admin',  'Consumer and merchant support, refund approvals.'),
  ('FINANCE_ADMIN',  'Finance Admin',  'Settlement runs, invoices, financial reconciliation.'),
  ('OPS_ADMIN',      'Ops Admin',      'Restaurant onboarding, configuration, incident management.')
on conflict (role_code) do nothing;

-- Restaurant team roles
insert into restaurant_team_role (role_code, role_name, description)
values
  ('OWNER',         'Owner',          'Full restaurant access including billing, team management, and settings.'),
  ('ADMIN',         'Admin',          'Drop management, analytics, team management.'),
  ('OPERATIONS',    'Operations',     'Create/manage drops, view orders.'),
  ('PICKUP_STAFF',  'Pickup Staff',   'Pickup verification only via staff app.'),
  ('FINANCE',       'Finance',        'View financials and download invoices. Read-only.')
on conflict (role_code) do nothing;

-- Commission plans
-- Commission plans
insert into restaurant_commission_plan (plan_code, plan_name, commission_bps, platform_fee_paise, is_active)
values
  ('PILOT_0PCT_30D',   'Pilot — 0% First 30 Days', 0,    0, true),
  ('STANDARD_12PCT',   'Standard — 12%',           1200, 0, true),
  ('STANDARD_15PCT',   'Standard — 15%',           1500, 0, true)
on conflict (plan_code) do nothing;

-- Subscription plans
-- Subscription plans
insert into consumer_subscription_plan (
  plan_code,
  plan_name,
  description,
  billing_interval_code,
  price_paise,
  currency_code,
  is_active
)
values
  (
    'SWAAD_CLUB_MONTHLY',
    'Swaad Club — Monthly',
    'Priority queue, exclusive drops, member badge, and early-access experiments.',
    'MONTHLY',
    19900,
    'INR',
    true
  )
on conflict (plan_code) do nothing;

-- CMS static pages
insert into cms_page (page_code, page_title, page_status_code)
values
  ('PRIVACY_POLICY',       'Privacy Policy',              'PUBLISHED'),
  ('TERMS_OF_SERVICE',     'Terms of Service',            'PUBLISHED'),
  ('REFUND_POLICY',        'Refund Policy',               'PUBLISHED'),
  ('FOOD_SAFETY_POLICY',   'Food Safety Policy',          'PUBLISHED'),
  ('GRIEVANCE_REDRESSAL',  'Grievance Redressal',         'PUBLISHED'),
  ('HOW_IT_WORKS',         'How It Works',                'PUBLISHED'),
  ('ABOUT',                'About goZaika',               'PUBLISHED'),
  ('FAQ',                  'Frequently Asked Questions',  'PUBLISHED')
on conflict (page_code) do nothing;

commit;

-- =============================================================================
-- END OF goZaika Foundational Schema  |  v4.1 repaired
-- =============================================================================
--
-- Table count: 101 tables/partitions across 22 bounded contexts
-- Append-only tables: 10 (immutability triggers applied)
-- COMPUTED_ maintained columns: 4 (via 4 trigger functions)
-- RLS: enabled on all application tables; policies cover public discovery, consumer, restaurant, platform-admin, and service-only surfaces
--
-- Next steps after applying this schema:
--   1. Apply supabase/seed.sql (dev/staging only — this file seeds reference data)
--   2. Configure Supabase Storage buckets: public-media, private-docs, private-exports
--   3. Set Storage bucket policies matching master_storage_visibility rules
--   4. Configure Supabase Auth: Phone OTP provider (MSG91/Twilio), Google OAuth
--   5. Generate Prisma client: prisma db pull && prisma generate
--   6. Apply RLS function grants as appropriate for your service key setup
--   7. Create analytics_event partitions monthly via migration
-- =============================================================================                                     