/**
 * Canonical goZaika palette (shared architecture spec §8) — the single source of
 * truth for BOTH the native apps (`@gozaika/mobile-ui` re-exports this) and the
 * web apps (`@gozaika/ui` re-exports this + maps it into Tailwind). Framework-
 * neutral: no React-Native or DOM imports, so the contrast math is unit-testable
 * and both surfaces share the exact same AA-safe companions.
 *
 * Customer surfaces emphasize saffron/cream; restaurant surfaces emphasize
 * forest/cream. Every status color ships with a readable text/icon companion
 * (never color-only).
 */
export const palette = {
  saffron: "#FF6B35",
  forest: "#1A5C38",
  gold: "#D4A017",
  // Brand saffron/gold are vivid enough for fills and graphics but fail WCAG AA
  // as text on light surfaces (saffron 2.84:1, gold 2.38:1 on white). These
  // darker companions are AA-readable as text on white/cream and keep the same
  // hue family; use `accentTextColor()` to pick them automatically.
  saffronText: "#B23C0E",
  goldText: "#7A5C00",
  cream: "#FFF8F0",
  charcoal: "#2D2D2D",
  white: "#FFFFFF",
  muted: "#6B7280",
  border: "#E5E7EB",
  // status hues
  successBg: "#E7F4EC",
  successFg: "#1A5C38",
  warningBg: "#FDF3E2",
  warningFg: "#8A5A00",
  dangerBg: "#FCEBEA",
  dangerFg: "#B3261E",
  infoBg: "#EAF1FB",
  infoFg: "#1C4E8A",
} as const;

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface ToneColors {
  readonly bg: string;
  readonly fg: string;
}

export function toneColors(tone: StatusTone): ToneColors {
  switch (tone) {
    case "success":
      return { bg: palette.successBg, fg: palette.successFg };
    case "warning":
      return { bg: palette.warningBg, fg: palette.warningFg };
    case "danger":
      return { bg: palette.dangerBg, fg: palette.dangerFg };
    case "info":
      return { bg: palette.infoBg, fg: palette.infoFg };
    case "neutral":
      return { bg: palette.border, fg: palette.charcoal };
  }
}

/** App accent themes. */
export const accents = {
  customer: palette.saffron,
  restaurant: palette.forest,
} as const;
