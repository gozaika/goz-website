import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/discovery-drops.json";
import { discoveryDropsSchema, publicDropCardSchema } from "./discovery";
import { mobileEnvelopeSchema } from "./envelope";

describe("discovery contracts", () => {
  it("the fixture is a valid envelope", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
  });

  it("the drops payload validates against the schema", () => {
    expect(discoveryDropsSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("a single drop validates against publicDropCardSchema", () => {
    expect(publicDropCardSchema.safeParse(fixture.data[0]).success).toBe(true);
  });
});
