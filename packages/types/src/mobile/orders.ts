import { z } from "zod";
import type { DietaryCategoryCode, OrderStatusCode, SpiceLevelCode } from "../index";

/**
 * Customer order contracts (Slice 10). The customer's paid orders + a detail with
 * the pickup window and restaurant info. The pickup OTP/QR is **not** returned here:
 * it is delivered by notification (forwardable for delegated pickup), and re-issuing
 * it in-app would rotate the hash and invalidate the texted code. See
 * docs/mobile/slice9-payment-design.md / slice10 notes.
 */

export const consumerOrderWireSchema = z.object({
  orderPk: z.string(),
  orderNumber: z.string(),
  orderStatusCode: z.string(),
  paymentStatusCode: z.string(),
  restaurantName: z.string(),
  restaurantSlug: z.string(),
  dropTitle: z.string(),
  bagDisplayName: z.string(),
  dietaryCategoryCode: z.string(),
  spiceLevelCode: z.string().nullable(),
  allergenSummaryText: z.string().nullable(),
  pickupInstructions: z.string().nullable(),
  quantity: z.number(),
  paidAmountPaise: z.number(),
  currencyCode: z.string(),
  pickupWindowStartAt: z.string(),
  pickupWindowEndAt: z.string(),
  collectedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const consumerOrdersDataSchema = z.object({ orders: z.array(consumerOrderWireSchema) });

export interface ConsumerOrderDto {
  readonly orderPk: string;
  readonly orderNumber: string;
  readonly orderStatusCode: OrderStatusCode;
  readonly paymentStatusCode: string;
  readonly restaurantName: string;
  readonly restaurantSlug: string;
  readonly dropTitle: string;
  readonly bagDisplayName: string;
  readonly dietaryCategoryCode: DietaryCategoryCode;
  readonly spiceLevelCode: SpiceLevelCode | null;
  readonly allergenSummaryText: string | null;
  readonly pickupInstructions: string | null;
  readonly quantity: number;
  readonly paidAmountPaise: number;
  readonly currencyCode: string;
  readonly pickupWindowStartAt: string;
  readonly pickupWindowEndAt: string;
  readonly collectedAt: string | null;
  readonly createdAt: string;
}
export interface ConsumerOrdersData {
  readonly orders: readonly ConsumerOrderDto[];
}

/** Result of re-sending the pickup notification (no OTP in the payload). */
export const resendPickupResultSchema = z.object({ ok: z.boolean(), message: z.string() });
export interface ResendPickupResult {
  readonly ok: boolean;
  readonly message: string;
}
