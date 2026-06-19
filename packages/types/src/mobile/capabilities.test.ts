import { describe, expect, it } from "vitest";
import {
  CAPABILITY_ROLES,
  decideRestaurantAccess,
  roleHasCapability,
  type MembershipView,
} from "./capabilities";

const R1 = "rest-1";
const R2 = "rest-2";

function member(over: Partial<MembershipView> = {}): MembershipView {
  return { restaurantPk: R1, roleCode: "OWNER", restaurantStatusCode: "ACTIVE", isActive: true, ...over };
}

describe("capability matrix", () => {
  it("OWNER and ADMIN hold every capability", () => {
    for (const cap of Object.keys(CAPABILITY_ROLES) as (keyof typeof CAPABILITY_ROLES)[]) {
      expect(roleHasCapability("OWNER", cap)).toBe(true);
      expect(roleHasCapability("ADMIN", cap)).toBe(true);
    }
  });

  it("FINANCE is finance/reports only — never operational", () => {
    expect(roleHasCapability("FINANCE", "viewFinance")).toBe(true);
    expect(roleHasCapability("FINANCE", "viewReports")).toBe(true);
    expect(roleHasCapability("FINANCE", "manageDrops")).toBe(false);
    expect(roleHasCapability("FINANCE", "verifyPickup")).toBe(false);
    expect(roleHasCapability("FINANCE", "manageTemplates")).toBe(false);
  });

  it("PICKUP_STAFF can verify pickups but not manage catalog or finance", () => {
    expect(roleHasCapability("PICKUP_STAFF", "verifyPickup")).toBe(true);
    expect(roleHasCapability("PICKUP_STAFF", "manageIncidents")).toBe(true);
    expect(roleHasCapability("PICKUP_STAFF", "manageTemplates")).toBe(false);
    expect(roleHasCapability("PICKUP_STAFF", "viewFinance")).toBe(false);
  });

  it("OPERATIONS manages catalog but not finance or profile/compliance", () => {
    expect(roleHasCapability("OPERATIONS", "manageDrops")).toBe(true);
    expect(roleHasCapability("OPERATIONS", "viewReports")).toBe(true);
    expect(roleHasCapability("OPERATIONS", "viewFinance")).toBe(false);
    expect(roleHasCapability("OPERATIONS", "manageProfile")).toBe(false);
  });
});

describe("decideRestaurantAccess", () => {
  it("allows an owner on an operational mutation", () => {
    const d = decideRestaurantAccess({ memberships: [member()], restaurantPk: R1, capability: "manageDrops" });
    expect(d.ok).toBe(true);
  });

  it("denies finance on an operational mutation (ROLE_DENIED)", () => {
    const d = decideRestaurantAccess({
      memberships: [member({ roleCode: "FINANCE" })],
      restaurantPk: R1,
      capability: "manageDrops",
    });
    expect(d).toMatchObject({ ok: false, code: "ROLE_DENIED" });
  });

  it("allows finance on finance read", () => {
    const d = decideRestaurantAccess({
      memberships: [member({ roleCode: "FINANCE" })],
      restaurantPk: R1,
      capability: "viewFinance",
    });
    expect(d.ok).toBe(true);
  });

  it("denies pickup staff on templates", () => {
    const d = decideRestaurantAccess({
      memberships: [member({ roleCode: "PICKUP_STAFF" })],
      restaurantPk: R1,
      capability: "manageTemplates",
    });
    expect(d).toMatchObject({ ok: false, code: "ROLE_DENIED" });
  });

  it("denies a cross-restaurant id (FORBIDDEN)", () => {
    const d = decideRestaurantAccess({ memberships: [member()], restaurantPk: R2, capability: "viewDashboard" });
    expect(d).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("denies an inactive (revoked) membership", () => {
    const d = decideRestaurantAccess({
      memberships: [member({ isActive: false })],
      restaurantPk: R1,
      capability: "viewDashboard",
    });
    expect(d).toMatchObject({ ok: false, code: "MEMBERSHIP_INACTIVE" });
  });

  it("denies a suspended restaurant safely", () => {
    const d = decideRestaurantAccess({
      memberships: [member({ restaurantStatusCode: "SUSPENDED" })],
      restaurantPk: R1,
      capability: "viewDashboard",
    });
    expect(d).toMatchObject({ ok: false, code: "RESTAURANT_SUSPENDED" });
  });

  it("requires selection when multiple memberships and no restaurantPk", () => {
    const d = decideRestaurantAccess({
      memberships: [member(), member({ restaurantPk: R2 })],
      restaurantPk: null,
      capability: "viewDashboard",
    });
    expect(d).toMatchObject({ ok: false, code: "RESTAURANT_SELECTION_REQUIRED" });
  });

  it("uses the single membership implicitly when none selected", () => {
    const d = decideRestaurantAccess({ memberships: [member()], restaurantPk: null, capability: "viewDashboard" });
    expect(d.ok).toBe(true);
  });
});
