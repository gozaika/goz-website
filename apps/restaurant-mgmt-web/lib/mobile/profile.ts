import type { SupabaseClient } from "@supabase/supabase-js";
import type { RestaurantComplianceStatusCode, RestaurantProfileData, RestaurantStatusCode } from "@gozaika/types";

type RestaurantRow = {
  readonly restaurant_name: string;
  readonly restaurant_slug: string;
  readonly legal_entity_name: string | null;
  readonly restaurant_status_code: string;
  readonly pickup_instructions: string | null;
  readonly primary_contact_email: string | null;
  readonly primary_contact_phone_e164: string | null;
  readonly geo_city_fk: string | null;
  readonly geo_neighborhood_fk: string | null;
  readonly geo_city: { city_name: string } | { city_name: string }[] | null;
  readonly geo_neighborhood: { neighborhood_name: string } | { neighborhood_name: string }[] | null;
};

type PublicProfileRow = {
  readonly headline: string | null;
  readonly story_markdown: string | null;
};

type ComplianceRow = {
  readonly compliance_status_code: string | null;
  readonly fssai_license_number: string | null;
  readonly fssai_license_expiry_date: string | null;
  readonly gstin: string | null;
  readonly pan_number: string | null;
  readonly last_reviewed_at: string | null;
};

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

/**
 * Aggregate the role-safe restaurant profile (basics + location + compliance
 * summary). Compliance returns status + presence flags + expiry only — never the
 * raw FSSAI/GSTIN/PAN numbers. Service-role read; the caller has already authorized
 * the restaurant. Returns null if the restaurant row is missing.
 */
export async function loadRestaurantProfile(
  service: SupabaseClient,
  restaurantPk: string,
  canEditBasics: boolean,
): Promise<RestaurantProfileData | null> {
  const { data: restaurant, error } = await service
    .from("restaurant_restaurant")
    .select(
      "restaurant_name,restaurant_slug,legal_entity_name,restaurant_status_code,pickup_instructions," +
        "primary_contact_email,primary_contact_phone_e164,geo_city_fk,geo_neighborhood_fk," +
        "geo_city:geo_city_fk(city_name),geo_neighborhood:geo_neighborhood_fk(neighborhood_name)",
    )
    .eq("restaurant_restaurant_pk", restaurantPk)
    .maybeSingle<RestaurantRow>();

  if (error) {
    throw error;
  }
  if (!restaurant) {
    return null;
  }

  const [{ data: compliance }, { data: publicProfile }] = await Promise.all([
    service
      .from("restaurant_compliance")
      .select("compliance_status_code,fssai_license_number,fssai_license_expiry_date,gstin,pan_number,last_reviewed_at")
      .eq("restaurant_fk", restaurantPk)
      .maybeSingle<ComplianceRow>(),
    service
      .from("restaurant_public_profile")
      .select("headline,story_markdown")
      .eq("restaurant_fk", restaurantPk)
      .maybeSingle<PublicProfileRow>(),
  ]);

  return {
    restaurantPk,
    restaurantName: restaurant.restaurant_name,
    restaurantSlug: restaurant.restaurant_slug,
    legalEntityName: restaurant.legal_entity_name,
    statusCode: restaurant.restaurant_status_code as RestaurantStatusCode,
    pickupInstructions: restaurant.pickup_instructions,
    primaryContactEmail: restaurant.primary_contact_email,
    primaryContactPhoneE164: restaurant.primary_contact_phone_e164,
    cityPk: restaurant.geo_city_fk,
    cityName: firstRel(restaurant.geo_city)?.city_name ?? null,
    neighborhoodPk: restaurant.geo_neighborhood_fk,
    neighborhoodName: firstRel(restaurant.geo_neighborhood)?.neighborhood_name ?? null,
    headline: publicProfile?.headline ?? null,
    storyMarkdown: publicProfile?.story_markdown ?? null,
    compliance: {
      statusCode: (compliance?.compliance_status_code ?? null) as RestaurantComplianceStatusCode | null,
      fssaiPresent: Boolean(compliance?.fssai_license_number),
      fssaiExpiryDate: compliance?.fssai_license_expiry_date ?? null,
      gstinPresent: Boolean(compliance?.gstin),
      panPresent: Boolean(compliance?.pan_number),
      lastReviewedAt: compliance?.last_reviewed_at ?? null,
    },
    canEditBasics,
  };
}
