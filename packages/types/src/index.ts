import { z } from "zod";

export const dietaryCategoryCodes = ["VEG", "NON_VEG", "JAIN", "EGG_ONLY"] as const;
export const spiceLevelCodes = ["MILD", "MEDIUM", "HOT", "EXTRA_HOT"] as const;

export const dropStatusCodes = [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "SOLD_OUT",
  "PICKUP_CLOSED",
  "EMERGENCY_CLOSED",
  "CANCELLED",
] as const;

export const orderStatusCodes = [
  "CREATED",
  "PAYMENT_PENDING",
  "PAID",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "COLLECTED",
  "PICKUP_EXPIRED",
  "CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
  "NO_SHOW",
] as const;

export const holdStatusCodes = ["ACTIVE", "CONVERTED", "RELEASED", "EXPIRED"] as const;
export const paymentIntentStatusCodes = [
  "CREATED",
  "RAZORPAY_ORDER_CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "EXPIRED",
] as const;

export const platformRoleCodes = [
  "SUPER_ADMIN",
  "SUPPORT_ADMIN",
  "FINANCE_ADMIN",
  "OPS_ADMIN",
] as const;

export const restaurantStatusCodes = ["PENDING", "ONBOARDING", "ACTIVE", "PAUSED", "SUSPENDED", "OFFBOARDED"] as const;
export const restaurantTeamRoleCodes = ["OWNER", "ADMIN", "OPERATIONS", "PICKUP_STAFF", "FINANCE"] as const;
export const restaurantComplianceStatusCodes = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"] as const;
export const restaurantDocumentTypeCodes = [
  "FSSAI_LICENSE",
  "GST_CERTIFICATE",
  "PAN_CARD",
  "BANK_CANCELLED_CHEQUE",
  "FOOD_SAFETY_AUDIT",
  "MENU_CARD",
  "IDENTITY_PROOF",
] as const;
export const restaurantDocumentStatusCodes = [
  "PENDING_REVIEW",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
] as const;
export const restaurantOnboardingTaskStatusCodes = ["PENDING", "IN_PROGRESS", "BLOCKED", "COMPLETED", "WAIVED"] as const;
export const restaurantOnboardingTaskCodes = [
  "PROFILE",
  "LOCATION_PICKUP",
  "COMPLIANCE_DETAILS",
  "DOCUMENT_UPLOAD",
  "CONTACTS",
  "REVIEW_SUBMISSION",
] as const;

export const consentPurposeCodes = [
  "OPERATIONAL",
  "MARKETING",
  "ANALYTICS",
  "REFERRAL_COMMS",
  "WHATSAPP_TRANSACTIONAL",
  "WHATSAPP_MARKETING",
] as const;

export const consentStateCodes = ["GRANTED", "REVOKED"] as const;
export const pickupVerificationMethodCodes = ["OTP_ENTRY", "QR_SCAN"] as const;
export const pickupVerificationResultCodes = [
  "SUCCESS",
  "INVALID_CODE",
  "WRONG_RESTAURANT",
  "ALREADY_COLLECTED",
  "EXPIRED_WINDOW",
  "ORDER_NOT_READY",
] as const;
export const incidentTypeCodes = [
  "DIETARY_MISMATCH",
  "FOOD_SAFETY",
  "PACKAGING_BREACH",
  "PICKUP_NOT_HONORED",
  "MISSING_ORDER",
  "QUALITY_ISSUE",
  "PLATFORM_ERROR",
] as const;
export const incidentSeverityCodes = ["P1", "P2", "P3", "P4"] as const;
export const incidentStatusCodes = [
  "OPEN",
  "TRIAGED",
  "INVESTIGATING",
  "MERCHANT_ACTION_REQUIRED",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
] as const;

export const notificationChannelCodes = ["EMAIL", "WHATSAPP", "SMS", "PUSH"] as const;
export const notificationStatusCodes = ["QUEUED", "SENDING", "SENT", "FAILED", "CANCELLED", "SUPPRESSED"] as const;
export const notificationAttemptStatusCodes = ["SENT", "FAILED", "RETRYING", "DROPPED"] as const;
export const notificationProviderCodes = ["META_WHATSAPP", "WATI", "RESEND", "DRY_RUN", "MANUAL", "SYSTEM"] as const;
export const notificationTemplateCodes = [
  "ORDER_CONFIRMATION",
  "PICKUP_REMINDER",
  "RESTAURANT_NEW_ORDER_ALERT",
  "RESTAURANT_PICKUP_ALERT",
  "INCIDENT_HIGH_SEVERITY_ALERT",
] as const;
export const notificationAudienceCodes = ["CONSUMER", "RESTAURANT", "ADMIN"] as const;
export const financeSettlementStatusCodes = [
  "DRAFT",
  "OPEN",
  "LOCKED",
  "SENT",
  "PAID",
  "RECONCILED",
  "CANCELLED",
] as const;
export const financeInvoiceStatusCodes = ["DRAFT", "ISSUED", "PAID", "VOID"] as const;
export const financePayoutEntryTypeCodes = [
  "ORDER_GROSS",
  "COMMISSION",
  "PAYMENT_FEE",
  "TAX",
  "REFUND",
  "ADJUSTMENT",
  "PAYOUT",
] as const;
export const financeOrderEligibilityStatusCodes = ["ELIGIBLE", "EXCLUDED"] as const;
export const roiReportInsightCodes = [
  "NO_DROPS_LISTED",
  "NO_PAID_ORDERS",
  "PICKUP_WINDOW_OPEN",
  "SETTLEMENT_NOT_LOCKED",
  "SETTLEMENT_LOCKED",
  "REFUNDS_OR_DEBITS_PRESENT",
  "INCIDENTS_PRESENT",
  "REPEAT_BUYER_DATA_THIN",
  "SELL_THROUGH_STRONG",
  "SELL_THROUGH_NEEDS_ATTENTION",
] as const;
export const roiReportEstimateBasisCodes = ["ESTIMATED", "SETTLEMENT_LOCKED", "INSUFFICIENT_DATA"] as const;
export const adminOpsQueueTypeCodes = ["INCIDENT", "SUPPORT", "REFUND"] as const;
export const adminOpsConfigFlagCodes = [
  "CLAIMS_ENABLED",
  "PUBLISHING_ENABLED",
  "MAX_BAGS_PER_DROP",
] as const;
export const refundSupportStatusCodes = [
  "REQUESTED",
  "OPS_REVIEW",
  "FINANCE_REVIEW",
  "APPROVED_MANUAL",
  "TRACKED_EXTERNALLY",
  "REJECTED",
  "CANCELLED",
] as const;

export type DietaryCategoryCode = (typeof dietaryCategoryCodes)[number];
export type SpiceLevelCode = (typeof spiceLevelCodes)[number];
export type DropStatusCode = (typeof dropStatusCodes)[number];
export type OrderStatusCode = (typeof orderStatusCodes)[number];
export type HoldStatusCode = (typeof holdStatusCodes)[number];
export type PaymentIntentStatusCode = (typeof paymentIntentStatusCodes)[number];
export type PickupVerificationMethodCode = (typeof pickupVerificationMethodCodes)[number];
export type PickupVerificationResultCode = (typeof pickupVerificationResultCodes)[number];
export type IncidentTypeCode = (typeof incidentTypeCodes)[number];
export type IncidentSeverityCode = (typeof incidentSeverityCodes)[number];
export type IncidentStatusCode = (typeof incidentStatusCodes)[number];
export type NotificationChannelCode = (typeof notificationChannelCodes)[number];
export type NotificationStatusCode = (typeof notificationStatusCodes)[number];
export type NotificationAttemptStatusCode = (typeof notificationAttemptStatusCodes)[number];
export type NotificationProviderCode = (typeof notificationProviderCodes)[number];
export type NotificationTemplateCode = (typeof notificationTemplateCodes)[number];
export type NotificationAudienceCode = (typeof notificationAudienceCodes)[number];
export type FinanceSettlementStatusCode = (typeof financeSettlementStatusCodes)[number];
export type FinanceInvoiceStatusCode = (typeof financeInvoiceStatusCodes)[number];
export type FinancePayoutEntryTypeCode = (typeof financePayoutEntryTypeCodes)[number];
export type FinanceOrderEligibilityStatusCode = (typeof financeOrderEligibilityStatusCodes)[number];
export type RoiReportInsightCode = (typeof roiReportInsightCodes)[number];
export type RoiReportEstimateBasisCode = (typeof roiReportEstimateBasisCodes)[number];
export type AdminOpsQueueTypeCode = (typeof adminOpsQueueTypeCodes)[number];
export type AdminOpsConfigFlagCode = (typeof adminOpsConfigFlagCodes)[number];
export type RefundSupportStatusCode = (typeof refundSupportStatusCodes)[number];
export type PlatformRoleCode = (typeof platformRoleCodes)[number];
export type RestaurantStatusCode = (typeof restaurantStatusCodes)[number];
export type RestaurantTeamRoleCode = (typeof restaurantTeamRoleCodes)[number];
export type RestaurantComplianceStatusCode = (typeof restaurantComplianceStatusCodes)[number];
export type RestaurantDocumentTypeCode = (typeof restaurantDocumentTypeCodes)[number];
export type RestaurantDocumentStatusCode = (typeof restaurantDocumentStatusCodes)[number];
export type RestaurantOnboardingTaskStatusCode = (typeof restaurantOnboardingTaskStatusCodes)[number];
export type RestaurantOnboardingTaskCode = (typeof restaurantOnboardingTaskCodes)[number];
export type ConsentPurposeCode = (typeof consentPurposeCodes)[number];
export type ConsentStateCode = (typeof consentStateCodes)[number];

export const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID",
);
export const paiseSchema = z.number().int().nonnegative().safe();
export const signedPaiseSchema = z.number().int().safe();
export const positiveQuantitySchema = z.number().int().min(1).max(99);
const optionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const optionalIndianPhoneE164 = (value: unknown) => {
  const phone = optionalString(value);

  if (!phone) {
    return undefined;
  }

  const digits = phone.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }
  if (/^91[6-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  return phone;
};

export const claimRequestSchema = z.object({
  dropPk: uuidSchema,
  idempotencyKey: z.string().min(16).max(128),
  quantity: positiveQuantitySchema.default(1),
});

export const razorpayCheckoutOrderRequestSchema = z.object({
  holdPk: uuidSchema,
  idempotencyKey: z.string().min(16).max(128),
});

export const claimIntentStatusCodes = ["ACTIVE", "EXPIRED", "RELEASED", "CONVERTED"] as const;
export type ClaimIntentStatusCode = (typeof claimIntentStatusCodes)[number];

export const checkoutStateSchema = z.object({
  orderPk: uuidSchema,
  holdPk: uuidSchema,
  statusCode: z.enum(orderStatusCodes),
  amountPaise: paiseSchema,
  paymentIntentStatusCode: z.enum(paymentIntentStatusCodes),
});

export const pickupQrPayloadSchema = z.object({
  version: z.literal(1),
  orderPk: uuidSchema,
  nonce: z.string().min(32).max(256),
  restaurantPk: uuidSchema,
  issuedAt: z.string().datetime(),
});

export interface RazorpayCheckoutOrderRequest {
  readonly holdPk: string;
  readonly idempotencyKey: string;
}

export interface RazorpayCheckoutPayload {
  readonly keyId: string;
  readonly providerOrderRef: string;
  readonly paymentOrderIntentPk: string;
  readonly holdPk: string;
  readonly amountPaise: number;
  readonly currencyCode: "INR";
  readonly restaurantName: string;
  readonly bagDisplayName: string;
  readonly description: string;
  readonly prefill: {
    readonly name?: string;
    readonly email?: string;
    readonly contact?: string;
  };
  readonly status: "RAZORPAY_ORDER_CREATED" | "CAPTURED";
  readonly orderHref?: string;
}

export interface CheckoutStatus {
  readonly holdPk: string;
  readonly holdStatusCode: ClaimIntentStatusCode;
  readonly paymentIntentStatusCode: PaymentIntentStatusCode | null;
  readonly orderPk: string | null;
  readonly orderStatusCode: OrderStatusCode | null;
  readonly orderHref: string | null;
}

export interface PickupProof {
  readonly qrPayload: string;
  readonly otp: string;
  readonly issuedAt: string;
}

export const pickupVerificationRequestSchema = z
  .object({
    otp: z.preprocess(optionalString, z.string().regex(/^\d{6}$/, "Enter the 6-digit pickup OTP.").optional()),
    qrPayload: z.preprocess(optionalString, z.string().min(20).max(2000).optional()),
    deviceLabel: z.preprocess(optionalString, z.string().max(80).default("Restaurant portal")),
    idempotencyKey: z.preprocess(optionalString, z.string().min(16).max(128).optional()),
  })
  .refine((value) => Boolean(value.otp) !== Boolean(value.qrPayload), {
    message: "Provide exactly one pickup credential: QR payload or OTP.",
    path: ["otp"],
  });

export const noShowRequestSchema = z.object({
  reasonText: z.string().trim().min(8).max(600),
  idempotencyKey: z.preprocess(optionalString, z.string().min(16).max(128).optional()),
});

export const orderIncidentCreateSchema = z.object({
  typeCode: z.enum(incidentTypeCodes),
  severityCode: z.enum(incidentSeverityCodes).default("P3"),
  descriptionText: z.string().trim().min(10).max(1200),
  internalNoteText: z.preprocess(optionalString, z.string().trim().max(1200).optional()),
});

export const notificationRetryRequestSchema = z.object({
  reasonText: z.string().trim().min(8).max(600),
});

export const notificationSuppressRequestSchema = z.object({
  reasonText: z.string().trim().min(8).max(600),
});

const financePeriodSchema = z
  .object({
    restaurantPk: uuidSchema,
    periodStartAt: z.string().datetime(),
    periodEndAt: z.string().datetime(),
  })
  .refine((value) => Date.parse(value.periodEndAt) > Date.parse(value.periodStartAt), {
    message: "Settlement period end must be after the start.",
    path: ["periodEndAt"],
  });

export const settlementPreviewRequestSchema = financePeriodSchema;
export const settlementCreateRequestSchema = financePeriodSchema.extend({
  noteText: z.preprocess(optionalString, z.string().trim().max(1000).optional()),
});
export const settlementLockRequestSchema = z.object({
  reasonText: z.string().trim().min(8).max(1000),
});
export const settlementStatusUpdateRequestSchema = z.object({
  statusCode: z.enum(["SENT", "PAID", "RECONCILED", "CANCELLED"]),
  noteText: z.string().trim().min(8).max(1000),
  providerReferenceText: z.preprocess(optionalString, z.string().trim().max(160).optional()),
});
export const settlementAdjustmentRequestSchema = z.object({
  amountPaise: signedPaiseSchema.refine((value) => value !== 0, "Adjustment amount cannot be zero."),
  descriptionText: z.string().trim().min(8).max(1000),
});
export const settlementInvoiceIssueRequestSchema = z.object({
  invoiceNumber: z.string().trim().min(4).max(80),
  externalDocumentRef: z.preprocess(optionalString, z.string().trim().max(240).optional()),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const roiReportPeriodRequestSchema = z
  .object({
    restaurantPk: uuidSchema.optional(),
    periodStartAt: z.string().datetime(),
    periodEndAt: z.string().datetime(),
  })
  .refine((value) => Date.parse(value.periodEndAt) > Date.parse(value.periodStartAt), {
    message: "Report period end must be after the start.",
    path: ["periodEndAt"],
  })
  .refine((value) => Date.parse(value.periodEndAt) - Date.parse(value.periodStartAt) <= 93 * 24 * 60 * 60 * 1000, {
    message: "ROI report periods are limited to 93 days.",
    path: ["periodEndAt"],
  });

export const adminOpsReasonSchema = z.string().trim().min(8).max(1000);

export const adminOpsRestaurantStatusActionSchema = z.object({
  restaurantPk: uuidSchema,
  nextStatusCode: z.enum(["ACTIVE", "PAUSED", "SUSPENDED"]),
  reasonText: adminOpsReasonSchema,
  publicNoteText: z.preprocess(optionalString, z.string().trim().max(500).optional()),
});

export const adminOpsDropStatusActionSchema = z.object({
  dropPk: uuidSchema,
  nextStatusCode: z.enum(["ACTIVE", "SCHEDULED", "PAUSED"]),
  reasonText: adminOpsReasonSchema,
});

export const adminOpsSupportTicketActionSchema = z.object({
  supportTicketPk: uuidSchema.optional(),
  restaurantPk: uuidSchema.optional().nullable(),
  orderPk: uuidSchema.optional().nullable(),
  incidentPk: uuidSchema.optional().nullable(),
  refundPk: uuidSchema.optional().nullable(),
  typeCode: z.string().trim().min(2).max(60).default("GENERAL"),
  priorityCode: z.string().trim().min(2).max(40).default("NORMAL"),
  statusCode: z.string().trim().min(2).max(40).default("OPEN"),
  subjectText: z.string().trim().min(4).max(180),
  descriptionText: z.string().trim().max(1200).optional(),
  assignedToProfilePk: uuidSchema.optional().nullable(),
  noteText: z.preprocess(optionalString, z.string().trim().max(1200).optional()),
  internalNoteFlag: z.boolean().default(true),
  reasonText: adminOpsReasonSchema,
});

export const adminOpsIncidentTriageSchema = z.object({
  incidentPk: uuidSchema,
  statusCode: z.enum(incidentStatusCodes),
  assignedToProfilePk: uuidSchema.optional().nullable(),
  supportTicketPk: uuidSchema.optional().nullable(),
  noteText: z.preprocess(optionalString, z.string().trim().max(1200).optional()),
  reasonText: adminOpsReasonSchema,
});

export const adminOpsRefundSupportSchema = z.object({
  refundPk: uuidSchema.optional(),
  orderPk: uuidSchema,
  supportTicketPk: uuidSchema.optional().nullable(),
  incidentPk: uuidSchema.optional().nullable(),
  amountPaise: paiseSchema.min(1),
  refundReasonCode: z.string().trim().min(3).max(80).default("CUSTOMER_SUPPORT"),
  trackingStatusCode: z.enum(refundSupportStatusCodes).default("REQUESTED"),
  noteText: z.string().trim().min(8).max(1200),
  reasonText: adminOpsReasonSchema,
});

export const adminOpsConfigFlagUpdateSchema = z.object({
  flagCode: z.enum(adminOpsConfigFlagCodes),
  scopeCode: z.enum(["GLOBAL", "RESTAURANT"]).default("GLOBAL"),
  scopeEntityPk: uuidSchema.optional().nullable(),
  isEnabled: z.boolean().optional(),
  numericValue: z.number().int().min(1).max(500).optional(),
  reasonText: adminOpsReasonSchema,
});

export const adminOpsExportRequestSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).max(200),
  title: z.string().trim().min(1).max(80).default("Admin ops queue"),
});

export interface PickupVerificationResult {
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly resultCode: PickupVerificationResultCode;
  readonly orderStatusCode: OrderStatusCode;
  readonly collectedAt: string | null;
  readonly message: string;
}

export interface NoShowResult {
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly orderStatusCode: OrderStatusCode;
  readonly message: string;
}

export interface OrderIncidentSummary {
  readonly incidentPk: string;
  readonly orderPk: string | null;
  readonly orderNumber: string | null;
  readonly restaurantPk: string | null;
  readonly restaurantName: string | null;
  readonly typeCode: IncidentTypeCode;
  readonly typeName: string;
  readonly severityCode: IncidentSeverityCode;
  readonly statusCode: IncidentStatusCode;
  readonly titleText: string;
  readonly descriptionText: string | null;
  readonly reportedByProfilePk: string | null;
  readonly occurredAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NotificationSummary {
  readonly notificationOutboxPk: string;
  readonly orderPk: string | null;
  readonly orderNumber: string | null;
  readonly restaurantPk: string | null;
  readonly restaurantName: string | null;
  readonly templateCode: NotificationTemplateCode | string;
  readonly audienceCode: NotificationAudienceCode | string;
  readonly channelCode: NotificationChannelCode;
  readonly sendStatusCode: NotificationStatusCode;
  readonly providerCode: NotificationProviderCode | string | null;
  readonly deliveryReasonCode: string | null;
  readonly scheduledAt: string;
  readonly sentAt: string | null;
  readonly nextAttemptAt: string | null;
  readonly retryCount: number;
  readonly maxAttempts: number;
  readonly lastAttemptStatusCode: NotificationAttemptStatusCode | null;
  readonly lastAttemptAt: string | null;
  readonly lastErrorCode: string | null;
  readonly lastErrorText: string | null;
  readonly manualFallbackText: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminNotificationDeliverySummary extends NotificationSummary {
  readonly businessContextTypeCode: string | null;
  readonly providerMessageRef: string | null;
  readonly destinationMaskedText: string;
}

export interface NotificationDeliveryAttemptSummary {
  readonly notificationDeliveryAttemptPk: string;
  readonly notificationOutboxPk: string;
  readonly providerCode: NotificationProviderCode | string | null;
  readonly providerMessageRef: string | null;
  readonly attemptStatusCode: NotificationAttemptStatusCode;
  readonly attemptNumber: number;
  readonly errorCode: string | null;
  readonly errorText: string | null;
  readonly attemptedAt: string;
  readonly createdAt: string;
}

export interface NotificationActionResult {
  readonly notificationOutboxPk: string;
  readonly sendStatusCode: NotificationStatusCode;
  readonly message: string;
}

export interface FinanceInvoiceSummary {
  readonly invoicePk: string | null;
  readonly invoiceNumber: string | null;
  readonly invoiceStatusCode: FinanceInvoiceStatusCode | null;
  readonly invoiceAmountPaise: number | null;
  readonly invoiceIssuedAt: string | null;
  readonly downloadSafeFilename: string | null;
  readonly externalDocumentRef?: string | null;
}

export interface FinanceSettlementSummary {
  readonly settlementRunPk: string;
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly periodStartAt: string;
  readonly periodEndAt: string;
  readonly settlementStatusCode: FinanceSettlementStatusCode;
  readonly orderCount: number;
  readonly excludedOrderCount: number;
  readonly grossSalesPaise: number;
  readonly refundPaise: number;
  readonly commissionPaise: number;
  readonly paymentFeePaise: number;
  readonly taxPaise: number;
  readonly adjustmentPaise: number;
  readonly netPayoutPaise: number;
  readonly lockedAt: string | null;
  readonly paidAt: string | null;
  readonly reconciledAt: string | null;
  readonly cancelledAt: string | null;
  readonly statusNoteText: string | null;
  readonly payoutProviderReferenceText: string | null;
  readonly payoutAccountStatusCode: string | null;
  readonly maskedPayoutAccount: string | null;
  readonly invoice: FinanceInvoiceSummary;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FinanceSettlementDetailRow {
  readonly payoutEntryPk: string;
  readonly settlementRunPk: string;
  readonly restaurantPk: string;
  readonly orderPk: string | null;
  readonly orderNumber: string | null;
  readonly paymentRefundPk: string | null;
  readonly entryTypeCode: FinancePayoutEntryTypeCode;
  readonly amountPaise: number;
  readonly descriptionText: string | null;
  readonly commissionBps: number | null;
  readonly commissionPlanCode: string | null;
  readonly sourceStatusCode: string | null;
  readonly pickupWindowEndAt: string | null;
  readonly bagDisplayName: string | null;
  readonly orderTotalPaise: number | null;
  readonly createdAt: string;
}

export interface FinancePayoutEntrySummary extends FinanceSettlementDetailRow {}

export interface FinanceEligibleOrderPreview {
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly pickupWindowEndAt: string;
  readonly orderStatusCode: OrderStatusCode | string;
  readonly paymentStatusCode: string;
  readonly paidAmountPaise: number;
  readonly paymentFeePaise: number;
  readonly paymentTaxPaise: number;
  readonly refundPaise: number;
  readonly commissionBps: number;
  readonly commissionPlanCode: string | null;
  readonly commissionPaise: number;
  readonly netPayoutPaise: number;
  readonly eligibilityStatusCode: FinanceOrderEligibilityStatusCode;
  readonly exclusionReasonCode: string | null;
  readonly exclusionReasonText: string | null;
}

export interface FinanceSettlementActionResult {
  readonly settlementRunPk: string;
  readonly settlementStatusCode: FinanceSettlementStatusCode;
  readonly message: string;
  readonly orderCount?: number;
  readonly grossSalesPaise?: number;
  readonly refundPaise?: number;
  readonly commissionPaise?: number;
  readonly paymentFeePaise?: number;
  readonly taxPaise?: number;
  readonly adjustmentPaise?: number;
  readonly netPayoutPaise?: number;
}

export interface FinanceAdjustmentResult {
  readonly payoutEntryPk: string;
  readonly settlementRunPk: string;
  readonly amountPaise: number;
  readonly message: string;
}

export interface NotificationFallbackCopy {
  readonly notificationOutboxPk: string;
  readonly templateCode: NotificationTemplateCode | string;
  readonly channelCode: NotificationChannelCode;
  readonly fallbackText: string;
  readonly warningText: string;
}

export interface RoiReportMetricCard {
  readonly code: string;
  readonly label: string;
  readonly valueText: string;
  readonly helperText: string;
  readonly tone: "success" | "warning" | "danger" | "neutral";
}

export interface RoiReportPeriodRequest {
  readonly restaurantPk?: string;
  readonly periodStartAt: string;
  readonly periodEndAt: string;
}

export interface RoiReportSummary {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly periodStartAt: string;
  readonly periodEndAt: string;
  readonly dropsListedCount: number;
  readonly bagsListedCount: number;
  readonly bagsSoldCount: number;
  readonly sellThroughBps: number | null;
  readonly gmvPaise: number;
  readonly estimatedNetRecoveryPaise: number;
  readonly netRecoveryBasisCode: RoiReportEstimateBasisCode;
  readonly settlementRunPk: string | null;
  readonly settlementStatusCode: FinanceSettlementStatusCode | null;
  readonly settlementLockedAt: string | null;
  readonly pickupCompletedCount: number;
  readonly noShowCount: number;
  readonly pickupCompletionBps: number | null;
  readonly openPickupOrderCount: number;
  readonly refundDebitPaise: number;
  readonly paymentFeePaise: number;
  readonly paymentTaxPaise: number;
  readonly incidentCount: number;
  readonly firstTimeBuyerCount: number;
  readonly repeatBuyerCount: number;
  readonly repeatBuyerDataAvailable: boolean;
  readonly dataFreshnessAt: string;
  readonly insightCodes: readonly RoiReportInsightCode[];
  readonly metricCards: readonly RoiReportMetricCard[];
  readonly assumptions: readonly string[];
  readonly nextActions: readonly string[];
}

export interface RoiReportDropDetailRow {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly dropPk: string;
  readonly dropTitle: string;
  readonly bagDisplayName: string;
  readonly dropStatusCode: DropStatusCode | string;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
  readonly quantityListed: number;
  readonly quantitySold: number;
  readonly quantityCollected: number;
  readonly noShowCount: number;
  readonly openPickupOrderCount: number;
  readonly sellThroughBps: number | null;
  readonly gmvPaise: number;
  readonly estimatedNetRecoveryPaise: number;
  readonly refundDebitPaise: number;
  readonly paymentFeePaise: number;
  readonly paymentTaxPaise: number;
  readonly incidentCount: number;
  readonly firstTimeBuyerCount: number;
  readonly repeatBuyerCount: number;
  readonly settlementRunPk: string | null;
  readonly settlementStatusCode: FinanceSettlementStatusCode | null;
  readonly latestOrderCreatedAt: string | null;
  readonly updatedAt: string;
}

export interface RoiReportIncidentRefundNoteRow {
  readonly rowPk: string;
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly orderPk: string | null;
  readonly orderNumber: string | null;
  readonly dropPk: string | null;
  readonly noteTypeCode: "INCIDENT" | "REFUND" | "DEBIT";
  readonly severityCode?: IncidentSeverityCode | null;
  readonly statusCode: string | null;
  readonly amountPaise: number | null;
  readonly titleText: string;
  readonly descriptionText: string | null;
  readonly occurredAt: string;
}

export interface RoiPartnerReportCopyPayload {
  readonly title: string;
  readonly periodLabel: string;
  readonly restaurantName: string;
  readonly summaryLines: readonly string[];
  readonly assumptionLines: readonly string[];
  readonly nextActionLines: readonly string[];
  readonly generatedAt: string;
}

export interface RoiReportPayload {
  readonly summary: RoiReportSummary;
  readonly dropRows: readonly RoiReportDropDetailRow[];
  readonly noteRows: readonly RoiReportIncidentRefundNoteRow[];
  readonly partnerCopy: RoiPartnerReportCopyPayload;
}

export interface AdminOpsRestaurantSummary {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly restaurantSlug: string;
  readonly statusCode: RestaurantStatusCode | string;
  readonly openIncidentCount: number;
  readonly openSupportTicketCount: number;
  readonly openRefundRequestCount: number;
  readonly activeDropCount: number;
  readonly pausedDropCount: number;
  readonly latestAuditAt: string | null;
  readonly updatedAt: string;
}

export interface AdminOpsDropSummary {
  readonly dropPk: string;
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly dropTitle: string;
  readonly statusCode: DropStatusCode | string;
  readonly quantityTotal: number;
  readonly quantityAvailable: number;
  readonly paidOrderCount: number;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
  readonly updatedAt: string;
}

export interface AdminOpsSupportTicketRow {
  readonly supportTicketPk: string;
  readonly restaurantPk: string | null;
  readonly restaurantName: string | null;
  readonly orderPk: string | null;
  readonly orderNumber: string | null;
  readonly incidentPk: string | null;
  readonly refundPk: string | null;
  readonly typeCode: string;
  readonly statusCode: string;
  readonly priorityCode: string;
  readonly subjectText: string;
  readonly descriptionText: string | null;
  readonly assignedToProfilePk: string | null;
  readonly slaDueAt: string | null;
  readonly resolvedAt: string | null;
  readonly latestEventAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminOpsIncidentQueueRow {
  readonly incidentPk: string;
  readonly restaurantPk: string | null;
  readonly restaurantName: string | null;
  readonly orderPk: string | null;
  readonly orderNumber: string | null;
  readonly supportTicketPk: string | null;
  readonly typeCode: IncidentTypeCode | string;
  readonly severityCode: IncidentSeverityCode | string;
  readonly statusCode: IncidentStatusCode | string;
  readonly titleText: string;
  readonly descriptionText: string | null;
  readonly assignedToProfilePk: string | null;
  readonly latestEventAt: string | null;
  readonly occurredAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminOpsRefundQueueRow {
  readonly refundPk: string;
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly supportTicketPk: string | null;
  readonly incidentPk: string | null;
  readonly refundStatusCode: string;
  readonly trackingStatusCode: RefundSupportStatusCode | string;
  readonly refundReasonCode: string;
  readonly amountPaise: number;
  readonly requestedAt: string;
  readonly processedAt: string | null;
  readonly updatedAt: string;
}

export interface AdminOpsConfigFlagRow {
  readonly configPk: string;
  readonly flagCode: AdminOpsConfigFlagCode | string;
  readonly flagName: string;
  readonly description: string | null;
  readonly scopeCode: "GLOBAL" | "RESTAURANT" | string;
  readonly scopeEntityPk: string | null;
  readonly scopeLabel: string;
  readonly isEnabled: boolean;
  readonly numericValue: number | null;
  readonly consumedByText: string;
  readonly updatedAt: string;
}

export interface AdminOpsAuditRow {
  readonly auditLogPk: string;
  readonly actorProfilePk: string | null;
  readonly actorRoleCode: string | null;
  readonly actionCode: string;
  readonly targetEntityTypeCode: string | null;
  readonly targetEntityPk: string | null;
  readonly reasonText: string | null;
  readonly createdAt: string;
}

export interface AdminOpsSummaryPayload {
  readonly restaurants: readonly AdminOpsRestaurantSummary[];
  readonly drops: readonly AdminOpsDropSummary[];
  readonly incidents: readonly AdminOpsIncidentQueueRow[];
  readonly supportTickets: readonly AdminOpsSupportTicketRow[];
  readonly refunds: readonly AdminOpsRefundQueueRow[];
  readonly configFlags: readonly AdminOpsConfigFlagRow[];
  readonly auditRows: readonly AdminOpsAuditRow[];
  readonly generatedAt: string;
}

export interface AdminOpsActionResult {
  readonly targetPk: string;
  readonly statusCode?: string;
  readonly message: string;
}

export const consentCaptureSchema = z.object({
  purposeCode: z.enum(consentPurposeCodes),
  state: z.enum(consentStateCodes),
  source: z.enum(["SIGNUP_FLOW", "ACCOUNT_SETTINGS", "CHECKOUT", "ADMIN_ACTION", "SYSTEM_GRANT"]),
  policyVersion: z.string().min(1).max(40),
  proofJson: z.record(z.string(), z.unknown()).default({}),
});

export const consentBatchCaptureSchema = z.object({
  events: z.array(consentCaptureSchema).min(1).max(12),
});

export const profileBootstrapSchema = z.object({
  fullName: z.preprocess(optionalString, z.string().trim().max(120).optional()),
  phoneE164: z.preprocess(
    optionalIndianPhoneE164,
    z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional(),
  ),
  emailAddress: z.preprocess(optionalString, z.string().trim().email().optional()),
  preferredLanguageCode: z.preprocess(optionalString, z.string().trim().min(2).max(12).default("en")),
  defaultCityCode: z.preprocess(optionalString, z.string().trim().min(2).max(16).default("HYD")),
});

export const restaurantSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.");

export const restaurantOnboardingCreateSchema = z.object({
  restaurantName: z.preprocess(optionalString, z.string().trim().min(2).max(140).optional()),
  restaurantSlug: z.preprocess(optionalString, restaurantSlugSchema.optional()),
  legalEntityName: z.preprocess(optionalString, z.string().trim().min(2).max(180).optional()),
  primaryContactEmail: z.preprocess(optionalString, z.string().trim().email().optional()),
  primaryContactPhoneE164: z.preprocess(
    optionalIndianPhoneE164,
    z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional(),
  ),
});

export const restaurantBasicsUpdateSchema = z.object({
  restaurantPk: uuidSchema,
  restaurantName: z.string().trim().min(2).max(140),
  restaurantSlug: restaurantSlugSchema,
  legalEntityName: z.preprocess(optionalString, z.string().trim().min(2).max(180).optional()),
  primaryContactEmail: z.string().trim().email(),
  primaryContactPhoneE164: z.preprocess(
    optionalIndianPhoneE164,
    z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional(),
  ),
  pickupInstructions: z.preprocess(optionalString, z.string().trim().min(10).max(1200).optional()),
  cityPk: uuidSchema.optional().nullable(),
  neighborhoodPk: uuidSchema.optional().nullable(),
  headline: z.preprocess(optionalString, z.string().trim().min(8).max(160).optional()),
  storyMarkdown: z.preprocess(optionalString, z.string().trim().max(2000).optional()),
});

export const restaurantComplianceUpdateSchema = z.object({
  restaurantPk: uuidSchema,
  fssaiLicenseNumber: z.string().trim().regex(/^\d{14}$/, "FSSAI license number should be 14 digits."),
  fssaiLicenseExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gstin: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/),
  panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/),
  accountHolderName: z.preprocess(optionalString, z.string().trim().min(2).max(140).optional()),
  bankName: z.preprocess(optionalString, z.string().trim().min(2).max(120).optional()),
  maskedAccountNumber: z.preprocess(optionalString, z.string().trim().regex(/^[Xx*]{4,}\d{3,6}$/).optional()),
  ifscCode: z.preprocess(optionalString, z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional()),
});

export const restaurantDocumentUploadRequestSchema = z.object({
  restaurantPk: uuidSchema,
  documentTypeCode: z.enum(restaurantDocumentTypeCodes),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024),
  documentNumber: z.preprocess(optionalString, z.string().trim().max(80).optional()),
  expiresAt: z.preprocess(optionalString, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

export const adminDocumentReviewSchema = z
  .object({
    statusCode: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.preprocess(optionalString, z.string().trim().min(8).max(800).optional()),
  })
  .refine((value) => value.statusCode !== "REJECTED" || Boolean(value.rejectionReason), {
    message: "Rejection reason is required.",
    path: ["rejectionReason"],
  });

export const adminComplianceReviewSchema = z
  .object({
    statusCode: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.preprocess(optionalString, z.string().trim().min(8).max(800).optional()),
  })
  .refine((value) => value.statusCode !== "REJECTED" || Boolean(value.rejectionReason), {
    message: "Rejection reason is required.",
    path: ["rejectionReason"],
  });

export const consumerProfileUpdateSchema = z.object({
  fullName: z.preprocess(optionalString, z.string().trim().min(1).max(120).optional()),
  phoneE164: z.preprocess(
    optionalIndianPhoneE164,
    z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional(),
  ),
  emailAddress: z.preprocess(optionalString, z.string().trim().email().optional()),
  preferredLanguageCode: z.preprocess(optionalString, z.string().trim().min(2).max(12).optional()),
  defaultCityCode: z.preprocess(optionalString, z.string().trim().min(2).max(16).optional()),
});

export const restaurantPortalProfileUpdateSchema = z.object({
  restaurantPk: uuidSchema,
  staffEmailAddress: z.preprocess(optionalString, z.string().trim().email().optional()),
  staffPhoneE164: z.preprocess(
    optionalIndianPhoneE164,
    z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional(),
  ),
  primaryContactEmail: z.preprocess(optionalString, z.string().trim().email().optional()),
  primaryContactPhoneE164: z.preprocess(
    optionalIndianPhoneE164,
    z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional(),
  ),
});

export const createDropDraftSchema = z.object({
  templateRevisionPk: uuidSchema,
  dropTitle: z.preprocess(optionalString, z.string().trim().min(3).max(120).optional()),
  quantityTotal: positiveQuantitySchema.max(500),
  pricePaise: paiseSchema.min(100),
  pickupStartAt: z.string().datetime(),
  pickupEndAt: z.string().datetime(),
  dropTypeCode: z.enum(["STANDARD", "SPOTLIGHT", "CHEF_SPECIAL"]).default("STANDARD"),
  statusCode: z.enum(["DRAFT", "SCHEDULED", "ACTIVE"]).default("SCHEDULED"),
});

export const createBagTemplateSchema = z
  .object({
    templateName: z.string().trim().min(3).max(120),
    displayName: z.string().trim().min(3).max(120),
    shortDescription: z.preprocess(optionalString, z.string().trim().min(10).max(300).optional()),
    dietaryCategoryCode: z.enum(dietaryCategoryCodes),
    spiceLevelCode: z.preprocess(optionalString, z.enum(spiceLevelCodes).optional()),
    servesMin: z.number().int().min(1).max(12),
    servesMax: z.number().int().min(1).max(12),
    maxHoldingMinutes: z.number().int().min(30).max(480),
    holdingGuidanceText: z.preprocess(optionalString, z.string().trim().min(10).max(240).optional()),
    minMenuValuePaise: paiseSchema.min(100),
    suggestedPricePaise: paiseSchema.min(100),
    defaultDropQuantity: z.number().int().min(1).max(500).default(10),
    defaultPickupStartOffsetMinutes: z.number().int().min(0).max(1440).default(15),
    defaultPickupDurationMinutes: z.number().int().min(15).max(480).default(90),
    allergenCodes: z.array(z.string().trim().toUpperCase().min(2).max(40)).min(1).max(14),
    allergenSummaryText: z.string().trim().min(8).max(300),
    includedItemHintText: z.preprocess(optionalString, z.string().trim().max(240).optional()),
  })
  .refine((value) => value.servesMin <= value.servesMax, {
    message: "Minimum servings cannot exceed maximum servings.",
    path: ["servesMin"],
  });

export interface ApiResponse<TData = unknown> {
  readonly ok: boolean;
  readonly data?: TData;
  readonly error?: string;
}

export interface SiteRoute {
  readonly href: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly indexable: boolean;
}

export interface PublicDropCard {
  readonly dropPk: string;
  readonly dropTitle: string;
  readonly dropTypeCode: string;
  readonly restaurantName: string;
  readonly restaurantSlug: string;
  readonly neighborhoodName: string | null;
  readonly bagDisplayName: string;
  readonly bagShortDescription: string | null;
  readonly dietaryCategoryCode: DietaryCategoryCode;
  readonly spiceLevelCode: SpiceLevelCode | null;
  readonly servesMin: number | null;
  readonly servesMax: number | null;
  readonly maxHoldingMinutes: number | null;
  readonly holdingGuidanceText: string | null;
  readonly minMenuValuePaise: number | null;
  readonly allergenSummaryText: string | null;
  readonly allergenCodes: readonly string[];
  readonly pricePaise: number;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
  readonly quantityTotal: number;
  readonly quantityAvailable: number;
  readonly statusCode: DropStatusCode;
}

export interface ClaimIntent {
  readonly holdPk: string;
  readonly dropPk: string;
  readonly consumerProfilePk: string;
  readonly statusCode: ClaimIntentStatusCode;
  readonly quantityHeld: number;
  readonly expiresAt: string;
  readonly holdCreatedAt: string;
  readonly holdUpdatedAt: string;
  readonly dropTitle: string;
  readonly dropStatusCode: DropStatusCode;
  readonly dropTypeCode: string;
  readonly quantityTotal: number;
  readonly quantityAvailable: number;
  readonly pricePaise: number;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
  readonly restaurantPk: string | null;
  readonly restaurantName: string;
  readonly restaurantSlug: string;
  readonly neighborhoodName: string | null;
  readonly bagDisplayName: string;
  readonly bagShortDescription: string | null;
  readonly dietaryCategoryCode: DietaryCategoryCode;
  readonly spiceLevelCode: SpiceLevelCode | null;
  readonly servesMin: number | null;
  readonly servesMax: number | null;
  readonly maxHoldingMinutes: number | null;
  readonly holdingGuidanceText: string | null;
  readonly minMenuValuePaise: number | null;
  readonly allergenSummaryText: string | null;
  readonly allergenCodes: readonly string[];
}

export interface ConsumerOrderSummary {
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly holdPk: string | null;
  readonly consumerProfilePk: string;
  readonly restaurantPk: string;
  readonly dropPk: string;
  readonly orderStatusCode: OrderStatusCode;
  readonly paymentStatusCode: string;
  readonly restaurantName: string;
  readonly restaurantSlug: string;
  readonly dropTitle: string;
  readonly bagDisplayName: string;
  readonly dietaryCategoryCode: DietaryCategoryCode;
  readonly spiceLevelCode: SpiceLevelCode | null;
  readonly allergenSummaryText: string | null;
  readonly allergenCodes: readonly string[];
  readonly servesText: string | null;
  readonly pickupInstructions: string | null;
  readonly quantity: number;
  readonly unitPricePaise: number;
  readonly paidAmountPaise: number;
  readonly currencyCode: string;
  readonly pickupWindowStartAt: string;
  readonly pickupWindowEndAt: string;
  readonly paymentIntentStatusCode: PaymentIntentStatusCode | null;
  readonly paymentCapturedAt: string | null;
  readonly collectedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RestaurantOrderSummary {
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly restaurantPk: string;
  readonly dropPk: string;
  readonly orderStatusCode: OrderStatusCode;
  readonly paymentStatusCode: string;
  readonly restaurantName: string;
  readonly dropTitle: string;
  readonly bagDisplayName: string;
  readonly dietaryCategoryCode: DietaryCategoryCode;
  readonly spiceLevelCode: SpiceLevelCode | null;
  readonly allergenSummaryText: string | null;
  readonly allergenCodes: readonly string[];
  readonly quantity: number;
  readonly paidAmountPaise: number;
  readonly currencyCode: string;
  readonly pickupWindowStartAt: string;
  readonly pickupWindowEndAt: string;
  readonly paymentIntentStatusCode: PaymentIntentStatusCode | null;
  readonly paymentCapturedAt: string | null;
  readonly collectedAt: string | null;
  readonly pickupVerificationAttemptCount?: number;
  readonly lastPickupVerificationResultCode?: PickupVerificationResultCode | null;
  readonly lastPickupVerificationAt?: string | null;
  readonly incidentCount?: number;
  readonly notifications?: readonly NotificationSummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminPickupOrderSummary extends RestaurantOrderSummary {
  readonly consumerProfilePk: string;
  readonly holdPk: string | null;
  readonly providerOrderRef: string | null;
  readonly webhookProcessedAt: string | null;
  readonly webhookProcessingStatusCode: string | null;
}

export interface AdminPaymentOrderSummary {
  readonly paymentOrderIntentPk: string;
  readonly holdPk: string;
  readonly orderPk: string | null;
  readonly orderNumber: string | null;
  readonly providerCode: "RAZORPAY";
  readonly providerOrderRef: string | null;
  readonly paymentIntentStatusCode: PaymentIntentStatusCode;
  readonly amountPaise: number;
  readonly currencyCode: string;
  readonly orderStatusCode: OrderStatusCode | null;
  readonly paymentStatusCode: string | null;
  readonly restaurantName: string | null;
  readonly dropTitle: string | null;
  readonly holdStatusCode: ClaimIntentStatusCode;
  readonly holdExpiresAt: string;
  readonly paymentCapturedAt: string | null;
  readonly transactionCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminPaymentWebhookSummary {
  readonly paymentWebhookEventPk: string;
  readonly providerCode: "RAZORPAY";
  readonly providerEventId: string;
  readonly eventTypeCode: string;
  readonly signatureVerified: boolean;
  readonly processingStatusCode: "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED" | "IGNORED";
  readonly processedAt: string | null;
  readonly processingErrorText: string | null;
  readonly receivedAt: string;
}

export interface ClaimCreationResult {
  readonly claimIntent: ClaimIntent;
  readonly alreadyHeld: boolean;
  readonly confirmationHref: string;
}

export interface PortalBagTemplate {
  readonly templatePk: string;
  readonly templateName: string;
  readonly templateStatusCode: string;
  readonly activeRevisionPk: string | null;
  readonly displayName: string | null;
  readonly shortDescription: string | null;
  readonly dietaryCategoryCode: DietaryCategoryCode | null;
  readonly spiceLevelCode: SpiceLevelCode | null;
  readonly servesMin: number | null;
  readonly servesMax: number | null;
  readonly maxHoldingMinutes: number | null;
  readonly holdingGuidanceText: string | null;
  readonly minMenuValuePaise: number | null;
  readonly suggestedPricePaise: number | null;
  readonly allergenSummaryText: string | null;
  readonly includedItemHintText: string | null;
  readonly defaultDropQuantity: number;
  readonly defaultPickupStartOffsetMinutes: number;
  readonly defaultPickupDurationMinutes: number;
  readonly allergenCodes: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PortalDrop {
  readonly dropPk: string;
  readonly dropTitle: string;
  readonly statusCode: DropStatusCode;
  readonly quantityTotal: number;
  readonly quantityHeld: number;
  readonly quantityAvailable: number;
  readonly pricePaise: number;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
  readonly updatedAt: string;
}
