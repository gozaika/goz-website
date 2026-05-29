import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertRestaurantAccess, getPortalActor } from "@/lib/portal-auth";

// Use a format-only UUID regex — Zod v4 tightened uuid() to RFC 4122 strict which
// rejects deterministic demo PKs (e.g. 20000000-0000-0000-0000-000000000001).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const schema = z.object({
  restaurantPk: z.string().regex(UUID_RE, "Invalid UUID"),
  line1: z.string().min(1, "Street address is required").max(200),
  landmark: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

export async function PATCH(request: Request) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Review the location details." },
      { status: 400 },
    );
  }

  const allowed = await assertRestaurantAccess(parsed.data.restaurantPk, actor.profilePk);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "You do not have access to this restaurant." }, { status: 403 });
  }

  const service = createServiceRoleSupabaseClient();

  // Get the restaurant's current city and existing geo_address_fk
  const { data: restaurant } = await service
    .from("restaurant_restaurant")
    .select("geo_city_fk,geo_address_fk")
    .eq("restaurant_restaurant_pk", parsed.data.restaurantPk)
    .single();

  if (!restaurant?.geo_city_fk) {
    return NextResponse.json(
      { ok: false, error: "Complete restaurant setup (city) before saving a location." },
      { status: 400 },
    );
  }

  const addressPayload = {
    line_1: parsed.data.line1,
    landmark: parsed.data.landmark ?? null,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    geo_city_fk: restaurant.geo_city_fk,
    updated_at: new Date().toISOString(),
  };

  let addressPk: string;

  if (restaurant.geo_address_fk) {
    // Update existing address
    const { error } = await service
      .from("geo_address")
      .update(addressPayload)
      .eq("geo_address_pk", restaurant.geo_address_fk);

    if (error) {
      console.error("portal_location_update_failed", { code: error.code, message: error.message });
      return NextResponse.json({ ok: false, error: "Could not update location." }, { status: 500 });
    }
    addressPk = restaurant.geo_address_fk;
  } else {
    // Insert new address
    const { data: newAddress, error } = await service
      .from("geo_address")
      .insert({ ...addressPayload, created_at: new Date().toISOString() })
      .select("geo_address_pk")
      .single();

    if (error || !newAddress) {
      console.error("portal_location_insert_failed", { code: error?.code, message: error?.message });
      return NextResponse.json({ ok: false, error: "Could not save location." }, { status: 500 });
    }
    addressPk = newAddress.geo_address_pk;

    // Link to restaurant
    await service
      .from("restaurant_restaurant")
      .update({ geo_address_fk: addressPk, updated_at: new Date().toISOString() })
      .eq("restaurant_restaurant_pk", parsed.data.restaurantPk);
  }

  return NextResponse.json({ ok: true, data: { addressPk } });
}
