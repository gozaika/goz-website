import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { restaurantPortalProfileUpdateSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { assertRestaurantAccess, getPortalActor } from "@/lib/portal-auth";

export async function PATCH(request: Request) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = restaurantPortalProfileUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check profile contact details and try again." }, { status: 400 });
  }

  const allowed = await assertRestaurantAccess(parsed.data.restaurantPk, actor.profilePk);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "You do not have access to this restaurant." }, { status: 403 });
  }

  const service = createServiceRoleSupabaseClient();
  const now = new Date().toISOString();

  const { error: profileError } = await service
    .from("iam_profile")
    .update({
      email_address: parsed.data.staffEmailAddress,
      phone_e164: parsed.data.staffPhoneE164,
      updated_at: now,
    })
    .eq("iam_profile_pk", actor.profilePk);

  if (profileError) {
    return NextResponse.json({ ok: false, error: "Could not save account contact." }, { status: 500 });
  }

  const { data: restaurant, error: restaurantLoadError } = await service
    .from("restaurant_restaurant")
    .select("restaurant_restaurant_pk,restaurant_name")
    .eq("restaurant_restaurant_pk", parsed.data.restaurantPk)
    .single();

  if (restaurantLoadError || !restaurant) {
    return NextResponse.json({ ok: false, error: "Restaurant profile is unavailable." }, { status: 404 });
  }

  const { error: restaurantError } = await service
    .from("restaurant_restaurant")
    .update({
      primary_contact_email: parsed.data.primaryContactEmail,
      primary_contact_phone_e164: parsed.data.primaryContactPhoneE164,
      updated_at: now,
    })
    .eq("restaurant_restaurant_pk", parsed.data.restaurantPk);

  if (restaurantError) {
    return NextResponse.json({ ok: false, error: "Could not save restaurant contact." }, { status: 500 });
  }

  if (parsed.data.primaryContactEmail || parsed.data.primaryContactPhoneE164) {
    const { data: contact } = await service
      .from("restaurant_contact")
      .select("restaurant_contact_pk")
      .eq("restaurant_fk", parsed.data.restaurantPk)
      .in("contact_type_code", ["PICKUP", "MANAGER", "OWNER", "SUPPORT"])
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const contactPayload = {
      contact_type_code: "MANAGER",
      contact_name: `${restaurant.restaurant_name} operations`,
      email_address: parsed.data.primaryContactEmail,
      phone_e164: parsed.data.primaryContactPhoneE164,
      is_primary: true,
      updated_at: now,
    };

    const { error: contactError } = contact
      ? await service.from("restaurant_contact").update(contactPayload).eq("restaurant_contact_pk", contact.restaurant_contact_pk)
      : await service.from("restaurant_contact").insert({
          ...contactPayload,
          restaurant_fk: parsed.data.restaurantPk,
          created_at: now,
        });

    if (contactError) {
      return NextResponse.json({ ok: false, error: "Could not save notification contact." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
