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
  financeSettlementStatusCodes,
  financePayoutEntryTypeCodes,
  roiReportInsightCodes,
  roiReportPeriodRequestSchema,
  adminOpsConfigFlagUpdateSchema,
  adminOpsDropStatusActionSchema,
  adminOpsRefundSupportSchema,
  adminOpsRestaurantStatusActionSchema,
  adminOpsSupportTicketActionSchema,
  refundSupportStatusCodes,
  settlementAdjustmentRequestSchema,
  settlementCreateRequestSchema,
  settlementInvoiceIssueRequestSchema,
  settlementLockRequestSchema,
  settlementStatusUpdateRequestSchema,
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

  it("keeps pilot finance settlement states and payout entry types available", () => {
    expect(financeSettlementStatusCodes).toEqual(expect.arrayContaining(["DRAFT", "LOCKED", "SENT", "PAID", "RECONCILED", "CANCELLED"]));
    expect(financePayoutEntryTypeCodes).toEqual(expect.arrayContaining(["ORDER_GROSS", "COMMISSION", "PAYMENT_FEE", "TAX", "REFUND", "ADJUSTMENT"]));
  });

  it("keeps pilot ROI report insight states available", () => {
    expect(roiReportInsightCodes).toEqual(expect.arrayContaining(["NO_PAID_ORDERS", "SETTLEMENT_LOCKED", "INCIDENTS_PRESENT"]));
  });

  it("keeps admin ops refund workflow states available", () => {
    expect(refundSupportStatusCodes).toEqual(expect.arrayContaining(["REQUESTED", "FINANCE_REVIEW", "TRACKED_EXTERNALLY", "REJECTED"]));
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

  it("validates settlement operation requests", () => {
    expect(
      settlementCreateRequestSchema.safeParse({
        restaurantPk: "11111111-1111-4111-8111-111111111111",
        periodStartAt: "2026-05-01T00:00:00.000Z",
        periodEndAt: "2026-05-08T00:00:00.000Z",
        noteText: "Pilot weekly settlement.",
      }).success,
    ).toBe(true);
    expect(settlementCreateRequestSchema.safeParse({
      restaurantPk: "11111111-1111-4111-8111-111111111111",
      periodStartAt: "2026-05-08T00:00:00.000Z",
      periodEndAt: "2026-05-01T00:00:00.000Z",
    }).success).toBe(false);
    expect(settlementLockRequestSchema.safeParse({ reasonText: "Finance reviewed order-level totals." }).success).toBe(true);
    expect(settlementStatusUpdateRequestSchema.safeParse({ statusCode: "PAID", noteText: "Manual UTR received from bank statement.", providerReferenceText: "settlement_demo_utr" }).success).toBe(true);
    expect(settlementAdjustmentRequestSchema.safeParse({ amountPaise: -1250, descriptionText: "Manual debit for prior overpayment." }).success).toBe(true);
    expect(settlementInvoiceIssueRequestSchema.safeParse({ invoiceNumber: "invoice_demo_001", metadata: { reviewer: "pilot" } }).success).toBe(true);
  });

  it("validates ROI report periods", () => {
    expect(
      roiReportPeriodRequestSchema.safeParse({
        restaurantPk: "11111111-1111-4111-8111-111111111111",
        periodStartAt: "2026-05-01T00:00:00.000Z",
        periodEndAt: "2026-05-08T00:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      roiReportPeriodRequestSchema.safeParse({
        periodStartAt: "2026-05-08T00:00:00.000Z",
        periodEndAt: "2026-05-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
    expect(
      roiReportPeriodRequestSchema.safeParse({
        periodStartAt: "2026-01-01T00:00:00.000Z",
        periodEndAt: "2026-06-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("validates admin ops status and support requests", () => {
    const restaurantPk = "11111111-1111-4111-8111-111111111111";
    expect(
      adminOpsRestaurantStatusActionSchema.safeParse({
        restaurantPk,
        nextStatusCode: "PAUSED",
        reasonText: "Food safety review requested by ops.",
      }).success,
    ).toBe(true);
    expect(
      adminOpsDropStatusActionSchema.safeParse({
        dropPk: restaurantPk,
        nextStatusCode: "PAUSED",
        reasonText: "Partner asked ops to pause claim flow.",
      }).success,
    ).toBe(true);
    expect(
      adminOpsSupportTicketActionSchema.safeParse({
        restaurantPk,
        typeCode: "ORDER_ISSUE",
        priorityCode: "HIGH",
        statusCode: "OPEN",
        subjectText: "Pickup issue for support review",
        reasonText: "Ops created the ticket from the admin queue.",
      }).success,
    ).toBe(true);
  });

  it("validates admin ops refund tracking and config allowlist updates", () => {
    const orderPk = "11111111-1111-4111-8111-111111111111";
    expect(
      adminOpsRefundSupportSchema.safeParse({
        orderPk,
        amountPaise: 34900,
        trackingStatusCode: "FINANCE_REVIEW",
        noteText: "Manual review requested. No provider refund has been initiated.",
        reasonText: "Customer reported missing pickup and support needs finance review.",
      }).success,
    ).toBe(true);
    expect(
      adminOpsConfigFlagUpdateSchema.safeParse({
        flagCode: "MAX_BAGS_PER_DROP",
        scopeCode: "GLOBAL",
        numericValue: 25,
        reasonText: "Pilot cap for first ten restaurants.",
      }).success,
    ).toBe(true);
    expect(
      adminOpsConfigFlagUpdateSchema.safeParse({
        flagCode: "NOT_ALLOWLISTED",
        reasonText: "Trying to change arbitrary config.",
      }).success,
    ).toBe(false);
  });

  it("accepts deterministic Postgres UUIDs used by demo restaurant seeds", () => {
    expect(
      settlementCreateRequestSchema.safeParse({
        restaurantPk: "20000000-0000-0000-0000-000000000001",
        periodStartAt: "2026-05-01T00:00:00.000Z",
        periodEndAt: "2026-05-08T00:00:00.000Z",
      }).success,
    ).toBe(true);
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

  it("allows restaurant contact edits before all onboarding basics are complete", () => {
    const result = restaurantBasicsUpdateSchema.safeParse({
      restaurantPk: "11111111-1111-4111-8111-111111111111",
      restaurantName: "Biryani Baithak",
      restaurantSlug: "biryani-baithak",
      legalEntityName: "",
      primaryContactEmail: "owner@gozaika.example",
      primaryContactPhoneE164: "",
      pickupInstructions: "",
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
