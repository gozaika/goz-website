import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { palette } from "@gozaika/design-tokens";

// theme.css mirrors the TS palette (CSS @theme can only take literal values).
// Lock the two together so a hand-edit of one without the other fails the gate.
const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "theme.css"), "utf8");

function cssVar(name: string): string | null {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`));
  return m?.[1] ? m[1].toUpperCase() : null;
}

describe("web theme.css mirrors @gozaika/design-tokens palette", () => {
  const cases: Array<[string, string]> = [
    ["saffron", palette.saffron],
    ["saffron-text", palette.saffronText],
    ["forest", palette.forest],
    ["gold", palette.gold],
    ["gold-text", palette.goldText],
    ["cream", palette.cream],
    ["charcoal", palette.charcoal],
    ["muted", palette.muted],
    ["hairline", palette.border],
    ["success", palette.successFg],
    ["success-soft", palette.successBg],
    ["warning", palette.warningFg],
    ["warning-soft", palette.warningBg],
    ["danger", palette.dangerFg],
    ["danger-soft", palette.dangerBg],
    ["info", palette.infoFg],
    ["info-soft", palette.infoBg],
  ];

  it.each(cases)("--color-%s === palette literal", (name, expected) => {
    expect(cssVar(name)).toBe(expected.toUpperCase());
  });
});
