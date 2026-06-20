import type { RestaurantStatusCode, RestaurantTeamRoleCode } from "../index";
import type { MobileErrorCode } from "./envelope";

/**
 * Centralized restaurant capability policy (restaurant spec §2 / Slice 4),
 * now **data-driven**: the single source of truth is the scope model below
 * (`CAPABILITY_SCOPE` + `ROLE_SCOPE_SEED`), which mirrors the `master_scope`
 * registry and the `restaurant_team_role_scope` seed in
 * `supabase/migrations/.../slice4_role_scope_reconcile.sql`. `decideRestaurantAccess`
 * resolves a role's scope set (from the DB at the request boundary, or this seed
 * as the default) and checks the capability's required scope. `CAPABILITY_ROLES`
 * is **derived** from the seed so the matrix can't drift from the scopes.
 *
 * Mobile TARGET state — the web portal stays membership-only (defect D2, deferred;
 * see docs/mobile/role-matrix-enforcement-gap.md §6).
 */
export type RestaurantCapability =
  | "viewDashboard"
  | "viewOrders"
  | "verifyPickup"
  | "manageIncidents"
  | "manageDrops"
  | "manageTemplates"
  | "manageProfile"
  | "manageCompliance"
  | "viewReviews"
  | "viewReports"
  | "viewFinance";

const ROLE_CODES: readonly RestaurantTeamRoleCode[] = ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF", "FINANCE"];

/** master_scope.scope_code each capability requires (RESTAURANT-scoped). */
export const CAPABILITY_SCOPE: Readonly<Record<RestaurantCapability, string>> = {
  viewDashboard: "DASHBOARD_VIEW",
  viewOrders: "ORDER_VIEW",
  verifyPickup: "ORDER_VERIFY_PICKUP",
  manageIncidents: "INCIDENT_MANAGE",
  manageDrops: "DROP_CREATE",
  manageTemplates: "CATALOG_MANAGE",
  manageProfile: "SETTINGS_MANAGE",
  manageCompliance: "COMPLIANCE_MANAGE",
  viewReviews: "REVIEW_VIEW",
  viewReports: "REPORTS_VIEW",
  viewFinance: "FINANCE_VIEW",
};

/** Scopes added/used by the mobile capability policy (must exist in master_scope). */
export const RESTAURANT_CAPABILITY_SCOPES: readonly string[] = Array.from(new Set(Object.values(CAPABILITY_SCOPE)));

/**
 * Canonical role → scope grant. The migration seeds `restaurant_team_role_scope`
 * to exactly this; a contract test asserts the derived matrix equals the reviewed
 * matrix, and the local smoke asserts the DB rows equal this seed.
 */
export const ROLE_SCOPE_SEED: Readonly<Record<RestaurantTeamRoleCode, readonly string[]>> = {
  OWNER: [
    "DASHBOARD_VIEW", "ORDER_VIEW", "ORDER_VERIFY_PICKUP", "INCIDENT_MANAGE", "DROP_CREATE",
    "CATALOG_MANAGE", "SETTINGS_MANAGE", "COMPLIANCE_MANAGE", "REVIEW_VIEW", "REPORTS_VIEW", "FINANCE_VIEW",
  ],
  ADMIN: [
    "DASHBOARD_VIEW", "ORDER_VIEW", "ORDER_VERIFY_PICKUP", "INCIDENT_MANAGE", "DROP_CREATE",
    "CATALOG_MANAGE", "SETTINGS_MANAGE", "COMPLIANCE_MANAGE", "REVIEW_VIEW", "REPORTS_VIEW", "FINANCE_VIEW",
  ],
  OPERATIONS: [
    "DASHBOARD_VIEW", "ORDER_VIEW", "ORDER_VERIFY_PICKUP", "INCIDENT_MANAGE", "DROP_CREATE",
    "CATALOG_MANAGE", "REVIEW_VIEW", "REPORTS_VIEW",
  ],
  PICKUP_STAFF: ["DASHBOARD_VIEW", "ORDER_VIEW", "ORDER_VERIFY_PICKUP", "INCIDENT_MANAGE"],
  FINANCE: ["DASHBOARD_VIEW", "ORDER_VIEW", "FINANCE_VIEW", "REPORTS_VIEW"],
};

export type RoleScopeMap = ReadonlyMap<RestaurantTeamRoleCode, ReadonlySet<string>>;

/** Build the default (seed-backed) role→scopes map used when no DB map is supplied. */
export function defaultRoleScopes(): RoleScopeMap {
  return new Map(ROLE_CODES.map((role) => [role, new Set(ROLE_SCOPE_SEED[role])]));
}

const DEFAULT_ROLE_SCOPES = defaultRoleScopes();

/** Whether a resolved scope set grants a capability. */
export function scopesHaveCapability(scopes: ReadonlySet<string>, capability: RestaurantCapability): boolean {
  return scopes.has(CAPABILITY_SCOPE[capability]);
}

/** Whether a role holds a capability under the given (or default seed) scope map. */
export function roleHasCapability(
  role: RestaurantTeamRoleCode,
  capability: RestaurantCapability,
  roleScopes: RoleScopeMap = DEFAULT_ROLE_SCOPES,
): boolean {
  const scopes = roleScopes.get(role);
  return scopes ? scopesHaveCapability(scopes, capability) : false;
}

/** Roles holding each capability — **derived** from the scope seed (display/tests). */
export const CAPABILITY_ROLES: Readonly<Record<RestaurantCapability, readonly RestaurantTeamRoleCode[]>> =
  Object.fromEntries(
    (Object.keys(CAPABILITY_SCOPE) as RestaurantCapability[]).map((cap) => [
      cap,
      ROLE_CODES.filter((role) => ROLE_SCOPE_SEED[role].includes(CAPABILITY_SCOPE[cap])),
    ]),
  ) as unknown as Record<RestaurantCapability, readonly RestaurantTeamRoleCode[]>;

const BLOCKED_STATUSES: ReadonlySet<string> = new Set<RestaurantStatusCode>(["SUSPENDED", "OFFBOARDED"]);

export interface MembershipView {
  readonly restaurantPk: string;
  readonly roleCode: RestaurantTeamRoleCode;
  readonly restaurantStatusCode: RestaurantStatusCode | string;
  readonly isActive: boolean;
}

export type AccessDecision =
  | { readonly ok: true; readonly membership: MembershipView }
  | { readonly ok: false; readonly code: MobileErrorCode; readonly message: string };

/**
 * Decide whether an actor may exercise `capability` on a selected restaurant.
 * Pure. Order: select → membership → active → status → role (capability via scopes).
 * `roleScopes` defaults to the seed; the request wrapper passes the DB-resolved map.
 */
export function decideRestaurantAccess(params: {
  readonly memberships: readonly MembershipView[];
  readonly restaurantPk: string | null;
  readonly capability: RestaurantCapability;
  readonly roleScopes?: RoleScopeMap;
}): AccessDecision {
  const { memberships, capability } = params;
  const roleScopes = params.roleScopes ?? DEFAULT_ROLE_SCOPES;

  const target = params.restaurantPk ?? (memberships.length === 1 ? memberships[0]?.restaurantPk ?? null : null);
  if (!target) {
    return { ok: false, code: "RESTAURANT_SELECTION_REQUIRED", message: "Select a restaurant to continue." };
  }

  const membership = memberships.find((m) => m.restaurantPk === target);
  if (!membership) {
    return { ok: false, code: "FORBIDDEN", message: "You do not have access to this restaurant." };
  }
  if (!membership.isActive) {
    return { ok: false, code: "MEMBERSHIP_INACTIVE", message: "Your access to this restaurant is inactive." };
  }
  if (BLOCKED_STATUSES.has(membership.restaurantStatusCode)) {
    return { ok: false, code: "RESTAURANT_SUSPENDED", message: "This restaurant is not currently active." };
  }
  if (!roleHasCapability(membership.roleCode, capability, roleScopes)) {
    return { ok: false, code: "ROLE_DENIED", message: "Your role does not permit this action." };
  }

  return { ok: true, membership };
}
