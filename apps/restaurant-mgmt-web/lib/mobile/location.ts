import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Restaurant pickup-pin location write (Slice 12 location pin). Stores WGS-84
 * coordinates on the restaurant's linked `geo_address` row, creating + linking one
 * if none exists. Coordinates move together: both numbers to set, both null to
 * clear. Service-role; the caller (mobile location route) has already authorized
 * `manageProfile` on `restaurantPk`, and every write is scoped to it — no
 * cross-tenant exposure.
 */

type RestaurantLocationRow = {
  readonly restaurant_name: string;
  readonly geo_address_fk: string | null;
  readonly geo_city_fk: string;
  readonly geo_neighborhood_fk: string | null;
};

export type SetLocationResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

export async function setRestaurantLocation(
  service: SupabaseClient,
  restaurantPk: string,
  latitude: number | null,
  longitude: number | null,
): Promise<SetLocationResult> {
  const { data: restaurant, error: readError } = await service
    .from("restaurant_restaurant")
    .select("restaurant_name,geo_address_fk,geo_city_fk,geo_neighborhood_fk")
    .eq("restaurant_restaurant_pk", restaurantPk)
    .maybeSingle<RestaurantLocationRow>();

  if (readError) {
    console.error("mobile_location_read_failed", { code: readError.code });
    return { ok: false, message: "Could not load the restaurant." };
  }
  if (!restaurant) return { ok: false, message: "Restaurant not found." };

  const now = new Date().toISOString();

  // Clear: null the coordinates on the existing pin row (keep the address/link).
  if (latitude === null || longitude === null) {
    if (!restaurant.geo_address_fk) return { ok: true };
    const { error } = await service
      .from("geo_address")
      .update({ latitude: null, longitude: null, updated_at: now })
      .eq("geo_address_pk", restaurant.geo_address_fk);
    if (error) {
      console.error("mobile_location_clear_failed", { code: error.code });
      return { ok: false, message: "Could not clear the location." };
    }
    return { ok: true };
  }

  // Update the existing pin row.
  if (restaurant.geo_address_fk) {
    const { error } = await service
      .from("geo_address")
      .update({ latitude, longitude, updated_at: now })
      .eq("geo_address_pk", restaurant.geo_address_fk);
    if (error) {
      console.error("mobile_location_update_failed", { code: error.code });
      return { ok: false, message: "Could not save the location." };
    }
    return { ok: true };
  }

  // Create + link a new address row carrying the pin.
  const { data: inserted, error: insertError } = await service
    .from("geo_address")
    .insert({
      line_1: restaurant.restaurant_name,
      geo_city_fk: restaurant.geo_city_fk,
      geo_neighborhood_fk: restaurant.geo_neighborhood_fk,
      latitude,
      longitude,
    })
    .select("geo_address_pk")
    .single();
  if (insertError || !inserted) {
    console.error("mobile_location_insert_failed", { code: insertError?.code });
    return { ok: false, message: "Could not save the location." };
  }

  const { error: linkError } = await service
    .from("restaurant_restaurant")
    .update({ geo_address_fk: (inserted as { geo_address_pk: string }).geo_address_pk, updated_at: now })
    .eq("restaurant_restaurant_pk", restaurantPk);
  if (linkError) {
    console.error("mobile_location_link_failed", { code: linkError.code });
    return { ok: false, message: "Could not save the location." };
  }
  return { ok: true };
}
