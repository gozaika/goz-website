import { describe, expect, it } from "vitest";
import { canRoleManageProductMedia } from "./product-media-policy";

describe("product-media role policy", () => {
  it("limits restaurant identity media to owner and admin", () => {
    expect(canRoleManageProductMedia("OWNER", "RESTAURANT_HERO")).toBe(true);
    expect(canRoleManageProductMedia("ADMIN", "RESTAURANT_LOGO")).toBe(true);
    expect(canRoleManageProductMedia("OPERATIONS", "RESTAURANT_HERO")).toBe(false);
    expect(canRoleManageProductMedia("FINANCE", "RESTAURANT_LOGO")).toBe(false);
  });

  it("allows operational drop imagery but denies pickup and finance roles", () => {
    expect(canRoleManageProductMedia("OPERATIONS", "DROP_PRIMARY")).toBe(true);
    expect(canRoleManageProductMedia("PICKUP_STAFF", "DROP_PRIMARY")).toBe(false);
    expect(canRoleManageProductMedia("FINANCE", "DROP_PRIMARY")).toBe(false);
  });
});
