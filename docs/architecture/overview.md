# goZaika Architecture Overview

goZaika is a premium-access, pickup-only BAM Bag marketplace for India. The platform is built as an RLS-first Supabase system with Next.js web surfaces, Expo mobile apps, Edge Functions for trusted integrations, and shared TypeScript packages for contracts, security-sensitive helpers, and UI primitives.

## Source Inputs Reviewed

- Live website: `https://goz-website-one.vercel.app/`
- Product and technology specification: `C:\venkat\limca\gozaika\goZaika_Technology_Specification_v2.docx`
- Canonical DDL: `C:\venkat\limca\gozaika\website\dbschema\gozaika_consolidated_schema.sql`

The SQL DDL is treated as the database contract. Comments in the DDL define state machines, surface ownership, RLS posture, append-only semantics, and safety-critical disclosure rules.

## System Surfaces

| Surface | Path | Runtime | Purpose |
| --- | --- | --- | --- |
| Consumer web | `apps/consumer-web` | Next.js App Router | Discovery, claim, checkout, account, Swaad Club |
| Restaurant portal | `apps/restaurant-mgmt-web` | Next.js App Router | Zayka Pro templates, drops, orders, finance, team |
| Admin portal | `apps/admin-web` | Next.js App Router | Internal operations, config, support, finance, audits |
| Consumer mobile | `apps/consumer-mobile` | Expo React Native | Drop alerts, claim, QR, orders, profile |
| Staff mobile | `apps/restaurant-staff-mobile` | Expo React Native | Counter pickup verification and incident reporting |
| Marketing site | `apps/website` | Existing Next app | Current public launch website |

## Trust Boundaries

- Browser and mobile clients use only Supabase anon/authenticated clients.
- Service-role keys are isolated to server-only Next route handlers, Supabase Edge Functions, and server packages.
- Razorpay payment success is accepted only after signature-verified webhook handling.
- Inventory claims call the canonical `api_create_inventory_hold` RPC.
- Payment, pickup, consent, audit, notification, and ledger events are append-only where the DDL requires it.
- DPDP consent is represented as purpose-scoped events, never as a single mutable boolean.

## Shared Packages

- `packages/types`: Zod schemas, status constants, request/response DTOs.
- `packages/utils`: paise money helpers, pickup window formatting, idempotency, QR payload helpers, safe errors.
- `packages/supabase`: browser/server/service-role client factories, auth and storage helpers, Edge shared utilities.
- `packages/db`: Prisma schema, server-only repository boundaries, migration notes.
- `packages/ui`: design tokens and reusable web components.
- `packages/config`: shared tsconfig, Tailwind preset, environment names.

## Slice 0 Scope

Slice 0 creates the monorepo foundation, copies the canonical SQL into Supabase migrations, adds typed shared packages, creates app shells, and scaffolds Edge Functions with security-first placeholders. Production credentials, webhook endpoints, and legal/privacy reviews are intentionally marked with `TODO/HUMAN_REVIEW`.

