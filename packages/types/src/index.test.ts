import { describe, expect, it } from "vitest";
import {
  claimIntentStatusCodes,
  claimRequestSchema,
  dropStatusCodes,
  restaurantBasicsUpdateSchema,
  restaurantComplianceUpdateSchema,
  restaurantDocumentStatusCodes,
  restaurantDocumentUploadRequestSchema,
  restaurantStatusCodes,
  orderStatusCodes,
  pickupVerificationRequestSchema,
} from "./index";

describe("goZaika status constants", () => {
  it("keeps critical drop lifecycle statuses available", () => {
    expect(dropStatusCodes).toContain("ACTIVE");
    expect(dropStatusCodes).toContain("EMERGENCY_CLOSED");
  });

  it("keeps pickup-ready and collected order states available", () => {
    expect(orderStatusCodes).toContain("READY_FOR_PICKUP");
    expect(orderStatusCodes).toContain("COLLECTED");
  });

  it("keeps claim hold intent states separate from paid order states", () => {
    expect(claimIntentStatusCodes).toContain("ACTIVE");
    expect(claimIntentStatusCodes).toContain("EXPIRED");
  });

  it("keeps restaurant onboarding and compliance statuses available", () => {
    expect(restaurantStatusCodes).toContain("ONBOARDING");
    expect(restaurantStatusCodes).toContain("ACTIVE");
    expect(restaurantDocumentStatusCodes).toContain("PENDING_REVIEW");
    expect(restaurantDocumentStatusCodes).toContain("REJECTED");
  });
});

describe("API schemas", () => {
  it("validates inventory claim requests", () => {
    const result = claimRequestSchema.safeParse({
      dropPk: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "claim-111111111111",
      quantity: 1,
    });

    expect(result.success).toBe(true);
  });

  it("requires exactly one pickup credential", () => {
    const result = pickupVerificationRequestSchema.safeParse({
      restaurantPk: "11111111-1111-4111-8111-111111111111",
      deviceLabel: "Counter 1",
      otp: "123456",
      nonce: "n".repeat(40),
    });

    expect(result.success).toBe(false);
  });

  it("validates restaurant onboarding basics", () => {
    const result = restaurantBasicsUpdateSchema.safeParse({
      restaurantPk: "11111111-1111-4111-8111-111111111111",
      restaurantName: "Biryani Baithak",
      restaurantSlug: "biryani-baithak",
      legalEntityName: "Biryani Baithak LLP",
      primaryContactEmail: "owner@gozaika.example",
      primaryContactPhoneE164: "+919876543210",
      pickupInstructions: "Pickup from the main billing counter during the window.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsafe compliance and document inputs", () => {
    expect(
      restaurantComplianceUpdateSchema.safeParse({
        restaurantPk: "11111111-1111-4111-8111-111111111111",
        fssaiLicenseNumber: "123",
        fssaiLicenseExpiryDate: "2028-03-31",
        gstin: "36ABCDE1234F1Z5",
        panNumber: "ABCDE1234F",
      }).success,
    ).toBe(false);

    expect(
      restaurantDocumentUploadRequestSchema.safeParse({
        restaurantPk: "11111111-1111-4111-8111-111111111111",
        documentTypeCode: "FSSAI_LICENSE",
        fileName: "license.exe",
        mimeType: "application/x-msdownload",
        sizeBytes: 100,
      }).success,
    ).toBe(false);
  });
});
