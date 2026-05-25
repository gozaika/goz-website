import { describe, expect, it } from "vitest";
import {
  claimIntentStatusCodes,
  claimRequestSchema,
  razorpayCheckoutOrderRequestSchema,
  dropStatusCodes,
  restaurantBasicsUpdateSchema,
  restaurantComplianceUpdateSchema,
  restaurantDocumentStatusCodes,
  restaurantDocumentUploadRequestSchema,
  restaurantStatusCodes,
  orderStatusCodes,
  notificationRetryRequestSchema,
  notificationStatusCodes,
  notificationTemplateCodes,
  orderIncidentCreateSchema,
  pickupVerificationRequestSchema,
} from "./index";

describe("goZaika status constants", () => {
  it("keeps critical drop lifecycle statuses available", () => {
    expect(dropStatusCodes).toContain("ACTIVE");
    expect(dropStatusCodes).toContain("EMERGENCY_CLOSED");
  });

  it("keeps pickup-ready and collected order states available", () => {
    expect(orderStatusCodes).toContain("CREATED");
    expect(orderStatusCodes).toContain("READY_FOR_PICKUP");
    expect(orderStatusCodes).toContain("COLLECTED");
  });

  it("keeps transactional notification states and templates available", () => {
    expect(notificationStatusCodes).toEqual(expect.arrayContaining(["QUEUED", "SENT", "FAILED", "SUPPRESSED"]));
    expect(notificationTemplateCodes).toEqual(expect.arrayContaining(["ORDER_CONFIRMATION", "PICKUP_REMINDER", "RESTAURANT_NEW_ORDER_ALERT"]));
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

  it("validates Razorpay checkout order requests", () => {
    const result = razorpayCheckoutOrderRequestSchema.safeParse({
      holdPk: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "checkout-111111111111",
    });

    expect(result.success).toBe(true);
  });

  it("requires exactly one pickup credential", () => {
    const result = pickupVerificationRequestSchema.safeParse({
      deviceLabel: "Counter 1",
      otp: "123456",
      qrPayload: JSON.stringify({
        version: 1,
        orderPk: "11111111-1111-4111-8111-111111111111",
        restaurantPk: "11111111-1111-4111-8111-111111111111",
        nonce: "n".repeat(40),
        issuedAt: "2026-05-24T00:00:00.000Z",
      }),
    });

    expect(result.success).toBe(false);
  });

  it("validates pilot incident creation inputs", () => {
    const result = orderIncidentCreateSchema.safeParse({
      typeCode: "FOOD_SAFETY",
      severityCode: "P1",
      descriptionText: "Customer reported a possible contamination issue at pickup.",
      internalNoteText: "Escalated to ops lead.",
    });

    expect(result.success).toBe(true);
  });

  it("validates notification retry reasons", () => {
    expect(notificationRetryRequestSchema.safeParse({ reasonText: "Provider credentials were restored." }).success).toBe(true);
    expect(notificationRetryRequestSchema.safeParse({ reasonText: "retry" }).success).toBe(false);
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
