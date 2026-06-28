import { describe, expect, it } from "vitest";
import {
  createPublicDropUrl,
  createIdempotencyKey,
  createPickupQrPayload,
  cuisineCoverKey,
  dropCoverKey,
  dropTypeRibbon,
  financeSettlementStatusLabel,
  financeSettlementStatusTone,
  formatPaise,
  formatBasisPoints,
  formatPickupWindow,
  formatSignedPaise,
  generateManualDropAlertText,
  adminOpsStatusLabel,
  adminOpsStatusTone,
  getDropClaimAvailability,
  generateSupportSafeCsv,
  generateSupportSafeText,
  maskSupportSafe,
  normalizeIndianPhone,
  notificationStatusLabel,
  notificationStatusTone,
  rateLabel,
  rateToBasisPoints,
  rateTone,
  resolveLatestConsent,
  slugifyRestaurantName,
  slaFreshnessLabel,
} from "./index";

describe("money formatting", () => {
  it("formats bigint paise without floating point arithmetic", () => {
    expect(formatPaise(129900n)).toBe("\u20B91,299");
    expect(formatPaise(129955n)).toBe("\u20B91,299.55");
  });

  it("formats signed settlement line items without floating point arithmetic", () => {
    expect(formatSignedPaise(-129955n)).toBe("-\u00A0\u20B91,299.55");
    expect(formatSignedPaise(5000n)).toBe("+\u00A0\u20B950");
    expect(formatSignedPaise(0n)).toBe("\u20B90");
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

describe("rate formatting", () => {
  it("formats basis point rates without noisy decimals", () => {
    expect(rateToBasisPoints(7, 10)).toBe(7000);
    expect(formatBasisPoints(7000)).toBe("70%");
    expect(formatBasisPoints(3333)).toBe("33.33%");
    expect(formatBasisPoints(null)).toBe("Not enough data");
  });

  it("labels rate tones for pilot reports", () => {
    expect(rateTone(8000)).toBe("success");
    expect(rateTone(5000)).toBe("warning");
    expect(rateTone(2500)).toBe("danger");
    expect(rateLabel(null)).toBe("Not enough data");
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

describe("notification status helpers", () => {
  it("keeps provider and consent states plain-language", () => {
    expect(notificationStatusLabel("FAILED", "PROVIDER_NOT_CONFIGURED")).toBe("Delivery unavailable");
    expect(notificationStatusLabel("SUPPRESSED", "CONSENT_NOT_GRANTED")).toBe("Unavailable by consent");
    expect(notificationStatusTone("FAILED")).toBe("danger");
    expect(notificationStatusTone("SENT")).toBe("success");
  });
});

describe("finance status helpers", () => {
  it("labels and tones settlement states", () => {
    expect(financeSettlementStatusLabel("SENT")).toBe("Payout sent");
    expect(financeSettlementStatusTone("RECONCILED")).toBe("success");
    expect(financeSettlementStatusTone("CANCELLED")).toBe("danger");
  });
});

describe("admin ops helpers", () => {
  it("labels admin ops statuses and SLA freshness", () => {
    expect(adminOpsStatusLabel("MERCHANT_ACTION_REQUIRED")).toBe("Partner action required");
    expect(adminOpsStatusTone("SUSPENDED")).toBe("danger");
    expect(slaFreshnessLabel("2026-05-18T18:00:00.000Z", new Date("2026-05-18T17:30:00.000Z"))).toBe("Due in 30m");
    expect(slaFreshnessLabel("2026-05-18T17:00:00.000Z", new Date("2026-05-18T17:30:00.000Z"))).toBe("Overdue 30m");
  });

  it("generates bounded support-safe copy formats", () => {
    expect(maskSupportSafe("person@example.com")).toBe("pe***@example.com");
    const rows = [{ order: "GZ-1", note: "pickup issue", amount: 34900 }];
    expect(generateSupportSafeCsv(rows, ["order", "note"])).toContain("GZ-1,pickup issue");
    expect(generateSupportSafeText("Queue", rows, ["order", "amount"])).toContain("Rows: 1");
  });
});

describe("claim availability", () => {
  const futurePickupEndAt = "2026-05-18T18:30:00.000Z";
  const now = new Date("2026-05-18T17:00:00.000Z");

  it("allows active and scheduled drops with available quantity", () => {
    expect(getDropClaimAvailability({ statusCode: "ACTIVE", quantityAvailable: 1, pickupEndAt: futurePickupEndAt }, now).canClaim).toBe(true);
    expect(getDropClaimAvailability({ statusCode: "SCHEDULED", quantityAvailable: 2, pickupEndAt: futurePickupEndAt }, now).canClaim).toBe(true);
  });

  it("explains unavailable claim states", () => {
    expect(getDropClaimAvailability({ statusCode: "PAUSED", quantityAvailable: 3, pickupEndAt: futurePickupEndAt }, now).reason).toBe("Paused by restaurant");
    expect(getDropClaimAvailability({ statusCode: "ACTIVE", quantityAvailable: 0, pickupEndAt: futurePickupEndAt }, now).reason).toBe("Sold out");
    expect(
      getDropClaimAvailability({ statusCode: "ACTIVE", quantityAvailable: 3, pickupEndAt: "2026-05-18T16:00:00.000Z" }, now).reason,
    ).toBe("Pickup window closed");
  });
});

describe("cover art resolution", () => {
  it("maps cuisine keywords (name + tags) to cover keys", () => {
    expect(cuisineCoverKey("Bawarchi Biryani Palace")).toBe("biryani");
    expect(cuisineCoverKey("The Smoky Grill")).toBe("grill");
    expect(cuisineCoverKey("Andhra Spice Trail")).toBe("coastal");
    expect(cuisineCoverKey("Sweet Bytes Bakery")).toBe("bakery");
    expect(cuisineCoverKey("Sattvik Kitchen")).toBe("thali");
    expect(cuisineCoverKey("Generic Place", ["seafood"])).toBe("coastal");
    expect(cuisineCoverKey("No Match Here")).toBeNull();
  });

  it("hides cuisine for blind-bag drops via the mystery cover", () => {
    expect(dropCoverKey({ restaurantName: "Sweet Bytes Bakery", dropTypeCode: "BLIND_ADVENTURE" })).toBe("mystery");
    expect(dropCoverKey({ restaurantName: "Bawarchi Biryani Palace", dropTypeCode: "CHEF_SPECIAL" })).toBe("biryani");
    expect(dropCoverKey({ restaurantName: "The Smoky Grill", dropTypeCode: "STANDARD" })).toBe("grill");
    expect(dropCoverKey({ restaurantName: "No Match Here", dropTypeCode: "STANDARD" })).toBeNull();
  });

  it("labels only premium drop types with a ribbon", () => {
    expect(dropTypeRibbon("CHEF_SPECIAL")).toBe("Chef's Special");
    expect(dropTypeRibbon("SPOTLIGHT")).toBe("Spotlight");
    expect(dropTypeRibbon("BLIND_ADVENTURE")).toBeNull();
    expect(dropTypeRibbon("STANDARD")).toBeNull();
    expect(dropTypeRibbon(undefined)).toBeNull();
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
