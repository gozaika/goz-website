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
    spiceLevelCode: (order.spiceLevelCode ?? null) as SpiceLevelCode | null,
    allergenSummaryText: order.allergenSummaryText,
    quantity: order.quantity,
    paidAmountPaise: order.paidAmountPaise,
    currencyCode: order.currencyCode,
    pickupWindowStartAt: order.pickupWindowStartAt,
    pickupWindowEndAt: order.pickupWindowEndAt,
    collectedAt: order.collectedAt,
    pickupVerificationAttemptCount: order.pickupVerificationAttemptCount ?? 0,
    lastPickupVerificationResultCode: order.lastPickupVerificationResultCode as PickupVerificationResultCode | null,
    lastPickupVerificationAt: order.lastPickupVerificationAt ?? null,
    incidentCount: order.incidentCount ?? 0,
    isReorder: order.isReorder ?? false,
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

/**
 * Count failed (non-SUCCESS) pickup verification attempts for an order in a rolling
 * window — the OTP brute-force throttle. Reads `order_pickup_verification_event`
 * (the same audit table the RPC writes). A successful collection ends the flow so
 * only failures are counted.
 */
export async function recentFailedVerifyCount(
  service: SupabaseClient,
  orderPk: string,
  windowMinutes = 10,
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await service
    .from("order_pickup_verification_event")
    .select("order_pickup_verification_event_pk", { count: "exact", head: true })
    .eq("order_fk", orderPk)
    .neq("verification_result_code", "SUCCESS")
    .gte("recorded_at", since);
  if (error) {
    throw error;
  }
  return count ?? 0;
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
