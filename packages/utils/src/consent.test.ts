import { describe, expect, it } from "vitest";
import { isAllowedDemoSupabaseUrl, resolveLatestConsent } from "./index";

describe("resolveLatestConsent", () => {
  it("returns the newest consent event per purpose", () => {
    const latest = resolveLatestConsent([
      { purposeCode: "MARKETING", state: "GRANTED", recordedAt: "2026-01-01T00:00:00.000Z" },
      { purposeCode: "MARKETING", state: "REVOKED", recordedAt: "2026-01-02T00:00:00.000Z" },
      { purposeCode: "ANALYTICS", state: "GRANTED", recordedAt: "2026-01-01T00:00:00.000Z" },
    ]);

    expect(latest.get("MARKETING")).toBe(false);
    expect(latest.get("ANALYTICS")).toBe(true);
  });
});

describe("isAllowedDemoSupabaseUrl", () => {
  it("allows local Supabase URLs by default", () => {
    expect(isAllowedDemoSupabaseUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isAllowedDemoSupabaseUrl("http://localhost:54321")).toBe(true);
  });

  it("refuses remote URLs unless explicitly allowed", () => {
    expect(isAllowedDemoSupabaseUrl("https://example.supabase.co")).toBe(false);
    expect(isAllowedDemoSupabaseUrl("https://example.supabase.co", true)).toBe(true);
  });
});
