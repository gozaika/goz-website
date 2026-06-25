import { describe, expect, it } from "vitest";
import { basisPointsToRatio, clampRatio, formatRatioPercent, normalizeSparkline } from "./partnerPrimitivesModel";

describe("partner primitive model helpers", () => {
  it("clamps sell-through ratios and basis points", () => {
    expect(clampRatio(-1)).toBe(0);
    expect(clampRatio(0.42)).toBe(0.42);
    expect(clampRatio(4)).toBe(1);
    expect(basisPointsToRatio(6750)).toBe(0.675);
    expect(formatRatioPercent(0.675)).toBe("68%");
  });

  it("normalizes sparkline values without inventing trend direction", () => {
    expect(normalizeSparkline([10, 20, 30])).toEqual([0, 0.5, 1]);
    expect(normalizeSparkline([5, 5, 5])).toEqual([0.5, 0.5, 0.5]);
    expect(normalizeSparkline([])).toEqual([]);
  });
});
