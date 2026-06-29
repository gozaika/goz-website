import { describe, expect, it } from "vitest";
import { accentTextColor, contrastRatio, meetsAA, onAccentTextColor, relativeLuminance } from "./contrast";
import { accents, palette } from "./colors";

// Canonical AA-contrast lock for the shared palette. Both @gozaika/mobile-ui and
// @gozaika/ui re-export these tokens, so locking the math here protects every
// surface from a silent sub-AA regression.
describe("design-tokens contrast", () => {
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

  it("status foregrounds meet AA on their backgrounds and on white", () => {
    for (const [fg, bg] of [
      [palette.successFg, palette.successBg],
      [palette.dangerFg, palette.dangerBg],
      [palette.warningFg, palette.warningBg],
      [palette.infoFg, palette.infoBg],
    ]) {
      expect(meetsAA(fg, bg)).toBe(true);
      expect(meetsAA(fg, palette.white)).toBe(true);
    }
  });

  it("muted captions stay AA on white and cream", () => {
    expect(meetsAA(palette.muted, palette.white)).toBe(true);
    expect(meetsAA(palette.muted, palette.cream)).toBe(true);
  });

  it("rejects malformed hex", () => {
    expect(() => relativeLuminance("#fff")).toThrow();
  });

  it("brand saffron/gold fail AA as text on light surfaces (why the companions exist)", () => {
    expect(meetsAA(palette.saffron, palette.white)).toBe(false);
    expect(meetsAA(palette.gold, palette.white)).toBe(false);
  });

  it("saffronText/goldText companions are AA as text on white and cream", () => {
    for (const fg of [palette.saffronText, palette.goldText]) {
      expect(meetsAA(fg, palette.white)).toBe(true);
      expect(meetsAA(fg, palette.cream)).toBe(true);
    }
  });

  it("accentTextColor returns an AA-on-cream text color for every accent", () => {
    expect(accentTextColor(palette.saffron)).toBe(palette.saffronText);
    expect(accentTextColor(palette.gold)).toBe(palette.goldText);
    expect(accentTextColor(accents.restaurant)).toBe(accents.restaurant); // forest already AA
    for (const accent of [palette.saffron, palette.gold, accents.customer, accents.restaurant]) {
      expect(meetsAA(accentTextColor(accent), palette.cream)).toBe(true);
    }
  });

  it("onAccentTextColor returns an AA text color to place on each accent fill", () => {
    expect(onAccentTextColor(accents.restaurant)).toBe(palette.white); // white on forest
    expect(onAccentTextColor(palette.saffron)).toBe(palette.charcoal); // charcoal on saffron (AA fix)
    expect(onAccentTextColor(palette.gold)).toBe(palette.charcoal); // charcoal on gold
    for (const accent of [palette.saffron, palette.gold, accents.restaurant]) {
      expect(meetsAA(onAccentTextColor(accent), accent)).toBe(true);
    }
  });
});
