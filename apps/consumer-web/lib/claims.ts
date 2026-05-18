import type { ClaimIntent } from "@gozaika/types";
import { createClient } from "@/lib/supabase/server";

export type ClaimIntentRow = {
  readonly hold_pk: string;
  readonly drop_pk: string;
  readonly consumer_profile_pk: string;
  readonly hold_status_code: ClaimIntent["statusCode"];
  readonly quantity_held: number | string;
  readonly expires_at: string;
  readonly hold_created_at: string;
  readonly hold_updated_at: string;
  readonly drop_title: string;
  readonly drop_status_code: ClaimIntent["dropStatusCode"];
  readonly drop_type_code: string;
  readonly quantity_total: number | string;
  readonly quantity_available: number | string;
  readonly price_paise: number | string;
  readonly pickup_start_at: string;
  readonly pickup_end_at: string;
  readonly restaurant_pk: string;
  readonly restaurant_name: string;
  readonly restaurant_slug: string;
  readonly neighborhood_name: string | null;
  readonly bag_display_name: string;
  readonly bag_short_description: string | null;
  readonly dietary_category_code: ClaimIntent["dietaryCategoryCode"];
  readonly spice_level_code: ClaimIntent["spiceLevelCode"];
  readonly serves_min: number | string | null;
  readonly serves_max: number | string | null;
  readonly max_holding_minutes: number | string | null;
  readonly holding_guidance_text: string | null;
  readonly min_menu_value_paise: number | string | null;
  readonly allergen_summary_text: string | null;
  readonly allergen_codes: readonly string[] | null;
};

export function mapClaimIntent(row: ClaimIntentRow): ClaimIntent {
  return {
    holdPk: row.hold_pk,
    dropPk: row.drop_pk,
    consumerProfilePk: row.consumer_profile_pk,
    statusCode: row.hold_status_code,
    quantityHeld: Number(row.quantity_held),
    expiresAt: row.expires_at,
    holdCreatedAt: row.hold_created_at,
    holdUpdatedAt: row.hold_updated_at,
    dropTitle: row.drop_title,
    dropStatusCode: row.drop_status_code,
    dropTypeCode: row.drop_type_code,
    quantityTotal: Number(row.quantity_total),
    quantityAvailable: Number(row.quantity_available),
    pricePaise: Number(row.price_paise),
    pickupStartAt: row.pickup_start_at,
    pickupEndAt: row.pickup_end_at,
    restaurantPk: row.restaurant_pk,
    restaurantName: row.restaurant_name,
    restaurantSlug: row.restaurant_slug,
    neighborhoodName: row.neighborhood_name,
    bagDisplayName: row.bag_display_name,
    bagShortDescription: row.bag_short_description,
    dietaryCategoryCode: row.dietary_category_code,
    spiceLevelCode: row.spice_level_code,
    servesMin: row.serves_min == null ? null : Number(row.serves_min),
    servesMax: row.serves_max == null ? null : Number(row.serves_max),
    maxHoldingMinutes: row.max_holding_minutes == null ? null : Number(row.max_holding_minutes),
    holdingGuidanceText: row.holding_guidance_text,
    minMenuValuePaise: row.min_menu_value_paise == null ? null : Number(row.min_menu_value_paise),
    allergenSummaryText: row.allergen_summary_text,
    allergenCodes: row.allergen_codes ?? [],
  };
}

export async function loadClaimIntent(holdPk: string): Promise<ClaimIntent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("api_claim_hold_summary").select("*").eq("hold_pk", holdPk).maybeSingle();

  if (error) {
    throw new Error("Could not load this hold.");
  }

  return data ? mapClaimIntent(data as ClaimIntentRow) : null;
}

export async function loadConsumerClaimIntents(): Promise<ClaimIntent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_claim_hold_summary")
    .select("*")
    .in("hold_status_code", ["ACTIVE", "EXPIRED", "RELEASED"])
    .order("hold_created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error("Could not load your current holds.");
  }

  return ((data ?? []) as ClaimIntentRow[]).map(mapClaimIntent);
}
