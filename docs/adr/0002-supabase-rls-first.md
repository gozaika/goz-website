# ADR 0002: Supabase RLS-First Tenancy

## Status

Accepted.

## Context

The canonical DDL defines RLS helper functions, RLS policies, append-only ledgers, public API read-model views, and inventory RPCs. Tenancy and safety rules are part of the database contract, not optional application documentation.

## Decision

Use Supabase RLS as the primary tenancy boundary:

- Public discovery reads use safe views such as `api_public_drop_card` and `api_public_restaurant_profile`.
- Consumer self-service reads use authenticated anon clients and RLS.
- Restaurant portal reads/writes use authenticated clients plus server-side validation where required.
- Admin, finance, payment webhook, settlement, export, erasure, and data correction flows run server-side with service-role access.
- Inventory holds use `api_create_inventory_hold`; expired holds use `api_release_expired_inventory_holds`.

## Consequences

- App code must adapt to the DDL instead of reshaping the schema casually.
- Service-role clients are isolated in server-only modules and Edge Functions.
- Tests must cover permission helpers and security-critical state transitions.
- Any future migration must be additive and documented.

