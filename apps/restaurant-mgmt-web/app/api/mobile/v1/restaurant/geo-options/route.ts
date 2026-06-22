import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { GeoOptionsData } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";

/**
 * Active city + neighborhood options for the location pickers (Slice 12). Gated by
 * `viewDashboard`; reference data (no tenant data), so any active member may read.
 */
export const GET = withMobileRestaurantRole("viewDashboard", async ({ requestId }) => {
  const service = createServiceRoleSupabaseClient();
  try {
    const [cities, neighborhoods] = await Promise.all([
      service.from("geo_city").select("geo_city_pk,city_name").eq("is_active", true).order("city_name"),
      service
        .from("geo_neighborhood")
        .select("geo_neighborhood_pk,geo_city_fk,neighborhood_name")
        .eq("is_active", true)
        .order("neighborhood_name"),
    ]);
    if (cities.error || neighborhoods.error) {
      throw cities.error ?? neighborhoods.error;
    }
    const data: GeoOptionsData = {
      cities: (cities.data ?? []).map((c) => ({ cityPk: c.geo_city_pk as string, cityName: c.city_name as string })),
      neighborhoods: (neighborhoods.data ?? []).map((n) => ({
        neighborhoodPk: n.geo_neighborhood_pk as string,
        cityPk: n.geo_city_fk as string,
        neighborhoodName: n.neighborhood_name as string,
      })),
    };
    return mobileResponseOk(data, requestId);
  } catch (caught) {
    console.error("mobile_geo_options_load_failed", { requestId, message: caught instanceof Error ? caught.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Could not load location options.", requestId);
  }
});
