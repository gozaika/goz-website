# Mobile Slice 12 — Unfinished Parts (resume notes)

Slice 12's **profile vertical is done and on main** (read + basics/location/story
edit, geo-options; role-gated by `viewDashboard`/`manageProfile`; live-proven). Two
parts remain. This doc is the resume brief.

## Done (on main)
- `GET /api/mobile/v1/restaurant/profile` — basics + location + compliance *summary*
  (status + presence flags only; no raw FSSAI/GSTIN/PAN). `canEditBasics` flag.
- `PATCH /api/mobile/v1/restaurant/basics` — name/slug/legal/contacts/pickup + geo
  (city/neighborhood) + public headline/story (`restaurant_public_profile` upsert).
- `GET /api/mobile/v1/restaurant/geo-options` — active cities/neighborhoods.
- Native `app/profile.tsx`: view + role-gated edit with modal location pickers.
- Contracts `packages/types/src/mobile/profile.ts` + fixture + test.

## Remainder A — Restaurant onboarding wizard (net-new restaurants)
Lower priority for the pilot (existing restaurants are already onboarded).
- Web reference: `apps/restaurant-mgmt-web/app/api/portal/onboarding/route.ts`
  (`POST` → RPC `api_create_or_get_restaurant_onboarding`; `GET` aggregates a full
  summary incl. `restaurant_onboarding_task`).
- Build: `POST /api/mobile/v1/restaurant/onboarding` (create/resume) + a native
  multi-step wizard (name/slug → contacts → location → submit). Actor has **no**
  membership yet, so it cannot use `withMobileRestaurantRole`; gate with
  `withMobileAuth` + the bootstrap pattern, and bind the new membership on create.
- Canonical request schema: `restaurantOnboardingCreateSchema` (already in @gozaika/types).

## Remainder B — Compliance edit + document upload (SECURITY-SENSITIVE)
Treat closer to the Slice 7/9 review bar — it writes to the **private-documents**
storage bucket and persists regulated identifiers.
- Web reference: `app/api/portal/restaurant/compliance/route.ts` (FSSAI/GSTIN/PAN +
  expiry; `restaurant_compliance`) and `app/api/portal/documents/*` (uploads via the
  `private-documents` bucket → `restaurant_document` + `master_document_type`/`_status`).
- Build: `PATCH /api/mobile/v1/restaurant/compliance` (role `manageCompliance`,
  OWNER/ADMIN) writing the regulated numbers server-side only; document upload via a
  **server-issued signed upload URL** (never expose the service role / bucket to the
  client), then register `restaurant_document`. Mobile picks files via
  `expo-document-picker`/`expo-image-picker` (not yet installed).
- Security must-dos: private bucket stays private (no public URL); signed URLs are
  short-lived and per-document; raw numbers are never returned to the client (the
  profile read already exposes only presence flags); validate type/size server-side.
- Recommend a human security review before merge (like the counter slice).

## Reproduce / verify the done parts
- Gate: `node scripts/mobile-ci.mjs` → 7/7.
- Live: start BFF on :3001 against local Supabase; OWNER (`+919876520001`/`200001`)
  sees `canEditBasics:true` and can PATCH location/story; PICKUP_STAFF
  (`+919876530003`/`300003`) sees `canEditBasics:false` and PATCH → `403 ROLE_DENIED`.
