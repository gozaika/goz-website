# Mobile App Identity Migration Runbook

Owner: Mobile Slice 1
Date: 19 June 2026
Status: code identities migrated; external store/EAS actions **pending authorization**

This records the permanent identity change for the two goZaika mobile apps and the manual, irreversible external steps that remain. Store identities **cannot be renamed in place** after publication — treat the values below as final.

## 1. Identity changes (applied in code)

| Field | Customer — before | Customer — after | Restaurant — before | Restaurant — after |
| --- | --- | --- | --- | --- |
| Directory | `apps/consumer-mobile` | _unchanged_ | `apps/restaurant-staff-mobile` | `apps/restaurant-mobile` |
| Workspace package | `@gozaika/consumer-mobile` | _unchanged_ | `@gozaika/restaurant-staff-mobile` | `@gozaika/restaurant-mobile` |
| Store name | `goZaika` | _unchanged_ | `goZaika Staff` | `goZaika Partner` |
| Expo slug | `gozaika-consumer` | `gozaika-customer` | `gozaika-staff` | `gozaika-restaurant` |
| URL scheme | `gozaika` | _unchanged_ | `gozaika-staff` | `gozaika-restaurant` |
| Android applicationId | `com.orbitwell.gozaikaconsumer` | `in.gozaika.customer` | `com.orbitwell.gozaikastaff` | `in.gozaika.restaurant` |
| Apple bundle ID | _(none set)_ | `in.gozaika.customer` | _(none set)_ | `in.gozaika.restaurant` |
| Tablet support | phone only | phone only (`supportsTablet:false`) | phone only | phones + tablets (`supportsTablet:true`, `orientation:default`) |
| Universal/App Link host | — | `customer.gozaika.in` (declared in Slice 16) | — | `restaurant.gozaika.in` (declared in Slice 16) |

The directory move used `git mv` so history is preserved (verify with `git log --follow apps/restaurant-mobile/app.json`).

## 2. Orbitwell removal

- Removed `com.orbitwell.gozaikaconsumer` and `com.orbitwell.gozaikastaff` from `app.json`.
- Repo search confirms no active `orbitwell`, `gozaika-staff`, `gozaikastaff`, `goZaika Staff`, or `restaurant-staff-mobile` references inside `apps/consumer-mobile` or `apps/restaurant-mobile`. Remaining hits exist only in historical records (`docs/product/ux-audit-production-polish.md`, `docs/implementation-plan.md`) and these spec/runbook documents — intentional migration history.

## 3. EAS project IDs — REMOVED, recreation pending

The old Orbitwell-era `extra.eas.projectId` values were **removed** from both `app.json` files (not replaced):

- Customer old projectId: `3c14ae81-39e4-4c01-9214-7a15eb6f9a34`
- Restaurant old projectId: `25d52d62-cc07-4e55-bba8-3c8e7c9a25e8`

**Pending manual step (requires goZaika Expo org authorization):** run `eas init` in each app under the goZaika Expo organization to create new projects, then add the new `extra.eas.projectId` and an explicit `owner` (the confirmed org slug). Do **not** reuse the Orbitwell project IDs. This was intentionally left undone in Slice 1 because creating external EAS/store records requires account authorization (shared spec §2, plan Slice 1 scope).

## 4. Signing & store listing disposition

- No signing certificates created yet. Slice 18 produces goZaika-owned signing (Apple Distribution cert + APNs key; Google Play App Signing + upload key). Fingerprints to be recorded here when generated.
- If either old Android applicationId (`com.orbitwell.*`) was ever published, it **cannot** be renamed — a new Play listing under `in.gozaika.*` is required and the old listing unpublished/migrated. As of this runbook no goZaika store listing exists.

## 5. Deep links / redirects

- Custom schemes are now `gozaika` (customer) and `gozaika-restaurant` (restaurant). Any OAuth redirect URIs and Supabase allow-listed redirects must use these schemes.
- Universal/App Links (`customer.gozaika.in`, `restaurant.gozaika.in`) and their domain-association files are wired in Slice 16, not here.

## 6. Expo Router + monorepo build note (important)

Both apps migrated from a single `App.tsx` (`registerRootComponent`) to **Expo Router** (`main: "expo-router/entry"`, file-based `app/` tree).

Monorepo gotcha discovered and worked around in Slice 1: `babel-preset-expo` and `@expo/metro-config` hoist to the workspace root, but `expo-router` stays app-local, so the preset's `hasModule('expo-router')` gate fails and the router transform (`require.context` / `EXPO_ROUTER_APP_ROOT` inlining) is skipped — bundling fails with *"Invalid call … process.env.EXPO_ROUTER_APP_ROOT"*. Fixes applied in each app:

- `babel.config.js` adds the router plugin explicitly: `require("babel-preset-expo/build/expo-router-plugin").expoRouterBabelPlugin`.
- `metro.config.js` sets `config.transformer.unstable_allowRequireContext = true`.

**Revisit both on any Expo SDK upgrade** — if a future SDK hoists consistently or fixes detection, these can be removed. This is the reason the shared spec mandates SDK upgrades go through an explicit compatibility PR.

## 7. Rollback limits

- Code identity changes (directory, package, app.json) are git-revertible on this branch.
- **Not revertible once external actions occur:** published store applicationId/bundleId, EAS project creation, signing certificates. None have been performed yet, so Slice 1 is fully reversible today.

## 8. Verification performed (Slice 1)

- `npm install` resolves both apps; `expo install` pinned `expo-router@~55.0.16` + peers (safe-area-context, screens, expo-linking, expo-constants) for SDK 55.
- `tsc --noEmit` passes in both apps.
- `npx expo export -p ios` bundles successfully for **both** apps — the full route tree compiles and every import resolves (3.2 MB Hermes bundle each).
- Device/simulator navigation of every placeholder route is **pending** (no simulator in the build environment) — run `npm --workspace @gozaika/<app> run dev` and confirm each tab/detail/modal route renders its placeholder.
