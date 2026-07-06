import { describe, expect, it } from "vitest";

import {
  computeEconomics,
  DEFAULT_ECONOMICS_INPUTS,
  normaliseFillMix,
  type EconomicsInputs,
} from "./economics";

describe("normaliseFillMix", () => {
  it("normalises fractions to sum to 1", () => {
    const mix = normaliseFillMix({ surplus: 1, semiPrep: 1, fresh: 2 });
    expect(mix.surplus + mix.semiPrep + mix.fresh).toBeCloseTo(1, 10);
    expect(mix.fresh).toBeCloseTo(0.5, 10);
  });

  it("accepts percentage-style inputs (they get normalised)", () => {
    const mix = normaliseFillMix({ surplus: 50, semiPrep: 20, fresh: 30 });
    expect(mix.surplus).toBeCloseTo(0.5, 10);
    expect(mix.semiPrep).toBeCloseTo(0.2, 10);
    expect(mix.fresh).toBeCloseTo(0.3, 10);
  });

  it("falls back to all-surplus when the mix is empty", () => {
    expect(normaliseFillMix({ surplus: 0, semiPrep: 0, fresh: 0 })).toEqual({
      surplus: 1,
      semiPrep: 0,
      fresh: 0,
    });
  });

  it("treats negatives and NaN as zero", () => {
    const mix = normaliseFillMix({ surplus: -5, semiPrep: Number.NaN, fresh: 10 });
    expect(mix.fresh).toBeCloseTo(1, 10);
    expect(mix.surplus).toBe(0);
  });
});

describe("computeEconomics — §5 illustrative example (all freshly made)", () => {
  // Menu ₹300, bag ₹155, 30% food cost, 15% commission, 100% fresh.
  const inputs: EconomicsInputs = {
    ...DEFAULT_ECONOMICS_INPUTS,
    fillMix: { surplus: 0, semiPrep: 0, fresh: 1 },
    packagingPaise: 1_500,
    labourPaise: 2_500,
  };
  const r = computeEconomics(inputs);

  it("food cost ≈ ₹90 when fully fresh", () => {
    expect(r.effectiveFoodCostPaise).toBe(9_000);
  });

  it("commission ≈ ₹23 on a ₹155 bag", () => {
    expect(r.commissionPaise).toBe(2_325);
  });

  it("net-of-food contribution ≈ ₹42 (matches the audit)", () => {
    // netRevenue − food = 13175 − 9000 = 4175 (₹41.75)
    expect(r.netRevenuePaise - r.effectiveFoodCostPaise).toBe(4_175);
  });

  it("thin/near-break-even per-bag contribution after packaging + labour", () => {
    // 4175 − (1500 + 2500) = 175 (₹1.75)
    expect(r.perBagContributionPaise).toBe(175);
  });
});

describe("computeEconomics — surplus dramatically lifts contribution", () => {
  const allFresh = computeEconomics({
    ...DEFAULT_ECONOMICS_INPUTS,
    fillMix: { surplus: 0, semiPrep: 0, fresh: 1 },
  });
  const allSurplus = computeEconomics({
    ...DEFAULT_ECONOMICS_INPUTS,
    fillMix: { surplus: 1, semiPrep: 0, fresh: 0 },
  });

  it("surplus has zero effective food cost", () => {
    expect(allSurplus.effectiveFoodCostPaise).toBe(0);
  });

  it("all-surplus contributes more than all-fresh", () => {
    expect(allSurplus.perBagContributionPaise).toBeGreaterThan(
      allFresh.perBagContributionPaise,
    );
  });

  it("all-surplus per-bag contribution jumps toward the ~₹110 the audit cites", () => {
    // netRevenue 13175 − packaging 1500 − labour 2500 = 9175 (₹91.75); no food cost.
    expect(allSurplus.perBagContributionPaise).toBe(9_175);
  });
});

describe("computeEconomics — CAC and break-even semantics", () => {
  it("a profitable bag yields a NEGATIVE CAC (it pays you to acquire)", () => {
    const r = computeEconomics(DEFAULT_ECONOMICS_INPUTS);
    expect(r.perBagContributionPaise).toBeGreaterThan(0);
    expect(r.effectiveCacPerCustomerPaise).toBeLessThan(0);
  });

  it("a profitable bag needs 0% conversion to break even", () => {
    const r = computeEconomics(DEFAULT_ECONOMICS_INPUTS);
    expect(r.breakEvenConversionRate).toBe(0);
  });

  it("a loss-making bag needs a positive break-even conversion", () => {
    // Force a negative contribution: expensive fresh fill, low price.
    const r = computeEconomics({
      ...DEFAULT_ECONOMICS_INPUTS,
      bagPricePaise: 9_000,
      fillMix: { surplus: 0, semiPrep: 0, fresh: 1 },
    });
    expect(r.perBagContributionPaise).toBeLessThan(0);
    expect(r.breakEvenConversionRate).not.toBeNull();
    expect(r.breakEvenConversionRate as number).toBeGreaterThan(0);
  });

  it("break-even is null when there is no downstream value to recover a loss", () => {
    const r = computeEconomics({
      ...DEFAULT_ECONOMICS_INPUTS,
      bagPricePaise: 9_000,
      fillMix: { surplus: 0, semiPrep: 0, fresh: 1 },
      repeatOrderValuePaise: 0,
    });
    expect(r.perBagContributionPaise).toBeLessThan(0);
    expect(r.breakEvenConversionRate).toBeNull();
  });

  it("after-CAC contribution exceeds before-CAC when conversion is positive", () => {
    const r = computeEconomics(DEFAULT_ECONOMICS_INPUTS);
    expect(r.perBagContributionAfterCacPaise).toBeGreaterThan(r.perBagContributionPaise);
    expect(r.expectedDownstreamPerBagPaise).toBe(
      Math.round(0.25 * r.downstreamValuePerCustomerPaise),
    );
  });

  it("zero conversion means no downstream value and zero CAC divisor guard", () => {
    const r = computeEconomics({ ...DEFAULT_ECONOMICS_INPUTS, conversionRate: 0 });
    expect(r.expectedDownstreamPerBagPaise).toBe(0);
    expect(r.effectiveCacPerCustomerPaise).toBe(0);
    expect(r.perBagContributionAfterCacPaise).toBe(r.perBagContributionPaise);
  });
});

describe("computeEconomics — framing outputs", () => {
  const r = computeEconomics(DEFAULT_ECONOMICS_INPUTS);

  it("effective value uplift reflects price vs menu value", () => {
    // 1 − 15500/30000 ≈ 0.483
    expect(r.effectiveValueUpliftRate).toBeCloseTo(0.4833, 3);
  });

  it("surplus value per bag = menu value × surplus share", () => {
    expect(r.surplusValuePerBagPaise).toBe(Math.round(30_000 * 0.5));
  });

  it("acquisition spend per bag = fresh food cost only", () => {
    // fullFoodCost 9000 × fresh 0.3
    expect(r.acquisitionSpendPerBagPaise).toBe(2_700);
  });

  it("aggregator comparison uses the repeat order value × aggregator rate", () => {
    expect(r.aggregatorCommissionPerOrderPaise).toBe(Math.round(40_000 * 0.3));
  });

  it("per-drop and per-week aggregates scale by volume", () => {
    expect(r.contributionAfterCacPerDropPaise).toBe(r.perBagContributionAfterCacPaise * 20);
    expect(r.contributionAfterCacPerWeekPaise).toBe(r.contributionAfterCacPerDropPaise * 5);
    expect(r.regularsPerDrop).toBeCloseTo(0.25 * 20, 10);
    expect(r.regularsPerWeek).toBeCloseTo(0.25 * 20 * 5, 10);
  });
});

describe("computeEconomics — robustness", () => {
  it("never divides by zero or emits NaN on degenerate inputs", () => {
    const r = computeEconomics({
      bagPricePaise: 0,
      menuValuePaise: 0,
      fillMix: { surplus: 0, semiPrep: 0, fresh: 0 },
      foodCostRate: 0,
      salvageCostFactor: 0,
      packagingPaise: 0,
      labourPaise: 0,
      commissionRate: 0,
      conversionRate: 0,
      repeatOrderValuePaise: 0,
      repeatMarginRate: 0,
      bagsPerDrop: 0,
      dropsPerWeek: 0,
      aggregatorCommissionRate: 0,
    });
    for (const value of Object.values(r)) {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
    }
    expect(r.effectiveValueUpliftRate).toBe(0);
  });

  it("clamps out-of-range rates instead of propagating them", () => {
    const r = computeEconomics({
      ...DEFAULT_ECONOMICS_INPUTS,
      commissionRate: 5, // 500% → clamped to 1
      conversionRate: -2, // → clamped to 0
    });
    expect(r.commissionPaise).toBe(DEFAULT_ECONOMICS_INPUTS.bagPricePaise);
    expect(r.expectedDownstreamPerBagPaise).toBe(0);
  });
});
