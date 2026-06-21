import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { CounterOrdersData } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { toCounterOrder } from "@/lib/mobile/counter";
import { loadRestaurantPickupOrders } from "@/lib/restaurant-orders";

/**
 * Restaurant pickup queue (Slice 7). Role-gated by `viewOrders`, scoped to the
 * selected restaurant (revalidated by the wrapper on every request). Uses the
 * shared loader so the wire shape cannot drift from the web portal.
 */
export const GET = withMobileRestaurantRole("viewOrders", async ({ restaurantPk, requestId }) => {
  const service = createServiceRoleSupabaseClient();
  try {
    const orders = await loadRestaurantPickupOrders({
      viewClient: service,
      serviceClient: service,
      restaurantPks: [restaurantPk],
    });
    const data: CounterOrdersData = { restaurantPk, orders: orders.map(toCounterOrder) };
    return mobileResponseOk(data, requestId);
  } catch (caught) {
    console.error("mobile_counter_orders_load_failed", {
      requestId,
      message: caught instanceof Error ? caught.message : "unknown",
    });
    return mobileResponseErr("SERVER_ERROR", "Could not load the pickup queue. Please try again.", requestId);
  }
});
