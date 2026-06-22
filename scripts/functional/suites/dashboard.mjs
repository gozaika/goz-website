import { suite, expect } from "../harness.mjs";
import { api, RESTAURANTS } from "../context.mjs";

const B = RESTAURANTS.BAWARCHI;

suite("role-shaped dashboard (Slice 14)", ({ test }) => {
  test("OWNER -> FULL (financials + operations)", async () => {
    const r = await api("GET", "/dashboard", { role: "OWNER", restaurantPk: B });
    expect(r.status).toBe(200);
    expect(r.data.variant).toBe("FULL");
    expect(r.data.financials).toBeTruthy();
    expect(r.data.operations).toBeTruthy();
  });

  test("OPERATIONS -> FULL", async () => {
    const r = await api("GET", "/dashboard", { role: "OPERATIONS", restaurantPk: B });
    expect(r.data.variant).toBe("FULL");
    expect(r.data.financials).toBeTruthy();
    expect(r.data.operations).toBeTruthy();
  });

  test("PICKUP_STAFF -> QUEUE_ONLY (operations only, NO financials)", async () => {
    const r = await api("GET", "/dashboard", { role: "PICKUP_STAFF", restaurantPk: B });
    expect(r.status).toBe(200);
    expect(r.data.variant).toBe("QUEUE_ONLY");
    expect(r.data.financials).toBeNull();
    expect(r.data.operations).toBeTruthy();
  });

  test("FINANCE -> SUMMARY (financials only, NO operations queue)", async () => {
    const r = await api("GET", "/dashboard", { role: "FINANCE", restaurantPk: B });
    expect(r.status).toBe(200);
    expect(r.data.variant).toBe("SUMMARY");
    expect(r.data.financials).toBeTruthy();
    expect(r.data.operations).toBeNull();
  });
});
