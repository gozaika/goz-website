import type { ActivePortalRestaurant } from "@/lib/slice3";
import type { PortalSwitcherRestaurant } from "./restaurant-switcher-island";

// Map the actor's active memberships into the chrome RestaurantSwitcher's shape.
// Returns undefined for single-membership accounts so PortalChrome hides the
// switcher entirely (the common / unchanged path).
export function toSwitcherRestaurants(
  memberships: readonly ActivePortalRestaurant[],
): readonly PortalSwitcherRestaurant[] | undefined {
  if (memberships.length < 2) return undefined;
  return memberships.map((restaurant) => ({
    id: restaurant.restaurantPk,
    name: restaurant.restaurantName,
    statusLabel: restaurant.restaurantStatusCode,
  }));
}
