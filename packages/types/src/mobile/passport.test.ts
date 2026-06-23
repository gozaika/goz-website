import { describe, expect, it } from "vitest";
import discoveryFixture from "../../test-fixtures/mobile/discovery-profile.json";
import passportFixture from "../../test-fixtures/mobile/passport.json";
import { mobileEnvelopeSchema } from "./envelope";
import { discoveryProfileSchema, zaykaPassportPayloadSchema } from "./passport";

describe("zayka passport contract", () => {
  it("the fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(passportFixture).success).toBe(true);
    expect(zaykaPassportPayloadSchema.safeParse(passportFixture.data).success).toBe(true);
  });

  it("exposes six badges and a next-tier target", () => {
    const payload = zaykaPassportPayloadSchema.parse(passportFixture.data);
    expect(payload.badges).toHaveLength(6);
    expect(payload.nextTierCode).toBe("GOLD");
    expect(payload.bagsToNextTier).toBeGreaterThan(0);
  });

  it("accepts an unknown future tier/badge code (permissive wire)", () => {
    const data = { ...passportFixture.data, stat: { ...passportFixture.data.stat, currentTierCode: "DIAMOND" }, nextTierCode: null };
    expect(zaykaPassportPayloadSchema.safeParse(data).success).toBe(true);
  });
});

describe("discovery profile contract", () => {
  it("the fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(discoveryFixture).success).toBe(true);
    expect(discoveryProfileSchema.safeParse(discoveryFixture.data).success).toBe(true);
  });

  it("separates tried from untried cuisines", () => {
    const profile = discoveryProfileSchema.parse(discoveryFixture.data);
    const tried = new Set(profile.triedCuisines.map((c) => c.cuisineCode));
    for (const u of profile.untriedCuisines) {
      expect(tried.has(u.cuisineCode)).toBe(false);
    }
    expect(profile.flavourDiversityScore).toBeGreaterThanOrEqual(0);
    expect(profile.flavourDiversityScore).toBeLessThanOrEqual(100);
  });
});
