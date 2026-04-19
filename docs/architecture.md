# goZaika Monorepo Architecture

## Topology

- `apps/website`: public launch website for discovery and partner intent.
- `packages/config`: shared constants and environment-safe defaults.
- `packages/db`: Supabase client factory for write-safe integrations.
- `packages/logger`: shared structured logger.
- `packages/utils`: shared UI/runtime helpers.
- `packages/types`: shared contract definitions.

## Deployment boundaries

- Website deploys independently to Vercel from `apps/website`.
- Other apps can be introduced under `apps/*` with independent Vercel projects.
- Shared packages are consumed through npm workspaces and transpiled by Next.js.

## Data boundary and security model

- Website writes only to lead-intake tables (`waitlist_leads`, `contact_submissions`, `partner_interests`).
- Row-level security is mandatory, with anonymous INSERT policy and authenticated SELECT policy.
- Secrets never enter client bundle; only `NEXT_PUBLIC_*` variables are browser-exposed.

## Conflict resolution log

Precedence used: Engineering Lock > Execution Briefing > Build Readiness > Website Spec > content package > nextjs website spec.

- **Forms backend conflict:** Engineering Lock says Resend-only V1; Execution Briefing upgrades to Supabase Day 1. Implemented Supabase + Resend using higher-priority Execution Briefing.
- **Route naming conflict:** lower specs used `/food-safety` and `/grievance`; canonical set is `/food-safety-policy` and `/grievance-redressal`. Canonical routes implemented with permanent redirects.
- **Placeholder social proof conflict:** lower spec had hard number claims; higher-priority docs prohibit fabricated metrics. Hardcoded social proof removed.
- **Testimonials conflict:** placeholders suggested in older docs; Build Readiness/Execution Briefing says remove in V1. Testimonials section omitted.
