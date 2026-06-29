import { z } from "zod";
import { mobileMediaAssetSchema } from "./discovery";

/**
 * Favorites / follows contracts (F1). A consumer follows a restaurant
 * (`consumer_saved_restaurant`) to surface it on the Home followed-rail and to
 * receive new-drop targeting. Privacy: only the signed-in consumer ever sees the
 * set of restaurants *they* follow; everyone else sees only the aggregate
 * `followerCount` (no follower identity is ever exposed). Wire schemas stay
 * permissive; codes are plain strings.
 */

const optionalMediaAssetSchema = z.preprocess((value) => value ?? null, mobileMediaAssetSchema.nullable());

export const followedRestaurantSchema = z.object({
  restaurantPk: z.string(),
  restaurantSlug: z.string(),
  restaurantName: z.string(),
  cityName: z.string().nullable(),
  neighborhoodName: z.string().nullable(),
  headline: z.string().nullable(),
  activeDropCount: z.number(),
  followerCount: z.number(),
  followedAt: z.string(),
  coverImage: optionalMediaAssetSchema,
});
export type MobileFollowedRestaurant = z.infer<typeof followedRestaurantSchema>;

/** GET /follows — the signed-in consumer's followed restaurants (Home rail) + the raw pk set. */
export const followsListSchema = z.object({
  restaurantPks: z.array(z.string()),
  restaurants: z.array(followedRestaurantSchema),
});
export type MobileFollowsList = z.infer<typeof followsListSchema>;

/** POST/DELETE /follows — the resulting state for one restaurant after a toggle. */
export const followToggleResultSchema = z.object({
  restaurantPk: z.string(),
  following: z.boolean(),
  followerCount: z.number(),
});
export type MobileFollowToggleResult = z.infer<typeof followToggleResultSchema>;

/**
 * Request body for follow/unfollow. `restaurantPk` is validated against a loose
 * uuid *shape* (8-4-4-4-12 hex), not RFC-4122 `.uuid()`, because the seeded
 * restaurant pks use a non-RFC pattern (e.g. `…-0000-0000-300000000001`). The
 * FK constraint is the real existence check.
 */
const UUID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const followToggleRequestSchema = z.object({
  restaurantPk: z.string().regex(UUID_SHAPE),
});
