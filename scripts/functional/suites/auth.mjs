import { suite, expect } from "../harness.mjs";
import { api, RESTAURANTS } from "../context.mjs";

suite("auth & envelope", ({ test }) => {
  test("unauthenticated GET /orders -> 401 UNAUTHENTICATED", async () => {
    const r = await api("GET", "/orders", { restaurantPk: RESTAURANTS.BAWARCHI });
    expect(r.status).toBe(401);
    expect(r.code).toBe("UNAUTHENTICATED");
  });

  test("stale client schema version -> 426 APP_UPDATE_REQUIRED", async () => {
    const r = await api("GET", "/orders", { role: "OWNER", restaurantPk: RESTAURANTS.BAWARCHI, schemaVersion: 0 });
    expect(r.status).toBe(426);
    expect(r.code).toBe("APP_UPDATE_REQUIRED");
  });

  test("GET /me resolves the restaurant actor", async () => {
    const r = await api("GET", "/me", { role: "OWNER" });
    expect(r.status).toBe(200);
    expect(r.ok).toBeTruthy();
    expect(r.data.actor.isRestaurantUser).toBe(true);
  });

  test("POST /auth/bootstrap returns memberships with role codes", async () => {
    const r = await api("POST", "/auth/bootstrap", { role: "OWNER", body: {} });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data.memberships)).toBe(true);
    expect(r.data.memberships.length).toBeGreaterThanOrEqual(1);
    expect(typeof r.data.memberships[0].roleCode).toBe("string");
  });
});
