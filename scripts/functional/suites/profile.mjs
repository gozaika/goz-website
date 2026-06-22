import { suite, expect } from "../harness.mjs";
import { api, RESTAURANTS } from "../context.mjs";

const B = RESTAURANTS.BAWARCHI;

suite("restaurant profile (Slice 12)", ({ test }) => {
  // viewDashboard: any active member may read the profile.
  for (const role of ["OWNER", "OPERATIONS", "PICKUP_STAFF", "FINANCE"]) {
    test(`GET /restaurant/profile allowed for ${role}`, async () => {
      const r = await api("GET", "/restaurant/profile", { role, restaurantPk: B });
      expect(r.status).toBe(200);
      expect(typeof r.data.restaurantName).toBe("string");
    });
  }

  test("canEditBasics true for OWNER, false for PICKUP_STAFF", async () => {
    const owner = await api("GET", "/restaurant/profile", { role: "OWNER", restaurantPk: B });
    const pickup = await api("GET", "/restaurant/profile", { role: "PICKUP_STAFF", restaurantPk: B });
    expect(owner.data.canEditBasics).toBe(true);
    expect(pickup.data.canEditBasics).toBe(false);
  });

  test("compliance exposes no raw FSSAI/GSTIN/PAN numbers", async () => {
    const r = await api("GET", "/restaurant/profile", { role: "OWNER", restaurantPk: B });
    const c = r.data.compliance;
    expect(typeof c.fssaiPresent).toBe("boolean");
    expect(Object.prototype.hasOwnProperty.call(c, "fssaiLicenseNumber")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(c, "gstin")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(c, "panNumber")).toBe(false);
  });

  // manageProfile: OWNER/ADMIN only.
  test("OPERATIONS PATCH /restaurant/basics -> 403 ROLE_DENIED", async () => {
    const r = await api("PATCH", "/restaurant/basics", {
      role: "OPERATIONS",
      restaurantPk: B,
      body: { restaurantName: "Bawarchi Biryani Palace", restaurantSlug: "bawarchi-biryani-palace", primaryContactEmail: "ops@bawarchi.example" },
    });
    expect(r.status).toBe(403);
    expect(r.code).toBe("ROLE_DENIED");
  });

  test("OWNER PATCH /restaurant/basics -> 200 (echoes refreshed profile)", async () => {
    const cur = await api("GET", "/restaurant/profile", { role: "OWNER", restaurantPk: B });
    const r = await api("PATCH", "/restaurant/basics", {
      role: "OWNER",
      restaurantPk: B,
      body: {
        restaurantName: cur.data.restaurantName,
        restaurantSlug: cur.data.restaurantSlug,
        primaryContactEmail: cur.data.primaryContactEmail ?? "ops@bawarchi.example",
      },
    });
    expect(r.status).toBe(200);
    expect(r.data.restaurantName).toBe(cur.data.restaurantName);
  });

  test("GET /restaurant/geo-options returns cities + neighborhoods", async () => {
    const r = await api("GET", "/restaurant/geo-options", { role: "OWNER", restaurantPk: B });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data.cities)).toBe(true);
    expect(Array.isArray(r.data.neighborhoods)).toBe(true);
  });
});
