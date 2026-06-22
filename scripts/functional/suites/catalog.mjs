import { suite, expect } from "../harness.mjs";
import { api, RESTAURANTS } from "../context.mjs";

const B = RESTAURANTS.BAWARCHI;

suite("templates & drops (Slice 13)", ({ test }) => {
  // manageTemplates / manageDrops: OWNER/ADMIN/OPERATIONS allowed; PICKUP/FINANCE denied.
  for (const role of ["OWNER", "ADMIN", "OPERATIONS"]) {
    test(`GET /templates allowed for ${role}`, async () => {
      const r = await api("GET", "/templates", { role, restaurantPk: B });
      expect(r.status).toBe(200);
      expect(Array.isArray(r.data.templates)).toBe(true);
    });
    test(`GET /drops allowed for ${role}`, async () => {
      const r = await api("GET", "/drops", { role, restaurantPk: B });
      expect(r.status).toBe(200);
      expect(Array.isArray(r.data.drops)).toBe(true);
    });
  }

  for (const role of ["PICKUP_STAFF", "FINANCE"]) {
    test(`GET /drops denied for ${role} -> 403 ROLE_DENIED`, async () => {
      const r = await api("GET", "/drops", { role, restaurantPk: B });
      expect(r.status).toBe(403);
      expect(r.code).toBe("ROLE_DENIED");
    });
    test(`POST /drops denied for ${role} -> 403 ROLE_DENIED`, async () => {
      const r = await api("POST", "/drops", { role, restaurantPk: B, body: { templateRevisionPk: "00000000-0000-0000-0000-000000000000", quantityTotal: 1, pricePaise: 10000, pickupStartAt: new Date(Date.now() + 3.6e6).toISOString(), pickupEndAt: new Date(Date.now() + 7.2e6).toISOString() } });
      expect(r.status).toBe(403);
      expect(r.code).toBe("ROLE_DENIED");
    });
  }

  test("OWNER can publish a drop from an active template (happy path)", async () => {
    const tpl = await api("GET", "/templates", { role: "OWNER", restaurantPk: B });
    const active = (tpl.data.templates ?? []).find((t) => t.activeRevisionPk);
    if (!active) {
      // No active template seeded — skip gracefully (apply slice13_active_template.sql to cover).
      console.log("      (skipped: no active template; run supabase/seed_demo/slice13_active_template.sql)");
      return;
    }
    const start = new Date(Date.now() + 3 * 3.6e6).toISOString();
    const end = new Date(Date.now() + 4 * 3.6e6).toISOString();
    const r = await api("POST", "/drops", {
      role: "OWNER",
      restaurantPk: B,
      body: { templateRevisionPk: active.activeRevisionPk, quantityTotal: 5, pricePaise: 14900, pickupStartAt: start, pickupEndAt: end, statusCode: "DRAFT" },
    });
    expect(r.status).toBe(200);
    expect(r.data.statusCode).toBe("DRAFT");
  });
});
