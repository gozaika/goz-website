# goZaika Database Schema Review and Consolidated Recommendation

Prepared as a principal staff engineer / database architect review of the website, technology specification, schema style guide, Team A artefacts, and Team B artefacts.

## 1. Business model and product intent captured

goZaika is not a generic restaurant marketplace, discount coupon app, or delivery platform. The product intent is a premium, pickup-only, time-windowed discovery marketplace for curated “BAM Bags” released by restaurants as drops. Consumers discover city- and neighborhood-scoped drops, claim inventory, pay online, and pick up directly from the restaurant counter. The database therefore has to optimize for scarcity, trust, live availability, pickup verification, allergen disclosure, payments, settlement, and auditability.

The schema must support five primary surfaces:

1. **Consumer web/PWA and mobile app** — city-scoped drop feed, real-time availability, claim/checkout, QR/OTP pickup, order history, saved restaurants, preferences, consent, referrals, reviews, Swaad Club, and Zayka Passport.
2. **Restaurant staff app** — intentionally narrow pickup-counter workflow: live queue, QR scan, OTP fallback, mark collected, handle offline/retry/idempotency paths.
3. **Zayka Pro restaurant portal** — restaurant-scoped drop management, bag templates, media, compliance, finance, invoices, team management, and analytics.
4. **Admin portal** — platform operations, onboarding, incident/support, refunds, settlements, CMS, configuration, privacy/erasure, audit.
5. **Background/Edge jobs** — Razorpay webhooks, expired-hold cleanup, notification outbox, settlement runs, exports, retention workflows, analytics ingestion.

The database design intent is therefore **RLS-first, event/audit-led, inventory-safe, payment-webhook-safe, and privacy-by-design**.

## 2. Source assessment

### Team A

Team A’s architecture document was directionally strong. It correctly emphasized:

- bounded contexts aligned to product surfaces,
- UUID keys,
- paise-denominated money,
- append-only ledgers and consent events,
- snapshot order history,
- public discovery read models,
- RLS as the security foundation,
- separation of service-role-only workflows.

Weaknesses:

- the SQL artefact was much thinner than the architecture document;
- some schema depth required by the product specification was missing;
- public/read-model guidance was mostly architectural rather than implemented;
- operational APIs and middleware guidance needed stronger database-level idempotency and concurrency backing.

### Team B

Team B’s schema was the stronger implementation base. It contained broad bounded-context coverage, extensive comments, Supabase-oriented conventions, append-only triggers, partitioned analytics events, payment/webhook tables, notification outbox, CMS, support/incident, finance, privacy/consent, and seed data.

Strengths:

- much more complete table coverage;
- good naming consistency and explicit constraints;
- strong documentation via `COMMENT ON TABLE` / `COMMENT ON COLUMN`;
- correct use of UUIDs, `timestamptz`, paise amounts, text status codes with checks, and master/reference tables;
- good start on append-only event tables and denormalized `COMPUTED_` columns;
- inclusion of `consumer_saved_restaurant`, storage abstraction, analytics partitioning, support/incident, CMS, finance, and legal/privacy support.

Critical gaps found:

1. **RLS was incomplete.** The file claimed broad business-table RLS but enabled it only on a subset. Public/reference/CMS/media/storage/restaurant/catalog surfaces were not consistently protected by policies.
2. **Restaurant portal policy coverage was incomplete.** Team members could manage `drop_drop`, but many related portal tables were missing restaurant-scoped policies: templates, revisions, allergens, media, profile, contact, documents, order items, order transitions, finance views, etc.
3. **Consumer bootstrap/privacy policies were incomplete.** Insert/select coverage for profile creation, consent events, and erasure requests needed hardening.
4. **Hot-path inventory concurrency was under-specified at the database layer.** API docs specified hold + confirm behavior, but the schema did not provide a safe atomic claim primitive. This leaves too much room for oversell if API code is implemented inconsistently.
5. **Idempotency columns were missing in several retry-sensitive paths.** Holds, pickup verification, refunds, support tickets, and export jobs need idempotency keys or request keys.
6. **Foreign key indexes were incomplete.** A static pass found 65 FK relationships not covered by a left-prefix index; this is risky for parent deletes/updates and common joins.
7. **One trigger function had a DELETE-time defect.** `COMPUTED_refresh_restaurant_counts()` referenced `NEW` in a DELETE trigger path. In PostgreSQL, DELETE triggers do not have a usable `NEW` record, so that path needed correction.
8. **Public discovery needed safer shapes.** Base tables contain operational columns that should not be the primary public API. Public read-model views are a cleaner contract.

## 3. Consolidated schema direction

The consolidated script uses Team B as the base and incorporates the best Team A design ideas plus review corrections.

### 3.1 What was kept from Team B

- full bounded-context table model;
- UUID primary keys and explicit FK/check/unique constraints;
- `citext`, `pgcrypto`, `timestamptz`, paise amounts;
- master/reference data pattern;
- CMS/legal policy pages;
- support/incident domains;
- payment and finance service-role domains;
- notification outbox pattern;
- append-only triggers for ledgers/events/audit;
- analytics partitioned parent table and seed data;
- extensive object comments for AI and application teams.

### 3.2 What was strengthened from Team A and the review

The final script adds or changes:

- `holding_guidance_text` on bag template revisions for explicit food-safety handling guidance;
- idempotency fields and unique indexes for:
  - `drop_inventory_hold.idempotency_key`,
  - `order_pickup_verification_event.idempotency_key`,
  - `payment_refund.idempotency_key`,
  - `support_ticket.requester_idempotency_key`,
  - `admin_export_job.idempotency_key`;
- complete RLS enablement across all application tables;
- public/reference policies for active master and geo data;
- public policies for storage, restaurant public profiles, drop media/audience, catalog media/allergens/revisions, review media, CMS, and public lead capture;
- consumer self-insert/select policies for profile, consent, and erasure workflows;
- restaurant-scoped policies across templates, revisions, allergens, media, profile/contact/document/payout/onboarding, order items/status transitions, drop events, closure logs, finance invoices and payout entries;
- dynamic platform-admin policy for authenticated platform admins;
- `api_create_inventory_hold()` RPC for atomic consumer hold creation;
- `api_release_expired_inventory_holds()` RPC for cron/service cleanup of expired holds;
- public and authenticated read-model views:
  - `api_public_drop_card`,
  - `api_public_restaurant_profile`,
  - `api_consumer_order_history`,
  - `api_restaurant_pickup_queue`;
- 65 generated FK indexes for missing FK left-prefix coverage;
- correction of the DELETE trigger defect in `COMPUTED_refresh_restaurant_counts()`.

## 4. Final architectural verdict

**Use the consolidated v4 script as the new baseline.** It is materially better than either team’s standalone artefact.

Team B was the stronger schema base. Team A contributed important architectural intent around read models, security posture, and operational flows. The consolidated script preserves Team B’s completeness while correcting RLS, retry/idempotency, FK-indexing, trigger correctness, and public/read-model gaps.

## 5. Database principles for implementation teams

1. **The database is the source of truth for inventory.** Claim/hold paths must use the database RPC or an equivalent single-transaction row-locking pattern.
2. **Razorpay webhooks must persist first, process second.** Never mutate order/payment state before the raw webhook event is stored and signature-verified.
3. **Orders must snapshot purchase-time facts.** Restaurant name, bag title, pickup window, allergens, price, and dietary claims must be copied to order tables and never depend only on mutable catalog rows.
4. **Append-only means append-only.** Do not update/delete consent, webhook, inventory, order transition, pickup verification, billing, support event, incident event, analytics event, or audit rows.
5. **RLS is the default security boundary.** API middleware can add defense-in-depth but must not be the only isolation layer.
6. **Public clients should prefer read-model views.** Views provide stable, safe shapes and avoid leaking operational columns from base tables.
7. **Do not use floats for money.** Continue with paise `bigint` only.
8. **Use service role only for service workflows.** Payment/finance/settlement/export/privacy-retention jobs should run through verified Edge Functions or backend jobs, not browser clients.

## 6. Remaining implementation notes

The consolidated SQL was statically reviewed and generated in this workspace. It was not executed against a live Supabase/Postgres instance in this environment. Before production adoption, run it through:

1. `supabase db reset` in a clean local project;
2. `supabase db diff` / migration lint;
3. RLS tests for anon, authenticated consumer, restaurant staff, platform admin, and service role;
4. concurrent inventory-hold tests with at least 100 parallel claims against a low-quantity drop;
5. Razorpay webhook replay/idempotency tests;
6. pickup verification duplicate/offline retry tests;
7. PostgREST exposure checks to confirm public views are used where expected;
8. Prisma introspection to ensure generated names remain acceptable to the application layer.

## 7. Deliverables

- `gozaika_consolidated_schema_v4.sql` — final consolidated schema script.
- `gozaika_database_schema_review_final.md` — this review and decision record.