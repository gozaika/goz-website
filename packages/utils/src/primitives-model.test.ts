import { describe, expect, it } from "vitest";
import { clampProgress, formatCountdownParts, progressPercent } from "./primitives-model";

// Shared by the mobile + web primitive ports — lock the tone thresholds so the
// CountdownChip reads identically on both surfaces.
describe("primitives-model", () => {
  it("clamps progress to [0,1] and rejects non-finite", () => {
    expect(clampProgress(-1)).toBe(0);
    expect(clampProgress(2)).toBe(1);
    expect(clampProgress(0.5)).toBe(0.5);
    expect(clampProgress(Number.NaN)).toBe(0);
  });

  it("renders progress as a rounded percent", () => {
    expect(progressPercent(0.5)).toBe(50);
    expect(progressPercent(0.333)).toBe(33);
    expect(progressPercent(5)).toBe(100);
  });

  it("marks an elapsed target as closed/expired/danger", () => {
    const parts = formatCountdownParts(0, 1000);
    expect(parts).toEqual({ label: "Closed", tone: "danger", expired: true });
  });

  it("uses danger tone within 15 minutes, warning under an hour", () => {
    const now = new Date("2026-06-29T12:00:00Z");
    expect(formatCountdownParts(new Date("2026-06-29T12:10:00Z"), now).tone).toBe("danger");
    expect(formatCountdownParts(new Date("2026-06-29T12:40:00Z"), now).tone).toBe("warning");
    expect(formatCountdownParts(new Date("2026-06-29T15:00:00Z"), now).tone).toBe("neutral");
  });

  it("formats hours and minutes for longer windows", () => {
    const now = new Date("2026-06-29T12:00:00Z");
    expect(formatCountdownParts(new Date("2026-06-29T14:30:00Z"), now).label).toBe("2 hr 30 min left");
    expect(formatCountdownParts(new Date("2026-06-29T14:00:00Z"), now).label).toBe("2 hr left");
  });

  it("handles unparseable input gracefully", () => {
    expect(formatCountdownParts("not-a-date", Date.now()).label).toBe("Time unavailable");
  });
});
