import type { SupabaseClient } from "@supabase/supabase-js";
import type { RestaurantOrderSummary } from "@gozaika/types";

/**
 * Shared restaurant pickup-order loader + row mappers. Single source of truth for
 * the queue shape so the web portal page (`app/portal/orders/page.tsx`) and the
 * mobile counter BFF (`/api/mobile/v1/orders`) cannot drift. Reads the
 * `api_restaurant_pickup_order_summary` view first and falls back to a tenant-scoped
 * `order_order` query when the view is empty/unavailable.
 */

export type PickupOrderRow = {
  readonly order_pk: string;
  readonly order_number: string;
  readonly restaurant_fk: string;
  readonly drop_fk: string;
  readonly order_status_code: RestaurantOrderSummary["orderStatusCode"];
  readonly payment_status_code: string;
  readonly restaurant_name: string;
  readonly drop_title: string;
  readonly bag_display_name: string;
  readonly dietary_category_code: RestaurantOrderSummary["dietaryCategoryCode"];
  readonly spice_level_code: RestaurantOrderSummary["spiceLevelCode"];
  readonly allergen_summary_text: string | null;
  readonly allergen_codes: readonly string[] | null;
  readonly quantity: number | string | null;
  readonly paid_amount_paise: number | string;
  readonly currency_code: string;
  readonly pickup_window_start_at: string;
  readonly pickup_window_end_at: string;
  readonly payment_intent_status_code: RestaurantOrderSummary["paymentIntentStatusCode"];
  readonly payment_captured_at: string | null;
  readonly collected_at: string | null;
  readonly pickup_verification_attempt_count: number | string;
  readonly last_pickup_verification_result_code: RestaurantOrderSummary["lastPickupVerificationResultCode"];
  readonly last_pickup_verification_at: string | null;
  readonly incident_count: number | string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly is_reorder?: boolean | null;
};

export type LegacyOrderRow = {
  readonly order_order_pk: string;
  readonly order_number: string;
  readonly restaurant_fk: string;
  readonly drop_fk: string;
  readonly order_status_code: RestaurantOrderSummary["orderStatusCode"];
  readonly payment_status_code: string;
  readonly snapshot_restaurant_name: string;
  readonly snapshot_drop_title: string;
  readonly snapshot_bag_display_name: string;
  readonly snapshot_dietary_category_code: RestaurantOrderSummary["dietaryCategoryCode"];
  readonly snapshot_spice_level_code: RestaurantOrderSummary["spiceLevelCode"];
  readonly snapshot_allergen_summary_text: string | null;
  readonly total_paise: number | string;
  readonly currency_code: string;
  readonly pickup_window_start_at: string;
  readonly pickup_window_end_at: string;
  readonly collected_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly order_item: { readonly quantity: number | string }[] | null;
  readonly payment_order_intent: { readonly payment_intent_status_code: RestaurantOrderSummary["paymentIntentStatusCode"] }[] | null;
  readonly drop_drop: { readonly drop_type_code: string } | { readonly drop_type_code: string }[] | null;
};

const LEGACY_PICKUP_STATUSES = ["PAID", "CONFIRMED", "READY_FOR_PICKUP", "COLLECTED", "NO_SHOW"] as const;

export function mapPickupOrder(row: PickupOrderRow): RestaurantOrderSummary {
  return {
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    restaurantPk: row.restaurant_fk,
    dropPk: row.drop_fk,
    orderStatusCode: row.order_status_code,
    paymentStatusCode: row.payment_status_code,
    restaurantName: row.restaurant_name,
    dropTitle: row.drop_title,
    bagDisplayName: row.bag_display_name,
    dietaryCategoryCode: row.dietary_category_code,
    spiceLevelCode: row.spice_level_code,
    allergenSummaryText: row.allergen_summary_text,
    allergenCodes: row.allergen_codes ?? [],
    quantity: Number(row.quantity ?? 1),
    paidAmountPaise: Number(row.paid_amount_paise),
    currencyCode: row.currency_code,
    pickupWindowStartAt: row.pickup_window_start_at,
    pickupWindowEndAt: row.pickup_window_end_at,
    paymentIntentStatusCode: row.payment_intent_status_code,
    paymentCapturedAt: row.payment_captured_at,
    collectedAt: row.collected_at,
    pickupVerificationAttemptCount: Number(row.pickup_verification_attempt_count ?? 0),
    lastPickupVerificationResultCode: row.last_pickup_verification_result_code,
    lastPickupVerificationAt: row.last_pickup_verification_at,
    incidentCount: Number(row.incident_count ?? 0),
    isReorder: Boolean(row.is_reorder),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function allergenCodesFromSummary(summary: string | null): string[] {
  return summary
    ? summary
        .split(/[,.]/)
        .map((item) => item.trim().toUpperCase())
        .filter((item) => item.length > 2)
        .slice(0, 4)
    : [];
}

export function mapLegacyOrder(row: LegacyOrderRow): RestaurantOrderSummary {
  return {
    orderPk: row.order_order_pk,
    orderNumber: row.order_number,
    restaurantPk: row.restaurant_fk,
    dropPk: row.drop_fk,
    orderStatusCode: row.order_status_code,
    paymentStatusCode: row.payment_status_code,
    restaurantName: row.snapshot_restaurant_name,
    dropTitle: row.snapshot_drop_title,
    bagDisplayName: row.snapshot_bag_display_name,
    dietaryCategoryCode: row.snapshot_dietary_category_code,
    spiceLevelCode: row.snapshot_spice_level_code,
    allergenSummaryText: row.snapshot_allergen_summary_text,
    allergenCodes: allergenCodesFromSummary(row.snapshot_allergen_summary_text),
    quantity: Number(row.order_item?.[0]?.quantity ?? 1),
    paidAmountPaise: Number(row.total_paise),
    currencyCode: row.currency_code,
    pickupWindowStartAt: row.pickup_window_start_at,
    pickupWindowEndAt: row.pickup_window_end_at,
    paymentIntentStatusCode: row.payment_order_intent?.[0]?.payment_intent_status_code ?? null,
    paymentCapturedAt: null,
    collectedAt: row.collected_at,
    pickupVerificationAttemptCount: 0,
    lastPickupVerificationResultCode: null,
    lastPickupVerificationAt: null,
    incidentCount: 0,
    isReorder: (Array.isArray(row.drop_drop) ? row.drop_drop[0]?.drop_type_code : row.drop_drop?.drop_type_code) === "REORDER",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LEGACY_SELECT =
  "order_order_pk,order_number,restaurant_fk,drop_fk,order_status_code,payment_status_code," +
  "snapshot_restaurant_name,snapshot_drop_title,snapshot_bag_display_name,snapshot_dietary_category_code," +
  "snapshot_spice_level_code,snapshot_allergen_summary_text,total_paise,currency_code,pickup_window_start_at," +
  "pickup_window_end_at,collected_at,created_at,updated_at,order_item(quantity),payment_order_intent(payment_intent_status_code),drop_drop(drop_type_code)";

/**
 * Load pickup orders for the given restaurant tenant(s). `viewClient` reads the
 * summary view (cookie-RLS on web, service-role on mobile); `serviceClient`
 * performs the explicit tenant-scoped legacy fallback. Always filtered to
 * `restaurantPks` — never returns another tenant's orders.
 */
export async function loadRestaurantPickupOrders(params: {
  readonly viewClient: SupabaseClient;
  readonly serviceClient: SupabaseClient;
  readonly restaurantPks: readonly string[];
  readonly limit?: number;
}): Promise<RestaurantOrderSummary[]> {
  const { viewClient, serviceClient, restaurantPks } = params;
  const limit = params.limit ?? 60;
  if (restaurantPks.length === 0) {
    return [];
  }

  const { data, error } = await viewClient
    .from("api_restaurant_pickup_order_summary")
    .select("*")
    .in("restaurant_fk", restaurantPks)
    .order("pickup_window_start_at", { ascending: false })
    .limit(limit);

  if (!error && (data ?? []).length > 0) {
    return ((data ?? []) as PickupOrderRow[]).map(mapPickupOrder);
  }

  if (error) {
    console.error("restaurant_pickup_order_summary_load_failed", { code: error.code, message: error.message });
  }

  const { data: legacyData, error: legacyError } = await serviceClient
    .from("order_order")
    .select(LEGACY_SELECT)
    .in("restaurant_fk", restaurantPks)
    .in("order_status_code", LEGACY_PICKUP_STATUSES)
    .order("pickup_window_start_at", { ascending: false })
    .limit(limit);

  if (legacyError) {
    console.error("restaurant_legacy_order_load_failed", { code: legacyError.code, message: legacyError.message });
    throw new Error("Could not load restaurant pickup orders.");
  }

  if (!error && (legacyData ?? []).length > 0) {
    console.warn("restaurant_pickup_order_summary_empty_used_tenant_fallback");
  }

  return ((legacyData ?? []) as unknown as LegacyOrderRow[]).map(mapLegacyOrder);
}
