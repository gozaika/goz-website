/**
 * WCAG 2.2 contrast helpers (shared spec §8 requires AA). Pure functions so the
 * palette can be unit-tested without rendering.
 */
import { palette } from "./colors";

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    throw new Error(`Expected a 6-digit hex color, got "${hex}"`);
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** AA: 4.5:1 for normal text, 3:1 for large text (>=18.66px bold / 24px). */
export function meetsAA(fg: string, bg: string, large = false): boolean {
  return contrastRatio(fg, bg) >= (large ? 3 : 4.5);
}

// Accent colors double as fills (buttons, rings, bars) and as text. As fills they
// only need the 3:1 graphics threshold, but as text on a light surface they must
// meet AA (4.5:1). The two helpers below keep that distinction honest so accent
// text never ships below AA, regardless of which accent a screen passes in.

/**
 * Readable color for rendering an accent **as text** on a light (white/cream)
 * surface. Known brand accents that fail AA as text map to their darker
 * companion; any other accent is kept when it already meets AA on cream, else it
 * falls back to charcoal. Pass the result to `<Text color={...}>`.
 */
export function accentTextColor(accent: string): string {
  if (accent === palette.saffron) return palette.saffronText;
  if (accent === palette.gold) return palette.goldText;
  return meetsAA(accent, palette.cream) ? accent : palette.charcoal;
}

/**
 * Readable text/icon color to place **on top of an accent fill** (e.g. a primary
 * button). Prefers white when it meets AA, otherwise charcoal; if neither meets
 * AA on a mid-tone accent it returns the higher-contrast of the two.
 */
export function onAccentTextColor(accent: string): string {
  const whiteRatio = contrastRatio(palette.white, accent);
  const charcoalRatio = contrastRatio(palette.charcoal, accent);
  const whiteOk = whiteRatio >= 4.5;
  const charcoalOk = charcoalRatio >= 4.5;
  if (whiteOk && (!charcoalOk || whiteRatio >= charcoalRatio)) return palette.white;
  if (charcoalOk) return palette.charcoal;
  return whiteRatio >= charcoalRatio ? palette.white : palette.charcoal;
}
