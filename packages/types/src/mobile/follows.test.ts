import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/follows-list.json";
import { mobileEnvelopeSchema } from "./envelope";
import { followToggleRequestSchema, followToggleResultSchema, followsListSchema } from "./follows";

describe("follows contract (F1)", () => {
  it("the list fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
    expect(followsListSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("every followed pk has a matching restaurant card", () => {
    const data = followsListSchema.parse(fixture.data);
    const cardPks = new Set(data.restaurants.map((r) => r.restaurantPk));
    for (const pk of data.restaurantPks) {
      expect(cardPks.has(pk)).toBe(true);
    }
  });

  it("the toggle result requires a boolean following state + count", () => {
    expect(
      followToggleResultSchema.safeParse({
        restaurantPk: "20000000-0000-0000-0000-300000000001",
        following: true,
        followerCount: 15,
      }).success,
    ).toBe(true);
    expect(followToggleResultSchema.safeParse({ restaurantPk: "x", following: "yes" }).success).toBe(false);
  });

  it("the toggle request only accepts a uuid restaurant pk", () => {
    expect(followToggleRequestSchema.safeParse({ restaurantPk: "20000000-0000-0000-0000-300000000001" }).success).toBe(true);
    expect(followToggleRequestSchema.safeParse({ restaurantPk: "not-a-uuid" }).success).toBe(false);
    expect(followToggleRequestSchema.safeParse({}).success).toBe(false);
  });
});
