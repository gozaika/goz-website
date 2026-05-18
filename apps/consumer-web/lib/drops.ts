import type { PublicDropCard } from "@gozaika/types";
import { createClient } from "@/lib/supabase/server";

type PublicDropRow = {
  readonly drop_drop_pk: string;
  readonly drop_title: string;
  readonly drop_status_code: PublicDropCard["statusCode"];
  readonly drop_type_code: string;
  readonly quantity_total: number;
  readonly computed_quantity_available: number;
  readonly price_paise: number | string;
  readonly pickup_start_at: string;
  readonly pickup_end_at: string;
  readonly restaurant_slug: string;
  readonly restaurant_name: string;
  readonly neighborhood_name: string | null;
  readonly bag_display_name: string;
  readonly bag_short_description: string | null;
  readonly dietary_category_code: PublicDropCard["dietaryCategoryCode"];
  readonly spice_level_code: PublicDropCard["spiceLevelCode"];
  readonly serves_min: number | null;
  readonly serves_max: number | null;
  readonly max_holding_minutes: number | null;
  readonly holding_guidance_text: string | null;
  readonly min_menu_value_paise: number | string | null;
  readonly allergen_summary_text: string | null;
  readonly allergen_codes: readonly string[] | null;
};

function mapDrop(row: PublicDropRow): PublicDropCard {
  return {
    dropPk: row.drop_drop_pk,
    dropTitle: row.drop_title,
    dropTypeCode: row.drop_type_code,
    restaurantName: row.restaurant_name,
    restaurantSlug: row.restaurant_slug,
    neighborhoodName: row.neighborhood_name,
    bagDisplayName: row.bag_display_name,
    bagShortDescription: row.bag_short_description,
    dietaryCategoryCode: row.dietary_category_code,
    spiceLevelCode: row.spice_level_code,
    servesMin: row.serves_min,
    servesMax: row.serves_max,
    maxHoldingMinutes: row.max_holding_minutes,
    holdingGuidanceText: row.holding_guidance_text,
    minMenuValuePaise: row.min_menu_value_paise == null ? null : Number(row.min_menu_value_paise),
    allergenSummaryText: row.allergen_summary_text,
    allergenCodes: row.allergen_codes ?? [],
    pricePaise: Number(row.price_paise),
    pickupStartAt: row.pickup_start_at,
    pickupEndAt: row.pickup_end_at,
    quantityTotal: row.quantity_total,
    quantityAvailable: row.computed_quantity_available,
    statusCode: row.drop_status_code,
  };
}

export async function loadPublicDrops(): Promise<PublicDropCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_public_drop_card")
    .select("*")
    .order("pickup_start_at", { ascending: true });

  if (error) {
    throw new Error("Could not load public drops.");
  }

  return ((data ?? []) as PublicDropRow[]).map(mapDrop);
}

export async function loadPublicDrop(dropPk: string): Promise<PublicDropCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("api_public_drop_card").select("*").eq("drop_drop_pk", dropPk).maybeSingle();

  if (error) {
    throw new Error("Could not load this drop.");
  }

  return data ? mapDrop(data as PublicDropRow) : null;
}
