import { describe, expect, it } from "vitest";
import { contrastRatio, meetsAA, relativeLuminance } from "./contrast";
import { palette } from "./colors";

describe("contrast", () => {
  it("computes luminance bounds", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("black on white is maximal contrast", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });

  it("charcoal text on cream meets AA for body text", () => {
    expect(meetsAA(palette.charcoal, palette.cream)).toBe(true);
  });

  it("status foregrounds meet AA on their backgrounds", () => {
    expect(meetsAA(palette.successFg, palette.successBg)).toBe(true);
    expect(meetsAA(palette.dangerFg, palette.dangerBg)).toBe(true);
    expect(meetsAA(palette.warningFg, palette.warningBg)).toBe(true);
    expect(meetsAA(palette.infoFg, palette.infoBg)).toBe(true);
  });

  it("rejects malformed hex", () => {
    expect(() => relativeLuminance("#fff")).toThrow();
  });
});
