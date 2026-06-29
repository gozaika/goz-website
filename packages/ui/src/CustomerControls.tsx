"use client";

import type { ReactNode } from "react";
import { accents, onAccentTextColor, palette } from "@gozaika/design-tokens";
import { cn } from "@gozaika/utils";

// Interactive customer primitives (need onClick → client components). Mirror the
// mobile FilterChipRow / SegmentedToggle / StickyActionBar / PeekBar. Accent
// fills use onAccentTextColor() so on-fill text always meets AA.

export interface FilterChip {
  readonly id: string;
  readonly label: string;
  readonly selected?: boolean;
  readonly disabled?: boolean;
}

export interface FilterChipRowProps {
  readonly chips: readonly FilterChip[];
  readonly onSelect: (id: string) => void;
  readonly accent?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function FilterChipRow({ chips, onSelect, accent = accents.customer, ariaLabel = "Filters", className }: FilterChipRowProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          aria-pressed={Boolean(chip.selected)}
          disabled={chip.disabled}
          onClick={() => onSelect(chip.id)}
          className={cn(
            "min-h-11 rounded-full border px-4 text-sm font-semibold transition disabled:opacity-50",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
            chip.selected ? "border-transparent" : "border-hairline bg-white text-charcoal hover:border-forest/30",
          )}
          style={chip.selected ? { backgroundColor: accent, color: onAccentTextColor(accent) } : undefined}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export interface SegmentedToggleOption {
  readonly id: string;
  readonly label: string;
}

export interface SegmentedToggleProps {
  readonly options: readonly SegmentedToggleOption[];
  readonly selectedId: string;
  readonly onChange: (id: string) => void;
  readonly accent?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function SegmentedToggle({ options, selectedId, onChange, accent = accents.customer, ariaLabel = "View mode", className }: SegmentedToggleProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("inline-flex gap-1 rounded-full border border-hairline bg-white p-1", className)}>
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-9 flex-1 rounded-full px-4 text-sm font-semibold transition",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
              selected ? "" : "text-charcoal hover:bg-forest/5",
            )}
            style={selected ? { backgroundColor: accent, color: onAccentTextColor(accent) } : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface StickyActionBarProps {
  readonly primaryLabel: string;
  readonly onPrimaryPress: () => void;
  readonly disabled?: boolean;
  readonly helperText?: string;
  readonly children?: ReactNode;
  readonly accent?: string;
  readonly className?: string;
}

export function StickyActionBar({ primaryLabel, onPrimaryPress, disabled = false, helperText, children, accent = accents.customer, className }: StickyActionBarProps) {
  return (
    <div className={cn("sticky bottom-0 z-10 flex flex-col gap-2 border-t border-hairline bg-white p-4 shadow-lg", className)}>
      {children}
      {helperText ? <p className="text-sm text-muted">{helperText}</p> : null}
      <button
        type="button"
        onClick={onPrimaryPress}
        disabled={disabled}
        className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: accent, color: onAccentTextColor(accent) }}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

export interface PeekBarProps {
  readonly title: string;
  readonly detail?: string;
  readonly actionLabel: string;
  readonly onPress: () => void;
  readonly accent?: string;
  readonly className?: string;
}

export function PeekBar({ title, detail, actionLabel, onPress, accent = accents.customer, className }: PeekBarProps) {
  const ink = onAccentTextColor(accent);
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={detail ? `${title}. ${detail}. ${actionLabel}` : `${title}. ${actionLabel}`}
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left shadow-md transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
        className,
      )}
      style={{ backgroundColor: accent }}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold" style={{ color: ink }}>
          {title}
        </span>
        {detail ? (
          <span className="block truncate text-xs" style={{ color: ink, opacity: 0.85 }}>
            {detail}
          </span>
        ) : null}
      </span>
      <span className="text-sm font-semibold" style={{ color: ink }}>
        {actionLabel}
      </span>
    </button>
  );
}
