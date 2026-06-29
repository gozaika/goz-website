import type { DietaryCategoryCode, PublicDropCard, PublicRestaurantProfile } from "@gozaika/types";
import { createServiceRoleSupabaseClient, publicStorageUrl, STORAGE_BUCKETS } from "@gozaika/supabase";
import { createClient } from "@/lib/supabase/server";
import { getFollowerCounts } from "./follows";
import { loadPublicDrops } from "./drops";

type PublicRestaurantRow = {
  readonly restaurant_restaurant_pk: string;
  readonly restaurant_slug: string;
  readonly restaurant_name: string;
  readonly average_rating: number | string | null;
  readonly rating_count: number | string | null;
  readonly city_name: string | null;
  readonly neighborhood_name: string | null;
  readonly pickup_instructions: string | null;
  readonly headline: string | null;
  readonly story_markdown: string | null;
  readonly latitude: number | string | null;
  readonly longitude: number | string | null;
  readonly hero_bucket_name: string | null;
  readonly hero_object_path: string | null;
  readonly hero_width_px: number | null;
  readonly hero_height_px: number | null;
  readonly hero_alt_text: string | null;
  readonly logo_bucket_name: string | null;
  readonly logo_object_path: string | null;
  readonly logo_width_px: number | null;
  readonly logo_height_px: number | null;
  readonly logo_alt_text: string | null;
};

function mapImage(
  bucket: string | null,
  objectPath: string | null,
  width: number | null,
  height: number | null,
  alt: string | null,
): PublicRestaurantProfile["coverImage"] {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl || bucket !== STORAGE_BUCKETS.publicMedia || !objectPath) return null;
  return { url: publicStorageUrl(baseUrl, bucket, objectPath), width, height, alt, blurhash: null };
}

const cuisineKeywords = [
  "Biryani",
  "Thali",
  "Dessert",
  "Snacks",
  "Drinks",
  "Coastal",
  "Vegetarian",
  "Indian",
] as const;

function cuisineTagsFor(drops: readonly PublicDropCard[], headline: string | null): string[] {
  const haystack = [headline, ...drops.flatMap((drop) => [drop.dropTitle, drop.bagDisplayName, drop.bagShortDescription])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const matches = cuisineKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
  return matches.length ? [...new Set(matches)] : ["Chef's Selection"];
}

function dietaryTagsFor(drops: readonly PublicDropCard[]): DietaryCategoryCode[] {
  return [...new Set(drops.map((drop) => drop.dietaryCategoryCode))];
}

function mapRestaurant(
  row: PublicRestaurantRow,
  drops: readonly PublicDropCard[],
  generatedAtMs: number,
  followerCounts: Map<string, number>,
): PublicRestaurantProfile {
  const restaurantDrops = drops.filter((drop) => drop.restaurantSlug === row.restaurant_slug);
  const activeDrops = restaurantDrops.filter(
    (drop) => Date.parse(drop.pickupEndAt) > generatedAtMs && ["ACTIVE", "SCHEDULED"].includes(drop.statusCode),
  );
  const pastDrops = restaurantDrops.filter((drop) => Date.parse(drop.pickupEndAt) <= generatedAtMs).slice(0, 6);

  return {
    restaurantPk: row.restaurant_restaurant_pk,
    restaurantSlug: row.restaurant_slug,
    restaurantName: row.restaurant_name,
    cityName: row.city_name,
    neighborhoodName: row.neighborhood_name,
    pickupInstructions: row.pickup_instructions,
    headline: row.headline,
    storyMarkdown: row.story_markdown,
    averageRating: row.average_rating == null ? null : Number(row.average_rating),
    ratingCount: Number(row.rating_count ?? 0),
    followerCount: followerCounts.get(row.restaurant_restaurant_pk) ?? 0,
    cuisineTags: cuisineTagsFor(restaurantDrops, row.headline),
    dietaryTags: dietaryTagsFor(restaurantDrops),
    activeDropCount: activeDrops.length,
    totalDropCount: restaurantDrops.length,
    upcomingDropCount: activeDrops.filter((drop) => drop.statusCode === "SCHEDULED").length,
    pastDropCount: pastDrops.length,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    coverImage: mapImage(row.hero_bucket_name, row.hero_object_path, row.hero_width_px, row.hero_height_px, row.hero_alt_text),
    logoImage: mapImage(row.logo_bucket_name, row.logo_object_path, row.logo_width_px, row.logo_height_px, row.logo_alt_text),
    activeDrops,
    pastDrops,
  };
}

export async function loadPublicRestaurants(): Promise<PublicRestaurantProfile[]> {
  const supabase = await createClient();
  const service = createServiceRoleSupabaseClient();
  const [drops, profiles, followerCounts] = await Promise.all([
    loadPublicDrops(),
    supabase
      .from("api_public_restaurant_profile")
      .select("*")
      .order("restaurant_name", { ascending: true }),
    getFollowerCounts(service).catch((error) => {
      console.warn("follower_counts_unavailable", { message: error instanceof Error ? error.message : "unknown" });
      return new Map<string, number>();
    }),
  ]);

  if (profiles.error) {
    console.warn("public_restaurant_profiles_unavailable", { code: profiles.error.code, message: profiles.error.message });
  }

  const generatedAtMs = new Date().getTime();
  const rows = (profiles.data ?? []) as PublicRestaurantRow[];
  const mapped = rows.map((row) => mapRestaurant(row, drops, generatedAtMs, followerCounts));
  const slugsWithProfiles = new Set(mapped.map((restaurant) => restaurant.restaurantSlug));
  const fromDrops = [...new Map(drops.map((drop) => [drop.restaurantSlug, drop])).values()]
    .filter((drop) => !slugsWithProfiles.has(drop.restaurantSlug))
    .map((drop) =>
      mapRestaurant(
        {
          restaurant_restaurant_pk: drop.restaurantPk,
          restaurant_slug: drop.restaurantSlug,
          restaurant_name: drop.restaurantName,
          average_rating: null,
          rating_count: 0,
          city_name: drop.cityName,
          neighborhood_name: drop.neighborhoodName,
          pickup_instructions: null,
          headline: drop.restaurantHeadline,
          story_markdown: null,
          latitude: drop.latitude,
          longitude: drop.longitude,
          hero_bucket_name: null,
          hero_object_path: null,
          hero_width_px: null,
          hero_height_px: null,
          hero_alt_text: null,
          logo_bucket_name: null,
          logo_object_path: null,
          logo_width_px: null,
          logo_height_px: null,
          logo_alt_text: null,
        },
        drops,
        generatedAtMs,
        followerCounts,
      ),
    );

  return [...mapped, ...fromDrops].sort((left, right) => {
    const activeDelta = right.activeDropCount - left.activeDropCount;
    return activeDelta || left.restaurantName.localeCompare(right.restaurantName);
  });
}

export async function loadPublicRestaurant(slug: string): Promise<PublicRestaurantProfile | null> {
  const restaurants = await loadPublicRestaurants();
  return restaurants.find((restaurant) => restaurant.restaurantSlug === slug) ?? null;
}
