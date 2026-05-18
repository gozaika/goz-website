import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { createBagTemplateSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant } from "@/lib/slice3";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "Only approved active restaurants can publish BAM Bag templates." }, { status: 403 });
  }

  const { id } = await context.params;
  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const service = createServiceRoleSupabaseClient();
  const { data: template, error: templateError } = await service
    .from("catalog_bag_template")
    .select("catalog_bag_template_pk,restaurant_fk,template_name,active_revision_fk,default_drop_quantity,default_pickup_start_offset_minutes,default_pickup_duration_minutes")
    .eq("catalog_bag_template_pk", id)
    .maybeSingle();

  if (templateError || !template || template.restaurant_fk !== restaurant.restaurantPk) {
    return NextResponse.json({ ok: false, error: "Template not found for this restaurant." }, { status: 404 });
  }

  if (json.action === "archive") {
    const { error } = await service
      .from("catalog_bag_template")
      .update({ template_status_code: "ARCHIVED", updated_at: new Date().toISOString() })
      .eq("catalog_bag_template_pk", id);

    if (error) {
      return NextResponse.json({ ok: false, error: "Could not archive this template." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: { templatePk: id, statusCode: "ARCHIVED" } });
  }

  if (json.action === "publish_revision") {
    const parsed = createBagTemplateSchema.safeParse(json.template ?? json);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => {
        const field = issue.path.join(".");
        return field ? `${field}: ${issue.message}` : issue.message;
      });
      return NextResponse.json(
        { ok: false, error: "Review the template details.", errors },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data: latestRevision } = await service
      .from("catalog_bag_template_revision")
      .select("revision_number")
      .eq("catalog_bag_template_fk", id)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: allergenRows, error: allergenError } = await service
      .from("master_allergen")
      .select("master_allergen_pk,allergen_code")
      .in("allergen_code", [...new Set(parsed.data.allergenCodes)]);

    if (allergenError || (allergenRows ?? []).length !== new Set(parsed.data.allergenCodes).size) {
      return NextResponse.json({ ok: false, error: "One or more allergen codes are not supported." }, { status: 400 });
    }

    const { data: revision, error: revisionError } = await service
      .from("catalog_bag_template_revision")
      .insert({
        catalog_bag_template_fk: id,
        revision_number: Number(latestRevision?.revision_number ?? 0) + 1,
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
      return NextResponse.json({ ok: false, error: "Could not publish a new template revision." }, { status: 500 });
    }

    const allergenPayload = (allergenRows ?? []).map((row) => ({
      catalog_bag_template_revision_fk: revision.catalog_bag_template_revision_pk,
      master_allergen_fk: row.master_allergen_pk,
      contains_flag: true,
      may_contain_flag: false,
      created_at: now,
      updated_at: now,
    }));

    const { error: allergenInsertError } = allergenPayload.length
      ? await service.from("catalog_bag_template_allergen").insert(allergenPayload)
      : { error: null };
    const { error: updateError } = await service
      .from("catalog_bag_template")
      .update({
        template_name: parsed.data.templateName,
        template_status_code: "ACTIVE",
        active_revision_fk: revision.catalog_bag_template_revision_pk,
        default_drop_quantity: parsed.data.defaultDropQuantity,
        default_pickup_start_offset_minutes: parsed.data.defaultPickupStartOffsetMinutes,
        default_pickup_duration_minutes: parsed.data.defaultPickupDurationMinutes,
        updated_at: now,
      })
      .eq("catalog_bag_template_pk", id);

    if (allergenInsertError || updateError) {
      return NextResponse.json({ ok: false, error: "Revision saved, but template finalization failed." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: { templatePk: id, templateRevisionPk: revision.catalog_bag_template_revision_pk },
    });
  }

  if (json.action === "duplicate") {
    if (!template.active_revision_fk) {
      return NextResponse.json({ ok: false, error: "Only templates with an active revision can be duplicated." }, { status: 409 });
    }

    const { data: sourceRevision, error: sourceRevisionError } = await service
      .from("catalog_bag_template_revision")
      .select("*")
      .eq("catalog_bag_template_revision_pk", template.active_revision_fk)
      .maybeSingle();

    if (sourceRevisionError || !sourceRevision) {
      return NextResponse.json({ ok: false, error: "Could not load the active template revision." }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { data: newTemplate, error: newTemplateError } = await service
      .from("catalog_bag_template")
      .insert({
        restaurant_fk: restaurant.restaurantPk,
        template_name: `${template.template_name} Copy`,
        template_status_code: "ACTIVE",
        default_drop_quantity: template.default_drop_quantity,
        default_pickup_start_offset_minutes: template.default_pickup_start_offset_minutes,
        default_pickup_duration_minutes: template.default_pickup_duration_minutes,
        created_by_profile_fk: actor.profilePk,
        created_at: now,
        updated_at: now,
      })
      .select("catalog_bag_template_pk")
      .single();

    if (newTemplateError || !newTemplate) {
      return NextResponse.json({ ok: false, error: "Could not duplicate this template." }, { status: 500 });
    }

    const { data: newRevision, error: newRevisionError } = await service
      .from("catalog_bag_template_revision")
      .insert({
        catalog_bag_template_fk: newTemplate.catalog_bag_template_pk,
        revision_number: 1,
        display_name: `${sourceRevision.display_name} Copy`,
        short_description: sourceRevision.short_description,
        dietary_category_code: sourceRevision.dietary_category_code,
        spice_level_code: sourceRevision.spice_level_code,
        serves_min: sourceRevision.serves_min,
        serves_max: sourceRevision.serves_max,
        max_holding_minutes: sourceRevision.max_holding_minutes,
        holding_guidance_text: sourceRevision.holding_guidance_text,
        min_menu_value_paise: sourceRevision.min_menu_value_paise,
        suggested_price_paise: sourceRevision.suggested_price_paise,
        allergen_summary_text: sourceRevision.allergen_summary_text,
        included_item_hint_text: sourceRevision.included_item_hint_text,
        revision_status_code: "PUBLISHED",
        published_at: now,
        created_by_profile_fk: actor.profilePk,
        created_at: now,
        updated_at: now,
      })
      .select("catalog_bag_template_revision_pk")
      .single();

    if (newRevisionError || !newRevision) {
      return NextResponse.json({ ok: false, error: "Template duplicated, but revision copy failed." }, { status: 500 });
    }

    const { data: sourceAllergens } = await service
      .from("catalog_bag_template_allergen")
      .select("master_allergen_fk,contains_flag,may_contain_flag")
      .eq("catalog_bag_template_revision_fk", template.active_revision_fk);

    if (sourceAllergens?.length) {
      await service.from("catalog_bag_template_allergen").insert(
        sourceAllergens.map((row) => ({
          catalog_bag_template_revision_fk: newRevision.catalog_bag_template_revision_pk,
          master_allergen_fk: row.master_allergen_fk,
          contains_flag: row.contains_flag,
          may_contain_flag: row.may_contain_flag,
          created_at: now,
          updated_at: now,
        })),
      );
    }

    await service
      .from("catalog_bag_template")
      .update({ active_revision_fk: newRevision.catalog_bag_template_revision_pk, updated_at: now })
      .eq("catalog_bag_template_pk", newTemplate.catalog_bag_template_pk);

    return NextResponse.json({
      ok: true,
      data: { templatePk: newTemplate.catalog_bag_template_pk, templateRevisionPk: newRevision.catalog_bag_template_revision_pk },
    });
  }

  if (json.action !== "publish_latest_revision") {
    return NextResponse.json({ ok: false, error: "Unsupported template action." }, { status: 400 });
  }

  const { data: revision, error: revisionError } = await service
    .from("catalog_bag_template_revision")
    .select("catalog_bag_template_revision_pk")
    .eq("catalog_bag_template_fk", id)
    .eq("revision_status_code", "PUBLISHED")
    .order("revision_number", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (revisionError || !revision) {
    return NextResponse.json(
      { ok: false, error: "This template has no published revision. Create a new template with disclosure details." },
      { status: 409 },
    );
  }

  const { error: updateError } = await service
    .from("catalog_bag_template")
    .update({
      active_revision_fk: revision.catalog_bag_template_revision_pk,
      template_status_code: "ACTIVE",
      updated_at: new Date().toISOString(),
    })
    .eq("catalog_bag_template_pk", id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: "Could not publish this template." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { templatePk: id, templateRevisionPk: revision.catalog_bag_template_revision_pk },
  });
}
