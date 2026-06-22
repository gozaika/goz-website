import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/discovery-drops.json";
import { discoveryDropsSchema, mobileMediaAssetSchema, publicDropCardSchema } from "./discovery";
import { mobileEnvelopeSchema } from "./envelope";

describe("discovery contracts", () => {
  it("the fixture is a valid envelope", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
  });

  it("the drops payload validates against the schema", () => {
    expect(discoveryDropsSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("a single drop validates against publicDropCardSchema", () => {
    const result = publicDropCardSchema.parse(fixture.data[0]);
    expect(result.image).toBeNull();
  });

  it("accepts a bounded optional media asset", () => {
    expect(
      mobileMediaAssetSchema.parse({
        url: "https://cdn.gozaika.in/drop/example.webp",
        width: 1200,
        height: 900,
        alt: "Sealed BAM Bag",
        blurhash: null,
      }),
    ).toMatchObject({ width: 1200, height: 900 });
  });
});
