/**
 * Restaurant economics calculator — the pure, framework-neutral model behind the
 * "fill-the-gap" tool on gozaika.in and the decision-support tab in the restaurant
 * web app (business-model-audit §11.2). Kept here in `@gozaika/utils` so the site
 * and the portal share ONE source of truth for the math and can never drift.
 *
 * Money is in paise (integers), matching the rest of the platform; rates are
 * fractions in [0, 1] (the UI converts its 0–100 sliders). Everything is a pure
 * function of its inputs, so the model is unit-testable in isolation.
 *
 * The core idea (§5, §11.1): a BAM Bag delivers ~1.5× menu value for ~0.75–0.8×
 * a normal order. The restaurant fills that value along a spectrum — surplus
 * (≈zero marginal cost) → semi-prepared salvage (partial cost) → freshly made
 * (full food cost, treated as customer-acquisition spend). The bag's own margin
 * is thin by design; the ROI is the downstream full-price reorder it seeds
 * (§20). This model makes that trade-off explicit and comparable to the ~30%
 * an aggregator takes for one cold, un-owned order.
 */

export interface EconomicsInputs {
  /** What the customer pays for the bag. */
  readonly bagPricePaise: number;
  /** Full à la carte menu value of everything in the bag (~1.5× a normal order). */
  readonly menuValuePaise: number;
  /** Fill mix — fractions of menu value from each source; normalised if they don't sum to 1. */
  readonly fillMix: {
    readonly surplus: number;
    readonly semiPrep: number;
    readonly fresh: number;
  };
  /** Food cost as a fraction of menu value if everything were freshly made (e.g. 0.30). */
  readonly foodCostRate: number;
  /** Semi-prep salvage marginal cost as a fraction of the equivalent fresh food cost (0–1). */
  readonly salvageCostFactor: number;
  /** Packaging cost per bag (paise). */
  readonly packagingPaise: number;
  /** Incremental portioning/assembly labour per bag (paise). */
  readonly labourPaise: number;
  /** Platform commission as a fraction of the bag price (e.g. 0.15). */
  readonly commissionRate: number;
  /** Expected sample→repeat conversion: fraction of bag buyers who reorder at full price. */
  readonly conversionRate: number;
  /** Average value of one full-price repeat order (paise). */
  readonly repeatOrderValuePaise: number;
  /** Restaurant gross margin on a repeat order, as a fraction (e.g. 0.65). */
  readonly repeatMarginRate: number;
  /** Bags released per drop. */
  readonly bagsPerDrop: number;
  /** Drops per week. */
  readonly dropsPerWeek: number;
  /** Aggregator commission used only for the "vs one cold order" comparison (e.g. 0.30). */
  readonly aggregatorCommissionRate: number;
}

export interface EconomicsResult {
  // ── per bag ────────────────────────────────────────────────────────────────
  readonly commissionPaise: number;
  readonly netRevenuePaise: number;
  readonly effectiveFoodCostPaise: number;
  readonly variableCostPaise: number;
  /** Contribution before any downstream reorder value — can be thin or negative by design. */
  readonly perBagContributionPaise: number;
  /** Restaurant margin on one acquired regular's full-price repeat order. */
  readonly downstreamValuePerCustomerPaise: number;
  /** Expected downstream value attributable to one bag (conversion × downstream value). */
  readonly expectedDownstreamPerBagPaise: number;
  /** Contribution once the seeded reorder value is counted — the number that matters. */
  readonly perBagContributionAfterCacPaise: number;
  /** Net cost to acquire one repeat regular. Negative = the bag pays you to acquire. */
  readonly effectiveCacPerCustomerPaise: number;
  /** Conversion needed for the bag to break even after CAC. 0 if already profitable; null if unreachable. */
  readonly breakEvenConversionRate: number | null;
  /** 1 − price/menu value — the guest's effective value uplift (for the abundance framing). */
  readonly effectiveValueUpliftRate: number;
  // ── acquisition-spend framing (§11.1 headline) ──────────────────────────────
  /** Menu value filled from surplus per bag (≈free revenue). */
  readonly surplusValuePerBagPaise: number;
  /** Marginal cost of the freshly-made portion per bag — the deliberate acquisition spend. */
  readonly acquisitionSpendPerBagPaise: number;
  // ── per drop / per week ──────────────────────────────────────────────────────
  readonly contributionAfterCacPerDropPaise: number;
  readonly contributionAfterCacPerWeekPaise: number;
  readonly regularsPerDrop: number;
  readonly regularsPerWeek: number;
  /** What one cold aggregator order would cost in commission — the comparison anchor. */
  readonly aggregatorCommissionPerOrderPaise: number;
}

function clampFraction(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Normalise the fill mix to fractions summing to 1 (falls back to all-surplus if empty). */
export function normaliseFillMix(mix: EconomicsInputs["fillMix"]): {
  surplus: number;
  semiPrep: number;
  fresh: number;
} {
  const surplus = nonNegative(mix.surplus);
  const semiPrep = nonNegative(mix.semiPrep);
  const fresh = nonNegative(mix.fresh);
  const total = surplus + semiPrep + fresh;
  if (total <= 0) return { surplus: 1, semiPrep: 0, fresh: 0 };
  return { surplus: surplus / total, semiPrep: semiPrep / total, fresh: fresh / total };
}

/**
 * Compute the full per-bag / per-drop / per-week economics from a single set of
 * inputs. Pure and total — every branch returns finite numbers (or an explicit
 * `null` break-even when it is genuinely unreachable).
 */
export function computeEconomics(inputs: EconomicsInputs): EconomicsResult {
  const bagPrice = nonNegative(inputs.bagPricePaise);
  const menuValue = nonNegative(inputs.menuValuePaise);
  const mix = normaliseFillMix(inputs.fillMix);
  const foodCostRate = clampFraction(inputs.foodCostRate);
  const salvageCostFactor = clampFraction(inputs.salvageCostFactor);
  const commissionRate = clampFraction(inputs.commissionRate);
  const conversionRate = clampFraction(inputs.conversionRate);
  const repeatMarginRate = clampFraction(inputs.repeatMarginRate);
  const aggregatorCommissionRate = clampFraction(inputs.aggregatorCommissionRate);
  const bagsPerDrop = Math.max(0, Math.round(nonNegative(inputs.bagsPerDrop)));
  const dropsPerWeek = Math.max(0, Math.round(nonNegative(inputs.dropsPerWeek)));

  // Food cost by source. Surplus is already-produced abundance (marginal cost ≈ 0);
  // semi-prep salvage costs a fraction of fresh; freshly-made carries full food cost.
  const fullFoodCost = menuValue * foodCostRate;
  const effectiveFoodCostPaise = Math.round(
    fullFoodCost * (mix.surplus * 0 + mix.semiPrep * salvageCostFactor + mix.fresh * 1),
  );

  const commissionPaise = Math.round(bagPrice * commissionRate);
  const netRevenuePaise = bagPrice - commissionPaise;
  const variableCostPaise =
    effectiveFoodCostPaise + nonNegative(inputs.packagingPaise) + nonNegative(inputs.labourPaise);
  const perBagContributionPaise = netRevenuePaise - variableCostPaise;

  const downstreamValuePerCustomerPaise = Math.round(
    nonNegative(inputs.repeatOrderValuePaise) * repeatMarginRate,
  );
  const expectedDownstreamPerBagPaise = Math.round(conversionRate * downstreamValuePerCustomerPaise);
  const perBagContributionAfterCacPaise = perBagContributionPaise + expectedDownstreamPerBagPaise;

  // Effective CAC per acquired regular: spread the bag's net cost over the regulars
  // it seeds. Negative means the bag itself is profitable AND wins you a regular.
  const effectiveCacPerCustomerPaise =
    conversionRate > 0 ? Math.round(-perBagContributionPaise / conversionRate) : 0;

  // Break-even conversion: the conversion that makes after-CAC contribution zero.
  // Already profitable → 0. No downstream value → unreachable (null).
  let breakEvenConversionRate: number | null;
  if (perBagContributionPaise >= 0) {
    breakEvenConversionRate = 0;
  } else if (downstreamValuePerCustomerPaise > 0) {
    breakEvenConversionRate = -perBagContributionPaise / downstreamValuePerCustomerPaise;
  } else {
    breakEvenConversionRate = null;
  }

  const effectiveValueUpliftRate = menuValue > 0 ? Math.max(0, 1 - bagPrice / menuValue) : 0;

  const surplusValuePerBagPaise = Math.round(menuValue * mix.surplus);
  const acquisitionSpendPerBagPaise = Math.round(fullFoodCost * mix.fresh);

  const contributionAfterCacPerDropPaise = perBagContributionAfterCacPaise * bagsPerDrop;
  const contributionAfterCacPerWeekPaise = contributionAfterCacPerDropPaise * dropsPerWeek;
  const regularsPerDrop = conversionRate * bagsPerDrop;
  const regularsPerWeek = regularsPerDrop * dropsPerWeek;

  const aggregatorCommissionPerOrderPaise = Math.round(
    nonNegative(inputs.repeatOrderValuePaise) * aggregatorCommissionRate,
  );

  return {
    commissionPaise,
    netRevenuePaise,
    effectiveFoodCostPaise,
    variableCostPaise,
    perBagContributionPaise,
    downstreamValuePerCustomerPaise,
    expectedDownstreamPerBagPaise,
    perBagContributionAfterCacPaise,
    effectiveCacPerCustomerPaise,
    breakEvenConversionRate,
    effectiveValueUpliftRate,
    surplusValuePerBagPaise,
    acquisitionSpendPerBagPaise,
    contributionAfterCacPerDropPaise,
    contributionAfterCacPerWeekPaise,
    regularsPerDrop,
    regularsPerWeek,
    aggregatorCommissionPerOrderPaise,
  };
}

/**
 * Sane starting defaults, aligned with the §5 illustrative example (menu ₹300,
 * bag ₹155, 30% food cost, 15% commission). The conversion rate is a deliberate,
 * clearly-labelled estimate until real platform sample→repeat data replaces it
 * (§11.2 caution) — ship a plausible number, never a fabricated certainty.
 */
export const DEFAULT_ECONOMICS_INPUTS: EconomicsInputs = {
  bagPricePaise: 15_500,
  menuValuePaise: 30_000,
  fillMix: { surplus: 0.5, semiPrep: 0.2, fresh: 0.3 },
  foodCostRate: 0.3,
  salvageCostFactor: 0.5,
  packagingPaise: 1_500,
  labourPaise: 2_500,
  commissionRate: 0.15,
  conversionRate: 0.25,
  repeatOrderValuePaise: 40_000,
  repeatMarginRate: 0.65,
  bagsPerDrop: 20,
  dropsPerWeek: 5,
  aggregatorCommissionRate: 0.3,
};
