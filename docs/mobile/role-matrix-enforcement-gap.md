# Role-Matrix Enforcement Gap — Slices 3 / 4 Deep-Dive

Audit date: 19 June 2026
Scope: how restaurant authorization works **today** in `restaurant-mgmt-web`, why the target role matrix is a security target (not current parity), and exactly what Slices 3 and 4 must build.
Companion: `mobile-parity-ledger.md` (defect **D2**), restaurant spec §2.

## 1. Bottom line

**The web portal performs no role-based authorization. It gates on active membership only.** Every active member of a restaurant — regardless of whether their `restaurant_team_role` is `OWNER`, `ADMIN`, `OPERATIONS`, `PICKUP_STAFF`, or `FINANCE` — can call every portal endpoint: publish drops, edit templates, edit the profile, submit onboarding, verify pickups. The `role_code` column exists, is populated, and even has a capability-scope mapping table, but **no handler reads it.**

This is exactly what the restaurant spec §2 warns: *"The web portal currently enforces active membership broadly but does not consistently gate by role."* The audit confirms it is not "inconsistent" — it is **absent**. The five-role matrix in the spec is a **mobile security target**, and any agent verifying "parity" against the live web app will see no role gating. **Do not copy web behavior here.** The contract tests in Slice 4 are the authority, not the web app.

## 2. Evidence (read from the checked-in code)

### 2.1 The only authorization helper — membership, not role

`apps/restaurant-mgmt-web/lib/portal-auth.ts:50`

```ts
export async function assertRestaurantAccess(restaurantPk, profilePk): Promise<boolean> {
  const { data } = await service
    .from("restaurant_team_membership")
    .select("restaurant_team_membership_pk")
    .eq("restaurant_fk", restaurantPk)
    .eq("iam_profile_fk", profilePk)
    .eq("is_active", true)        // <-- only filter. role_code never selected or compared.
    .limit(1).maybeSingle();
  return Boolean(data);
}
```

`getPortalActor()` (same file) resolves `iam_profile` from the cookie session and returns `{authUserId, profilePk, email, phone}` — **no roles, no memberships**.

### 2.2 The membership loaders also ignore role

`apps/restaurant-mgmt-web/lib/slice3.ts:19` (`loadDefaultRestaurant`) and `:49` (`loadActiveRestaurantsForProfile`) both query `restaurant_team_membership` with `.eq("is_active", true)` and select only restaurant fields — `restaurant_team_role_fk` is never joined or returned.

### 2.3 Handlers inherit the gap

- `app/api/portal/drops/route.ts` (POST): checks `getPortalActor` → `loadDefaultRestaurant` → restaurant `ACTIVE` status → `publishingEnabled` guardrail → quantity/time validation. **No role check.** A `PICKUP_STAFF` member can publish a drop.
- `app/api/portal/orders/[orderId]/pickup/verify/route.ts` (POST): `getPortalActor` → cross-tenant check via `loadActiveRestaurantsForProfile` (good — prevents wrong-restaurant) → canonical RPC. **No role check.** A `FINANCE` member can verify pickups.
- `app/api/portal/profile`, `onboarding`, `templates`, `restaurant/*`, `documents/*`: same pattern.

Tenant isolation (which restaurant) **is** enforced on order actions via `loadActiveRestaurantsForProfile`. Role isolation (which capability) is not enforced anywhere.

### 2.4 The capability data already exists and is unused

The schema seeds a full capability model that no runtime path consults:

- `restaurant_team_role` — 5 roles seeded (`supabase/migrations/20260502000000_slice2_restaurant_onboarding.sql:61`): `OWNER, ADMIN, OPERATIONS, PICKUP_STAFF, FINANCE`.
- `restaurant_team_role_scope` → `master_scope` — per-role capability scopes seeded in the same migration (`:73`–`:105`).
- Precedent for role-gated access already exists in **admin**: `supabase/migrations/20260529000000_slice8b_admin_ops_hardening.sql:111` uses `r.role_code = any(p_allowed_roles)`. The pattern is proven; it was simply never applied to the restaurant portal.

**Implication for Slice 4:** the centralized capability policy should be driven by `restaurant_team_role_scope`/`master_scope` rather than a hardcoded TypeScript matrix, so role/capability changes are data-driven and the mobile policy cannot silently diverge from the DB. If a hardcoded matrix is used for v1 speed, it must be contract-tested against the seeded scope rows.

## 3. Target matrix (restaurant spec §2) → endpoint enforcement

| Endpoint (mobile `/api/mobile/v1`) | OWNER | ADMIN | OPERATIONS | PICKUP_STAFF | FINANCE |
| --- | :-: | :-: | :-: | :-: | :-: |
| `auth/bootstrap` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET dashboard` | ✓ | ✓ | ✓ | limited queue | summary |
| `GET orders`, `pickup/verify`, `no-show` | ✓ | ✓ | ✓ | ✓ | read-only |
| `orders/:id/incidents` | ✓ | ✓ | ✓ | ✓ | — |
| `templates*`, `drops*` | ✓ | ✓ | ✓ | — | — |
| `onboarding`, `restaurant/basics`,`/location` | ✓ | ✓ | limited fields | — | — |
| `restaurant/compliance`, `documents/*` | ✓ | ✓ | upload if authorized | — | — |
| `GET reviews` | ✓ | ✓ | ✓ | — | — |
| `GET reports/roi` | ✓ | ✓ | ✓ | — | ✓ |
| `GET finance/*`, `invoices/:id` | ✓ | ✓ | — | — | ✓ |

"limited"/"summary"/"read-only" cells require payload-shaping, not just allow/deny — e.g. PICKUP_STAFF dashboard returns queue only; FINANCE dashboard returns the summary variant.

## 4. What Slice 3 must build (bearer foundation)

Slice 3 owns the *mechanism*; Slice 4 owns the *policy*.

1. **Bearer validation helper** (server-only): validate Supabase JWT, resolve `iam_profile`, request ID, app metadata. Replaces the cookie path (`createClient()` in `lib/supabase/server.ts`) for mobile without breaking web cookie handlers.
2. **Stable envelope** `{ok,data,requestId,serverTime}` / `{ok:false,error:{code,message,retryable,fieldErrors?},requestId}`.
3. **Authenticated `me` endpoint** per surface proving the helper resolves identity. Customer `me` may create/resolve consumer profile; restaurant `me` must **not** (see §5).
4. **Denial codes** wired into the envelope so Slice 4 can return them: `UNAUTHENTICATED(401)`, `ROLE_DENIED(403)`, `MEMBERSHIP_INACTIVE(403)`, `RESTAURANT_SUSPENDED(403)`, `RESTAURANT_SELECTION_REQUIRED(409)`, `ROLE_CHANGED(403)`, `APP_UPDATE_REQUIRED(426)`.
5. **Contract-test fixtures** under `packages/types/test-fixtures/mobile/` for valid/expired/malformed token, missing profile, ownership denial.

## 5. What Slice 4 must build (restaurant authorization + bootstrap)

1. **Split the bootstrap (fixes D1).** `apps/restaurant-mgmt-web/app/api/portal/bootstrap/route.ts:28` currently calls `api_bootstrap_consumer_profile`. The mobile `POST /auth/bootstrap` must resolve/create **only** the IAM identity for an existing restaurant actor and return: actor-safe identity, active `restaurant_team_membership[]` **with role codes**, restaurant status, onboarding summary. It must produce **no `consumer_profile` row**. Add a test asserting zero consumer rows after restaurant bootstrap.
2. **Resolve memberships + roles** in one place. Extend the membership loader to select `restaurant_team_role.role_code`. Return all active memberships (multi-restaurant) without cross-tenant leakage.
3. **Centralized capability policy.** A single `assertCapability(actor, restaurantPk, capability)` that:
   - revalidates active membership for the **selected** `restaurantPk` on every scoped call;
   - looks up the actor's role for that restaurant and checks the capability (ideally via `restaurant_team_role_scope`);
   - returns the precise denial code from §4.4.
4. **Require `restaurantPk` on scoped calls** and revalidate every request (supports the restaurant switcher; revoked membership denies immediately mid-session).
5. **First role-protected read endpoint** (e.g. `GET dashboard` or `GET orders`) wired through the policy, with the full contract-test matrix below.

### Required contract tests (Slice 4 authority — restaurant spec §10)

- Owner/Admin allowed on operational mutation; **Finance denied** on drops/pickup mutation; **Pickup staff denied** on templates/drops/finance.
- Cross-restaurant `restaurantPk` denied (`ROLE`/tenant).
- Revoked membership mid-session → immediate `MEMBERSHIP_INACTIVE`.
- Suspended restaurant → `RESTAURANT_SUSPENDED`, no data leak.
- Multi-membership actor: correct per-restaurant role resolution.
- Restaurant bootstrap produces **no** consumer-profile row.

## 6. Web-hardening boundary (explicit)

The same role policy **should** be extended to the web cookie handlers as a separate, explicitly-tested hardening change — but that is **optional and separately reviewed**, not part of the mobile slices. The mobile slices must not be represented as fixing web authorization. If web hardening is deferred, record that decision in the Slice 4 completion record. Until then, the web portal remains membership-only and the mobile BFF is the only role-correct surface.

## 7. Risks if this is gotten wrong

- **Silent under-enforcement:** an agent copies the membership-only pattern into the BFF → ships a restaurant app where pickup staff can publish drops or read finance. This is the single highest-severity drift in the whole program. Mandatory human authorization review after Slice 4 (per plan §2) exists for exactly this.
- **Over-enforcement breaking web:** an agent "fixes" `lib/portal-auth.ts` directly and breaks the cookie web portal. Keep mobile policy in the BFF/extracted service; do not retrofit web handlers under cover of a mobile slice.
- **Hardcoded matrix drift:** a TS matrix that disagrees with seeded `restaurant_team_role_scope`. Prefer data-driven; contract-test either way.
