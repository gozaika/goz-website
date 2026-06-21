import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CounterOrder,
  DietaryCategoryCode,
  MobileErrorCode,
  OrderStatusCode,
  PickupVerificationResultCode,
  RestaurantOrderSummary,
  SpiceLevelCode,
} from "@gozaika/types";
import { pickupRpcErrorMessage } from "@/lib/pickup-verification";

/** Trim a full RestaurantOrderSummary to the counter card the mobile queue needs. */
export function toCounterOrder(order: RestaurantOrderSummary): CounterOrder {
  return {
    orderPk: order.orderPk,
    orderNumber: order.orderNumber,
    orderStatusCode: order.orderStatusCode as OrderStatusCode,
    dropTitle: order.dropTitle,
    bagDisplayName: order.bagDisplayName,
    dietaryCategoryCode: order.dietaryCategoryCode as DietaryCategoryCode,
    spiceLevelCode: order.spiceLevelCode as SpiceLevelCode,
    allergenSummaryText: order.allergenSummaryText,
    quantity: order.quantity,
    paidAmountPaise: order.paidAmountPaise,
    currencyCode: order.currencyCode,
    pickupWindowStartAt: order.pickupWindowStartAt,
    pickupWindowEndAt: order.pickupWindowEndAt,
    collectedAt: order.collectedAt,
    pickupVerificationAttemptCount: order.pickupVerificationAttemptCount ?? 0,
    lastPickupVerificationResultCode: order.lastPickupVerificationResultCode as PickupVerificationResultCode | null,
    incidentCount: order.incidentCount ?? 0,
  };
}

/** Resolve the owning restaurant of an order (tenant check). Null if not found. */
export async function loadOrderRestaurantFk(service: SupabaseClient, orderPk: string): Promise<string | null> {
  const { data, error } = await service
    .from("order_order")
    .select("restaurant_fk")
    .eq("order_order_pk", orderPk)
    .maybeSingle<{ readonly restaurant_fk: string }>();
  if (error) {
    throw error;
  }
  return data?.restaurant_fk ?? null;
}

/** Translate a pickup/no-show/incident RPC error into a mobile envelope code + message. */
export function mobileRpcError(message: string): { readonly code: MobileErrorCode; readonly message: string } {
  const mapped = pickupRpcErrorMessage(message);
  const code: MobileErrorCode =
    mapped.status === 404
      ? "NOT_FOUND"
      : mapped.status === 403
        ? "FORBIDDEN"
        : mapped.status === 409
          ? "CONFLICT"
          : mapped.status === 400
            ? "VALIDATION"
            : "SERVER_ERROR";
  return { code, message: mapped.error };
}
