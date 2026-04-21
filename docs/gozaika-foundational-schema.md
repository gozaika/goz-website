# goZaika foundational production schema

## 1. Short architecture note

This schema uses PostgreSQL as the system of record and treats `auth.users.id` as the canonical authentication identity, but never as the full domain model. Every human actor first becomes an `iam_profile`, and all consumer, restaurant, staff, support, and admin data hangs off that profile model plus explicit memberships. That keeps Supabase Auth concerns separate from business state, supports multi-restaurant ownership cleanly, and makes RLS tractable.

For money, the schema stores all monetary amounts in **paise** using `bigint` columns named `*_paise`. That keeps arithmetic exact, avoids floating-point defects, and works well for Razorpay and finance exports. For launch, geography uses relational city and neighborhood tables plus latitude/longitude numerics instead of PostGIS; Hyderabad discovery queries remain city- and neighborhood-led, so PostGIS is not worth the operational overhead yet.

Inventory uses a **hybrid hold + confirm** model. A claim first creates a short-lived `drop_inventory_hold` row inside a transaction that locks the target drop row and increments `quantity_reserved`. Payment success converts the hold into sold inventory and decrements the reservation. Expiry or payment failure releases the hold. This is the cleanest launch-safe design because it prevents oversell, supports payment abandonment, preserves inventory history, and keeps the public discovery path fast with stored counters plus a generated `quantity_available`.

Sensitive compliance, payout, webhook, and audit tables are present in Postgres but should be treated as **service-role only** from day one. Browser clients should use a narrow set of RLS-protected business tables and security-invoker views; anything involving KYC, finance, signature validation, raw payloads, or admin repair must stay server mediated.

## 2. Complete entity list grouped by bounded context

### Identity and access

- `iam_profile`
- `iam_platform_role`
- `iam_platform_membership`
- `iam_platform_role_scope`
- `restaurant_team_role`
- `restaurant_team_membership`
- `restaurant_team_role_scope`

### Geography and shared reference data

- `geo_city`
- `geo_neighborhood`
- `geo_address`
- `catalog_allergen`
- `restaurant_cuisine`
- `drop_audience_segment`

### Consumer domain

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

### Restaurant domain

- `restaurant_restaurant`
- `restaurant_compliance`
- `restaurant_contact`
- `restaurant_restaurant_cuisine`
- `restaurant_payout_account`
- `restaurant_commission_plan`
- `restaurant_commission_override`
- `restaurant_document`
- `restaurant_setting`

### Storage metadata

- `storage_object`

### Catalog / bag template domain

- `catalog_bag_template`
- `catalog_bag_template_revision`
- `catalog_bag_template_allergen`
- `catalog_bag_template_media`

### Drop / listing domain

- `drop_recurring_schedule`
- `drop_drop`
- `drop_drop_audience`
- `drop_drop_media`
- `drop_inventory_hold`
- `drop_inventory_event`
- `drop_closure_log`

### Order / claim / pickup domain

- `order_order`
- `order_order_item`
- `order_status_transition`
- `order_pickup_verification_event`

### Payment and financial domain

- `core_idempotency_key`
- `payment_intent`
- `payment_transaction`
- `payment_webhook_event`
- `payment_refund`
- `finance_settlement_run`
- `finance_restaurant_payout_entry`
- `finance_invoice`

### Reviews, incidents, support

- `review_review`
- `review_review_media`
- `support_ticket`
- `support_ticket_event`
- `incident_incident`
- `incident_event`

### Notifications and messaging

- `notification_template`
- `notification_outbox`
- `notification_delivery_attempt`

### Admin, config, audit, analytics foundation

- `audit_log`
- `config_feature_flag`
- `config_runtime_setting`
- `analytics_event`
- `admin_export_job`
- `admin_data_correction`

## 3. PostgreSQL-first schema design

### Cross-cutting conventions

- Primary keys: UUID everywhere for business tables, named `<table_name>_pk`, default `gen_random_uuid()`.
- Append-only log/event tables use `bigint generated always as identity`.
- Mutable business tables carry `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()`.
- Money is always `bigint` in paise.
- Fixed business state machines use PostgreSQL enums.
- Extensible reference sets use master tables, not enums. Allergens are modeled this way so new allergens can be added without a type migration.
- Every exposed `public` table gets RLS. Sensitive tables are still in `public` for Prisma simplicity, but are intended to be service-role only.

### Enums

- `enum_consumer_dietary_category`: `VEG`, `NON_VEG`, `JAIN`, `EGG_ONLY`
- `enum_catalog_spice_level`: `MILD`, `MEDIUM`, `HOT`
- `enum_catalog_source_type`: `SURPLUS`, `SLACK_HOUR`, `CHEF_SPECIAL`, `SPOTLIGHT`
- `enum_restaurant_status`: `PENDING`, `ACTIVE`, `SUSPENDED`, `REJECTED`, `ARCHIVED`
- `enum_restaurant_contact_type`: `PRIMARY_OPERATIONS`, `ESCALATION`, `FINANCE`, `LEGAL`
- `enum_restaurant_team_role_code`: `OWNER`, `ADMIN`, `OPERATIONS`, `PICKUP_STAFF`, `FINANCE`
- `enum_drop_status`: `DRAFT`, `SCHEDULED`, `ACTIVE`, `PAUSED`, `SOLD_OUT`, `EXPIRED`, `CANCELLED`, `EMERGENCY_CLOSED`
- `enum_drop_type`: `STANDARD`, `SPOTLIGHT`, `CHEF_SPECIAL`
- `enum_drop_hold_status`: `ACTIVE`, `CONVERTED`, `RELEASED`, `EXPIRED`
- `enum_order_status`: `CREATED`, `PAYMENT_PENDING`, `PAYMENT_AUTHORIZED`, `PAID`, `CONFIRMED`, `READY_FOR_PICKUP`, `COLLECTED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`, `PICKUP_EXPIRED`, `FAILED`
- `enum_payment_provider`: `RAZORPAY`
- `enum_payment_status`: `CREATED`, `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUND_PENDING`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CANCELLED`
- `enum_subscription_status`: `TRIAL`, `ACTIVE`, `PAST_DUE`, `PAUSED`, `CANCELLED`, `EXPIRED`
- `enum_referral_status`: `PENDING`, `QUALIFIED`, `REWARDED`, `CANCELLED`
- `enum_incident_status`: `OPEN`, `TRIAGED`, `INVESTIGATING`, `MERCHANT_ACTION_REQUIRED`, `RESOLVED`, `CLOSED`, `REJECTED`
- `enum_incident_type`: `DIETARY_MISMATCH`, `PACKAGING_BREACH`, `FOOD_SAFETY`, `PICKUP_NOT_HONORED`, `MISSING_ORDER`, `QUALITY_ISSUE`, `OTHER`
- `enum_review_status`: `PUBLISHED`, `FLAGGED`, `HIDDEN`
- `enum_notification_channel`: `WHATSAPP`, `EMAIL`, `PUSH`, `SMS`
- `enum_notification_status`: `PENDING`, `SCHEDULED`, `PROCESSING`, `SENT`, `FAILED`, `CANCELLED`
- `enum_config_scope`: `GLOBAL`, `CITY`, `RESTAURANT`, `SEGMENT`
- `enum_finance_settlement_status`: `DRAFT`, `OPEN`, `LOCKED`, `SENT`, `PAID`, `RECONCILED`, `FAILED`
- `enum_finance_payout_entry_type`: `ORDER_SALE`, `REFUND_DEBIT`, `COMMISSION_CHARGE`, `MANUAL_ADJUSTMENT`, `INCIDENT_CREDIT`
- `enum_privacy_consent_state`: `GRANTED`, `REVOKED`
- `enum_privacy_erasure_status`: `REQUESTED`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `EXECUTING`, `COMPLETED`, `CANCELLED`

### Identity and access tables

- `iam_profile`
  - Columns: `iam_profile_pk`, `auth_user_fk` -> `auth.users(id)`, `phone_e164`, `email_address`, `display_name`, `default_city_fk`, `is_consumer`, `is_restaurant_user`, `is_platform_user`, `last_seen_at`, timestamps.
  - Constraints: unique on `auth_user_fk`, partial unique on `phone_e164`, partial unique on `email_address`.
  - Indexes: `(default_city_fk)`, `(last_seen_at desc)`.

- `iam_platform_role`
  - Columns: `iam_platform_role_pk`, `role_code`, `role_name`, `description`, timestamps.
  - Constraints: unique on `role_code`.

- `iam_platform_membership`
  - Columns: `iam_platform_membership_pk`, `iam_profile_fk`, `iam_platform_role_fk`, `is_active`, timestamps.
  - Constraints: unique natural key on `(iam_profile_fk, iam_platform_role_fk)`.
  - Indexes: active membership lookup by profile.

- `iam_platform_role_scope`
  - Columns: `iam_platform_role_scope_pk`, `iam_platform_role_fk`, `scope_code`, timestamps.
  - Constraints: unique on `(iam_platform_role_fk, scope_code)`.

- `restaurant_team_role`
  - Columns: `restaurant_team_role_pk`, `role_code`, `role_name`, `description`, timestamps.
  - Constraints: unique on `role_code`.

- `restaurant_team_membership`
  - Columns: `restaurant_team_membership_pk`, `restaurant_fk`, `iam_profile_fk`, `restaurant_team_role_fk`, `is_active`, `is_default`, `invited_by_profile_fk`, `joined_at`, timestamps.
  - Constraints: unique on `(restaurant_fk, iam_profile_fk, restaurant_team_role_fk)`.
  - Indexes: `(restaurant_fk, is_active)`, `(iam_profile_fk, is_active)`.

- `restaurant_team_role_scope`
  - Columns: `restaurant_team_role_scope_pk`, `restaurant_team_role_fk`, `scope_code`, timestamps.
  - Constraints: unique on `(restaurant_team_role_fk, scope_code)`.

### Geography and reference tables

- `geo_city`
  - Columns: `geo_city_pk`, `city_code`, `city_name`, `state_name`, `country_code`, `currency_code`, `timezone_name`, `is_active`, timestamps.
  - Constraints: unique on `city_code`.

- `geo_neighborhood`
  - Columns: `geo_neighborhood_pk`, `geo_city_fk`, `neighborhood_code`, `neighborhood_name`, `is_active`, timestamps.
  - Constraints: unique on `(geo_city_fk, neighborhood_code)`.
  - Indexes: `(geo_city_fk, neighborhood_name)`.

- `geo_address`
  - Columns: `geo_address_pk`, `line_1`, `line_2`, `landmark`, `geo_city_fk`, `geo_neighborhood_fk`, `postal_code`, `latitude`, `longitude`, timestamps.
  - Checks: latitude between -90 and 90, longitude between -180 and 180.
  - Indexes: `(geo_city_fk, geo_neighborhood_fk)`.

- `catalog_allergen`
  - Columns: `catalog_allergen_pk`, `allergen_code`, `allergen_name`, `description`, `is_active`, timestamps.
  - Constraints: unique on `allergen_code`.

- `restaurant_cuisine`
  - Columns: `restaurant_cuisine_pk`, `cuisine_code`, `cuisine_name`, `is_active`, timestamps.
  - Constraints: unique on `cuisine_code`.

- `drop_audience_segment`
  - Columns: `drop_audience_segment_pk`, `segment_code`, `segment_name`, `description`, `is_active`, timestamps.
  - Constraints: unique on `segment_code`.

### Consumer tables

- `consumer_profile`
  - Columns: `consumer_profile_pk`, `iam_profile_fk`, `first_name`, `last_name`, `birth_month`, `birth_day`, `preferred_language_code`, `marketing_source_code`, `referral_code_fk`, timestamps.
  - Constraints: unique on `iam_profile_fk`.

- `consumer_dietary_preference`
  - Columns: `consumer_dietary_preference_pk`, `consumer_profile_fk`, `dietary_category`, timestamps.
  - Constraints: unique on `(consumer_profile_fk, dietary_category)`.

- `consumer_allergen_preference`
  - Columns: `consumer_allergen_preference_pk`, `consumer_profile_fk`, `catalog_allergen_fk`, `avoid_flag`, timestamps.
  - Constraints: unique on `(consumer_profile_fk, catalog_allergen_fk)`.

- `consumer_city_preference`
  - Columns: `consumer_city_preference_pk`, `consumer_profile_fk`, `geo_city_fk`, `is_default`, timestamps.
  - Constraints: unique on `(consumer_profile_fk, geo_city_fk)`.
  - Partial index: one default city per consumer where `is_default = true`.

- `consumer_saved_restaurant`
  - Columns: `consumer_saved_restaurant_pk`, `consumer_profile_fk`, `restaurant_fk`, `saved_at`.
  - Constraints: unique on `(consumer_profile_fk, restaurant_fk)`.

- `consumer_referral_code`
  - Columns: `consumer_referral_code_pk`, `consumer_profile_fk`, `referral_code`, `is_active`, timestamps.
  - Constraints: unique on `consumer_profile_fk`, unique on `referral_code`.

- `consumer_referral`
  - Columns: `consumer_referral_pk`, `referrer_consumer_profile_fk`, `referred_consumer_profile_fk`, `referral_status`, `qualified_at`, `rewarded_at`, `source_code`, timestamps.
  - Constraints: unique on `(referrer_consumer_profile_fk, referred_consumer_profile_fk)`.
  - Checks: referrer and referred must differ.

- `consumer_subscription_plan`
  - Columns: `consumer_subscription_plan_pk`, `plan_code`, `plan_name`, `price_paise`, `billing_interval_months`, `benefits_json`, `is_active`, timestamps.
  - Constraints: unique on `plan_code`.

- `consumer_subscription`
  - Columns: `consumer_subscription_pk`, `consumer_profile_fk`, `consumer_subscription_plan_fk`, `subscription_status`, `starts_at`, `ends_at`, `renewal_due_at`, `provider_subscription_ref`, timestamps.
  - Partial index: one active-ish subscription per consumer/plan where status in `TRIAL`, `ACTIVE`, `PAST_DUE`, `PAUSED`.

- `consumer_passport_stat`
  - Columns: `consumer_passport_stat_pk`, `consumer_profile_fk`, `lifetime_orders_count`, `lifetime_collects_count`, `city_count`, `restaurant_count`, `points_balance`, timestamps.
  - Constraints: unique on `consumer_profile_fk`.

- `consumer_notification_preference`
  - Columns: `consumer_notification_preference_pk`, `consumer_profile_fk`, `whatsapp_transactional_enabled`, `whatsapp_marketing_enabled`, `email_transactional_enabled`, `email_marketing_enabled`, `push_transactional_enabled`, `push_marketing_enabled`, timestamps.
  - Constraints: unique on `consumer_profile_fk`.

- `privacy_consent_purpose`
  - Columns: `privacy_consent_purpose_pk`, `purpose_code`, `purpose_name`, `description`, `is_required_for_service`, `retention_policy_code`, timestamps.
  - Constraints: unique on `purpose_code`.

- `privacy_consent_event`
  - Columns: `privacy_consent_event_pk`, `iam_profile_fk`, `privacy_consent_purpose_fk`, `consent_state`, `policy_version`, `capture_source_code`, `proof_json`, `recorded_at`, `recorded_by_profile_fk`.
  - Indexes: `(iam_profile_fk, privacy_consent_purpose_fk, recorded_at desc)`.

- `privacy_retention_policy`
  - Columns: `privacy_retention_policy_pk`, `policy_code`, `applies_to_table_name`, `retention_days`, `anonymize_after_days`, `purge_after_days`, `legal_hold_supported`, timestamps.
  - Constraints: unique on `policy_code`.

- `privacy_erasure_request`
  - Columns: `privacy_erasure_request_pk`, `iam_profile_fk`, `privacy_erasure_status`, `requested_reason`, `requested_at`, `reviewed_by_profile_fk`, `reviewed_at`, `executed_at`, `rejected_reason`, timestamps.
  - Indexes: `(privacy_erasure_status, requested_at)`.

### Restaurant tables

- `restaurant_restaurant`
  - Columns: `restaurant_restaurant_pk`, `restaurant_slug`, `restaurant_name`, `display_name`, `restaurant_status`, `geo_address_fk`, `primary_city_fk`, `primary_neighborhood_fk`, `legal_entity_name`, `description`, `phone_e164`, `public_email_address`, `average_rating`, `rating_count`, timestamps.
  - Constraints: unique on `restaurant_slug`.
  - Indexes: `(primary_city_fk, restaurant_status)`, `(primary_neighborhood_fk, restaurant_status)`.

- `restaurant_compliance`
  - Columns: `restaurant_compliance_pk`, `restaurant_fk`, `fssai_license_number`, `fssai_expires_at`, `gstin`, `pan_reference`, `kyc_status_code`, `food_safety_notes`, `packaging_commitment_notes`, `freshness_commitment_notes`, timestamps.
  - Constraints: unique on `restaurant_fk`, partial unique on `fssai_license_number`, partial unique on `gstin`.

- `restaurant_contact`
  - Columns: `restaurant_contact_pk`, `restaurant_fk`, `contact_type`, `full_name`, `phone_e164`, `email_address`, `is_primary`, `is_active`, timestamps.
  - Partial unique index: one primary contact per restaurant and contact type where `is_primary = true`.

- `restaurant_restaurant_cuisine`
  - Columns: `restaurant_restaurant_cuisine_pk`, `restaurant_fk`, `restaurant_cuisine_fk`, timestamps.
  - Constraints: unique on `(restaurant_fk, restaurant_cuisine_fk)`.

- `restaurant_payout_account`
  - Columns: `restaurant_payout_account_pk`, `restaurant_fk`, `payout_method_code`, `beneficiary_name`, `bank_account_last4`, `ifsc_code`, `upi_vpa`, `provider_beneficiary_ref`, `details_ciphertext`, `is_active`, timestamps.
  - Constraints: at most one active row per restaurant by partial index.

- `restaurant_commission_plan`
  - Columns: `restaurant_commission_plan_pk`, `plan_code`, `plan_name`, `commission_bps`, `flat_fee_paise`, `effective_from`, `effective_to`, `is_active`, timestamps.
  - Constraints: unique on `plan_code`.

- `restaurant_commission_override`
  - Columns: `restaurant_commission_override_pk`, `restaurant_fk`, `restaurant_commission_plan_fk`, `commission_bps_override`, `flat_fee_paise_override`, `effective_from`, `effective_to`, `reason_note`, timestamps.
  - Indexes: active override lookup by restaurant and time range.

- `restaurant_document`
  - Columns: `restaurant_document_pk`, `restaurant_fk`, `storage_object_fk`, `document_type_code`, `document_status_code`, `expires_at`, `verified_by_profile_fk`, `verified_at`, timestamps.
  - Constraints: unique on `(restaurant_fk, storage_object_fk)`.

- `restaurant_setting`
  - Columns: `restaurant_setting_pk`, `restaurant_fk`, `pickup_grace_minutes`, `verification_mode_code`, `allow_whatsapp_order_alerts`, `allow_email_finance_alerts`, `default_holding_minutes`, `notes`, timestamps.
  - Constraints: unique on `restaurant_fk`.

### Storage metadata

- `storage_object`
  - Columns: `storage_object_pk`, `bucket_name`, `object_path`, `mime_type`, `file_size_bytes`, `checksum_sha256`, `uploaded_by_profile_fk`, `visibility_code`, `deleted_at`, timestamps.
  - Constraints: unique on `(bucket_name, object_path)`.
  - Indexes: `(uploaded_by_profile_fk)`, partial index on active objects where `deleted_at is null`.

### Catalog tables

- `catalog_bag_template`
  - Columns: `catalog_bag_template_pk`, `restaurant_fk`, `template_code`, `template_name`, `template_status`, `current_revision_number`, `is_pickup_ready_by_default`, timestamps.
  - Constraints: unique on `(restaurant_fk, template_code)`.
  - Indexes: `(restaurant_fk, template_status)`.

- `catalog_bag_template_revision`
  - Columns: `catalog_bag_template_revision_pk`, `catalog_bag_template_fk`, `revision_number`, `source_type`, `dietary_category`, `spice_level`, `template_title`, `template_description`, `serves_min`, `serves_max`, `max_holding_minutes`, `min_menu_value_paise`, `bag_price_paise`, `packaging_notes`, `food_safety_notes`, `version_status_code`, timestamps.
  - Constraints: unique on `(catalog_bag_template_fk, revision_number)`.
  - Checks: `serves_min > 0`, `serves_max >= serves_min`, `max_holding_minutes > 0`, `bag_price_paise > 0`.

- `catalog_bag_template_allergen`
  - Columns: `catalog_bag_template_allergen_pk`, `catalog_bag_template_revision_fk`, `catalog_allergen_fk`, timestamps.
  - Constraints: unique on `(catalog_bag_template_revision_fk, catalog_allergen_fk)`.

- `catalog_bag_template_media`
  - Columns: `catalog_bag_template_media_pk`, `catalog_bag_template_revision_fk`, `storage_object_fk`, `sort_order`, `is_primary`, timestamps.
  - Constraints: unique on `(catalog_bag_template_revision_fk, storage_object_fk)`.
  - Partial index: one primary media per revision where `is_primary = true`.

### Drop and inventory tables

- `drop_recurring_schedule`
  - Columns: `drop_recurring_schedule_pk`, `restaurant_fk`, `schedule_name`, `timezone_name`, `rrule_text`, `next_run_at`, `is_active`, timestamps.
  - Indexes: `(restaurant_fk, is_active)`, `(next_run_at)`.

- `drop_drop`
  - Columns: `drop_drop_pk`, `restaurant_fk`, `catalog_bag_template_revision_fk`, `drop_recurring_schedule_fk`, `drop_title`, `drop_description`, `drop_type`, `drop_status`, `geo_city_fk`, `geo_neighborhood_fk`, `publish_at`, `pickup_start_at`, `pickup_end_at`, `quantity_total`, `quantity_reserved`, `quantity_sold`, `quantity_available generated always as (greatest(quantity_total - quantity_reserved - quantity_sold, 0)) stored`, `bag_price_paise`, `min_menu_value_paise`, `holds_expire_minutes`, `operational_note`, `paused_at`, `cancelled_at`, `emergency_closed_at`, `sold_out_at`, `expires_at`, timestamps.
  - Checks: `pickup_end_at > pickup_start_at`, `quantity_total > 0`, `quantity_reserved >= 0`, `quantity_sold >= 0`, `quantity_reserved + quantity_sold <= quantity_total`, `bag_price_paise > 0`.
  - Indexes: `(restaurant_fk, drop_status)`, `(geo_city_fk, drop_status, publish_at)`, `(geo_neighborhood_fk, drop_status, pickup_start_at)`.
  - Partial index: active discovery on `(geo_city_fk, pickup_start_at, pickup_end_at, quantity_available)` where status in `SCHEDULED`, `ACTIVE`, `PAUSED`.

- `drop_drop_audience`
  - Columns: `drop_drop_audience_pk`, `drop_fk`, `drop_audience_segment_fk`, timestamps.
  - Constraints: unique on `(drop_fk, drop_audience_segment_fk)`.

- `drop_drop_media`
  - Columns: `drop_drop_media_pk`, `drop_fk`, `storage_object_fk`, `sort_order`, `is_primary`, timestamps.
  - Constraints: unique on `(drop_fk, storage_object_fk)`.
  - Partial index: one primary media per drop where `is_primary = true`.

- `drop_inventory_hold`
  - Columns: `drop_inventory_hold_pk`, `drop_fk`, `consumer_profile_fk`, `hold_quantity`, `hold_status`, `expires_at`, `order_fk`, `released_reason_code`, timestamps.
  - Checks: `hold_quantity > 0`, `expires_at > created_at`.
  - Indexes: `(drop_fk, hold_status, expires_at)`, `(consumer_profile_fk, created_at desc)`.
  - Partial index: active hold expiry queue where `hold_status = 'ACTIVE'`.

- `drop_inventory_event`
  - Columns: `drop_inventory_event_pk bigint identity`, `drop_fk`, `event_type_code`, `delta_quantity`, `before_quantity_reserved`, `after_quantity_reserved`, `before_quantity_sold`, `after_quantity_sold`, `source_order_fk`, `source_hold_fk`, `recorded_by_profile_fk`, `note_text`, `created_at`.
  - Indexes: `(drop_fk, created_at desc)`, `(source_order_fk)`.

- `drop_closure_log`
  - Columns: `drop_closure_log_pk`, `drop_fk`, `closed_reason_code`, `unsold_quantity`, `disposal_note`, `recorded_by_profile_fk`, `recorded_at`, timestamps.
  - Constraints: unique on `drop_fk`.

### Order and pickup tables

- `order_order`
  - Columns: `order_order_pk`, `order_number bigint generated always as identity`, `consumer_profile_fk`, `restaurant_fk`, `drop_fk`, `drop_inventory_hold_fk`, `order_status`, `currency_code`, `subtotal_paise`, `discount_paise`, `platform_fee_paise`, `tax_paise`, `total_paise`, `pickup_otp_hash`, `pickup_qr_nonce`, `pickup_qr_version`, `pickup_ready_at`, `collected_at`, `cancelled_at`, `pickup_expired_at`, `failure_reason_code`, `cancellation_reason_code`, `source_channel_code`, `created_via_idempotency_key_fk`, timestamps.
  - Constraints: unique on `order_number`, unique on `drop_inventory_hold_fk`.
  - Checks: `subtotal_paise >= 0`, `discount_paise >= 0`, `platform_fee_paise >= 0`, `tax_paise >= 0`, `total_paise = subtotal_paise - discount_paise + platform_fee_paise + tax_paise`.
  - Indexes: `(consumer_profile_fk, created_at desc)`, `(restaurant_fk, order_status, created_at desc)`, `(drop_fk, order_status)`.

- `order_order_item`
  - Columns: `order_order_item_pk`, `order_fk`, `catalog_bag_template_revision_fk`, `drop_fk`, `quantity`, `unit_price_paise`, `line_total_paise`, timestamps.
  - Constraints: unique on `(order_fk, catalog_bag_template_revision_fk, drop_fk)`.
  - Checks: `quantity > 0`, `line_total_paise = quantity * unit_price_paise`.

- `order_status_transition`
  - Columns: `order_status_transition_pk bigint identity`, `order_fk`, `from_status`, `to_status`, `changed_by_profile_fk`, `change_source_code`, `note_text`, `created_at`.
  - Indexes: `(order_fk, created_at desc)`.

- `order_pickup_verification_event`
  - Columns: `order_pickup_verification_event_pk bigint identity`, `order_fk`, `verified_by_profile_fk`, `verification_method_code`, `attempt_status_code`, `submitted_code_hash`, `captured_offline_at`, `synced_at`, `device_label`, `note_text`, `created_at`.
  - Indexes: `(order_fk, created_at desc)`, `(verified_by_profile_fk, created_at desc)`.

### Payment and finance tables

- `core_idempotency_key`
  - Columns: `core_idempotency_key_pk`, `scope_code`, `key_value`, `request_hash`, `response_resource_type`, `response_resource_pk`, `expires_at`, timestamps.
  - Constraints: unique on `(scope_code, key_value)`.
  - Indexes: `(expires_at)`.

- `payment_intent`
  - Columns: `payment_intent_pk`, `order_fk`, `payment_provider`, `provider_order_id`, `payment_status`, `amount_paise`, `currency_code`, `provider_customer_ref`, `provider_receipt_ref`, `idempotency_key_fk`, `authorized_at`, `captured_at`, `failed_at`, `failure_code`, `failure_reason`, timestamps.
  - Constraints: unique on `order_fk`, partial unique on `provider_order_id`.
  - Indexes: `(payment_status, created_at desc)`.

- `payment_transaction`
  - Columns: `payment_transaction_pk`, `payment_intent_fk`, `provider_payment_id`, `provider_signature`, `payment_status`, `amount_paise`, `gateway_fee_paise`, `gateway_tax_paise`, `raw_payload`, `processed_at`, timestamps.
  - Constraints: partial unique on `provider_payment_id`.
  - Indexes: `(payment_intent_fk, created_at desc)`.

- `payment_webhook_event`
  - Columns: `payment_webhook_event_pk bigint identity`, `payment_provider`, `provider_event_id`, `event_type_code`, `signature_valid`, `dedupe_key`, `processing_status_code`, `payload_json`, `error_text`, `processed_at`, `received_at`.
  - Constraints: partial unique on `(payment_provider, provider_event_id)`, partial unique on `dedupe_key`.
  - Indexes: `(processing_status_code, received_at)`.

- `payment_refund`
  - Columns: `payment_refund_pk`, `order_fk`, `payment_transaction_fk`, `provider_refund_id`, `refund_status_code`, `refund_reason_code`, `amount_paise`, `requested_by_profile_fk`, `requested_at`, `processed_at`, `failure_reason`, timestamps.
  - Constraints: partial unique on `provider_refund_id`.
  - Indexes: `(order_fk, requested_at desc)`.

- `finance_settlement_run`
  - Columns: `finance_settlement_run_pk`, `restaurant_fk`, `settlement_status`, `period_start_at`, `period_end_at`, `gross_sales_paise`, `refunds_paise`, `commission_paise`, `net_payout_paise`, `external_settlement_ref`, `locked_at`, `paid_at`, timestamps.
  - Checks: `period_end_at > period_start_at`.
  - Indexes: `(restaurant_fk, period_start_at desc)`, `(settlement_status, period_end_at)`.

- `finance_restaurant_payout_entry`
  - Columns: `finance_restaurant_payout_entry_pk bigint identity`, `restaurant_fk`, `finance_settlement_run_fk`, `entry_type`, `order_fk`, `payment_refund_fk`, `amount_paise`, `description`, `event_at`, `created_at`.
  - Indexes: `(restaurant_fk, event_at desc)`, `(finance_settlement_run_fk)`.

- `finance_invoice`
  - Columns: `finance_invoice_pk`, `invoice_number bigint generated always as identity`, `restaurant_fk`, `finance_settlement_run_fk`, `storage_object_fk`, `invoice_period_start_at`, `invoice_period_end_at`, `invoice_total_paise`, `issued_at`, timestamps.
  - Constraints: unique on `invoice_number`.

### Reviews, incidents, support tables

- `review_review`
  - Columns: `review_review_pk`, `order_fk`, `consumer_profile_fk`, `restaurant_fk`, `rating_value`, `headline_text`, `review_text`, `review_status`, `published_at`, timestamps.
  - Constraints: unique on `order_fk`.
  - Checks: `rating_value between 1 and 5`.
  - Indexes: `(restaurant_fk, review_status, published_at desc)`.

- `review_review_media`
  - Columns: `review_review_media_pk`, `review_fk`, `storage_object_fk`, `sort_order`, timestamps.
  - Constraints: unique on `(review_fk, storage_object_fk)`.

- `support_ticket`
  - Columns: `support_ticket_pk`, `consumer_profile_fk`, `restaurant_fk`, `order_fk`, `ticket_type_code`, `ticket_status_code`, `priority_code`, `subject_text`, `description_text`, `opened_at`, `resolved_at`, timestamps.
  - Indexes: `(ticket_status_code, opened_at)`, `(restaurant_fk, opened_at desc)`, `(consumer_profile_fk, opened_at desc)`.

- `support_ticket_event`
  - Columns: `support_ticket_event_pk bigint identity`, `support_ticket_fk`, `event_type_code`, `actor_profile_fk`, `event_note`, `payload_json`, `created_at`.
  - Indexes: `(support_ticket_fk, created_at desc)`.

- `incident_incident`
  - Columns: `incident_incident_pk`, `restaurant_fk`, `order_fk`, `support_ticket_fk`, `incident_type`, `incident_status`, `reported_by_profile_fk`, `assigned_to_profile_fk`, `summary_text`, `detail_text`, `refund_triggered_flag`, `sla_due_at`, `resolved_at`, timestamps.
  - Indexes: `(restaurant_fk, incident_status, created_at desc)`, `(incident_status, sla_due_at)`.

- `incident_event`
  - Columns: `incident_event_pk bigint identity`, `incident_fk`, `event_type_code`, `actor_profile_fk`, `event_note`, `payload_json`, `created_at`.
  - Indexes: `(incident_fk, created_at desc)`.

### Notifications, audit, config, analytics tables

- `notification_template`
  - Columns: `notification_template_pk`, `template_code`, `channel`, `provider_template_ref`, `template_version`, `is_active`, `body_schema_json`, timestamps.
  - Constraints: unique on `(template_code, channel, template_version)`.

- `notification_outbox`
  - Columns: `notification_outbox_pk`, `iam_profile_fk`, `restaurant_fk`, `order_fk`, `channel`, `notification_status`, `notification_template_fk`, `dedupe_key`, `payload_json`, `scheduled_for`, `sent_at`, `retry_count`, `last_error`, timestamps.
  - Partial unique index on `dedupe_key` where not null.
  - Indexes: `(notification_status, scheduled_for)`, `(iam_profile_fk, created_at desc)`.

- `notification_delivery_attempt`
  - Columns: `notification_delivery_attempt_pk bigint identity`, `notification_outbox_fk`, `attempt_number`, `provider_message_id`, `attempt_status_code`, `provider_response_json`, `error_text`, `attempted_at`.
  - Constraints: unique on `(notification_outbox_fk, attempt_number)`.

- `audit_log`
  - Columns: `audit_log_pk bigint identity`, `actor_profile_fk`, `actor_role_code`, `entity_table_name`, `entity_pk`, `action_code`, `before_json`, `after_json`, `request_id`, `ip_address`, `user_agent`, `created_at`.
  - Indexes: `(entity_table_name, entity_pk, created_at desc)`, `(actor_profile_fk, created_at desc)`.

- `config_feature_flag`
  - Columns: `config_feature_flag_pk`, `flag_code`, `flag_name`, `description`, `default_enabled`, `rollout_json`, timestamps.
  - Constraints: unique on `flag_code`.

- `config_runtime_setting`
  - Columns: `config_runtime_setting_pk`, `setting_code`, `scope_type`, `geo_city_fk`, `restaurant_fk`, `segment_code`, `value_json`, `effective_from`, `effective_to`, timestamps.
  - Indexes: `(setting_code, scope_type)`, `(restaurant_fk, setting_code)`, `(geo_city_fk, setting_code)`.
  - Checks: exactly one of global/city/restaurant/segment scope payloads must be populated consistently with `scope_type`.

- `analytics_event`
  - Columns: `analytics_event_pk bigint identity`, `event_name`, `iam_profile_fk`, `consumer_profile_fk`, `restaurant_fk`, `order_fk`, `drop_fk`, `session_id`, `source_code`, `properties_json`, `occurred_at`, `ingested_at`.
  - Indexes: `(event_name, occurred_at desc)`, `(restaurant_fk, occurred_at desc)`, `(consumer_profile_fk, occurred_at desc)`.

- `admin_export_job`
  - Columns: `admin_export_job_pk`, `requested_by_profile_fk`, `export_type_code`, `filter_json`, `storage_object_fk`, `job_status_code`, `requested_at`, `completed_at`, `error_text`, timestamps.
  - Indexes: `(job_status_code, requested_at)`.

- `admin_data_correction`
  - Columns: `admin_data_correction_pk`, `requested_by_profile_fk`, `approved_by_profile_fk`, `entity_table_name`, `entity_pk`, `change_reason`, `before_json`, `after_json`, `executed_at`, timestamps.
  - Indexes: `(entity_table_name, entity_pk, executed_at desc)`.

### State transition rules

- Restaurant status transitions: `PENDING -> ACTIVE|REJECTED|ARCHIVED`; `ACTIVE -> SUSPENDED|ARCHIVED`; `SUSPENDED -> ACTIVE|ARCHIVED`; terminal otherwise.
- Bag template status transitions: `DRAFT -> ACTIVE|ARCHIVED`; `ACTIVE -> INACTIVE|ARCHIVED`; `INACTIVE -> ACTIVE|ARCHIVED`.
- Drop status transitions: `DRAFT -> SCHEDULED|CANCELLED`; `SCHEDULED -> ACTIVE|PAUSED|CANCELLED|EMERGENCY_CLOSED`; `ACTIVE -> PAUSED|SOLD_OUT|EXPIRED|CANCELLED|EMERGENCY_CLOSED`; `PAUSED -> ACTIVE|CANCELLED|EMERGENCY_CLOSED|EXPIRED`; terminal thereafter.
- Order status transitions:
  - internal: `CREATED -> PAYMENT_PENDING -> PAYMENT_AUTHORIZED|FAILED`
  - commercial: `PAYMENT_AUTHORIZED -> PAID -> CONFIRMED -> READY_FOR_PICKUP -> COLLECTED`
  - exception: `PAID|CONFIRMED|READY_FOR_PICKUP -> REFUND_PENDING -> REFUNDED`
  - closure: `CREATED|PAYMENT_PENDING -> CANCELLED|FAILED`, `READY_FOR_PICKUP -> PICKUP_EXPIRED`
- Payment status transitions: `CREATED -> PENDING -> AUTHORIZED|FAILED|CANCELLED`; `AUTHORIZED -> CAPTURED|FAILED|CANCELLED`; `CAPTURED -> REFUND_PENDING|PARTIALLY_REFUNDED|REFUNDED`.
- Subscription transitions: `TRIAL -> ACTIVE|CANCELLED|EXPIRED`; `ACTIVE -> PAST_DUE|PAUSED|CANCELLED|EXPIRED`; `PAST_DUE -> ACTIVE|CANCELLED|EXPIRED`; `PAUSED -> ACTIVE|CANCELLED|EXPIRED`.
- Incident transitions: `OPEN -> TRIAGED -> INVESTIGATING -> MERCHANT_ACTION_REQUIRED|RESOLVED`; `MERCHANT_ACTION_REQUIRED -> INVESTIGATING|RESOLVED`; `RESOLVED -> CLOSED`; `OPEN|TRIAGED -> REJECTED`.

### Views and helper functions recommended for launch

- `public.drop_active_public_view` with `security_invoker = true` for consumer browsing.
- `public.consumer_order_history_view` with `security_invoker = true`.
- `public.drop_sell_through_view` for city/restaurant ops.
- `public.restaurant_dashboard_summary_view` for portal KPIs.
- `private.current_profile_pk()`, `private.is_platform_admin()`, `private.has_restaurant_access()`, `private.has_restaurant_scope()`.
- `private.create_drop_hold()` and `private.release_expired_holds()` for safe inventory mutation.

## 4. Prisma schema

Prisma can represent most core tables, enums, and relations, but it **cannot** fully model:

- `auth.users` foreign-key behavior in a generated Prisma model
- security-definer helper functions
- RLS policies
- partial indexes
- generated stored columns such as `quantity_available`
- update triggers and workflow helpers

Keep those pieces in raw SQL migrations. The Prisma layer should map the relational model closely and let application code call raw SQL for the hold workflow and policy-backed views.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum enum_consumer_dietary_category {
  VEG
  NON_VEG
  JAIN
  EGG_ONLY
}

enum enum_catalog_spice_level {
  MILD
  MEDIUM
  HOT
}

enum enum_catalog_source_type {
  SURPLUS
  SLACK_HOUR
  CHEF_SPECIAL
  SPOTLIGHT
}

enum enum_restaurant_status {
  PENDING
  ACTIVE
  SUSPENDED
  REJECTED
  ARCHIVED
}

enum enum_drop_status {
  DRAFT
  SCHEDULED
  ACTIVE
  PAUSED
  SOLD_OUT
  EXPIRED
  CANCELLED
  EMERGENCY_CLOSED
}

enum enum_drop_type {
  STANDARD
  SPOTLIGHT
  CHEF_SPECIAL
}

enum enum_drop_hold_status {
  ACTIVE
  CONVERTED
  RELEASED
  EXPIRED
}

enum enum_order_status {
  CREATED
  PAYMENT_PENDING
  PAYMENT_AUTHORIZED
  PAID
  CONFIRMED
  READY_FOR_PICKUP
  COLLECTED
  CANCELLED
  REFUND_PENDING
  REFUNDED
  PICKUP_EXPIRED
  FAILED
}

enum enum_payment_provider {
  RAZORPAY
}

enum enum_payment_status {
  CREATED
  PENDING
  AUTHORIZED
  CAPTURED
  FAILED
  REFUND_PENDING
  REFUNDED
  PARTIALLY_REFUNDED
  CANCELLED
}

enum enum_subscription_status {
  TRIAL
  ACTIVE
  PAST_DUE
  PAUSED
  CANCELLED
  EXPIRED
}

enum enum_referral_status {
  PENDING
  QUALIFIED
  REWARDED
  CANCELLED
}

enum enum_incident_status {
  OPEN
  TRIAGED
  INVESTIGATING
  MERCHANT_ACTION_REQUIRED
  RESOLVED
  CLOSED
  REJECTED
}

enum enum_incident_type {
  DIETARY_MISMATCH
  PACKAGING_BREACH
  FOOD_SAFETY
  PICKUP_NOT_HONORED
  MISSING_ORDER
  QUALITY_ISSUE
  OTHER
}

enum enum_review_status {
  PUBLISHED
  FLAGGED
  HIDDEN
}

enum enum_notification_channel {
  WHATSAPP
  EMAIL
  PUSH
  SMS
}

enum enum_notification_status {
  PENDING
  SCHEDULED
  PROCESSING
  SENT
  FAILED
  CANCELLED
}

enum enum_config_scope {
  GLOBAL
  CITY
  RESTAURANT
  SEGMENT
}

enum enum_finance_settlement_status {
  DRAFT
  OPEN
  LOCKED
  SENT
  PAID
  RECONCILED
  FAILED
}

enum enum_finance_payout_entry_type {
  ORDER_SALE
  REFUND_DEBIT
  COMMISSION_CHARGE
  MANUAL_ADJUSTMENT
  INCIDENT_CREDIT
}

enum enum_privacy_consent_state {
  GRANTED
  REVOKED
}

enum enum_privacy_erasure_status {
  REQUESTED
  IN_REVIEW
  APPROVED
  REJECTED
  EXECUTING
  COMPLETED
  CANCELLED
}

model iam_profile {
  iam_profile_pk       String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  auth_user_fk         String   @unique @db.Uuid
  phone_e164           String?
  email_address        String?  @db.Citext
  display_name         String?
  default_city_fk      String?  @db.Uuid
  is_consumer          Boolean  @default(true)
  is_restaurant_user   Boolean  @default(false)
  is_platform_user     Boolean  @default(false)
  last_seen_at         DateTime?
  created_at           DateTime @default(now()) @db.Timestamptz(6)
  updated_at           DateTime @default(now()) @db.Timestamptz(6)

  consumer_profile           consumer_profile?
  platform_memberships       iam_platform_membership[]
  restaurant_team_membership restaurant_team_membership[]
  saved_restaurants          consumer_saved_restaurant[]
  orders                     order_order[]

  @@index([default_city_fk])
  @@map("iam_profile")
}

model geo_city {
  geo_city_pk    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  city_code      String   @unique
  city_name      String
  state_name     String
  country_code   String
  currency_code  String
  timezone_name  String
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now()) @db.Timestamptz(6)
  updated_at     DateTime @default(now()) @db.Timestamptz(6)

  profiles       iam_profile[]
  neighborhoods  geo_neighborhood[]

  @@map("geo_city")
}

model geo_neighborhood {
  geo_neighborhood_pk String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  geo_city_fk         String   @db.Uuid
  neighborhood_code   String
  neighborhood_name   String
  is_active           Boolean  @default(true)
  created_at          DateTime @default(now()) @db.Timestamptz(6)
  updated_at          DateTime @default(now()) @db.Timestamptz(6)

  city geo_city @relation(fields: [geo_city_fk], references: [geo_city_pk])

  @@unique([geo_city_fk, neighborhood_code])
  @@map("geo_neighborhood")
}

model consumer_profile {
  consumer_profile_pk String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  iam_profile_fk      String   @unique @db.Uuid
  first_name          String?
  last_name           String?
  birth_month         Int?
  birth_day           Int?
  preferred_language_code String?
  marketing_source_code   String?
  created_at          DateTime @default(now()) @db.Timestamptz(6)
  updated_at          DateTime @default(now()) @db.Timestamptz(6)

  profile        iam_profile                     @relation(fields: [iam_profile_fk], references: [iam_profile_pk])
  dietary_prefs  consumer_dietary_preference[]
  allergen_prefs consumer_allergen_preference[]
  city_prefs     consumer_city_preference[]
  referral_codes consumer_referral_code[]
  referrals_sent consumer_referral[]            @relation("referrals_sent")
  referrals_recv consumer_referral[]            @relation("referrals_recv")
  subscriptions  consumer_subscription[]

  @@map("consumer_profile")
}

model consumer_dietary_preference {
  consumer_dietary_preference_pk String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  consumer_profile_fk            String @db.Uuid
  dietary_category               enum_consumer_dietary_category
  created_at                     DateTime @default(now()) @db.Timestamptz(6)
  updated_at                     DateTime @default(now()) @db.Timestamptz(6)

  consumer_profile consumer_profile @relation(fields: [consumer_profile_fk], references: [consumer_profile_pk])

  @@unique([consumer_profile_fk, dietary_category])
  @@map("consumer_dietary_preference")
}

model catalog_allergen {
  catalog_allergen_pk String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  allergen_code       String   @unique
  allergen_name       String
  description         String?
  is_active           Boolean  @default(true)
  created_at          DateTime @default(now()) @db.Timestamptz(6)
  updated_at          DateTime @default(now()) @db.Timestamptz(6)

  consumer_prefs consumer_allergen_preference[]
  template_links catalog_bag_template_allergen[]

  @@map("catalog_allergen")
}

model consumer_allergen_preference {
  consumer_allergen_preference_pk String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  consumer_profile_fk             String   @db.Uuid
  catalog_allergen_fk             String   @db.Uuid
  avoid_flag                      Boolean  @default(true)
  created_at                      DateTime @default(now()) @db.Timestamptz(6)
  updated_at                      DateTime @default(now()) @db.Timestamptz(6)

  consumer_profile consumer_profile @relation(fields: [consumer_profile_fk], references: [consumer_profile_pk])
  allergen         catalog_allergen @relation(fields: [catalog_allergen_fk], references: [catalog_allergen_pk])

  @@unique([consumer_profile_fk, catalog_allergen_fk])
  @@map("consumer_allergen_preference")
}

model consumer_city_preference {
  consumer_city_preference_pk String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  consumer_profile_fk         String   @db.Uuid
  geo_city_fk                 String   @db.Uuid
  is_default                  Boolean  @default(false)
  created_at                  DateTime @default(now()) @db.Timestamptz(6)
  updated_at                  DateTime @default(now()) @db.Timestamptz(6)

  consumer_profile consumer_profile @relation(fields: [consumer_profile_fk], references: [consumer_profile_pk])
  geo_city         geo_city         @relation(fields: [geo_city_fk], references: [geo_city_pk])

  @@unique([consumer_profile_fk, geo_city_fk])
  @@map("consumer_city_preference")
}

model restaurant_restaurant {
  restaurant_restaurant_pk String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  restaurant_slug          String                 @unique
  restaurant_name          String
  display_name             String?
  restaurant_status        enum_restaurant_status
  geo_address_fk           String?                @db.Uuid
  primary_city_fk          String?                @db.Uuid
  primary_neighborhood_fk  String?                @db.Uuid
  legal_entity_name        String?
  description              String?
  phone_e164               String?
  public_email_address     String?                @db.Citext
  average_rating           Decimal?               @db.Decimal(3, 2)
  rating_count             Int                    @default(0)
  created_at               DateTime               @default(now()) @db.Timestamptz(6)
  updated_at               DateTime               @default(now()) @db.Timestamptz(6)

  contacts                 restaurant_contact[]
  bag_templates            catalog_bag_template[]
  drops                    drop_drop[]
  orders                   order_order[]

  @@index([primary_city_fk, restaurant_status])
  @@map("restaurant_restaurant")
}

model catalog_bag_template {
  catalog_bag_template_pk String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  restaurant_fk           String   @db.Uuid
  template_code           String
  template_name           String
  template_status         String
  current_revision_number Int      @default(1)
  is_pickup_ready_by_default Boolean @default(false)
  created_at              DateTime @default(now()) @db.Timestamptz(6)
  updated_at              DateTime @default(now()) @db.Timestamptz(6)

  restaurant restaurant_restaurant           @relation(fields: [restaurant_fk], references: [restaurant_restaurant_pk])
  revisions  catalog_bag_template_revision[]

  @@unique([restaurant_fk, template_code])
  @@map("catalog_bag_template")
}

model catalog_bag_template_revision {
  catalog_bag_template_revision_pk String                       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  catalog_bag_template_fk          String                       @db.Uuid
  revision_number                  Int
  source_type                      enum_catalog_source_type
  dietary_category                 enum_consumer_dietary_category
  spice_level                      enum_catalog_spice_level?
  template_title                   String
  template_description             String?
  serves_min                       Int
  serves_max                       Int
  max_holding_minutes              Int
  min_menu_value_paise             BigInt
  bag_price_paise                  BigInt
  packaging_notes                  String?
  food_safety_notes                String?
  version_status_code              String
  created_at                       DateTime                     @default(now()) @db.Timestamptz(6)
  updated_at                       DateTime                     @default(now()) @db.Timestamptz(6)

  bag_template catalog_bag_template         @relation(fields: [catalog_bag_template_fk], references: [catalog_bag_template_pk])
  allergens    catalog_bag_template_allergen[]
  drops        drop_drop[]

  @@unique([catalog_bag_template_fk, revision_number])
  @@map("catalog_bag_template_revision")
}

model catalog_bag_template_allergen {
  catalog_bag_template_allergen_pk String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  catalog_bag_template_revision_fk String @db.Uuid
  catalog_allergen_fk              String @db.Uuid
  created_at                       DateTime @default(now()) @db.Timestamptz(6)
  updated_at                       DateTime @default(now()) @db.Timestamptz(6)

  revision catalog_bag_template_revision @relation(fields: [catalog_bag_template_revision_fk], references: [catalog_bag_template_revision_pk])
  allergen catalog_allergen             @relation(fields: [catalog_allergen_fk], references: [catalog_allergen_pk])

  @@unique([catalog_bag_template_revision_fk, catalog_allergen_fk])
  @@map("catalog_bag_template_allergen")
}

model drop_drop {
  drop_drop_pk                     String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  restaurant_fk                    String           @db.Uuid
  catalog_bag_template_revision_fk String           @db.Uuid
  drop_title                       String
  drop_description                 String?
  drop_type                        enum_drop_type
  drop_status                      enum_drop_status
  geo_city_fk                      String?          @db.Uuid
  geo_neighborhood_fk              String?          @db.Uuid
  publish_at                       DateTime?        @db.Timestamptz(6)
  pickup_start_at                  DateTime         @db.Timestamptz(6)
  pickup_end_at                    DateTime         @db.Timestamptz(6)
  quantity_total                   Int
  quantity_reserved                Int              @default(0)
  quantity_sold                    Int              @default(0)
  bag_price_paise                  BigInt
  min_menu_value_paise             BigInt
  holds_expire_minutes             Int              @default(10)
  operational_note                 String?
  paused_at                        DateTime?        @db.Timestamptz(6)
  cancelled_at                     DateTime?        @db.Timestamptz(6)
  emergency_closed_at              DateTime?        @db.Timestamptz(6)
  sold_out_at                      DateTime?        @db.Timestamptz(6)
  expires_at                       DateTime?        @db.Timestamptz(6)
  created_at                       DateTime         @default(now()) @db.Timestamptz(6)
  updated_at                       DateTime         @default(now()) @db.Timestamptz(6)

  restaurant restaurant_restaurant          @relation(fields: [restaurant_fk], references: [restaurant_restaurant_pk])
  revision   catalog_bag_template_revision  @relation(fields: [catalog_bag_template_revision_fk], references: [catalog_bag_template_revision_pk])
  holds      drop_inventory_hold[]
  orders     order_order[]

  @@index([geo_city_fk, drop_status, publish_at])
  @@map("drop_drop")
}

model drop_inventory_hold {
  drop_inventory_hold_pk String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  drop_fk                String                @db.Uuid
  consumer_profile_fk    String                @db.Uuid
  hold_quantity          Int
  hold_status            enum_drop_hold_status
  expires_at             DateTime              @db.Timestamptz(6)
  order_fk               String?               @db.Uuid
  released_reason_code   String?
  created_at             DateTime              @default(now()) @db.Timestamptz(6)
  updated_at             DateTime              @default(now()) @db.Timestamptz(6)

  drop     drop_drop         @relation(fields: [drop_fk], references: [drop_drop_pk])
  consumer consumer_profile  @relation(fields: [consumer_profile_fk], references: [consumer_profile_pk])
  order    order_order?

  @@index([drop_fk, hold_status, expires_at])
  @@map("drop_inventory_hold")
}

model order_order {
  order_order_pk                String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  order_number                  BigInt            @default(autoincrement())
  consumer_profile_fk           String            @db.Uuid
  restaurant_fk                 String            @db.Uuid
  drop_fk                       String            @db.Uuid
  drop_inventory_hold_fk        String?           @unique @db.Uuid
  order_status                  enum_order_status
  currency_code                 String
  subtotal_paise                BigInt
  discount_paise                BigInt            @default(0)
  platform_fee_paise            BigInt            @default(0)
  tax_paise                     BigInt            @default(0)
  total_paise                   BigInt
  pickup_otp_hash               String?
  pickup_qr_nonce               String?           @db.Uuid
  pickup_qr_version             Int?
  pickup_ready_at               DateTime?         @db.Timestamptz(6)
  collected_at                  DateTime?         @db.Timestamptz(6)
  cancelled_at                  DateTime?         @db.Timestamptz(6)
  pickup_expired_at             DateTime?         @db.Timestamptz(6)
  failure_reason_code           String?
  cancellation_reason_code      String?
  source_channel_code           String?
  created_via_idempotency_key_fk String?          @db.Uuid
  created_at                    DateTime          @default(now()) @db.Timestamptz(6)
  updated_at                    DateTime          @default(now()) @db.Timestamptz(6)

  consumer consumer_profile @relation(fields: [consumer_profile_fk], references: [consumer_profile_pk])
  restaurant restaurant_restaurant @relation(fields: [restaurant_fk], references: [restaurant_restaurant_pk])
  drop      drop_drop        @relation(fields: [drop_fk], references: [drop_drop_pk])
  hold      drop_inventory_hold? @relation(fields: [drop_inventory_hold_fk], references: [drop_inventory_hold_pk])
  items     order_order_item[]
  payment_intent payment_intent?
  review    review_review?

  @@index([consumer_profile_fk, created_at])
  @@index([restaurant_fk, order_status, created_at])
  @@map("order_order")
}

model order_order_item {
  order_order_item_pk              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  order_fk                         String   @db.Uuid
  catalog_bag_template_revision_fk String   @db.Uuid
  drop_fk                          String   @db.Uuid
  quantity                         Int
  unit_price_paise                 BigInt
  line_total_paise                 BigInt
  created_at                       DateTime @default(now()) @db.Timestamptz(6)
  updated_at                       DateTime @default(now()) @db.Timestamptz(6)

  order    order_order                  @relation(fields: [order_fk], references: [order_order_pk])
  revision catalog_bag_template_revision @relation(fields: [catalog_bag_template_revision_fk], references: [catalog_bag_template_revision_pk])
  drop     drop_drop                    @relation(fields: [drop_fk], references: [drop_drop_pk])

  @@unique([order_fk, catalog_bag_template_revision_fk, drop_fk])
  @@map("order_order_item")
}

model payment_intent {
  payment_intent_pk      String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  order_fk               String              @unique @db.Uuid
  payment_provider       enum_payment_provider
  provider_order_id      String?
  payment_status         enum_payment_status
  amount_paise           BigInt
  currency_code          String
  provider_customer_ref  String?
  provider_receipt_ref   String?
  idempotency_key_fk     String?             @db.Uuid
  authorized_at          DateTime?           @db.Timestamptz(6)
  captured_at            DateTime?           @db.Timestamptz(6)
  failed_at              DateTime?           @db.Timestamptz(6)
  failure_code           String?
  failure_reason         String?
  created_at             DateTime            @default(now()) @db.Timestamptz(6)
  updated_at             DateTime            @default(now()) @db.Timestamptz(6)

  order        order_order            @relation(fields: [order_fk], references: [order_order_pk])
  transactions payment_transaction[]

  @@map("payment_intent")
}

model payment_transaction {
  payment_transaction_pk String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  payment_intent_fk      String              @db.Uuid
  provider_payment_id    String?
  provider_signature     String?
  payment_status         enum_payment_status
  amount_paise           BigInt
  gateway_fee_paise      BigInt?
  gateway_tax_paise      BigInt?
  raw_payload            Json?
  processed_at           DateTime?           @db.Timestamptz(6)
  created_at             DateTime            @default(now()) @db.Timestamptz(6)
  updated_at             DateTime            @default(now()) @db.Timestamptz(6)

  payment_intent payment_intent @relation(fields: [payment_intent_fk], references: [payment_intent_pk])
  refunds        payment_refund[]

  @@map("payment_transaction")
}

model payment_refund {
  payment_refund_pk       String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  order_fk                String   @db.Uuid
  payment_transaction_fk  String?  @db.Uuid
  provider_refund_id      String?
  refund_status_code      String
  refund_reason_code      String
  amount_paise            BigInt
  requested_by_profile_fk String?  @db.Uuid
  requested_at            DateTime @db.Timestamptz(6)
  processed_at            DateTime? @db.Timestamptz(6)
  failure_reason          String?
  created_at              DateTime @default(now()) @db.Timestamptz(6)
  updated_at              DateTime @default(now()) @db.Timestamptz(6)

  order       order_order?         @relation(fields: [order_fk], references: [order_order_pk])
  transaction payment_transaction? @relation(fields: [payment_transaction_fk], references: [payment_transaction_pk])

  @@map("payment_refund")
}

model review_review {
  review_review_pk   String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  order_fk           String             @unique @db.Uuid
  consumer_profile_fk String            @db.Uuid
  restaurant_fk      String             @db.Uuid
  rating_value       Int
  headline_text      String?
  review_text        String?
  review_status      enum_review_status
  published_at       DateTime?          @db.Timestamptz(6)
  created_at         DateTime           @default(now()) @db.Timestamptz(6)
  updated_at         DateTime           @default(now()) @db.Timestamptz(6)

  order    order_order            @relation(fields: [order_fk], references: [order_order_pk])

  @@map("review_review")
}

model notification_outbox {
  notification_outbox_pk String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  iam_profile_fk         String?                  @db.Uuid
  restaurant_fk          String?                  @db.Uuid
  order_fk               String?                  @db.Uuid
  channel                enum_notification_channel
  notification_status    enum_notification_status
  notification_template_fk String?                @db.Uuid
  dedupe_key             String?
  payload_json           Json?
  scheduled_for          DateTime?                @db.Timestamptz(6)
  sent_at                DateTime?                @db.Timestamptz(6)
  retry_count            Int                      @default(0)
  last_error             String?
  created_at             DateTime                 @default(now()) @db.Timestamptz(6)
  updated_at             DateTime                 @default(now()) @db.Timestamptz(6)

  @@map("notification_outbox")
}
```

## 5. SQL migration set for PostgreSQL / Supabase

The migration below is the foundational SQL slice: extensions, enums, core tables, helper functions, generated inventory column, updated-at triggers, and launch-critical indexes. It is intentionally PostgreSQL-first and leaves RLS policies to section 6.

```sql
create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists private;

create type enum_consumer_dietary_category as enum ('VEG', 'NON_VEG', 'JAIN', 'EGG_ONLY');
create type enum_catalog_spice_level as enum ('MILD', 'MEDIUM', 'HOT');
create type enum_catalog_source_type as enum ('SURPLUS', 'SLACK_HOUR', 'CHEF_SPECIAL', 'SPOTLIGHT');
create type enum_restaurant_status as enum ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'ARCHIVED');
create type enum_restaurant_contact_type as enum ('PRIMARY_OPERATIONS', 'ESCALATION', 'FINANCE', 'LEGAL');
create type enum_drop_status as enum ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'EXPIRED', 'CANCELLED', 'EMERGENCY_CLOSED');
create type enum_drop_type as enum ('STANDARD', 'SPOTLIGHT', 'CHEF_SPECIAL');
create type enum_drop_hold_status as enum ('ACTIVE', 'CONVERTED', 'RELEASED', 'EXPIRED');
create type enum_order_status as enum ('CREATED', 'PAYMENT_PENDING', 'PAYMENT_AUTHORIZED', 'PAID', 'CONFIRMED', 'READY_FOR_PICKUP', 'COLLECTED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'PICKUP_EXPIRED', 'FAILED');
create type enum_payment_provider as enum ('RAZORPAY');
create type enum_payment_status as enum ('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');
create type enum_subscription_status as enum ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED');
create type enum_referral_status as enum ('PENDING', 'QUALIFIED', 'REWARDED', 'CANCELLED');
create type enum_incident_status as enum ('OPEN', 'TRIAGED', 'INVESTIGATING', 'MERCHANT_ACTION_REQUIRED', 'RESOLVED', 'CLOSED', 'REJECTED');
create type enum_incident_type as enum ('DIETARY_MISMATCH', 'PACKAGING_BREACH', 'FOOD_SAFETY', 'PICKUP_NOT_HONORED', 'MISSING_ORDER', 'QUALITY_ISSUE', 'OTHER');
create type enum_review_status as enum ('PUBLISHED', 'FLAGGED', 'HIDDEN');
create type enum_notification_channel as enum ('WHATSAPP', 'EMAIL', 'PUSH', 'SMS');
create type enum_notification_status as enum ('PENDING', 'SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
create type enum_config_scope as enum ('GLOBAL', 'CITY', 'RESTAURANT', 'SEGMENT');
create type enum_finance_settlement_status as enum ('DRAFT', 'OPEN', 'LOCKED', 'SENT', 'PAID', 'RECONCILED', 'FAILED');
create type enum_finance_payout_entry_type as enum ('ORDER_SALE', 'REFUND_DEBIT', 'COMMISSION_CHARGE', 'MANUAL_ADJUSTMENT', 'INCIDENT_CREDIT');
create type enum_privacy_consent_state as enum ('GRANTED', 'REVOKED');
create type enum_privacy_erasure_status as enum ('REQUESTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXECUTING', 'COMPLETED', 'CANCELLED');

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.current_profile_pk()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select iam_profile_pk
  from iam_profile
  where auth_user_fk = auth.uid()
$$;

create table geo_city (
  geo_city_pk uuid primary key default gen_random_uuid(),
  city_code text not null,
  city_name text not null,
  state_name text not null,
  country_code text not null default 'IN',
  currency_code text not null default 'INR',
  timezone_name text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_geo_city_code unique (city_code)
);

create table geo_neighborhood (
  geo_neighborhood_pk uuid primary key default gen_random_uuid(),
  geo_city_fk uuid not null references geo_city (geo_city_pk) on delete restrict,
  neighborhood_code text not null,
  neighborhood_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_geo_neighborhood_code unique (geo_city_fk, neighborhood_code)
);

create table geo_address (
  geo_address_pk uuid primary key default gen_random_uuid(),
  line_1 text not null,
  line_2 text,
  landmark text,
  geo_city_fk uuid not null references geo_city (geo_city_pk) on delete restrict,
  geo_neighborhood_fk uuid references geo_neighborhood (geo_neighborhood_pk) on delete set null,
  postal_code text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_geo_address_lat check (latitude is null or latitude between -90 and 90),
  constraint ck_geo_address_lng check (longitude is null or longitude between -180 and 180)
);

create table iam_profile (
  iam_profile_pk uuid primary key default gen_random_uuid(),
  auth_user_fk uuid not null references auth.users (id) on delete restrict,
  phone_e164 text,
  email_address citext,
  display_name text,
  default_city_fk uuid references geo_city (geo_city_pk) on delete set null,
  is_consumer boolean not null default true,
  is_restaurant_user boolean not null default false,
  is_platform_user boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_iam_profile_auth_user unique (auth_user_fk)
);

create unique index uq_iam_profile_phone on iam_profile (phone_e164) where phone_e164 is not null;
create unique index uq_iam_profile_email on iam_profile (email_address) where email_address is not null;

create table iam_platform_role (
  iam_platform_role_pk uuid primary key default gen_random_uuid(),
  role_code text not null,
  role_name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_iam_platform_role_code unique (role_code)
);

create table iam_platform_membership (
  iam_platform_membership_pk uuid primary key default gen_random_uuid(),
  iam_profile_fk uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  iam_platform_role_fk uuid not null references iam_platform_role (iam_platform_role_pk) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_iam_platform_membership unique (iam_profile_fk, iam_platform_role_fk)
);

create table iam_platform_role_scope (
  iam_platform_role_scope_pk uuid primary key default gen_random_uuid(),
  iam_platform_role_fk uuid not null references iam_platform_role (iam_platform_role_pk) on delete cascade,
  scope_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_iam_platform_role_scope unique (iam_platform_role_fk, scope_code)
);

create table restaurant_team_role (
  restaurant_team_role_pk uuid primary key default gen_random_uuid(),
  role_code text not null,
  role_name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_team_role_code unique (role_code)
);

create table consumer_profile (
  consumer_profile_pk uuid primary key default gen_random_uuid(),
  iam_profile_fk uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  first_name text,
  last_name text,
  birth_month integer,
  birth_day integer,
  preferred_language_code text,
  marketing_source_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consumer_profile_profile unique (iam_profile_fk)
);

create table restaurant_restaurant (
  restaurant_restaurant_pk uuid primary key default gen_random_uuid(),
  restaurant_slug text not null,
  restaurant_name text not null,
  display_name text,
  restaurant_status enum_restaurant_status not null default 'PENDING',
  geo_address_fk uuid references geo_address (geo_address_pk) on delete set null,
  primary_city_fk uuid references geo_city (geo_city_pk) on delete set null,
  primary_neighborhood_fk uuid references geo_neighborhood (geo_neighborhood_pk) on delete set null,
  legal_entity_name text,
  description text,
  phone_e164 text,
  public_email_address citext,
  average_rating numeric(3, 2),
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_slug unique (restaurant_slug)
);

create table restaurant_team_membership (
  restaurant_team_membership_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  iam_profile_fk uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  restaurant_team_role_fk uuid not null references restaurant_team_role (restaurant_team_role_pk) on delete restrict,
  is_active boolean not null default true,
  is_default boolean not null default false,
  invited_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_team_membership unique (restaurant_fk, iam_profile_fk, restaurant_team_role_fk)
);

create table restaurant_team_role_scope (
  restaurant_team_role_scope_pk uuid primary key default gen_random_uuid(),
  restaurant_team_role_fk uuid not null references restaurant_team_role (restaurant_team_role_pk) on delete cascade,
  scope_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_team_role_scope unique (restaurant_team_role_fk, scope_code)
);

create table catalog_allergen (
  catalog_allergen_pk uuid primary key default gen_random_uuid(),
  allergen_code text not null,
  allergen_name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_catalog_allergen_code unique (allergen_code)
);

create table restaurant_cuisine (
  restaurant_cuisine_pk uuid primary key default gen_random_uuid(),
  cuisine_code text not null,
  cuisine_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_cuisine_code unique (cuisine_code)
);

create table restaurant_compliance (
  restaurant_compliance_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  fssai_license_number text,
  fssai_expires_at timestamptz,
  gstin citext,
  pan_reference text,
  kyc_status_code text not null default 'PENDING',
  food_safety_notes text,
  packaging_commitment_notes text,
  freshness_commitment_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_compliance_restaurant unique (restaurant_fk)
);

create unique index uq_restaurant_compliance_fssai on restaurant_compliance (fssai_license_number) where fssai_license_number is not null;
create unique index uq_restaurant_compliance_gstin on restaurant_compliance (gstin) where gstin is not null;

create table restaurant_contact (
  restaurant_contact_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  contact_type enum_restaurant_contact_type not null,
  full_name text not null,
  phone_e164 text,
  email_address citext,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_restaurant_contact_primary
on restaurant_contact (restaurant_fk, contact_type)
where is_primary = true;

create table restaurant_restaurant_cuisine (
  restaurant_restaurant_cuisine_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  restaurant_cuisine_fk uuid not null references restaurant_cuisine (restaurant_cuisine_pk) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_restaurant_cuisine unique (restaurant_fk, restaurant_cuisine_fk)
);

create table restaurant_payout_account (
  restaurant_payout_account_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  payout_method_code text not null,
  beneficiary_name text not null,
  bank_account_last4 text,
  ifsc_code citext,
  upi_vpa citext,
  provider_beneficiary_ref text,
  details_ciphertext bytea,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_restaurant_payout_account_active
on restaurant_payout_account (restaurant_fk)
where is_active = true;

create table restaurant_commission_plan (
  restaurant_commission_plan_pk uuid primary key default gen_random_uuid(),
  plan_code text not null,
  plan_name text not null,
  commission_bps integer not null,
  flat_fee_paise bigint not null default 0,
  effective_from timestamptz not null,
  effective_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_commission_plan_code unique (plan_code)
);

create table restaurant_commission_override (
  restaurant_commission_override_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  restaurant_commission_plan_fk uuid not null references restaurant_commission_plan (restaurant_commission_plan_pk) on delete restrict,
  commission_bps_override integer,
  flat_fee_paise_override bigint,
  effective_from timestamptz not null,
  effective_to timestamptz,
  reason_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table storage_object (
  storage_object_pk uuid primary key default gen_random_uuid(),
  bucket_name text not null,
  object_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  checksum_sha256 text,
  uploaded_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  visibility_code text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_storage_object_path unique (bucket_name, object_path)
);

create table restaurant_document (
  restaurant_document_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  storage_object_fk uuid not null references storage_object (storage_object_pk) on delete restrict,
  document_type_code text not null,
  document_status_code text not null default 'PENDING',
  expires_at timestamptz,
  verified_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_document_file unique (restaurant_fk, storage_object_fk)
);

create table restaurant_setting (
  restaurant_setting_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  pickup_grace_minutes integer not null default 15,
  verification_mode_code text not null default 'OTP_OR_QR',
  allow_whatsapp_order_alerts boolean not null default true,
  allow_email_finance_alerts boolean not null default true,
  default_holding_minutes integer not null default 10,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_restaurant_setting_restaurant unique (restaurant_fk)
);

create table consumer_dietary_preference (
  consumer_dietary_preference_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  dietary_category enum_consumer_dietary_category not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consumer_dietary_preference unique (consumer_profile_fk, dietary_category)
);

create table consumer_allergen_preference (
  consumer_allergen_preference_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  catalog_allergen_fk uuid not null references catalog_allergen (catalog_allergen_pk) on delete restrict,
  avoid_flag boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consumer_allergen_preference unique (consumer_profile_fk, catalog_allergen_fk)
);

create table consumer_city_preference (
  consumer_city_preference_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  geo_city_fk uuid not null references geo_city (geo_city_pk) on delete restrict,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consumer_city_preference unique (consumer_profile_fk, geo_city_fk)
);

create unique index uq_consumer_city_preference_default
on consumer_city_preference (consumer_profile_fk)
where is_default = true;

create table consumer_saved_restaurant (
  consumer_saved_restaurant_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  saved_at timestamptz not null default now(),
  constraint uq_consumer_saved_restaurant unique (consumer_profile_fk, restaurant_fk)
);

create table consumer_referral_code (
  consumer_referral_code_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  referral_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consumer_referral_code_profile unique (consumer_profile_fk),
  constraint uq_consumer_referral_code_value unique (referral_code)
);

create table consumer_referral (
  consumer_referral_pk uuid primary key default gen_random_uuid(),
  referrer_consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  referred_consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  referral_status enum_referral_status not null default 'PENDING',
  qualified_at timestamptz,
  rewarded_at timestamptz,
  source_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consumer_referral_pair unique (referrer_consumer_profile_fk, referred_consumer_profile_fk),
  constraint ck_consumer_referral_not_self check (referrer_consumer_profile_fk <> referred_consumer_profile_fk)
);

create table consumer_subscription_plan (
  consumer_subscription_plan_pk uuid primary key default gen_random_uuid(),
  plan_code text not null,
  plan_name text not null,
  price_paise bigint not null,
  billing_interval_months integer not null default 1,
  benefits_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consumer_subscription_plan_code unique (plan_code)
);

create table consumer_subscription (
  consumer_subscription_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  consumer_subscription_plan_fk uuid not null references consumer_subscription_plan (consumer_subscription_plan_pk) on delete restrict,
  subscription_status enum_subscription_status not null default 'TRIAL',
  starts_at timestamptz not null,
  ends_at timestamptz,
  renewal_due_at timestamptz,
  provider_subscription_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_consumer_subscription_active
on consumer_subscription (consumer_profile_fk, consumer_subscription_plan_fk)
where subscription_status in ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED');

create table consumer_passport_stat (
  consumer_passport_stat_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  lifetime_orders_count integer not null default 0,
  lifetime_collects_count integer not null default 0,
  city_count integer not null default 0,
  restaurant_count integer not null default 0,
  points_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consumer_passport_stat unique (consumer_profile_fk)
);

create table consumer_notification_preference (
  consumer_notification_preference_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete cascade,
  whatsapp_transactional_enabled boolean not null default true,
  whatsapp_marketing_enabled boolean not null default false,
  email_transactional_enabled boolean not null default true,
  email_marketing_enabled boolean not null default false,
  push_transactional_enabled boolean not null default true,
  push_marketing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_consumer_notification_preference unique (consumer_profile_fk)
);

create table privacy_consent_purpose (
  privacy_consent_purpose_pk uuid primary key default gen_random_uuid(),
  purpose_code text not null,
  purpose_name text not null,
  description text,
  is_required_for_service boolean not null default false,
  retention_policy_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_privacy_consent_purpose_code unique (purpose_code)
);

create table privacy_consent_event (
  privacy_consent_event_pk uuid primary key default gen_random_uuid(),
  iam_profile_fk uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  privacy_consent_purpose_fk uuid not null references privacy_consent_purpose (privacy_consent_purpose_pk) on delete restrict,
  consent_state enum_privacy_consent_state not null,
  policy_version text not null,
  capture_source_code text not null,
  proof_json jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  recorded_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null
);

create table privacy_retention_policy (
  privacy_retention_policy_pk uuid primary key default gen_random_uuid(),
  policy_code text not null,
  applies_to_table_name text not null,
  retention_days integer not null,
  anonymize_after_days integer,
  purge_after_days integer,
  legal_hold_supported boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_privacy_retention_policy_code unique (policy_code)
);

create table privacy_erasure_request (
  privacy_erasure_request_pk uuid primary key default gen_random_uuid(),
  iam_profile_fk uuid not null references iam_profile (iam_profile_pk) on delete cascade,
  privacy_erasure_status enum_privacy_erasure_status not null default 'REQUESTED',
  requested_reason text,
  requested_at timestamptz not null default now(),
  reviewed_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  reviewed_at timestamptz,
  executed_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table catalog_bag_template (
  catalog_bag_template_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  template_code text not null,
  template_name text not null,
  template_status text not null check (template_status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
  current_revision_number integer not null default 1,
  is_pickup_ready_by_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_catalog_bag_template_code unique (restaurant_fk, template_code)
);

create table catalog_bag_template_revision (
  catalog_bag_template_revision_pk uuid primary key default gen_random_uuid(),
  catalog_bag_template_fk uuid not null references catalog_bag_template (catalog_bag_template_pk) on delete cascade,
  revision_number integer not null,
  source_type enum_catalog_source_type not null,
  dietary_category enum_consumer_dietary_category not null,
  spice_level enum_catalog_spice_level,
  template_title text not null,
  template_description text,
  serves_min integer not null,
  serves_max integer not null,
  max_holding_minutes integer not null,
  min_menu_value_paise bigint not null,
  bag_price_paise bigint not null,
  packaging_notes text,
  food_safety_notes text,
  version_status_code text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_catalog_bag_template_revision unique (catalog_bag_template_fk, revision_number),
  constraint ck_catalog_bag_template_serves check (serves_min > 0 and serves_max >= serves_min),
  constraint ck_catalog_bag_template_holding check (max_holding_minutes > 0),
  constraint ck_catalog_bag_template_price check (bag_price_paise > 0)
);

create table catalog_bag_template_allergen (
  catalog_bag_template_allergen_pk uuid primary key default gen_random_uuid(),
  catalog_bag_template_revision_fk uuid not null references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete cascade,
  catalog_allergen_fk uuid not null references catalog_allergen (catalog_allergen_pk) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_catalog_bag_template_allergen unique (catalog_bag_template_revision_fk, catalog_allergen_fk)
);

create table catalog_bag_template_media (
  catalog_bag_template_media_pk uuid primary key default gen_random_uuid(),
  catalog_bag_template_revision_fk uuid not null references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete cascade,
  storage_object_fk uuid not null references storage_object (storage_object_pk) on delete restrict,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_catalog_bag_template_media unique (catalog_bag_template_revision_fk, storage_object_fk)
);

create unique index uq_catalog_bag_template_media_primary
on catalog_bag_template_media (catalog_bag_template_revision_fk)
where is_primary = true;

create table drop_audience_segment (
  drop_audience_segment_pk uuid primary key default gen_random_uuid(),
  segment_code text not null,
  segment_name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_drop_audience_segment_code unique (segment_code)
);

create table drop_recurring_schedule (
  drop_recurring_schedule_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  schedule_name text not null,
  timezone_name text not null default 'Asia/Kolkata',
  rrule_text text not null,
  next_run_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table drop_drop (
  drop_drop_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  catalog_bag_template_revision_fk uuid not null references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete restrict,
  drop_recurring_schedule_fk uuid references drop_recurring_schedule (drop_recurring_schedule_pk) on delete set null,
  drop_title text not null,
  drop_description text,
  drop_type enum_drop_type not null default 'STANDARD',
  drop_status enum_drop_status not null default 'DRAFT',
  geo_city_fk uuid references geo_city (geo_city_pk) on delete set null,
  geo_neighborhood_fk uuid references geo_neighborhood (geo_neighborhood_pk) on delete set null,
  publish_at timestamptz,
  pickup_start_at timestamptz not null,
  pickup_end_at timestamptz not null,
  quantity_total integer not null,
  quantity_reserved integer not null default 0,
  quantity_sold integer not null default 0,
  quantity_available integer generated always as (greatest(quantity_total - quantity_reserved - quantity_sold, 0)) stored,
  bag_price_paise bigint not null,
  min_menu_value_paise bigint not null,
  holds_expire_minutes integer not null default 10,
  operational_note text,
  paused_at timestamptz,
  cancelled_at timestamptz,
  emergency_closed_at timestamptz,
  sold_out_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_drop_pickup_window check (pickup_end_at > pickup_start_at),
  constraint ck_drop_quantity_total check (quantity_total > 0),
  constraint ck_drop_quantity_balance check (quantity_reserved >= 0 and quantity_sold >= 0 and quantity_reserved + quantity_sold <= quantity_total),
  constraint ck_drop_price check (bag_price_paise > 0)
);

create table drop_drop_audience (
  drop_drop_audience_pk uuid primary key default gen_random_uuid(),
  drop_fk uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  drop_audience_segment_fk uuid not null references drop_audience_segment (drop_audience_segment_pk) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_drop_drop_audience unique (drop_fk, drop_audience_segment_fk)
);

create table drop_drop_media (
  drop_drop_media_pk uuid primary key default gen_random_uuid(),
  drop_fk uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  storage_object_fk uuid not null references storage_object (storage_object_pk) on delete restrict,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_drop_drop_media unique (drop_fk, storage_object_fk)
);

create unique index uq_drop_drop_media_primary on drop_drop_media (drop_fk) where is_primary = true;

create table core_idempotency_key (
  core_idempotency_key_pk uuid primary key default gen_random_uuid(),
  scope_code text not null,
  key_value text not null,
  request_hash text not null,
  response_resource_type text,
  response_resource_pk uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_core_idempotency_key unique (scope_code, key_value)
);

create table order_order (
  order_order_pk uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity,
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete restrict,
  drop_fk uuid not null references drop_drop (drop_drop_pk) on delete restrict,
  drop_inventory_hold_fk uuid,
  order_status enum_order_status not null default 'CREATED',
  currency_code text not null default 'INR',
  subtotal_paise bigint not null,
  discount_paise bigint not null default 0,
  platform_fee_paise bigint not null default 0,
  tax_paise bigint not null default 0,
  total_paise bigint not null,
  pickup_otp_hash text,
  pickup_qr_nonce uuid,
  pickup_qr_version integer not null default 1,
  pickup_ready_at timestamptz,
  collected_at timestamptz,
  cancelled_at timestamptz,
  pickup_expired_at timestamptz,
  failure_reason_code text,
  cancellation_reason_code text,
  source_channel_code text,
  created_via_idempotency_key_fk uuid references core_idempotency_key (core_idempotency_key_pk) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_order_order_number unique (order_number),
  constraint ck_order_total check (total_paise = subtotal_paise - discount_paise + platform_fee_paise + tax_paise)
);

create table drop_inventory_hold (
  drop_inventory_hold_pk uuid primary key default gen_random_uuid(),
  drop_fk uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  hold_quantity integer not null,
  hold_status enum_drop_hold_status not null default 'ACTIVE',
  expires_at timestamptz not null,
  order_fk uuid references order_order (order_order_pk) on delete set null,
  released_reason_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_drop_inventory_hold_quantity check (hold_quantity > 0),
  constraint ck_drop_inventory_hold_expiry check (expires_at > created_at)
);

alter table order_order
  add constraint fk_order_drop_inventory_hold
  foreign key (drop_inventory_hold_fk) references drop_inventory_hold (drop_inventory_hold_pk) on delete set null;

create table order_order_item (
  order_order_item_pk uuid primary key default gen_random_uuid(),
  order_fk uuid not null references order_order (order_order_pk) on delete cascade,
  catalog_bag_template_revision_fk uuid not null references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete restrict,
  drop_fk uuid not null references drop_drop (drop_drop_pk) on delete restrict,
  quantity integer not null,
  unit_price_paise bigint not null,
  line_total_paise bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_order_order_item unique (order_fk, catalog_bag_template_revision_fk, drop_fk),
  constraint ck_order_order_item_quantity check (quantity > 0),
  constraint ck_order_order_item_total check (line_total_paise = quantity * unit_price_paise)
);

create table drop_inventory_event (
  drop_inventory_event_pk bigint generated always as identity primary key,
  drop_fk uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  event_type_code text not null,
  delta_quantity integer not null,
  before_quantity_reserved integer,
  after_quantity_reserved integer,
  before_quantity_sold integer,
  after_quantity_sold integer,
  source_order_fk uuid references order_order (order_order_pk) on delete set null,
  source_hold_fk uuid references drop_inventory_hold (drop_inventory_hold_pk) on delete set null,
  recorded_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  note_text text,
  created_at timestamptz not null default now()
);

create table drop_closure_log (
  drop_closure_log_pk uuid primary key default gen_random_uuid(),
  drop_fk uuid not null references drop_drop (drop_drop_pk) on delete cascade,
  closed_reason_code text not null,
  unsold_quantity integer not null default 0,
  disposal_note text,
  recorded_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_drop_closure_log_drop unique (drop_fk)
);

create table order_status_transition (
  order_status_transition_pk bigint generated always as identity primary key,
  order_fk uuid not null references order_order (order_order_pk) on delete cascade,
  from_status enum_order_status,
  to_status enum_order_status not null,
  changed_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  change_source_code text not null,
  note_text text,
  created_at timestamptz not null default now()
);

create table order_pickup_verification_event (
  order_pickup_verification_event_pk bigint generated always as identity primary key,
  order_fk uuid not null references order_order (order_order_pk) on delete cascade,
  verified_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  verification_method_code text not null,
  attempt_status_code text not null,
  submitted_code_hash text,
  captured_offline_at timestamptz,
  synced_at timestamptz,
  device_label text,
  note_text text,
  created_at timestamptz not null default now()
);

create table payment_intent (
  payment_intent_pk uuid primary key default gen_random_uuid(),
  order_fk uuid not null references order_order (order_order_pk) on delete cascade,
  payment_provider enum_payment_provider not null default 'RAZORPAY',
  provider_order_id text,
  payment_status enum_payment_status not null default 'CREATED',
  amount_paise bigint not null,
  currency_code text not null default 'INR',
  provider_customer_ref text,
  provider_receipt_ref text,
  idempotency_key_fk uuid references core_idempotency_key (core_idempotency_key_pk) on delete set null,
  authorized_at timestamptz,
  captured_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_payment_intent_order unique (order_fk)
);

create unique index uq_payment_intent_provider_order_id on payment_intent (provider_order_id) where provider_order_id is not null;

create table payment_transaction (
  payment_transaction_pk uuid primary key default gen_random_uuid(),
  payment_intent_fk uuid not null references payment_intent (payment_intent_pk) on delete cascade,
  provider_payment_id text,
  provider_signature text,
  payment_status enum_payment_status not null,
  amount_paise bigint not null,
  gateway_fee_paise bigint,
  gateway_tax_paise bigint,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_payment_transaction_provider_payment_id on payment_transaction (provider_payment_id) where provider_payment_id is not null;

create table payment_webhook_event (
  payment_webhook_event_pk bigint generated always as identity primary key,
  payment_provider enum_payment_provider not null,
  provider_event_id text,
  event_type_code text not null,
  signature_valid boolean not null,
  dedupe_key text,
  processing_status_code text not null default 'RECEIVED',
  payload_json jsonb not null,
  error_text text,
  processed_at timestamptz,
  received_at timestamptz not null default now()
);

create unique index uq_payment_webhook_provider_event on payment_webhook_event (payment_provider, provider_event_id) where provider_event_id is not null;
create unique index uq_payment_webhook_dedupe_key on payment_webhook_event (dedupe_key) where dedupe_key is not null;

create table payment_refund (
  payment_refund_pk uuid primary key default gen_random_uuid(),
  order_fk uuid not null references order_order (order_order_pk) on delete cascade,
  payment_transaction_fk uuid references payment_transaction (payment_transaction_pk) on delete set null,
  provider_refund_id text,
  refund_status_code text not null,
  refund_reason_code text not null,
  amount_paise bigint not null,
  requested_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_payment_refund_provider_refund_id on payment_refund (provider_refund_id) where provider_refund_id is not null;

create table finance_settlement_run (
  finance_settlement_run_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  settlement_status enum_finance_settlement_status not null default 'DRAFT',
  period_start_at timestamptz not null,
  period_end_at timestamptz not null,
  gross_sales_paise bigint not null default 0,
  refunds_paise bigint not null default 0,
  commission_paise bigint not null default 0,
  net_payout_paise bigint not null default 0,
  external_settlement_ref text,
  locked_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_finance_settlement_run_period check (period_end_at > period_start_at)
);

create table finance_restaurant_payout_entry (
  finance_restaurant_payout_entry_pk bigint generated always as identity primary key,
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  finance_settlement_run_fk uuid references finance_settlement_run (finance_settlement_run_pk) on delete set null,
  entry_type enum_finance_payout_entry_type not null,
  order_fk uuid references order_order (order_order_pk) on delete set null,
  payment_refund_fk uuid references payment_refund (payment_refund_pk) on delete set null,
  amount_paise bigint not null,
  description text,
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table finance_invoice (
  finance_invoice_pk uuid primary key default gen_random_uuid(),
  invoice_number bigint generated always as identity,
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  finance_settlement_run_fk uuid not null references finance_settlement_run (finance_settlement_run_pk) on delete cascade,
  storage_object_fk uuid references storage_object (storage_object_pk) on delete set null,
  invoice_period_start_at timestamptz not null,
  invoice_period_end_at timestamptz not null,
  invoice_total_paise bigint not null,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_finance_invoice_number unique (invoice_number)
);

create table review_review (
  review_review_pk uuid primary key default gen_random_uuid(),
  order_fk uuid not null references order_order (order_order_pk) on delete cascade,
  consumer_profile_fk uuid not null references consumer_profile (consumer_profile_pk) on delete restrict,
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete restrict,
  rating_value integer not null,
  headline_text text,
  review_text text,
  review_status enum_review_status not null default 'PUBLISHED',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_review_review_order unique (order_fk),
  constraint ck_review_review_rating check (rating_value between 1 and 5)
);

create table review_review_media (
  review_review_media_pk uuid primary key default gen_random_uuid(),
  review_fk uuid not null references review_review (review_review_pk) on delete cascade,
  storage_object_fk uuid not null references storage_object (storage_object_pk) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_review_review_media unique (review_fk, storage_object_fk)
);

create table support_ticket (
  support_ticket_pk uuid primary key default gen_random_uuid(),
  consumer_profile_fk uuid references consumer_profile (consumer_profile_pk) on delete set null,
  restaurant_fk uuid references restaurant_restaurant (restaurant_restaurant_pk) on delete set null,
  order_fk uuid references order_order (order_order_pk) on delete set null,
  ticket_type_code text not null,
  ticket_status_code text not null default 'OPEN',
  priority_code text not null default 'NORMAL',
  subject_text text not null,
  description_text text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table support_ticket_event (
  support_ticket_event_pk bigint generated always as identity primary key,
  support_ticket_fk uuid not null references support_ticket (support_ticket_pk) on delete cascade,
  event_type_code text not null,
  actor_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  event_note text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table incident_incident (
  incident_incident_pk uuid primary key default gen_random_uuid(),
  restaurant_fk uuid not null references restaurant_restaurant (restaurant_restaurant_pk) on delete restrict,
  order_fk uuid references order_order (order_order_pk) on delete set null,
  support_ticket_fk uuid references support_ticket (support_ticket_pk) on delete set null,
  incident_type enum_incident_type not null,
  incident_status enum_incident_status not null default 'OPEN',
  reported_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  assigned_to_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  summary_text text not null,
  detail_text text,
  refund_triggered_flag boolean not null default false,
  sla_due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table incident_event (
  incident_event_pk bigint generated always as identity primary key,
  incident_fk uuid not null references incident_incident (incident_incident_pk) on delete cascade,
  event_type_code text not null,
  actor_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  event_note text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table notification_template (
  notification_template_pk uuid primary key default gen_random_uuid(),
  template_code text not null,
  channel enum_notification_channel not null,
  provider_template_ref text,
  template_version text not null,
  is_active boolean not null default true,
  body_schema_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_notification_template unique (template_code, channel, template_version)
);

create table notification_outbox (
  notification_outbox_pk uuid primary key default gen_random_uuid(),
  iam_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  restaurant_fk uuid references restaurant_restaurant (restaurant_restaurant_pk) on delete set null,
  order_fk uuid references order_order (order_order_pk) on delete set null,
  channel enum_notification_channel not null,
  notification_status enum_notification_status not null default 'PENDING',
  notification_template_fk uuid references notification_template (notification_template_pk) on delete set null,
  dedupe_key text,
  payload_json jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  sent_at timestamptz,
  retry_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_notification_outbox_dedupe on notification_outbox (dedupe_key) where dedupe_key is not null;

create table notification_delivery_attempt (
  notification_delivery_attempt_pk bigint generated always as identity primary key,
  notification_outbox_fk uuid not null references notification_outbox (notification_outbox_pk) on delete cascade,
  attempt_number integer not null,
  provider_message_id text,
  attempt_status_code text not null,
  provider_response_json jsonb not null default '{}'::jsonb,
  error_text text,
  attempted_at timestamptz not null default now(),
  constraint uq_notification_delivery_attempt unique (notification_outbox_fk, attempt_number)
);

create table audit_log (
  audit_log_pk bigint generated always as identity primary key,
  actor_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  actor_role_code text,
  entity_table_name text not null,
  entity_pk uuid,
  action_code text not null,
  before_json jsonb,
  after_json jsonb,
  request_id text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table config_feature_flag (
  config_feature_flag_pk uuid primary key default gen_random_uuid(),
  flag_code text not null,
  flag_name text not null,
  description text,
  default_enabled boolean not null default false,
  rollout_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_config_feature_flag_code unique (flag_code)
);

create table config_runtime_setting (
  config_runtime_setting_pk uuid primary key default gen_random_uuid(),
  setting_code text not null,
  scope_type enum_config_scope not null,
  geo_city_fk uuid references geo_city (geo_city_pk) on delete cascade,
  restaurant_fk uuid references restaurant_restaurant (restaurant_restaurant_pk) on delete cascade,
  segment_code text,
  value_json jsonb not null default '{}'::jsonb,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_config_runtime_setting_scope check (
    (scope_type = 'GLOBAL' and geo_city_fk is null and restaurant_fk is null and segment_code is null) or
    (scope_type = 'CITY' and geo_city_fk is not null and restaurant_fk is null) or
    (scope_type = 'RESTAURANT' and restaurant_fk is not null and geo_city_fk is null) or
    (scope_type = 'SEGMENT' and segment_code is not null and restaurant_fk is null)
  )
);

create table analytics_event (
  analytics_event_pk bigint generated always as identity primary key,
  event_name text not null,
  iam_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  consumer_profile_fk uuid references consumer_profile (consumer_profile_pk) on delete set null,
  restaurant_fk uuid references restaurant_restaurant (restaurant_restaurant_pk) on delete set null,
  order_fk uuid references order_order (order_order_pk) on delete set null,
  drop_fk uuid references drop_drop (drop_drop_pk) on delete set null,
  session_id text,
  source_code text,
  properties_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  ingested_at timestamptz not null default now()
);

create table admin_export_job (
  admin_export_job_pk uuid primary key default gen_random_uuid(),
  requested_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  export_type_code text not null,
  filter_json jsonb not null default '{}'::jsonb,
  storage_object_fk uuid references storage_object (storage_object_pk) on delete set null,
  job_status_code text not null default 'QUEUED',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  error_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admin_data_correction (
  admin_data_correction_pk uuid primary key default gen_random_uuid(),
  requested_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  approved_by_profile_fk uuid references iam_profile (iam_profile_pk) on delete set null,
  entity_table_name text not null,
  entity_pk uuid,
  change_reason text not null,
  before_json jsonb,
  after_json jsonb,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_geo_neighborhood_city_name on geo_neighborhood (geo_city_fk, neighborhood_name);
create index idx_iam_profile_default_city on iam_profile (default_city_fk);
create index idx_restaurant_restaurant_city_status on restaurant_restaurant (primary_city_fk, restaurant_status);
create index idx_restaurant_restaurant_neighborhood_status on restaurant_restaurant (primary_neighborhood_fk, restaurant_status);
create index idx_restaurant_team_membership_restaurant_active on restaurant_team_membership (restaurant_fk, is_active);
create index idx_restaurant_team_membership_profile_active on restaurant_team_membership (iam_profile_fk, is_active);
create index idx_drop_recurring_schedule_next_run on drop_recurring_schedule (next_run_at);
create index idx_drop_drop_restaurant_status on drop_drop (restaurant_fk, drop_status);
create index idx_drop_drop_city_status_publish on drop_drop (geo_city_fk, drop_status, publish_at);
create index idx_drop_drop_neighborhood_status_pickup on drop_drop (geo_neighborhood_fk, drop_status, pickup_start_at);
create index idx_drop_drop_active_discovery on drop_drop (geo_city_fk, pickup_start_at, pickup_end_at, quantity_available) where drop_status in ('SCHEDULED', 'ACTIVE', 'PAUSED');
create index idx_drop_inventory_hold_expiry on drop_inventory_hold (drop_fk, hold_status, expires_at);
create index idx_drop_inventory_event_drop_created on drop_inventory_event (drop_fk, created_at desc);
create index idx_order_order_consumer_created on order_order (consumer_profile_fk, created_at desc);
create index idx_order_order_restaurant_status_created on order_order (restaurant_fk, order_status, created_at desc);
create index idx_order_status_transition_order_created on order_status_transition (order_fk, created_at desc);
create index idx_order_pickup_verification_event_order_created on order_pickup_verification_event (order_fk, created_at desc);
create index idx_payment_intent_status_created on payment_intent (payment_status, created_at desc);
create index idx_payment_webhook_event_status_received on payment_webhook_event (processing_status_code, received_at);
create index idx_payment_refund_order_requested on payment_refund (order_fk, requested_at desc);
create index idx_finance_settlement_run_restaurant_period on finance_settlement_run (restaurant_fk, period_start_at desc);
create index idx_finance_payout_entry_restaurant_event on finance_restaurant_payout_entry (restaurant_fk, event_at desc);
create index idx_review_review_restaurant_status_published on review_review (restaurant_fk, review_status, published_at desc);
create index idx_support_ticket_status_opened on support_ticket (ticket_status_code, opened_at);
create index idx_incident_incident_status_sla on incident_incident (incident_status, sla_due_at);
create index idx_notification_outbox_status_schedule on notification_outbox (notification_status, scheduled_for);
create index idx_audit_log_entity_created on audit_log (entity_table_name, entity_pk, created_at desc);
create index idx_analytics_event_name_occurred on analytics_event (event_name, occurred_at desc);

create comment on table drop_inventory_hold is 'Temporary claim reservations used to prevent oversell while payment is pending.';
create comment on table payment_webhook_event is 'Raw provider webhook ledger with dedupe and signature-verification metadata.';
create comment on table privacy_consent_event is 'Append-only consent ledger by purpose and policy version.';
create comment on table finance_restaurant_payout_entry is 'Append-only merchant payout ledger entries grouped into settlement runs.';
create comment on column restaurant_payout_account.details_ciphertext is 'Encrypted payout payload; never expose to browser clients.';
create comment on column order_order.pickup_otp_hash is 'Store only hashed verification code, never plaintext OTP.';
create comment on column payment_webhook_event.payload_json is 'Raw provider payload for audit and replay.';

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'geo_city',
    'geo_neighborhood',
    'geo_address',
    'iam_profile',
    'iam_platform_role',
    'iam_platform_membership',
    'iam_platform_role_scope',
    'restaurant_team_role',
    'restaurant_team_membership',
    'restaurant_team_role_scope',
    'consumer_profile',
    'consumer_dietary_preference',
    'consumer_allergen_preference',
    'consumer_city_preference',
    'consumer_referral_code',
    'consumer_referral',
    'consumer_subscription_plan',
    'consumer_subscription',
    'consumer_passport_stat',
    'consumer_notification_preference',
    'privacy_consent_purpose',
    'privacy_retention_policy',
    'privacy_erasure_request',
    'restaurant_restaurant',
    'restaurant_compliance',
    'restaurant_contact',
    'restaurant_restaurant_cuisine',
    'restaurant_payout_account',
    'restaurant_commission_plan',
    'restaurant_commission_override',
    'restaurant_document',
    'restaurant_setting',
    'storage_object',
    'catalog_allergen',
    'restaurant_cuisine',
    'catalog_bag_template',
    'catalog_bag_template_revision',
    'catalog_bag_template_allergen',
    'catalog_bag_template_media',
    'drop_audience_segment',
    'drop_recurring_schedule',
    'drop_drop',
    'drop_drop_audience',
    'drop_drop_media',
    'drop_inventory_hold',
    'drop_closure_log',
    'core_idempotency_key',
    'order_order',
    'order_order_item',
    'payment_intent',
    'payment_transaction',
    'payment_refund',
    'finance_settlement_run',
    'review_review',
    'review_review_media',
    'support_ticket',
    'notification_template',
    'notification_outbox',
    'config_feature_flag',
    'config_runtime_setting',
    'admin_export_job',
    'admin_data_correction'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on %I for each row execute function private.set_updated_at()',
      target_table,
      target_table
    );
  end loop;
end $$;
```

## 6. Row Level Security design for Supabase

### Tables that use RLS

Enable RLS on all browser-adjacent tables:

- `iam_profile`
- `consumer_*`
- `restaurant_restaurant`
- `restaurant_team_membership`
- `restaurant_contact`
- `restaurant_setting`
- `catalog_bag_template*`
- `drop_*`
- `order_*`
- `review_*`
- `support_ticket*`
- `incident_*`
- `notification_outbox`
- `storage_object` for non-sensitive public assets only

Also enable RLS as defense in depth on:

- `payment_intent`
- `payment_transaction`
- `payment_refund`
- `payment_webhook_event`
- `finance_*`
- `restaurant_compliance`
- `restaurant_payout_account`
- `restaurant_document`
- `audit_log`
- `config_*`
- `analytics_event`
- `admin_*`

For these sensitive tables, RLS policies should grant access only to `service_role` and optionally a tightly controlled platform-admin path, but not general browser clients.

### Browser-readable tables

- `drop_active_public_view`
- `restaurant_restaurant` limited columns via view
- `review_review` published rows only
- own `iam_profile`
- own `consumer_*`
- own `order_*`
- restaurant-scoped operational rows for authorized team members

### Browser-writeable tables

- own `iam_profile`
- own `consumer_*` preferences
- own `consumer_saved_restaurant`
- `review_review` only for eligible collected orders
- `support_ticket`
- `order_pickup_verification_event` for authorized restaurant staff only

### Service-role only tables

- `restaurant_compliance`
- `restaurant_payout_account`
- `restaurant_document`
- `payment_*`
- `finance_*`
- `payment_webhook_event`
- `audit_log`
- `privacy_retention_policy`
- `admin_*`
- `config_*`
- raw `analytics_event` ingestion if server-originated

### Helper functions

```sql
create or replace function private.is_platform_admin(required_role text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from iam_platform_membership m
    join iam_platform_role r
      on r.iam_platform_role_pk = m.iam_platform_role_fk
    where m.iam_profile_fk = private.current_profile_pk()
      and m.is_active = true
      and (required_role is null or r.role_code = required_role)
  )
$$;

create or replace function private.has_restaurant_access(target_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from restaurant_team_membership tm
    where tm.restaurant_fk = target_restaurant
      and tm.iam_profile_fk = private.current_profile_pk()
      and tm.is_active = true
  )
$$;
```

### Example policies

```sql
alter table iam_profile enable row level security;
alter table consumer_profile enable row level security;
alter table consumer_saved_restaurant enable row level security;
alter table order_order enable row level security;
alter table review_review enable row level security;
alter table restaurant_restaurant enable row level security;
alter table drop_drop enable row level security;
alter table restaurant_team_membership enable row level security;
alter table order_pickup_verification_event enable row level security;

create policy select_own_iam_profile
on iam_profile
for select
to authenticated
using (iam_profile_pk = private.current_profile_pk());

create policy update_own_iam_profile
on iam_profile
for update
to authenticated
using (iam_profile_pk = private.current_profile_pk())
with check (iam_profile_pk = private.current_profile_pk());

create policy select_own_consumer_profile
on consumer_profile
for select
to authenticated
using (
  iam_profile_fk = private.current_profile_pk()
);

create policy upsert_own_saved_restaurants
on consumer_saved_restaurant
for all
to authenticated
using (
  consumer_profile_fk in (
    select consumer_profile_pk
    from consumer_profile
    where iam_profile_fk = private.current_profile_pk()
  )
)
with check (
  consumer_profile_fk in (
    select consumer_profile_pk
    from consumer_profile
    where iam_profile_fk = private.current_profile_pk()
  )
);

create policy select_own_orders
on order_order
for select
to authenticated
using (
  consumer_profile_fk in (
    select consumer_profile_pk
    from consumer_profile
    where iam_profile_fk = private.current_profile_pk()
  )
);

create policy restaurant_team_select_orders
on order_order
for select
to authenticated
using (private.has_restaurant_access(restaurant_fk));

create policy restaurant_team_select_drop
on drop_drop
for select
to authenticated
using (
  drop_status in ('ACTIVE', 'SCHEDULED')
  or private.has_restaurant_access(restaurant_fk)
);

create policy restaurant_team_manage_drop
on drop_drop
for all
to authenticated
using (private.has_restaurant_access(restaurant_fk))
with check (private.has_restaurant_access(restaurant_fk));

create policy restaurant_team_select_membership
on restaurant_team_membership
for select
to authenticated
using (private.has_restaurant_access(restaurant_fk));

create policy restaurant_pickup_staff_insert_verification
on order_pickup_verification_event
for insert
to authenticated
with check (
  verified_by_profile_fk = private.current_profile_pk()
  and exists (
    select 1
    from order_order o
    where o.order_order_pk = order_pickup_verification_event.order_fk
      and private.has_restaurant_access(o.restaurant_fk)
  )
);

create policy published_reviews_public_read
on review_review
for select
to anon, authenticated
using (review_status = 'PUBLISHED');
```

### Tables that must never be directly exposed to the browser

- `payment_webhook_event`
- `payment_transaction`
- `restaurant_payout_account`
- `restaurant_compliance`
- `restaurant_document`
- `finance_settlement_run`
- `finance_restaurant_payout_entry`
- `finance_invoice`
- `audit_log`
- `admin_data_correction`
- `privacy_retention_policy`

## 7. Database invariants

### Enforce directly in SQL

- `pickup_end_at > pickup_start_at`.
- `quantity_total > 0`.
- `quantity_reserved + quantity_sold <= quantity_total`.
- `hold_quantity > 0`.
- `expires_at > created_at` for holds.
- `total_paise = subtotal_paise - discount_paise + platform_fee_paise + tax_paise`.
- `line_total_paise = quantity * unit_price_paise`.
- one review per order.
- one saved-restaurant row per consumer/restaurant pair.
- one consumer city preference row per city, at most one default.
- one active subscription per consumer per plan.
- referral cannot self-refer.
- one active restaurant payout account per restaurant.
- one primary contact per restaurant and contact type.
- unique external provider identifiers where present.
- documents must reference a real `storage_object`.
- inventory events and pickup verification events are append-only.

### Enforce in triggers or stored procedures

- `drop_inventory_hold` creation must lock `drop_drop` and increment `quantity_reserved` atomically.
- converting a hold into a paid order must decrement reserved quantity and increment sold quantity in one transaction.
- expiring or releasing a hold must decrement reserved quantity exactly once.
- `drop_status` should flip to `SOLD_OUT` when `quantity_available = 0`, and back to `ACTIVE` only through explicit admin restock.
- `review_review` insert must verify the source order is `COLLECTED`.
- order status transitions must follow the allowed transition graph.
- payment status transitions must follow the allowed transition graph.

### Enforce in transactional application logic

- check drop audience eligibility, including Swaad Club and insider segments.
- validate bag price guardrails from `config_runtime_setting`.
- ensure restaurant settlement lines are generated exactly once per financial event.
- verify Razorpay signatures before recording transaction success.
- control refund limits and partial-refund business rules.
- prevent team-role privilege escalation unless the acting user has the proper admin scope.
- execute privacy erasure as a coordinated workflow across auth, storage, notifications, and analytics systems.

## 8. Intentional exclusions for phase 2 or later

- corporate account hierarchy and employee budgets
- wallet / stored credit ledger
- full push-token device registry and mobile app install attribution
- attach-purchase / bounceback upsell order graph
- coupon engine and promotion combinatorics
- advanced campaign orchestration beyond transactional outbox
- warehouse-style aggregate tables and star schema
- machine-learning feature store
- live courier / delivery modeling, because launch is pickup only
- restaurant menu item normalization beneath the bag template layer
- end-user visible subscription entitlements beyond Swaad Club basics

## 9. Seed data suggestions for local / dev

- one `geo_city` row for `HYD` / Hyderabad, with neighborhoods such as Jubilee Hills, Banjara Hills, Gachibowli, Kondapur, Hitech City.
- `catalog_allergen` rows for `NUTS`, `DAIRY`, `GLUTEN`, `SHELLFISH`, `SOY`.
- `drop_audience_segment` rows for `ALL_USERS`, `SWAAD_CLUB`, `WHATSAPP_INSIDERS`, `RESTAURANT_FOLLOWERS`.
- `iam_platform_role` rows for `SUPER_ADMIN`, `SUPPORT_ADMIN`, `FINANCE_ADMIN`, `OPS_ADMIN`.
- `restaurant_team_role` rows for `OWNER`, `ADMIN`, `OPERATIONS`, `PICKUP_STAFF`, `FINANCE`.
- one `consumer_subscription_plan` row for `SWAAD_CLUB_MONTHLY`.
- one active premium restaurant with compliance and payout rows.
- one bag template for a veg chef-special bag and one non-veg slack-hour bag.
- one active drop with `quantity_total = 20`, one sold-out drop, one scheduled drop.
- one consumer with dietary and allergen preferences plus saved restaurants.
- one paid order in `READY_FOR_PICKUP`, one collected order with review, one refunded incident-linked order.
- one pending support ticket and one active food-safety incident.
- runtime settings for bag price min/max, default hold minutes, and spotlight pricing.
