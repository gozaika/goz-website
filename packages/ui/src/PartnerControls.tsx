"use client";

import { accentTextColor, accents, palette, type StatusTone } from "@gozaika/design-tokens";
import { cn } from "@gozaika/utils";
import { Badge } from "./primitives";

// Interactive partner primitives (optional onClick → client components). Mirror
// the mobile ActionCard / QueueCard / RestaurantSwitcher.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

export interface ActionCardProps {
  readonly title: string;
  readonly detail?: string;
  readonly actionLabel?: string;
  readonly onPress?: () => void;
  readonly tone?: StatusTone;
  readonly accent?: string;
  readonly className?: string;
}

export function ActionCard({ title, detail, actionLabel, onPress, tone = "neutral", accent = accents.restaurant, className }: ActionCardProps) {
  const accentBorder = tone === "warning" ? palette.warningFg : tone === "danger" ? palette.dangerFg : accent;
  const body = (
    <>
      <p className="text-lg font-semibold text-charcoal">{title}</p>
      {detail ? <p className="text-sm text-muted">{detail}</p> : null}
      {actionLabel ? (
        <p className="text-sm font-semibold" style={{ color: accentTextColor(accent) }}>
          {actionLabel}
        </p>
      ) : null}
    </>
  );
  const base = cn("flex min-h-11 flex-col gap-2 rounded-md border border-l-4 border-hairline bg-white p-4 text-left shadow-sm", className);
  if (onPress) {
    return (
      <button type="button" onClick={onPress} aria-label={detail ? `${title}. ${detail}` : title} className={cn(base, "transition hover:bg-forest/5", FOCUS)} style={{ borderLeftColor: accentBorder }}>
        {body}
      </button>
    );
  }
  return (
    <div className={base} style={{ borderLeftColor: accentBorder }}>
      {body}
    </div>
  );
}

export interface QueueCardProps {
  readonly orderNumber: string;
  readonly title: string;
  readonly statusLabel: string;
  readonly statusTone?: StatusTone;
  readonly detailLines?: readonly string[];
  readonly amountLabel?: string;
  readonly incidentLabel?: string;
  readonly selected?: boolean;
  readonly onPress?: () => void;
  readonly accent?: string;
  readonly className?: string;
}

export function QueueCard({
  orderNumber,
  title,
  statusLabel,
  statusTone = "neutral",
  detailLines = [],
  amountLabel,
  incidentLabel,
  selected = false,
  onPress,
  accent = accents.restaurant,
  className,
}: QueueCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold text-charcoal">{orderNumber}</p>
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </div>
      <p className="text-sm text-charcoal">{title}</p>
      {detailLines.map((line) => (
        <p key={line} className="text-xs font-medium text-muted">
          {line}
        </p>
      ))}
      <div className="flex items-center justify-between gap-3">
        {incidentLabel ? <Badge tone="warning">{incidentLabel}</Badge> : <span />}
        {amountLabel ? <span className="text-sm font-semibold text-charcoal">{amountLabel}</span> : null}
      </div>
    </>
  );
  const base = cn("flex flex-col gap-2 rounded-md bg-white p-4", selected ? "border-2 shadow-md" : "border border-hairline shadow-sm", className);
  const style = selected ? { borderColor: accent } : undefined;
  if (onPress) {
    return (
      <button type="button" onClick={onPress} aria-pressed={selected} aria-label={`Order ${orderNumber}. ${title}. ${statusLabel}`} className={cn(base, "text-left transition", FOCUS)} style={style}>
        {body}
      </button>
    );
  }
  return (
    <div className={base} style={style}>
      {body}
    </div>
  );
}

export interface RestaurantSwitcherItem {
  readonly id: string;
  readonly name: string;
  readonly roleLabel?: string;
  readonly statusLabel?: string;
}

export interface RestaurantSwitcherProps {
  readonly restaurants: readonly RestaurantSwitcherItem[];
  readonly selectedId?: string | null;
  readonly onSelect: (id: string) => void;
  readonly accent?: string;
  readonly className?: string;
}

export function RestaurantSwitcher({ restaurants, selectedId, onSelect, accent = accents.restaurant, className }: RestaurantSwitcherProps) {
  if (!restaurants.length) {
    return <p className="text-sm text-muted">No restaurants available for this account.</p>;
  }
  return (
    <div role="menu" aria-label="Restaurant switcher" className={cn("flex flex-col gap-2", className)}>
      {restaurants.map((restaurant) => {
        const selected = restaurant.id === selectedId;
        return (
          <button
            key={restaurant.id}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            aria-label={restaurant.name}
            onClick={() => onSelect(restaurant.id)}
            className={cn("flex flex-col gap-1 rounded-md bg-white p-3 text-left transition", selected ? "border-2" : "border border-hairline hover:bg-forest/5", FOCUS)}
            style={selected ? { borderColor: accent } : undefined}
          >
            <p className="text-base font-semibold text-charcoal">{restaurant.name}</p>
            <div className="flex flex-wrap gap-2">
              {restaurant.roleLabel ? <Badge tone="info">{restaurant.roleLabel}</Badge> : null}
              {restaurant.statusLabel ? <Badge tone={selected ? "success" : "neutral"}>{restaurant.statusLabel}</Badge> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
