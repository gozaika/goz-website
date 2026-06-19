import { describe, expect, it } from "vitest";
import { createServerClock } from "./serverTime";

describe("createServerClock", () => {
  it("is unsynced until fed a server time", () => {
    const clock = createServerClock(() => 1000);
    expect(clock.isSynced).toBe(false);
    expect(clock.offsetMs).toBe(0);
    expect(clock.nowMs()).toBe(1000);
  });

  it("computes the offset against a skewed device clock", () => {
    // Device thinks it is epoch 1000ms; server says 6000ms -> +5000 offset.
    const clock = createServerClock(() => 1000);
    clock.syncFromIso(new Date(6000).toISOString());
    expect(clock.isSynced).toBe(true);
    expect(clock.offsetMs).toBe(5000);
    expect(clock.nowMs()).toBe(6000);
  });

  it("ignores an unparseable timestamp", () => {
    const clock = createServerClock(() => 1000);
    clock.syncFromIso("not-a-date");
    expect(clock.isSynced).toBe(false);
    expect(clock.offsetMs).toBe(0);
  });
});
