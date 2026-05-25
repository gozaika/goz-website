import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { restaurantBasicsUpdateSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { assertRestaurantAccess, getPortalActor } from "@/lib/portal-auth";

export async function PATCH(request: Request) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = restaurantBasicsUpdateSchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        ok: false,
        error: firstIssue?.path.length
          ? `Check ${firstIssue.path.join(".")}: ${firstIssue.message}`
          : "Check restaurant basics and try again.",
      },
      { status: 400 },
    );
  }

  const allowed = await assertRestaurantAccess(parsed.data.restaurantPk, actor.profilePk);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "You do not have access to this restaurant." }, { status: 403 });
  }

  const service = createServiceRoleSupabaseClient();
  const { error: restaurantError } = await service
    .from("restaurant_restaurant")
    .update({
      restaurant_name: parsed.data.restaurantName,
      restaurant_slug: parsed.data.restaurantSlug,
      legal_entity_name: parsed.data.legalEntityName ?? null,
      geo_city_fk: parsed.data.cityPk ?? null,
      geo_neighborhood_fk: parsed.data.neighborhoodPk ?? null,
      primary_contact_email: parsed.data.primaryContactEmail,
      primary_contact_phone_e164: parsed.data.primaryContactPhoneE164 ?? null,
      pickup_instructions: parsed.data.pickupInstructions ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_restaurant_pk", parsed.data.restaurantPk);

  if (restaurantError) {
    return NextResponse.json({ ok: false, error: "Could not save restaurant basics." }, { status: 500 });
  }

  const { data: existingContact } = await service
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
    contact_name: `${parsed.data.restaurantName} operations`,
    email_address: parsed.data.primaryContactEmail,
    phone_e164: parsed.data.primaryContactPhoneE164 ?? null,
    is_primary: true,
    updated_at: new Date().toISOString(),
  };
  const { error: contactError } = existingContact
    ? await service.from("restaurant_contact").update(contactPayload).eq("restaurant_contact_pk", existingContact.restaurant_contact_pk)
    : await service.from("restaurant_contact").insert({
        ...contactPayload,
        restaurant_fk: parsed.data.restaurantPk,
        created_at: new Date().toISOString(),
      });

  if (contactError) {
    return NextResponse.json({ ok: false, error: "Could not save restaurant contact." }, { status: 500 });
  }

  await service
    .from("restaurant_public_profile")
    .upsert(
      {
        restaurant_fk: parsed.data.restaurantPk,
        headline: parsed.data.headline ?? "Chef-curated BAM Bags, pickup only.",
        story_markdown: parsed.data.storyMarkdown ?? "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_fk" },
    );

  await service
    .from("restaurant_onboarding_task")
    .update({
      task_status_code: "COMPLETED",
      completed_at: new Date().toISOString(),
      completed_by_profile_fk: actor.profilePk,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_fk", parsed.data.restaurantPk)
    .in("task_code", ["PROFILE", "LOCATION_PICKUP", "CONTACTS"]);

  return NextResponse.json({ ok: true });
}
