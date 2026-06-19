import type { MobileRestaurantSummaryDto, RestaurantStatusCode, RestaurantTeamRoleCode } from "@gozaika/types";
import { mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";

/**
 * First role-protected restaurant read (Slice 4). Gated by `viewDashboard`, scoped
 * to the selected restaurant, and revalidated on every request.
 */
export const GET = withMobileRestaurantRole("viewDashboard", ({ membership, requestId }) => {
  const data: MobileRestaurantSummaryDto = {
    restaurantPk: membership.restaurantPk,
    restaurantName: membership.restaurantName,
    restaurantStatusCode: membership.restaurantStatusCode as RestaurantStatusCode,
    roleCode: membership.roleCode as RestaurantTeamRoleCode,
  };
  return mobileResponseOk(data, requestId);
});
