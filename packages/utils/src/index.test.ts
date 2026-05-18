import { describe, expect, it } from "vitest";
import {
  createPublicDropUrl,
  createIdempotencyKey,
  createPickupQrPayload,
  formatPaise,
  formatPickupWindow,
  generateManualDropAlertText,
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

describe("manual drop launch comms", () => {
  const drop = {
    dropPk: "33000000-0000-0000-0000-000000000001",
    dropTitle: "Chef's mystery dinner bag",
    restaurantName: "Biryani Baithak",
    neighborhoodName: "Banjara Hills",
    dietaryCategoryCode: "NON_VEG",
    allergenSummaryText: "May contain dairy and gluten.",
    allergenCodes: ["DAIRY", "GLUTEN"],
    pricePaise: 34900,
    pickupStartAt: "2026-04-25T12:30:00.000Z",
    pickupEndAt: "2026-04-25T13:30:00.000Z",
    quantityTotal: 10,
    quantityAvailable: 7,
    statusCode: "ACTIVE",
  };

  it("builds stable public drop URLs", () => {
    expect(createPublicDropUrl(drop.dropPk)).toBe(
      "https://customer.gozaika.in/drops/33000000-0000-0000-0000-000000000001",
    );
  });

  it("generates WhatsApp-safe alert text from drop fields", () => {
    const message = generateManualDropAlertText(drop);

    expect(message).toContain("Restaurant: Biryani Baithak");
    expect(message).toContain("Availability: 7 of 10 bags shown as available");
    expect(message).toContain("Dietary: Non-Veg");
    expect(message).toContain("Allergens: DAIRY, GLUTEN. May contain dairy and gluten.");
    expect(message).toContain("Check allergens before claiming.");
    expect(message).toContain("https://customer.gozaika.in/drops/33000000-0000-0000-0000-000000000001");
  });

  it("does not imply unavailable drops are claimable", () => {
    const message = generateManualDropAlertText({ ...drop, statusCode: "PAUSED", quantityAvailable: 0 });

    expect(message).toContain("Availability: Not available to claim right now");
    expect(message).toContain("Status: Sold out");
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
