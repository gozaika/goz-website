# ADR 0001: npm Workspace, Next.js 16, Expo 55, Supabase

## Status

Accepted.

## Context

The existing `@gozaika/website` app is the canonical production website and already uses npm workspaces, `package-lock.json`, Next.js 16.2.4, React 19.2.4, ESLint 9 flat config, and Tailwind 4. Slice 0 must not disrupt that baseline.

## Decision

Use npm workspaces for Slice 0:

- `apps/*` for deployable surfaces.
- `packages/*` for shared code and contracts.
- `supabase/migrations` for canonical SQL.
- `supabase/functions` for webhooks and scheduled workers.

New web apps use the same major framework stack as `apps/website`. Mobile apps use Expo SDK 55, with native dependencies installed through Expo's installer.

## Consequences

- The production website remains compatible with the existing lockfile and deployment posture.
- CI runs through npm workspace scripts without interactive prompts.
- pnpm migration is deferred to a dedicated future slice.
- Web app configuration stays consistent: ESLint CLI with flat config, Tailwind 4 PostCSS, and no `next lint`.
