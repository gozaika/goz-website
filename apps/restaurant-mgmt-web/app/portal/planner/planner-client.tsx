"use client";

import { computeEconomics, DEFAULT_ECONOMICS_INPUTS, formatPaise } from "@gozaika/utils";
import { useMemo, useState } from "react";

/**
 * Drop economics planner — the restaurant-app decision-support version of the
 * gozaika.in calculator (business-model-audit §11.2, §14: "a fuller decision-
 * support version on a dedicated tab"). Exposes every cost assumption (the site
 * tool hides these behind defaults) so an operator can model a real drop. The
 * math is the shared @gozaika/utils model, so this can never disagree with the
 * public tool. Seeded with sane defaults today; the §11.2 direction is to feed
 * real platform sample→repeat data into the conversion input over time.
 */

const rupees = (paise: number): number => Math.round(paise) / 100;

function MoneyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-charcoal">
      {label}
      <div className="flex items-center rounded-md border border-black/15 bg-white focus-within:border-forest">
        <span className="pl-3 text-muted">₹</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
          className="min-h-11 w-full rounded-md bg-transparent px-2 tabular-nums outline-none"
        />
      </div>
      {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

function CountField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-charcoal">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Math.round(Number(event.target.value)))))}
        className="min-h-11 rounded-md border border-black/15 bg-white px-3 tabular-nums outline-none focus:border-forest"
      />
    </label>
  );
}

function PercentSlider({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-charcoal">{label}</span>
        <span className="text-sm font-bold tabular-nums text-forest">{value}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-success-soft accent-forest"
      />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function ResultCard({
  label,
  value,
  sub,
  tone = "neutral",
  testId,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn" | "neutral";
  testId?: string;
}) {
  const cls =
    tone === "good"
      ? "border-forest/25 bg-success-soft text-forest"
      : tone === "warn"
        ? "border-gold/40 bg-warning-soft text-warning"
        : "border-hairline bg-white text-charcoal";
  return (
    <article className={`rounded-lg border p-4 ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums" data-testid={testId}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-sm opacity-80">{sub}</p> : null}
    </article>
  );
}

export function DropEconomicsPlanner() {
  const d = DEFAULT_ECONOMICS_INPUTS;
  const [bagPrice, setBagPrice] = useState(rupees(d.bagPricePaise));
  const [menuValue, setMenuValue] = useState(rupees(d.menuValuePaise));
  const [surplusPct, setSurplusPct] = useState(Math.round(d.fillMix.surplus * 100));
  const [freshPct, setFreshPct] = useState(Math.round(d.fillMix.fresh * 100));
  const [foodCostPct, setFoodCostPct] = useState(Math.round(d.foodCostRate * 100));
  const [salvagePct, setSalvagePct] = useState(Math.round(d.salvageCostFactor * 100));
  const [packaging, setPackaging] = useState(rupees(d.packagingPaise));
  const [labour, setLabour] = useState(rupees(d.labourPaise));
  const [conversionPct, setConversionPct] = useState(Math.round(d.conversionRate * 100));
  const [repeatOrderValue, setRepeatOrderValue] = useState(rupees(d.repeatOrderValuePaise));
  const [repeatMarginPct, setRepeatMarginPct] = useState(Math.round(d.repeatMarginRate * 100));
  const [bagsPerDrop, setBagsPerDrop] = useState(d.bagsPerDrop);
  const [dropsPerWeek, setDropsPerWeek] = useState(d.dropsPerWeek);

  const semiPrepPct = Math.max(0, 100 - surplusPct - freshPct);

  const handleSurplus = (next: number) => {
    setSurplusPct(next);
    if (next + freshPct > 100) setFreshPct(100 - next);
  };
  const handleFresh = (next: number) => {
    setFreshPct(next);
    if (surplusPct + next > 100) setSurplusPct(100 - next);
  };

  const result = useMemo(
    () =>
      computeEconomics({
        bagPricePaise: Math.round(bagPrice * 100),
        menuValuePaise: Math.round(menuValue * 100),
        fillMix: { surplus: surplusPct, semiPrep: semiPrepPct, fresh: freshPct },
        foodCostRate: foodCostPct / 100,
        salvageCostFactor: salvagePct / 100,
        packagingPaise: Math.round(packaging * 100),
        labourPaise: Math.round(labour * 100),
        commissionRate: d.commissionRate,
        conversionRate: conversionPct / 100,
        repeatOrderValuePaise: Math.round(repeatOrderValue * 100),
        repeatMarginRate: repeatMarginPct / 100,
        bagsPerDrop,
        dropsPerWeek,
        aggregatorCommissionRate: d.aggregatorCommissionRate,
      }),
    [
      bagPrice,
      menuValue,
      surplusPct,
      semiPrepPct,
      freshPct,
      foodCostPct,
      salvagePct,
      packaging,
      labour,
      conversionPct,
      repeatOrderValue,
      repeatMarginPct,
      bagsPerDrop,
      dropsPerWeek,
      d.commissionRate,
      d.aggregatorCommissionRate,
    ],
  );

  const cacGain = result.effectiveCacPerCustomerPaise <= 0;
  const regularsWeek = Math.round(result.regularsPerWeek * 10) / 10;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ── Assumptions ── */}
      <div className="grid gap-5 rounded-lg border border-hairline bg-white p-5">
        <div>
          <h2 className="font-bold text-charcoal">The bag</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <MoneyField label="Bag price" value={bagPrice} onChange={setBagPrice} hint="What the guest pays" />
            <MoneyField
              label="Menu value inside"
              value={menuValue}
              onChange={setMenuValue}
              hint="À la carte value of the contents"
            />
          </div>
        </div>

        <div>
          <h2 className="font-bold text-charcoal">How you fill it</h2>

          {/* Proportion bar — surplus / semi-prep / fresh; makes the remainder visible. */}
          <div
            className="mt-3 flex h-3 w-full overflow-hidden rounded-full"
            role="img"
            aria-label={`Fill mix: ${surplusPct}% surplus, ${semiPrepPct}% semi-prepared salvage, ${freshPct}% freshly made`}
          >
            <div style={{ width: `${surplusPct}%`, backgroundColor: "var(--color-forest)" }} />
            <div style={{ width: `${semiPrepPct}%`, backgroundColor: "var(--color-gold)" }} />
            <div style={{ width: `${freshPct}%`, backgroundColor: "var(--color-saffron)" }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-charcoal">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--color-forest)" }} />
              Surplus {surplusPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--color-gold)" }} />
              Semi-prep {semiPrepPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--color-saffron)" }} />
              Fresh {freshPct}%
            </span>
          </div>

          <div className="mt-4 grid gap-4">
            <PercentSlider label="Surplus" value={surplusPct} onChange={handleSurplus} hint="Near-zero marginal cost" />
            <PercentSlider label="Freshly made" value={freshPct} onChange={handleFresh} hint="Full food cost — acquisition spend" />
            <p className="text-xs text-muted">Semi-prepared salvage fills the rest ({semiPrepPct}%).</p>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-charcoal">Cost assumptions</h2>
          <div className="mt-3 grid gap-4">
            <PercentSlider
              label="Food cost (of menu value)"
              value={foodCostPct}
              min={5}
              max={60}
              onChange={setFoodCostPct}
            />
            <PercentSlider
              label="Semi-prep salvage cost"
              value={salvagePct}
              onChange={setSalvagePct}
              hint="Share of fresh food cost the salvage still carries"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField label="Packaging / bag" value={packaging} onChange={setPackaging} />
              <MoneyField label="Extra labour / bag" value={labour} onChange={setLabour} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-charcoal">Acquisition &amp; volume</h2>
          <div className="mt-3 grid gap-4">
            <PercentSlider
              label="Sample → repeat conversion"
              value={conversionPct}
              min={0}
              max={60}
              onChange={setConversionPct}
              hint="Estimate until your drops produce real reorder data"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField label="Avg repeat order value" value={repeatOrderValue} onChange={setRepeatOrderValue} />
              <PercentSlider label="Repeat order margin" value={repeatMarginPct} min={0} max={90} onChange={setRepeatMarginPct} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CountField label="Bags / drop" value={bagsPerDrop} min={1} max={200} onChange={setBagsPerDrop} />
              <CountField label="Drops / week" value={dropsPerWeek} min={1} max={21} onChange={setDropsPerWeek} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="grid content-start gap-4">
        <div className="rounded-lg border border-forest/20 bg-forest p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">This drop creates</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tabular-nums">{regularsWeek}</span>
            <span className="text-base font-medium">new regular{regularsWeek === 1 ? "" : "s"} a week</span>
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-white/80">
            <span>from</span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-white">
              {formatPaise(result.surplusValuePerBagPaise * bagsPerDrop)} surplus
            </span>
            {result.acquisitionSpendPerBagPaise > 0 ? (
              <>
                <span aria-hidden="true">+</span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-white">
                  {formatPaise(result.acquisitionSpendPerBagPaise * bagsPerDrop)} fresh
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-3 border-t border-white/15 pt-3 text-xs text-white/75">
            One cold aggregator order costs you{" "}
            <strong className="text-white">{formatPaise(result.aggregatorCommissionPerOrderPaise)}</strong> in
            commission — and you never own the customer.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ResultCard
            label="Per bag, after reorders"
            value={formatPaise(result.perBagContributionAfterCacPaise)}
            sub={`${formatPaise(result.perBagContributionPaise)} on the bag alone`}
            tone={result.perBagContributionAfterCacPaise >= 0 ? "good" : "warn"}
            testId="planner-per-bag-after"
          />
          <ResultCard
            label="Cost per new regular"
            value={
              cacGain
                ? `+${formatPaise(-result.effectiveCacPerCustomerPaise)}`
                : formatPaise(result.effectiveCacPerCustomerPaise)
            }
            sub={cacGain ? "The bag pays you to acquire" : "Net acquisition spend per regular"}
            tone={cacGain ? "good" : "neutral"}
          />
          <ResultCard
            label="Per drop, after reorders"
            value={formatPaise(result.contributionAfterCacPerDropPaise)}
            sub={`${bagsPerDrop} bags`}
            tone={result.contributionAfterCacPerDropPaise >= 0 ? "good" : "warn"}
          />
          <ResultCard
            label="Per week, after reorders"
            value={formatPaise(result.contributionAfterCacPerWeekPaise)}
            sub={`${dropsPerWeek} drops/week`}
            tone={result.contributionAfterCacPerWeekPaise >= 0 ? "good" : "warn"}
            testId="planner-per-week"
          />
          <ResultCard
            label="Break-even return rate"
            value={result.breakEvenConversionRate === null ? "—" : `${Math.round(result.breakEvenConversionRate * 100)}%`}
            sub={
              result.breakEvenConversionRate === 0
                ? "Profitable before a single reorder"
                : result.breakEvenConversionRate === null
                  ? "No reorder value set"
                  : "Return rate needed to break even"
            }
            tone={result.breakEvenConversionRate === 0 ? "good" : "neutral"}
          />
          <ResultCard
            label="On the bag itself"
            value={formatPaise(result.perBagContributionPaise)}
            sub={`Net ${formatPaise(result.netRevenuePaise)} − cost ${formatPaise(result.variableCostPaise)}`}
            tone={result.perBagContributionPaise >= 0 ? "good" : "warn"}
          />
        </div>

        <section className="rounded-lg border border-gold/40 bg-warning-soft p-4 text-sm text-charcoal">
          <h3 className="font-bold">Planning assumptions</h3>
          <ul className="mt-2 grid gap-1 text-muted">
            <li>Platform commission fixed at the 15% standard rate.</li>
            <li>Surplus is treated as near-zero marginal cost; freshly-made carries full food cost.</li>
            <li>
              Conversion is your estimate. It becomes data-backed as your drops generate real sample→repeat orders.
            </li>
            <li>The bag is a discovery funnel — the reorder is the return, not the bag margin.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
