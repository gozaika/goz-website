import { describe, expect, it } from "vitest";
import { accentTextColor, contrastRatio, meetsAA, onAccentTextColor, relativeLuminance } from "./contrast";
import { accents, palette } from "./colors";

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

  // X1 a11y pass: lock the contrast of the color combinations the U1-R4 uplift
  // overlays actually render, so a future palette/token edit can't silently
  // regress below WCAG AA.

  it("muted captions stay AA on white and cream (overlay sub-labels)", () => {
    expect(meetsAA(palette.muted, palette.white)).toBe(true);
    expect(meetsAA(palette.muted, palette.cream)).toBe(true);
  });

  it("status foregrounds stay AA on white cards (DataTable / MetricHero tones)", () => {
    for (const fg of [palette.successFg, palette.warningFg, palette.dangerFg, palette.infoFg]) {
      expect(meetsAA(fg, palette.white)).toBe(true);
    }
  });

  it("neutral badge text (charcoal on border) is AA", () => {
    expect(meetsAA(palette.charcoal, palette.border)).toBe(true);
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
    expect(onAccentTextColor(palette.saffron)).toBe(palette.charcoal); // charcoal on saffron
    expect(onAccentTextColor(palette.gold)).toBe(palette.charcoal); // charcoal on gold
    for (const accent of [palette.saffron, palette.gold, accents.restaurant]) {
      expect(meetsAA(onAccentTextColor(accent), accent)).toBe(true);
    }
  });
});
