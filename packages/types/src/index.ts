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
  "PAYMENT_PENDING",
  "PAID",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "COLLECTED",
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

export type DietaryCategoryCode = (typeof dietaryCategoryCodes)[number];
export type SpiceLevelCode = (typeof spiceLevelCodes)[number];
export type DropStatusCode = (typeof dropStatusCodes)[number];
export type OrderStatusCode = (typeof orderStatusCodes)[number];
export type HoldStatusCode = (typeof holdStatusCodes)[number];
export type PaymentIntentStatusCode = (typeof paymentIntentStatusCodes)[number];
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

export const uuidSchema = z.string().uuid();
export const paiseSchema = z.number().int().nonnegative().safe();
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

export const pickupVerificationRequestSchema = z
  .object({
    restaurantPk: uuidSchema,
    deviceLabel: z.string().min(1).max(80),
    nonce: z.string().min(32).max(256).optional(),
    otp: z.string().regex(/^\d{6}$/).optional(),
  })
  .refine((value) => Boolean(value.nonce) !== Boolean(value.otp), {
    message: "Provide exactly one pickup credential: nonce or OTP.",
    path: ["nonce"],
  });

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
  legalEntityName: z.string().trim().min(2).max(180),
  primaryContactEmail: z.string().trim().email(),
  primaryContactPhoneE164: z.preprocess(
    optionalIndianPhoneE164,
    z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
  ),
  pickupInstructions: z.string().trim().min(10).max(1200),
  cityPk: uuidSchema.optional().nullable(),
  neighborhoodPk: uuidSchema.optional().nullable(),
  headline: z.string().trim().min(8).max(160).optional(),
  storyMarkdown: z.string().trim().max(2000).optional(),
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
  preferredLanguageCode: z.preprocess(optionalString, z.string().trim().min(2).max(12).optional()),
  defaultCityCode: z.preprocess(optionalString, z.string().trim().min(2).max(16).optional()),
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
  readonly quantityAvailable: number;
  readonly pricePaise: number;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
  readonly updatedAt: string;
}
