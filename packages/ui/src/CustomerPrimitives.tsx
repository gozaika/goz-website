import type { ReactNode } from "react";
import { accentTextColor, accents, onAccentTextColor, palette, toneColors, type StatusTone } from "@gozaika/design-tokens";
import { cn, formatCountdownParts, progressPercent } from "@gozaika/utils";
import { Badge, Card, Text } from "./primitives";

// Web ports of the shared customer primitives (mirror @gozaika/mobile-ui
// CustomerPrimitives). Static / render-only ones live here (RSC-friendly);
// interactive ones live in CustomerControls.tsx ("use client"). Accent fills use
// the `accent` prop + onAccentTextColor() so text on the fill always meets AA —
// no raw brand-hex in source.

export interface HeroBannerStat {
  readonly label: string;
  readonly value: string;
}

export interface HeroBannerProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly stats?: readonly HeroBannerStat[];
  readonly accent?: string;
  readonly children?: ReactNode;
  readonly className?: string;
}

export function HeroBanner({ eyebrow, title, subtitle, stats = [], accent = accents.customer, children, className }: HeroBannerProps) {
  return (
    <section className={cn("flex flex-col gap-3 overflow-hidden rounded-2xl border border-hairline bg-cream p-6 shadow-md md:p-8", className)}>
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accentTextColor(accent) }}>
          {eyebrow}
        </p>
      ) : null}
      <Text variant="display">{title}</Text>
      {subtitle ? <p className="max-w-2xl text-base text-muted">{subtitle}</p> : null}
      {stats.length ? (
        <div className="flex flex-wrap gap-2">
          {stats.map((stat) => (
            <div key={`${stat.label}-${stat.value}`} className="rounded-full bg-white px-4 py-2">
              <p className="text-lg font-semibold" style={{ color: accentTextColor(accent) }}>
                {stat.value}
              </p>
              <p className="text-xs font-medium text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export interface CountdownChipProps {
  readonly targetTime: Date | string | number;
  readonly now?: Date | string | number;
  readonly labelPrefix?: string;
}

export function CountdownChip({ targetTime, now, labelPrefix = "Pickup" }: CountdownChipProps) {
  const parts = formatCountdownParts(targetTime, now);
  const tone: StatusTone = parts.tone === "danger" ? "danger" : parts.tone === "warning" ? "warning" : "neutral";
  return (
    <Badge tone={tone} className="gap-1.5">
      <span aria-hidden="true" className="inline-block h-[7px] w-[7px] rounded-full" style={{ backgroundColor: toneColors(tone).fg }} />
      {labelPrefix}: {parts.label}
    </Badge>
  );
}

export interface ProgressRingProps {
  readonly value: number;
  readonly label?: string;
  readonly size?: number;
  readonly accent?: string;
}

/** SVG ring (web-native equivalent of the mobile nested-view ring). */
export function ProgressRing({ value, label, size = 96, accent = palette.gold }: ProgressRingProps) {
  const percent = progressPercent(value);
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return (
    <div className="flex flex-col items-center gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={label ?? "Progress"}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.border} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: accentTextColor(accent) }}>
          {percent}%
        </span>
      </div>
      {label ? <p className="text-center text-xs font-medium text-muted">{label}</p> : null}
    </div>
  );
}

export interface LoyaltyCardStat {
  readonly label: string;
  readonly value: string;
}

export interface LoyaltyCardProps {
  readonly tier: string;
  readonly title?: string;
  readonly progress: number;
  readonly progressLabel?: string;
  readonly stats?: readonly LoyaltyCardStat[];
  readonly accent?: string;
  readonly className?: string;
}

export function LoyaltyCard({ tier, title = "Zayka Passport", progress, progressLabel, stats = [], accent = palette.gold, className }: LoyaltyCardProps) {
  return (
    <Card elevated="md" className={cn("bg-cream", className)}>
      <div className="flex items-center gap-4">
        <ProgressRing value={progress} label={progressLabel} accent={accent} />
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-xs font-semibold" style={{ color: accentTextColor(accent) }}>
            {title}
          </p>
          <Text variant="title">{tier}</Text>
          {stats.length ? (
            <div className="flex flex-wrap gap-3">
              {stats.map((stat) => (
                <div key={`${stat.label}-${stat.value}`} className="min-w-24">
                  <p className="text-lg font-semibold text-charcoal">{stat.value}</p>
                  <p className="text-xs font-medium text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
