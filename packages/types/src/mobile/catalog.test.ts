import { describe, expect, it } from "vitest";
import dropsFixture from "../../test-fixtures/mobile/drops.json";
import { dropStatusActionRequestSchema, dropStatusActionResultSchema, dropSummaryWireSchema, dropsDataSchema } from "./catalog";
import { mobileEnvelopeSchema } from "./envelope";

describe("catalog (drops) contract", () => {
  it("the drops fixture is a valid envelope", () => {
    expect(mobileEnvelopeSchema.safeParse(dropsFixture).success).toBe(true);
  });

  it("the drops payload validates against dropsDataSchema", () => {
    expect(dropsDataSchema.safeParse(dropsFixture.data).success).toBe(true);
  });

  it("a single drop validates against dropSummaryWireSchema", () => {
    expect(dropSummaryWireSchema.safeParse(dropsFixture.data.drops[0]).success).toBe(true);
  });

  it("validates drop lifecycle status actions", () => {
    expect(
      dropStatusActionRequestSchema.safeParse({
        nextStatusCode: "PAUSED",
        reasonText: "Partner pause after prep review.",
      }).success,
    ).toBe(true);
    expect(dropStatusActionRequestSchema.safeParse({ nextStatusCode: "SOLD_OUT", reasonText: "No" }).success).toBe(false);
    expect(
      dropStatusActionResultSchema.safeParse({
        dropPk: "50000000-0000-0000-0000-000000000001",
        statusCode: "PAUSED",
        message: "Drop paused.",
      }).success,
    ).toBe(true);
  });
});
