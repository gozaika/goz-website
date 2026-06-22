import { describe, expect, it } from "vitest";
import dropsFixture from "../../test-fixtures/mobile/drops.json";
import { dropSummaryWireSchema, dropsDataSchema } from "./catalog";
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
});
