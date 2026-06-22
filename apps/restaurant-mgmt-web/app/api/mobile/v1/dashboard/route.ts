import type { RestaurantTeamRoleCode } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadDashboard } from "@/lib/mobile/dashboard";

/**
 * Role-shaped restaurant dashboard (Slice 14). Gated by `viewDashboard` (all active
 * members); the payload shape is then narrowed by role (QUEUE_ONLY for PICKUP_STAFF,
 * SUMMARY for FINANCE, FULL otherwise) so a role never receives data it may not see.
 */
export const GET = withMobileRestaurantRole("viewDashboard", async ({ restaurantPk, membership, requestId }) => {
  try {
    const data = await loadDashboard({
      restaurantPk,
      restaurantName: membership.restaurantName,
      statusCode: membership.restaurantStatusCode,
      roleCode: membership.roleCode as RestaurantTeamRoleCode,
    });
    return mobileResponseOk(data, requestId);
  } catch (caught) {
    console.error("mobile_dashboard_load_failed", { requestId, message: caught instanceof Error ? caught.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Could not load the dashboard.", requestId);
  }
});
