import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { roleHasCapability, type RestaurantTeamRoleCode } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadRestaurantProfile } from "@/lib/mobile/profile";

/**
 * Restaurant profile read (Slice 12). Any active member may view (`viewDashboard`);
 * `canEditBasics` reflects whether the actor's role holds `manageProfile`
 * (OWNER/ADMIN) so the app can show/hide the edit affordance. Compliance is a
 * summary only — no raw FSSAI/GSTIN/PAN numbers.
 */
export const GET = withMobileRestaurantRole("viewDashboard", async ({ restaurantPk, membership, requestId }) => {
  const service = createServiceRoleSupabaseClient();
  const canEditBasics = roleHasCapability(membership.roleCode as RestaurantTeamRoleCode, "manageProfile");
  try {
    const profile = await loadRestaurantProfile(service, restaurantPk, canEditBasics);
    if (!profile) {
      return mobileResponseErr("NOT_FOUND", "Restaurant profile is unavailable.", requestId);
    }
    return mobileResponseOk(profile, requestId);
  } catch (caught) {
    console.error("mobile_restaurant_profile_load_failed", {
      requestId,
      message: caught instanceof Error ? caught.message : "unknown",
    });
    return mobileResponseErr("SERVER_ERROR", "Could not load the restaurant profile.", requestId);
  }
});
