import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/dashboard-full.json";
import { dashboardDataSchema, dashboardVariantForRole } from "./dashboard";
import { mobileEnvelopeSchema } from "./envelope";

describe("dashboard contract", () => {
  it("the full fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
    expect(dashboardDataSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("variant is derived per the role matrix", () => {
    expect(dashboardVariantForRole("OWNER")).toBe("FULL");
    expect(dashboardVariantForRole("ADMIN")).toBe("FULL");
    expect(dashboardVariantForRole("OPERATIONS")).toBe("FULL");
    expect(dashboardVariantForRole("PICKUP_STAFF")).toBe("QUEUE_ONLY");
    expect(dashboardVariantForRole("FINANCE")).toBe("SUMMARY");
  });
});
