// Pure, framework-neutral decision logic for the shared design-system primitives
// (countdown tone, progress clamping). Lives in @gozaika/utils so the native
// (@gozaika/mobile-ui) and web (@gozaika/ui) primitive ports share one source of
// truth and can never drift on the tone thresholds.

export interface CountdownParts {
  readonly label: string;
  readonly tone: "neutral" | "warning" | "danger";
  readonly expired: boolean;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function progressPercent(value: number): number {
  return Math.round(clampProgress(value) * 100);
}

export function formatCountdownParts(
  targetTime: Date | string | number,
  now: Date | string | number = Date.now(),
): CountdownParts {
  const targetMs = new Date(targetTime).getTime();
  const nowMs = new Date(now).getTime();

  if (!Number.isFinite(targetMs) || !Number.isFinite(nowMs)) {
    return { label: "Time unavailable", tone: "neutral", expired: false };
  }

  const remainingMs = targetMs - nowMs;

  if (remainingMs <= 0) {
    return { label: "Closed", tone: "danger", expired: true };
  }

  const totalMinutes = Math.ceil(remainingMs / MINUTE_MS);

  if (remainingMs < HOUR_MS) {
    return {
      label: `${totalMinutes} min left`,
      tone: totalMinutes <= 15 ? "danger" : "warning",
      expired: false,
    };
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label = minutes === 0 ? `${hours} hr left` : `${hours} hr ${minutes} min left`;

  return { label, tone: "neutral", expired: false };
}
