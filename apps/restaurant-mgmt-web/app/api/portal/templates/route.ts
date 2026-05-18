import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { createBagTemplateSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalTemplates } from "@/lib/slice3";

export async function GET() {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant) {
    return NextResponse.json({ ok: true, data: [] });
  }

  return NextResponse.json({ ok: true, data: await loadPortalTemplates(restaurant.restaurantPk) });
}

export async function POST(request: Request) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "Only approved active restaurants can publish BAM Bag templates." }, { status: 403 });
  }

  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = createBagTemplateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Review the template disclosure fields and try again." }, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const now = new Date().toISOString();
  const uniqueAllergenCodes = [...new Set(parsed.data.allergenCodes)];
  const { data: allergenRows, error: allergenError } = await service
    .from("master_allergen")
    .select("master_allergen_pk,allergen_code")
    .in("allergen_code", uniqueAllergenCodes);

  if (allergenError) {
    return NextResponse.json({ ok: false, error: "Could not validate allergens." }, { status: 500 });
  }

  if ((allergenRows ?? []).length !== uniqueAllergenCodes.length) {
    return NextResponse.json({ ok: false, error: "One or more allergen codes are not supported." }, { status: 400 });
  }

  const { data: template, error: templateError } = await service
    .from("catalog_bag_template")
    .insert({
      restaurant_fk: restaurant.restaurantPk,
      template_name: parsed.data.templateName,
      template_status_code: "ACTIVE",
      created_by_profile_fk: actor.profilePk,
      created_at: now,
      updated_at: now,
    })
    .select("catalog_bag_template_pk")
    .single();

  if (templateError || !template) {
    return NextResponse.json({ ok: false, error: "Could not create the template." }, { status: 500 });
  }

  const { data: revision, error: revisionError } = await service
    .from("catalog_bag_template_revision")
    .insert({
      catalog_bag_template_fk: template.catalog_bag_template_pk,
      revision_number: 1,
      display_name: parsed.data.displayName,
      short_description: parsed.data.shortDescription ?? null,
      dietary_category_code: parsed.data.dietaryCategoryCode,
      spice_level_code: parsed.data.spiceLevelCode ?? null,
      serves_min: parsed.data.servesMin,
      serves_max: parsed.data.servesMax,
      max_holding_minutes: parsed.data.maxHoldingMinutes,
      holding_guidance_text: parsed.data.holdingGuidanceText ?? null,
      min_menu_value_paise: parsed.data.minMenuValuePaise,
      suggested_price_paise: parsed.data.suggestedPricePaise,
      allergen_summary_text: parsed.data.allergenSummaryText,
      included_item_hint_text: parsed.data.includedItemHintText ?? null,
      revision_status_code: "PUBLISHED",
      published_at: now,
      created_by_profile_fk: actor.profilePk,
      created_at: now,
      updated_at: now,
    })
    .select("catalog_bag_template_revision_pk")
    .single();

  if (revisionError || !revision) {
    return NextResponse.json({ ok: false, error: "Could not publish the template revision." }, { status: 500 });
  }

  const allergenPayload = (allergenRows ?? []).map((row) => ({
    catalog_bag_template_revision_fk: revision.catalog_bag_template_revision_pk,
    master_allergen_fk: row.master_allergen_pk,
    contains_flag: true,
    may_contain_flag: false,
    created_at: now,
    updated_at: now,
  }));

  const { error: templateUpdateError } = await service
    .from("catalog_bag_template")
    .update({ active_revision_fk: revision.catalog_bag_template_revision_pk, updated_at: now })
    .eq("catalog_bag_template_pk", template.catalog_bag_template_pk);

  const { error: allergenInsertError } = allergenPayload.length
    ? await service.from("catalog_bag_template_allergen").insert(allergenPayload)
    : { error: null };

  if (templateUpdateError || allergenInsertError) {
    return NextResponse.json({ ok: false, error: "Template saved, but disclosure finalization failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { templatePk: template.catalog_bag_template_pk, templateRevisionPk: revision.catalog_bag_template_revision_pk } });
}
