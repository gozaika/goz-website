import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { PortalBagTemplate, PortalDrop } from "@gozaika/types";

export type ActivePortalRestaurant = {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly restaurantStatusCode: string;
  readonly cityPk: string;
  readonly neighborhoodPk: string | null;
};

export async function loadDefaultRestaurant(profilePk: string): Promise<ActivePortalRestaurant | null> {
  const service = createServiceRoleSupabaseClient();
  const { data: membership } = await service
    .from("restaurant_team_membership")
    .select(
      "restaurant_fk,restaurant_restaurant(restaurant_restaurant_pk,restaurant_name,restaurant_status_code,geo_city_fk,geo_neighborhood_fk)",
    )
    .eq("iam_profile_fk", profilePk)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  const restaurant = Array.isArray(membership?.restaurant_restaurant)
    ? membership?.restaurant_restaurant[0]
    : membership?.restaurant_restaurant;

  if (!restaurant?.restaurant_restaurant_pk || !restaurant.geo_city_fk) {
    return null;
  }

  return {
    restaurantPk: restaurant.restaurant_restaurant_pk,
    restaurantName: restaurant.restaurant_name,
    restaurantStatusCode: restaurant.restaurant_status_code,
    cityPk: restaurant.geo_city_fk,
    neighborhoodPk: restaurant.geo_neighborhood_fk ?? null,
  };
}

type TemplateRevisionRelation = {
  readonly catalog_bag_template_revision_pk: string;
  readonly display_name: string;
  readonly short_description: string | null;
  readonly dietary_category_code: PortalBagTemplate["dietaryCategoryCode"];
  readonly spice_level_code: PortalBagTemplate["spiceLevelCode"];
  readonly serves_min: number | string | null;
  readonly serves_max: number | string | null;
  readonly max_holding_minutes: number | string | null;
  readonly holding_guidance_text: string | null;
  readonly min_menu_value_paise: number | string | null;
  readonly suggested_price_paise: number | string | null;
  readonly allergen_summary_text: string | null;
  readonly included_item_hint_text: string | null;
};

type TemplateRow = {
  readonly catalog_bag_template_pk: string;
  readonly template_name: string;
  readonly template_status_code: string;
  readonly active_revision_fk: string | null;
  readonly default_drop_quantity: number | string | null;
  readonly default_pickup_start_offset_minutes: number | string | null;
  readonly default_pickup_duration_minutes: number | string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly catalog_bag_template_revision?: TemplateRevisionRelation | TemplateRevisionRelation[] | null;
};

export async function loadPortalTemplates(restaurantPk: string): Promise<PortalBagTemplate[]> {
  const service = createServiceRoleSupabaseClient();
  const { data: templates, error } = await service
    .from("catalog_bag_template")
    .select(
      "catalog_bag_template_pk,template_name,template_status_code,active_revision_fk,default_drop_quantity,default_pickup_start_offset_minutes,default_pickup_duration_minutes,created_at,updated_at,catalog_bag_template_revision!fk_catalog_bag_template_active_revision(catalog_bag_template_revision_pk,display_name,short_description,dietary_category_code,spice_level_code,serves_min,serves_max,max_holding_minutes,holding_guidance_text,min_menu_value_paise,suggested_price_paise,allergen_summary_text,included_item_hint_text)",
    )
    .eq("restaurant_fk", restaurantPk)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const revisionPks = (templates ?? []).map((template) => template.active_revision_fk).filter(Boolean) as string[];
  const { data: allergens } = revisionPks.length
    ? await service
        .from("catalog_bag_template_allergen")
        .select("catalog_bag_template_revision_fk,master_allergen(allergen_code)")
        .in("catalog_bag_template_revision_fk", revisionPks)
    : { data: [] };

  const allergensByRevision = new Map<string, string[]>();
  for (const row of allergens ?? []) {
    const allergen = Array.isArray(row.master_allergen) ? row.master_allergen[0] : row.master_allergen;
    if (!row.catalog_bag_template_revision_fk || !allergen?.allergen_code) continue;
    allergensByRevision.set(row.catalog_bag_template_revision_fk, [
      ...(allergensByRevision.get(row.catalog_bag_template_revision_fk) ?? []),
      allergen.allergen_code,
    ]);
  }

  return ((templates ?? []) as TemplateRow[]).map((template) => {
    const revision = Array.isArray(template.catalog_bag_template_revision)
      ? template.catalog_bag_template_revision[0]
      : (template.catalog_bag_template_revision ?? null);
    return {
      templatePk: template.catalog_bag_template_pk,
      templateName: template.template_name,
      templateStatusCode: template.template_status_code,
      activeRevisionPk: template.active_revision_fk,
      defaultDropQuantity: Number(template.default_drop_quantity ?? 10),
      defaultPickupStartOffsetMinutes: Number(template.default_pickup_start_offset_minutes ?? 15),
      defaultPickupDurationMinutes: Number(template.default_pickup_duration_minutes ?? 90),
      displayName: revision?.display_name ?? null,
      shortDescription: revision?.short_description ?? null,
      dietaryCategoryCode: revision?.dietary_category_code ?? null,
      spiceLevelCode: revision?.spice_level_code ?? null,
      servesMin: revision?.serves_min == null ? null : Number(revision.serves_min),
      servesMax: revision?.serves_max == null ? null : Number(revision.serves_max),
      maxHoldingMinutes: revision?.max_holding_minutes == null ? null : Number(revision.max_holding_minutes),
      holdingGuidanceText: revision?.holding_guidance_text ?? null,
      minMenuValuePaise: revision?.min_menu_value_paise == null ? null : Number(revision.min_menu_value_paise),
      suggestedPricePaise: revision?.suggested_price_paise == null ? null : Number(revision.suggested_price_paise),
      allergenSummaryText: revision?.allergen_summary_text ?? null,
      includedItemHintText: revision?.included_item_hint_text ?? null,
      allergenCodes: template.active_revision_fk ? (allergensByRevision.get(template.active_revision_fk) ?? []) : [],
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    };
  });
}

export async function loadPortalDrops(restaurantPk: string): Promise<PortalDrop[]> {
  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service
    .from("drop_drop")
    .select("drop_drop_pk,drop_title,drop_status_code,quantity_total,computed_quantity_available,price_paise,pickup_start_at,pickup_end_at,updated_at")
    .eq("restaurant_fk", restaurantPk)
    .order("pickup_start_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((drop) => ({
    dropPk: drop.drop_drop_pk,
    dropTitle: drop.drop_title,
    statusCode: drop.drop_status_code,
    quantityTotal: drop.quantity_total,
    quantityAvailable: drop.computed_quantity_available,
    pricePaise: Number(drop.price_paise),
    pickupStartAt: drop.pickup_start_at,
    pickupEndAt: drop.pickup_end_at,
    updatedAt: drop.updated_at,
  }));
}
