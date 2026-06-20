import { z } from "zod";

// Public discovery contracts (Slice 8). Wire schemas mirror the existing
// PublicDropCard / PublicRestaurantProfile (codes kept permissive as strings).
// The BFF returns the same shapes the web `lib/drops` / `lib/restaurants` produce.

export const publicDropCardSchema = z.object({
  dropPk: z.string(),
  dropTitle: z.string(),
  dropTypeCode: z.string(),
  restaurantPk: z.string(),
  restaurantName: z.string(),
  restaurantSlug: z.string(),
  restaurantHeadline: z.string().nullable(),
  cityName: z.string().nullable(),
  neighborhoodName: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  bagDisplayName: z.string(),
  bagShortDescription: z.string().nullable(),
  dietaryCategoryCode: z.string(),
  spiceLevelCode: z.string().nullable(),
  servesMin: z.number().nullable(),
  servesMax: z.number().nullable(),
  maxHoldingMinutes: z.number().nullable(),
  holdingGuidanceText: z.string().nullable(),
  minMenuValuePaise: z.number().nullable(),
  allergenSummaryText: z.string().nullable(),
  allergenCodes: z.array(z.string()),
  pricePaise: z.number(),
  pickupStartAt: z.string(),
  pickupEndAt: z.string(),
  quantityTotal: z.number(),
  quantityAvailable: z.number(),
  statusCode: z.string(),
});
export type MobilePublicDropCard = z.infer<typeof publicDropCardSchema>;

export const publicRestaurantProfileSchema = z.object({
  restaurantPk: z.string(),
  restaurantSlug: z.string(),
  restaurantName: z.string(),
  cityName: z.string().nullable(),
  neighborhoodName: z.string().nullable(),
  pickupInstructions: z.string().nullable(),
  headline: z.string().nullable(),
  storyMarkdown: z.string().nullable(),
  averageRating: z.number().nullable(),
  ratingCount: z.number(),
  cuisineTags: z.array(z.string()),
  dietaryTags: z.array(z.string()),
  activeDropCount: z.number(),
  totalDropCount: z.number(),
  upcomingDropCount: z.number(),
  pastDropCount: z.number(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  activeDrops: z.array(publicDropCardSchema),
  pastDrops: z.array(publicDropCardSchema),
});
export type MobilePublicRestaurantProfile = z.infer<typeof publicRestaurantProfileSchema>;

export const discoveryDropsSchema = z.array(publicDropCardSchema);
export const restaurantsListSchema = z.array(publicRestaurantProfileSchema);
