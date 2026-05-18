import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";
import { createDropDraftSchema } from "@gozaika/types";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalDrops } from "@/lib/slice3";

export async function GET() {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant) {
    return NextResponse.json({ ok: true, data: [] });
  }

  return NextResponse.json({ ok: true, data: await loadPortalDrops(restaurant.restaurantPk) });
}

export async function POST(request: Request) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "Only approved active restaurants can publish drops." }, { status: 403 });
  }

  const parsed = createDropDraftSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Review the drop details and try again." }, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data: revision, error: revisionError } = await service
    .from("catalog_bag_template_revision")
    .select("catalog_bag_template_revision_pk,display_name,catalog_bag_template!inner(restaurant_fk,template_status_code,active_revision_fk)")
    .eq("catalog_bag_template_revision_pk", parsed.data.templateRevisionPk)
    .maybeSingle();

  const template = Array.isArray(revision?.catalog_bag_template)
    ? revision?.catalog_bag_template[0]
    : revision?.catalog_bag_template;

  if (revisionError || !revision || template?.restaurant_fk !== restaurant.restaurantPk || template.template_status_code !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "Choose an active template for this restaurant." }, { status: 400 });
  }

  const pickupStart = new Date(parsed.data.pickupStartAt);
  const pickupEnd = new Date(parsed.data.pickupEndAt);
  if (!(pickupEnd > pickupStart)) {
    return NextResponse.json({ ok: false, error: "Pickup end time must be after pickup start time." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const publishedAt = parsed.data.statusCode === "ACTIVE" ? now : null;
  const { data: drop, error: dropError } = await service
    .from("drop_drop")
    .insert({
      restaurant_fk: restaurant.restaurantPk,
      catalog_bag_template_revision_fk: parsed.data.templateRevisionPk,
      drop_title: parsed.data.dropTitle ?? revision.display_name,
      drop_status_code: parsed.data.statusCode,
      drop_type_code: parsed.data.dropTypeCode,
      geo_city_fk: restaurant.cityPk,
      geo_neighborhood_fk: restaurant.neighborhoodPk,
      quantity_total: parsed.data.quantityTotal,
      price_paise: parsed.data.pricePaise,
      publish_at: publishedAt,
      pickup_start_at: parsed.data.pickupStartAt,
      pickup_end_at: parsed.data.pickupEndAt,
      visibility_code: "PUBLIC",
      created_by_profile_fk: actor.profilePk,
      published_by_profile_fk: publishedAt ? actor.profilePk : null,
      published_at: publishedAt,
      created_at: now,
      updated_at: now,
    })
    .select("drop_drop_pk,drop_status_code")
    .single();

  if (dropError || !drop) {
    return NextResponse.json({ ok: false, error: "Could not publish this drop." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { dropPk: drop.drop_drop_pk, statusCode: drop.drop_status_code } }, { status: 201 });
}
