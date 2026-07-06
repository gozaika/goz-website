'use client';

import { useMemo, useState } from 'react';
import { computeEconomics, DEFAULT_ECONOMICS_INPUTS, formatPaise } from '@gozaika/utils';

/**
 * gozaika.in restaurant economics calculator — the sales-oriented "your economics /
 * your acquisition" tool (business-model-audit §11.2, §14: prominent but not the
 * hero, restaurant-safe "revenue from what's wasted" framing). The full
 * decision-support version with every cost assumption lives in the restaurant web
 * app; this one exposes the handful of levers a partner cares about and keeps the
 * cost assumptions at sensible defaults. The math is shared (@gozaika/utils) so the
 * two surfaces can never disagree.
 */

const rupees = (paise: number): number => Math.round(paise) / 100;

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}): React.ReactElement {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray700">{label}</span>
        <span className="text-sm font-bold text-forest tabular-nums">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-forest-light accent-saffron"
      />
    </label>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
  hint,
  testId,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'neutral';
  hint?: string;
  testId?: string;
}): React.ReactElement {
  const valueColor =
    tone === 'good' ? 'text-forest' : tone === 'bad' ? 'text-[var(--color-saffron-hover)]' : 'text-gray900';
  return (
    <div className="rounded-2xl border border-forest-light bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueColor}`} data-testid={testId}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-snug text-gray500">{hint}</p> : null}
    </div>
  );
}

export function RestaurantEconomicsCalculator({
  disclaimer,
}: {
  disclaimer: string;
}): React.ReactElement {
  const [bagPrice, setBagPrice] = useState(rupees(DEFAULT_ECONOMICS_INPUTS.bagPricePaise));
  const [menuValue, setMenuValue] = useState(rupees(DEFAULT_ECONOMICS_INPUTS.menuValuePaise));
  const [surplusPct, setSurplusPct] = useState(50);
  const [freshPct, setFreshPct] = useState(30);
  const [conversionPct, setConversionPct] = useState(25);
  const [bagsPerDrop, setBagsPerDrop] = useState(DEFAULT_ECONOMICS_INPUTS.bagsPerDrop);
  const [dropsPerWeek, setDropsPerWeek] = useState(DEFAULT_ECONOMICS_INPUTS.dropsPerWeek);

  const semiPrepPct = Math.max(0, 100 - surplusPct - freshPct);

  const result = useMemo(
    () =>
      computeEconomics({
        ...DEFAULT_ECONOMICS_INPUTS,
        bagPricePaise: Math.round(bagPrice * 100),
        menuValuePaise: Math.round(menuValue * 100),
        fillMix: { surplus: surplusPct, semiPrep: semiPrepPct, fresh: freshPct },
        conversionRate: conversionPct / 100,
        bagsPerDrop,
        dropsPerWeek,
      }),
    [bagPrice, menuValue, surplusPct, freshPct, semiPrepPct, conversionPct, bagsPerDrop, dropsPerWeek],
  );

  const cacIsGain = result.effectiveCacPerCustomerPaise <= 0;
  const surplusPerDrop = result.surplusValuePerBagPaise * bagsPerDrop;
  const acquisitionPerDrop = result.acquisitionSpendPerBagPaise * bagsPerDrop;
  const regularsPerWeekRounded = Math.round(result.regularsPerWeek * 10) / 10;

  // Cap the pair so surplus + fresh never exceeds 100 (semi-prep is the remainder).
  const handleSurplus = (next: number): void => {
    setSurplusPct(next);
    if (next + freshPct > 100) setFreshPct(100 - next);
  };
  const handleFresh = (next: number): void => {
    setFreshPct(next);
    if (surplusPct + next > 100) setSurplusPct(100 - next);
  };

  return (
    <div className="premium-card overflow-hidden rounded-3xl bg-white">
      <div className="grid gap-0 lg:grid-cols-2">
        {/* ── Inputs ── */}
        <div className="border-b border-forest-light p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <h3 className="text-lg font-semibold text-gray900">Your drop</h3>
          <div className="mt-5 space-y-5">
            <Slider label="Bag price" value={bagPrice} min={49} max={499} step={1} suffix="" onChange={setBagPrice} />
            <p className="-mt-3 text-xs text-gray500">₹{bagPrice} to the guest</p>

            <Slider
              label="Menu value inside"
              value={menuValue}
              min={100}
              max={800}
              step={10}
              onChange={setMenuValue}
            />
            <p className="-mt-3 text-xs text-gray500">
              A generous spread — about {(menuValue / Math.max(bagPrice, 1)).toFixed(1)}× the bag price in food
            </p>

            <div className="rounded-2xl bg-cream p-4">
              <p className="text-sm font-semibold text-gray900">How you fill it</p>
              <div className="mt-3 space-y-4">
                <Slider label="Surplus" value={surplusPct} min={0} max={100} suffix="%" onChange={handleSurplus} />
                <Slider label="Freshly made" value={freshPct} min={0} max={100} suffix="%" onChange={handleFresh} />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray700">Semi-prepared salvage</span>
                  <span className="font-bold text-forest tabular-nums">{semiPrepPct}%</span>
                </div>
              </div>
            </div>

            <Slider
              label="First-timers who come back"
              value={conversionPct}
              min={0}
              max={60}
              suffix="%"
              onChange={setConversionPct}
            />
            <p className="-mt-3 text-xs text-gray500">Planning estimate until your drops show the real rate</p>

            <div className="grid grid-cols-2 gap-4">
              <Slider label="Bags / drop" value={bagsPerDrop} min={5} max={100} step={5} onChange={setBagsPerDrop} />
              <Slider label="Drops / week" value={dropsPerWeek} min={1} max={21} onChange={setDropsPerWeek} />
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="bg-forest p-6 text-cream sm:p-8">
          <p className="text-sm leading-relaxed text-forest-light">
            This drop turns{' '}
            <strong className="text-white">{formatPaise(surplusPerDrop)}</strong> of surplus
            {acquisitionPerDrop > 0 ? (
              <>
                {' '}
                and <strong className="text-white">{formatPaise(acquisitionPerDrop)}</strong> of fresh-food
                acquisition
              </>
            ) : null}{' '}
            into{' '}
            <strong className="text-white">
              {regularsPerWeekRounded} new regular{regularsPerWeekRounded === 1 ? '' : 's'}
            </strong>{' '}
            a week — versus the{' '}
            <strong className="text-white">{formatPaise(result.aggregatorCommissionPerOrderPaise)}</strong> a 30%
            aggregator takes for one cold, un-owned order.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Metric
              label="Per bag, after reorders"
              value={formatPaise(result.perBagContributionAfterCacPaise)}
              tone={result.perBagContributionAfterCacPaise >= 0 ? 'good' : 'bad'}
              hint={`${formatPaise(result.perBagContributionPaise)} on the bag itself`}
            />
            <Metric
              label="Cost per new regular"
              value={
                cacIsGain
                  ? `+${formatPaise(-result.effectiveCacPerCustomerPaise)}`
                  : formatPaise(result.effectiveCacPerCustomerPaise)
              }
              tone={cacIsGain ? 'good' : 'neutral'}
              hint={cacIsGain ? 'The bag pays you to acquire' : 'Acquisition spend per regular'}
            />
            <Metric
              label="Per week, after reorders"
              value={formatPaise(result.contributionAfterCacPerWeekPaise)}
              tone={result.contributionAfterCacPerWeekPaise >= 0 ? 'good' : 'bad'}
              testId="calc-per-week"
            />
            <Metric
              label="Break-even return rate"
              value={
                result.breakEvenConversionRate === null
                  ? '—'
                  : `${Math.round(result.breakEvenConversionRate * 100)}%`
              }
              hint={
                result.breakEvenConversionRate === 0
                  ? 'Profitable before a single reorder'
                  : 'Return rate to break even'
              }
            />
          </div>

          <p className="mt-6 text-xs leading-relaxed text-forest-light/80">{disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
