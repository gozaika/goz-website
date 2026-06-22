import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/restaurant-profile.json";
import { mobileEnvelopeSchema } from "./envelope";
import { restaurantProfileDataSchema } from "./profile";

describe("restaurant profile contract", () => {
  it("the fixture is a valid envelope", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
  });

  it("the profile payload validates against restaurantProfileDataSchema", () => {
    expect(restaurantProfileDataSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("compliance exposes a summary only — no raw license numbers", () => {
    const compliance = fixture.data.compliance as Record<string, unknown>;
    expect(compliance).not.toHaveProperty("fssaiLicenseNumber");
    expect(compliance).not.toHaveProperty("gstin");
    expect(compliance).not.toHaveProperty("panNumber");
  });
});
