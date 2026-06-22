import { suite, expect } from "../harness.mjs";
import { api, RESTAURANTS } from "../context.mjs";

const B = RESTAURANTS.BAWARCHI;

suite("finance settlements (Slice 15)", ({ test }) => {
  // viewFinance: OWNER/ADMIN/FINANCE allowed.
  for (const role of ["OWNER", "ADMIN", "FINANCE"]) {
    test(`GET /finance allowed for ${role}`, async () => {
      const r = await api("GET", "/finance", { role, restaurantPk: B });
      expect(r.status).toBe(200);
      expect(Array.isArray(r.data.settlements)).toBe(true);
    });
  }

  // OPERATIONS / PICKUP_STAFF denied.
  for (const role of ["OPERATIONS", "PICKUP_STAFF"]) {
    test(`GET /finance denied for ${role} -> 403 ROLE_DENIED`, async () => {
      const r = await api("GET", "/finance", { role, restaurantPk: B });
      expect(r.status).toBe(403);
      expect(r.code).toBe("ROLE_DENIED");
    });
  }

  test("settlements never expose a raw payout account number", async () => {
    const r = await api("GET", "/finance", { role: "FINANCE", restaurantPk: B });
    for (const s of r.data.settlements ?? []) {
      expect(Object.prototype.hasOwnProperty.call(s, "payoutAccountNumber")).toBe(false);
      if (s.maskedPayoutAccount) expect(String(s.maskedPayoutAccount)).toContain("*");
    }
  });
});
