import { describe, expect, it } from "vitest";
import {
  createIdempotencyKey,
  createPickupQrPayload,
  formatPaise,
  formatPickupWindow,
  normalizeIndianPhone,
  resolveLatestConsent,
  slugifyRestaurantName,
} from "./index";

describe("money formatting", () => {
  it("formats bigint paise without floating point arithmetic", () => {
    expect(formatPaise(129900n)).toBe("\u20B91,299");
    expect(formatPaise(129955n)).toBe("\u20B91,299.55");
  });
});

describe("consent resolution", () => {
  it("resolves latest purpose-scoped consent from append-only events", () => {
    const latest = resolveLatestConsent([
      { purposeCode: "MARKETING", granted: true, createdAt: "2026-04-25T01:00:00.000Z" },
      { purposeCode: "WHATSAPP", granted: true, createdAt: "2026-04-25T01:05:00.000Z" },
      { purposeCode: "MARKETING", granted: false, createdAt: "2026-04-25T01:10:00.000Z" },
    ]);

    expect(latest.get("MARKETING")).toBe(false);
    expect(latest.get("WHATSAPP")).toBe(true);
  });
});

describe("pickup window formatting", () => {
  it("formats pickup windows in India time by default", () => {
    expect(formatPickupWindow("2026-04-25T12:30:00.000Z", "2026-04-25T13:30:00.000Z")).toContain("6:00");
  });
});

describe("phone and payload helpers", () => {
  it("normalizes Indian phone numbers", () => {
    expect(normalizeIndianPhone("98765 43210")).toBe("+919876543210");
  });

  it("creates bounded idempotency keys", () => {
    expect(createIdempotencyKey("Claim Hold", "actor", "entropy")).toBe("claim-hold:actor:entropy");
  });

  it("creates versioned QR payload JSON", () => {
    const payload = createPickupQrPayload({
      orderPk: "order",
      restaurantPk: "restaurant",
      nonce: "nonce",
      issuedAt: "2026-04-25T00:00:00.000Z",
    });

    expect(JSON.parse(payload)).toMatchObject({ version: 1, orderPk: "order" });
  });

  it("creates restaurant-safe slugs", () => {
    expect(slugifyRestaurantName("Charminar Chai Co.")).toBe("charminar-chai-co");
    expect(slugifyRestaurantName("Biryani & More")).toBe("biryani-and-more");
  });
});
