import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { restaurantLocationUpdateSchema } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadRestaurantProfile } from "@/lib/mobile/profile";
import { setRestaurantLocation } from "@/lib/mobile/location";

/**
 * Set / clear the restaurant pickup-pin coordinates (Slice 12 location pin).
 * Role-gated by `manageProfile` (OWNER/ADMIN), scoped to the selected restaurant.
 * Coordinates are validated by the canonical `restaurantLocationUpdateSchema`
 * (both set, or both null). Returns the refreshed profile.
 */
export async function PATCH(req: Request) {
  return withMobileRestaurantRole("manageProfile", async ({ restaurantPk, requestId }) => {
    const parsed = restaurantLocationUpdateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return mobileResponseErr("VALIDATION", parsed.error.issues[0]?.message ?? "Check the coordinates.", requestId, {
        fieldErrors: parsed.error.issues.map((issue) => ({ field: String(issue.path[0] ?? "latitude"), message: issue.message })),
      });
    }

    const service = createServiceRoleSupabaseClient();
    const result = await setRestaurantLocation(service, restaurantPk, parsed.data.latitude, parsed.data.longitude);
    if (!result.ok) {
      return mobileResponseErr("SERVER_ERROR", result.message, requestId);
    }

    const profile = await loadRestaurantProfile(service, restaurantPk, true);
    if (!profile) {
      return mobileResponseErr("NOT_FOUND", "Restaurant profile is unavailable.", requestId);
    }
    return mobileResponseOk(profile, requestId);
  })(req);
}
