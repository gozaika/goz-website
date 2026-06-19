import { resolveRestaurantMemberships } from "@gozaika/supabase";
import type {
  MobileMembershipDto,
  MobileRestaurantBootstrapDto,
  RestaurantStatusCode,
  RestaurantTeamRoleCode,
} from "@gozaika/types";
import { mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";

/**
 * Restaurant bootstrap (Slice 4). Resolves the IAM actor + active memberships and
 * roles for an existing restaurant actor.
 *
 * IMPORTANT (fixes defect D1): this path must NEVER call
 * `api_bootstrap_consumer_profile` — restaurant bootstrap must not create a
 * consumer profile as a side effect (shared spec §5.1).
 */
export const POST = withMobileAuth(async ({ actor, requestId }) => {
  const resolved = await resolveRestaurantMemberships(actor.profilePk);
  const active = resolved.filter((m) => m.isActive);

  const memberships: MobileMembershipDto[] = active.map((m) => ({
    restaurantPk: m.restaurantPk,
    restaurantName: m.restaurantName,
    roleCode: m.roleCode as RestaurantTeamRoleCode,
    restaurantStatusCode: m.restaurantStatusCode as RestaurantStatusCode,
    isDefault: m.isDefault,
  }));

  const selectedRestaurantPk =
    memberships.find((m) => m.isDefault)?.restaurantPk ??
    (memberships.length === 1 ? memberships[0]?.restaurantPk ?? null : null);

  const data: MobileRestaurantBootstrapDto = { actor, memberships, selectedRestaurantPk };
  return mobileResponseOk(data, requestId);
});
