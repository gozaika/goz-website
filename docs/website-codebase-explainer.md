# goZaika Website Codebase Explainer

## What this phase delivers

- Launches only `apps/website` while keeping a monorepo foundation for `customer`, `restaurant`, and `goZaikaAdmin`.
- Uses App Router with strict TypeScript and locked design/security rules from engineering authority documents.
- Implements canonical routes, redirects, legal surfaces, and lead capture APIs with anti-abuse layers.

## Runtime flow

- Public pages render as server components with metadata on every route.
- Forms run in client components and submit to typed route handlers under `app/api/*/route.ts`.
- API routes enforce this order: rate-limit -> Turnstile verify -> validate -> sanitize -> persist -> notify.
- Supabase stores lead data with RLS; Resend sends operational notifications to configured aliases.

## Shared package boundaries

- `packages/config`: brand and platform constants.
- `packages/types`: route and API contracts.
- `packages/utils`: utility helpers like `cn()`.
- `packages/logger`: structured logging API.
- `packages/db`: shared Supabase client factory.

## Why this structure supports future apps

- Future apps can consume shared packages without duplicating business rules.
- CI and environment management remain centralized from day one.
- Deployment remains independent per app (`apps/website` now, additional apps later).
