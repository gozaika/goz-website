import { describe, expect, it } from "vitest";
import { clampProgress, formatCountdownParts, progressPercent } from "./customerPrimitivesModel";

describe("customer primitive model helpers", () => {
  it("formats countdown labels without fabricating state", () => {
    expect(formatCountdownParts("2026-06-25T12:10:00.000Z", "2026-06-25T12:00:00.000Z")).toEqual({
      label: "10 min left",
      tone: "danger",
      expired: false,
    });
    expect(formatCountdownParts("2026-06-25T14:30:00.000Z", "2026-06-25T12:00:00.000Z")).toMatchObject({
      label: "2 hr 30 min left",
      tone: "neutral",
    });
    expect(formatCountdownParts("2026-06-25T11:59:00.000Z", "2026-06-25T12:00:00.000Z")).toEqual({
      label: "Closed",
      tone: "danger",
      expired: true,
    });
  });

  it("clamps progress values for loyalty visuals", () => {
    expect(clampProgress(-0.2)).toBe(0);
    expect(clampProgress(0.42)).toBe(0.42);
    expect(clampProgress(1.8)).toBe(1);
    expect(progressPercent(0.625)).toBe(63);
  });
});
