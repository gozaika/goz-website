import type { ReactNode } from "react";
import { accentTextColor, accents, type StatusTone } from "@gozaika/design-tokens";
import { cn, clampRatio, formatRatioPercent, normalizeSparkline } from "@gozaika/utils";
import { Badge, Card, Text } from "./primitives";

// Web ports of the shared partner primitives (mirror @gozaika/mobile-ui
// PartnerPrimitives). Static / render-only ones here; interactive ones
// (ActionCard / QueueCard / RestaurantSwitcher) in PartnerControls.tsx.

const TONE_TEXT: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-charcoal",
};

export interface MetricHeroProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly value: string;
  readonly helper?: string;
  readonly badgeLabel?: string;
  readonly badgeTone?: StatusTone;
  readonly accent?: string;
  readonly children?: ReactNode;
  readonly className?: string;
}

export function MetricHero({ eyebrow, title, value, helper, badgeLabel, badgeTone = "neutral", accent = accents.restaurant, children, className }: MetricHeroProps) {
  return (
    <Card elevated="md" className={cn("border-l-4", className)} style={{ borderLeftColor: accent }}>
      <div className="flex justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentTextColor(accent) }}>
              {eyebrow}
            </p>
          ) : null}
          <p className="text-sm font-semibold text-muted">{title}</p>
          <p className="text-4xl font-extrabold leading-tight" style={{ color: accentTextColor(accent) }}>
            {value}
          </p>
          {helper ? <p className="text-sm text-muted">{helper}</p> : null}
        </div>
        {badgeLabel ? <Badge tone={badgeTone}>{badgeLabel}</Badge> : null}
      </div>
      {children}
    </Card>
  );
}

export interface SellThroughBarProps {
  readonly sold: number;
  readonly total: number;
  readonly label?: string;
  readonly accent?: string;
  readonly className?: string;
}

export function SellThroughBar({ sold, total, label, accent = accents.restaurant, className }: SellThroughBarProps) {
  const ratio = total > 0 ? clampRatio(sold / total) : 0;
  const pct = Math.round(ratio * 100);
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label ?? "Sell-through"} className={cn("flex flex-col gap-1", className)}>
      <div className="flex justify-between gap-3">
        <span className="text-xs font-medium text-muted">{label ?? "Sell-through"}</span>
        <span className="text-xs font-medium text-muted">
          {sold}/{total} · {formatRatioPercent(ratio)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-hairline">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
      </div>
    </div>
  );
}

export interface SparklineProps {
  readonly values: readonly number[];
  readonly label: string;
  readonly accent?: string;
  readonly height?: number;
}

export function Sparkline({ values, label, accent = accents.restaurant, height = 42 }: SparklineProps) {
  const normalized = normalizeSparkline(values);
  if (!normalized.length) {
    return <p className="text-xs font-medium text-muted">No trend data</p>;
  }
  return (
    <div role="img" aria-label={label} className="flex items-end gap-1" style={{ height }}>
      {normalized.map((value, index) => (
        <div
          key={`${index}-${value}`}
          className="min-w-1 flex-1 rounded-full"
          style={{ height: Math.max(4, height * value), backgroundColor: accent, opacity: 0.42 + value * 0.58 }}
        />
      ))}
    </div>
  );
}

export interface DataTableRow {
  readonly label: string;
  readonly value: string;
  readonly helper?: string;
  readonly tone?: StatusTone;
}

export interface DataTableProps {
  readonly rows: readonly DataTableRow[];
  readonly title?: string;
  readonly className?: string;
}

export function DataTable({ rows, title, className }: DataTableProps) {
  return (
    <Card className={className}>
      {title ? <Text variant="heading">{title}</Text> : null}
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${row.value}`}
          className={cn("flex items-center justify-between gap-3 py-2", (title || index > 0) && "border-t border-hairline")}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold text-charcoal">{row.label}</p>
            {row.helper ? <p className="text-xs font-medium text-muted">{row.helper}</p> : null}
          </div>
          <p className={cn("text-lg font-semibold", TONE_TEXT[row.tone ?? "neutral"])}>{row.value}</p>
        </div>
      ))}
    </Card>
  );
}

export interface RoleAwareSectionProps {
  readonly allowed: boolean;
  readonly children: ReactNode;
  readonly fallbackTitle?: string;
  readonly fallbackMessage?: string;
}

export function RoleAwareSection({
  allowed,
  children,
  fallbackTitle = "Not available for this role",
  fallbackMessage = "Your server role controls which partner data is shown here.",
}: RoleAwareSectionProps) {
  if (allowed) {
    return <>{children}</>;
  }
  return (
    <Card className="bg-cream">
      <Text variant="heading">{fallbackTitle}</Text>
      <p className="text-sm text-muted">{fallbackMessage}</p>
    </Card>
  );
}
