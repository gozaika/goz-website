export function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

export function basisPointsToRatio(bps: number): number {
  return clampRatio(bps / 10_000);
}

export function formatRatioPercent(value: number): string {
  return `${Math.round(clampRatio(value) * 100)}%`;
}

export function normalizeSparkline(values: readonly number[]): readonly number[] {
  if (!values.length) {
    return [];
  }

  const finiteValues = values.map((value) => (Number.isFinite(value) ? value : 0));
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);

  if (min === max) {
    return finiteValues.map(() => 0.5);
  }

  return finiteValues.map((value) => clampRatio((value - min) / (max - min)));
}
