import { suite, expect } from "../harness.mjs";
import { api, RESTAURANTS } from "../context.mjs";

const FAKE_ORDER = "40000000-0000-0000-0000-000000000099";
const B = RESTAURANTS.BAWARCHI;

suite("counter / orders (Slice 7)", ({ test }) => {
  // viewOrders: all active members may list.
  for (const role of ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF", "FINANCE"]) {
    test(`GET /orders allowed for ${role}`, async () => {
      const r = await api("GET", "/orders", { role, restaurantPk: B });
      expect(r.status).toBe(200);
      expect(Array.isArray(r.data.orders)).toBe(true);
    });
  }

  test("cross-restaurant GET /orders -> 403 FORBIDDEN", async () => {
    const r = await api("GET", "/orders", { role: "OWNER", restaurantPk: RESTAURANTS.SATTVIK });
    expect(r.status).toBe(403);
    expect(r.code).toBe("FORBIDDEN");
  });

  // verifyPickup: FINANCE denied; PICKUP passes the role gate (then 404 tenant).
  test("FINANCE pickup/verify -> 403 ROLE_DENIED", async () => {
    const r = await api("POST", `/orders/${FAKE_ORDER}/pickup/verify`, { role: "FINANCE", restaurantPk: B, body: { otp: "000000" } });
    expect(r.status).toBe(403);
    expect(r.code).toBe("ROLE_DENIED");
  });

  test("PICKUP_STAFF pickup/verify passes role gate -> 404 NOT_FOUND (fake order)", async () => {
    const r = await api("POST", `/orders/${FAKE_ORDER}/pickup/verify`, { role: "PICKUP_STAFF", restaurantPk: B, body: { otp: "000000" } });
    expect(r.status).toBe(404);
    expect(r.code).toBe("NOT_FOUND");
  });

  // manageIncidents: FINANCE denied; PICKUP allowed (reaches tenant check).
  test("FINANCE incidents -> 403 ROLE_DENIED", async () => {
    const r = await api("POST", `/orders/${FAKE_ORDER}/incidents`, { role: "FINANCE", restaurantPk: B, body: { typeCode: "QUALITY_ISSUE", descriptionText: "functional harness" } });
    expect(r.status).toBe(403);
    expect(r.code).toBe("ROLE_DENIED");
  });

  test("PICKUP_STAFF incidents passes role gate -> 404 NOT_FOUND (fake order)", async () => {
    const r = await api("POST", `/orders/${FAKE_ORDER}/incidents`, { role: "PICKUP_STAFF", restaurantPk: B, body: { typeCode: "QUALITY_ISSUE", descriptionText: "functional harness" } });
    expect(r.status).toBe(404);
    expect(r.code).toBe("NOT_FOUND");
  });
});
