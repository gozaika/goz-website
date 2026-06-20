import { describe, expect, it } from "vitest";
import type { RestaurantTeamRoleCode } from "../index";
import { CAPABILITY_ROLES, CAPABILITY_SCOPE, ROLE_SCOPE_SEED, type RestaurantCapability } from "./capabilities";

// The human-reviewed matrix (restaurant spec §2, signed off 2026-06-20). The
// data-driven scope seed MUST derive exactly this — if a future scope edit drifts
// the matrix, this fails. The local smoke separately asserts the DB rows == the seed.
const REVIEWED_MATRIX: Record<RestaurantCapability, readonly RestaurantTeamRoleCode[]> = {
  viewDashboard: ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF", "FINANCE"],
  viewOrders: ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF", "FINANCE"],
  verifyPickup: ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF"],
  manageIncidents: ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF"],
  manageDrops: ["OWNER", "ADMIN", "OPERATIONS"],
  manageTemplates: ["OWNER", "ADMIN", "OPERATIONS"],
  manageProfile: ["OWNER", "ADMIN"],
  manageCompliance: ["OWNER", "ADMIN"],
  viewReviews: ["OWNER", "ADMIN", "OPERATIONS"],
  viewReports: ["OWNER", "ADMIN", "OPERATIONS", "FINANCE"],
  viewFinance: ["OWNER", "ADMIN", "FINANCE"],
};

describe("data-driven capability scopes", () => {
  it("the scope seed derives EXACTLY the reviewed matrix", () => {
    for (const cap of Object.keys(REVIEWED_MATRIX) as RestaurantCapability[]) {
      expect([...CAPABILITY_ROLES[cap]].sort()).toEqual([...REVIEWED_MATRIX[cap]].sort());
    }
  });

  it("every capability's required scope is granted to at least one role in the seed", () => {
    const seededScopes = new Set(Object.values(ROLE_SCOPE_SEED).flat());
    for (const scope of Object.values(CAPABILITY_SCOPE)) {
      expect(seededScopes.has(scope)).toBe(true);
    }
  });
});
