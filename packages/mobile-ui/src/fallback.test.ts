import { describe, expect, it } from "vitest";
import { firstGrapheme, stableFallbackColor } from "./fallback";

describe("mobile fallback identity", () => {
  it("keeps a Devanagari grapheme cluster intact", () => {
    expect(firstGrapheme(" स्वाद घर")).toBe("स्वा");
  });

  it("returns a stable approved color", () => {
    expect(stableFallbackColor("Biryani Baithak")).toBe(stableFallbackColor("Biryani Baithak"));
    expect(stableFallbackColor("Biryani Baithak")).toMatch(/^#/);
  });
});
