import type { ConsumerOrderDto, ConsumerOrderSummary, DietaryCategoryCode, OrderStatusCode, SpiceLevelCode } from "@gozaika/types";

/** Trim a full ConsumerOrderSummary to the customer mobile order DTO (no pickup OTP). */
export function toConsumerOrderDto(o: ConsumerOrderSummary): ConsumerOrderDto {
  return {
    orderPk: o.orderPk,
    orderNumber: o.orderNumber,
    orderStatusCode: o.orderStatusCode as OrderStatusCode,
    paymentStatusCode: o.paymentStatusCode,
    restaurantName: o.restaurantName,
    restaurantSlug: o.restaurantSlug,
    dropTitle: o.dropTitle,
    bagDisplayName: o.bagDisplayName,
    dietaryCategoryCode: o.dietaryCategoryCode as DietaryCategoryCode,
    spiceLevelCode: (o.spiceLevelCode ?? null) as SpiceLevelCode | null,
    allergenSummaryText: o.allergenSummaryText,
    pickupInstructions: o.pickupInstructions,
    quantity: o.quantity,
    paidAmountPaise: o.paidAmountPaise,
    currencyCode: o.currencyCode,
    pickupWindowStartAt: o.pickupWindowStartAt,
    pickupWindowEndAt: o.pickupWindowEndAt,
    collectedAt: o.collectedAt,
    createdAt: o.createdAt,
  };
}
