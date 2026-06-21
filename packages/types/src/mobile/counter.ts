import { z } from "zod";
import type {
  DietaryCategoryCode,
  IncidentSeverityCode,
  IncidentStatusCode,
  IncidentTypeCode,
  OrderStatusCode,
  PickupVerificationResultCode,
  SpiceLevelCode,
} from "../index";

/**
 * Restaurant counter contracts (Slice 7). The pickup queue, server-authoritative
 * verification result, no-show and incident shapes the `/api/mobile/v1/orders*`
 * endpoints emit and the restaurant app decodes.
 *
 * Wire schemas keep code fields permissive (`z.string()`) so a new status/result
 * code from the server never hard-fails an older client; the precise `*Dto` TS
 * unions are applied (and narrowed `as unknown as`) at the single client boundary,
 * matching the permissive-wire + precise-type pattern used across mobile contracts.
 */

// ---- Pickup queue ----

export const counterOrderWireSchema = z.object({
  orderPk: z.string(),
  orderNumber: z.string(),
  orderStatusCode: z.string(),
  dropTitle: z.string(),
  bagDisplayName: z.string(),
  dietaryCategoryCode: z.string(),
  spiceLevelCode: z.string(),
  allergenSummaryText: z.string().nullable(),
  quantity: z.number(),
  paidAmountPaise: z.number(),
  currencyCode: z.string(),
  pickupWindowStartAt: z.string(),
  pickupWindowEndAt: z.string(),
  collectedAt: z.string().nullable(),
  pickupVerificationAttemptCount: z.number(),
  lastPickupVerificationResultCode: z.string().nullable(),
  incidentCount: z.number(),
});

export const counterOrdersDataSchema = z.object({
  restaurantPk: z.string(),
  orders: z.array(counterOrderWireSchema),
});

export interface CounterOrder {
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly orderStatusCode: OrderStatusCode;
  readonly dropTitle: string;
  readonly bagDisplayName: string;
  readonly dietaryCategoryCode: DietaryCategoryCode;
  readonly spiceLevelCode: SpiceLevelCode;
  readonly allergenSummaryText: string | null;
  readonly quantity: number;
  readonly paidAmountPaise: number;
  readonly currencyCode: string;
  readonly pickupWindowStartAt: string;
  readonly pickupWindowEndAt: string;
  readonly collectedAt: string | null;
  readonly pickupVerificationAttemptCount: number;
  readonly lastPickupVerificationResultCode: PickupVerificationResultCode | null;
  readonly incidentCount: number;
}

export interface CounterOrdersData {
  readonly restaurantPk: string;
  readonly orders: readonly CounterOrder[];
}

// ---- Pickup verification result ----

export const pickupVerifyResultSchema = z.object({
  orderPk: z.string(),
  orderNumber: z.string(),
  resultCode: z.string(),
  orderStatusCode: z.string(),
  collectedAt: z.string().nullable(),
  message: z.string(),
});

export interface PickupVerifyResultDto {
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly resultCode: PickupVerificationResultCode;
  readonly orderStatusCode: OrderStatusCode;
  readonly collectedAt: string | null;
  readonly message: string;
}

// ---- No-show ----

export const noShowResultSchema = z.object({
  orderPk: z.string(),
  orderNumber: z.string(),
  orderStatusCode: z.string(),
  message: z.string(),
});

export interface NoShowResultDto {
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly orderStatusCode: OrderStatusCode;
  readonly message: string;
}

// ---- Incident ----

export const incidentCreatedSchema = z.object({
  incidentPk: z.string(),
  orderPk: z.string().nullable(),
  orderNumber: z.string().nullable(),
  typeCode: z.string(),
  severityCode: z.string(),
  statusCode: z.string(),
  titleText: z.string(),
  createdAt: z.string(),
});

export interface IncidentCreatedDto {
  readonly incidentPk: string;
  readonly orderPk: string | null;
  readonly orderNumber: string | null;
  readonly typeCode: IncidentTypeCode;
  readonly severityCode: IncidentSeverityCode;
  readonly statusCode: IncidentStatusCode;
  readonly titleText: string;
  readonly createdAt: string;
}

// ---- Request bodies (client builds; the BFF validates with the canonical
//      pickupVerificationRequestSchema / noShowRequestSchema / orderIncidentCreateSchema). ----

export interface CounterPickupVerifyRequest {
  /** Exactly one of `otp` / `qrPayload` (mutually exclusive, enforced server-side). */
  readonly otp?: string;
  readonly qrPayload?: string;
  readonly deviceLabel?: string;
  readonly idempotencyKey?: string;
}

export interface CounterNoShowRequest {
  readonly reasonText: string;
  readonly idempotencyKey?: string;
}

export interface CounterIncidentRequest {
  readonly typeCode: IncidentTypeCode;
  readonly severityCode?: IncidentSeverityCode;
  readonly descriptionText: string;
  readonly internalNoteText?: string;
}
