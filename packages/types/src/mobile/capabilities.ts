import type { RestaurantStatusCode, RestaurantTeamRoleCode } from "../index";
import type { MobileErrorCode } from "./envelope";

/**
 * Centralized restaurant capability policy (restaurant spec §2 / Slice 4).
 *
 * This is the mobile **target** authorization state — the web portal currently
 * gates on active membership only and does NOT check role (see
 * docs/mobile/role-matrix-enforcement-gap.md). It is pure and exhaustively unit
 * tested so the matrix can't silently weaken. A later slice may drive it from
 * `restaurant_team_role_scope` rows; until then this is contract-tested target state.
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

const ALL: readonly RestaurantTeamRoleCode[] = ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF", "FINANCE"];
const OPERATIONAL: readonly RestaurantTeamRoleCode[] = ["OWNER", "ADMIN", "OPERATIONS"];
const COUNTER: readonly RestaurantTeamRoleCode[] = ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF"];
const MANAGEMENT: readonly RestaurantTeamRoleCode[] = ["OWNER", "ADMIN"];

/** Which roles hold each capability. */
export const CAPABILITY_ROLES: Readonly<Record<RestaurantCapability, readonly RestaurantTeamRoleCode[]>> = {
  viewDashboard: ALL,
  viewOrders: ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF", "FINANCE"], // FINANCE read-only
  verifyPickup: COUNTER,
  manageIncidents: COUNTER,
  manageDrops: OPERATIONAL,
  manageTemplates: OPERATIONAL,
  manageProfile: MANAGEMENT,
  manageCompliance: MANAGEMENT,
  viewReviews: OPERATIONAL,
  viewReports: ["OWNER", "ADMIN", "OPERATIONS", "FINANCE"],
  viewFinance: ["OWNER", "ADMIN", "FINANCE"],
};

export function roleHasCapability(role: RestaurantTeamRoleCode, capability: RestaurantCapability): boolean {
  return CAPABILITY_ROLES[capability].includes(role);
}

/** Restaurant statuses on which scoped operations are refused. */
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
 * Pure: takes already-resolved memberships so every branch is deterministically
 * testable without a database. Order: select → membership → active → status → role.
 */
export function decideRestaurantAccess(params: {
  readonly memberships: readonly MembershipView[];
  readonly restaurantPk: string | null;
  readonly capability: RestaurantCapability;
}): AccessDecision {
  const { memberships, capability } = params;

  // Resolve the target restaurant. A single membership is used implicitly;
  // otherwise an explicit selection is required.
  const target =
    params.restaurantPk ?? (memberships.length === 1 ? memberships[0]?.restaurantPk ?? null : null);
  if (!target) {
    return { ok: false, code: "RESTAURANT_SELECTION_REQUIRED", message: "Select a restaurant to continue." };
  }

  const membership = memberships.find((m) => m.restaurantPk === target);
  if (!membership) {
    // Not a member of this restaurant (incl. cross-tenant ids). Generic to avoid leaking existence.
    return { ok: false, code: "FORBIDDEN", message: "You do not have access to this restaurant." };
  }
  if (!membership.isActive) {
    return { ok: false, code: "MEMBERSHIP_INACTIVE", message: "Your access to this restaurant is inactive." };
  }
  if (BLOCKED_STATUSES.has(membership.restaurantStatusCode)) {
    return { ok: false, code: "RESTAURANT_SUSPENDED", message: "This restaurant is not currently active." };
  }
  if (!roleHasCapability(membership.roleCode, capability)) {
    return { ok: false, code: "ROLE_DENIED", message: "Your role does not permit this action." };
  }

  return { ok: true, membership };
}
