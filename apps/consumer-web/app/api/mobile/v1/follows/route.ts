import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { followToggleRequestSchema, type MobileFollowedRestaurant } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { resolveConsumerProfilePk } from "@/lib/reviews";
import { followRestaurant, getFollowedRowsByRestaurant, unfollowRestaurant } from "@/lib/follows";
import { loadPublicRestaurants } from "@/lib/restaurants";

/**
 * Favorites / follows (F1). The signed-in consumer lists, follows, and unfollows
 * restaurants — backed by `consumer_saved_restaurant`, shared logic in
 * `lib/follows.ts`. Privacy: every operation is scoped to the consumer's own
 * resolved profile; only the aggregate `followerCount` is ever returned.
 */

/** GET — the consumer's followed restaurants (Home rail cards) + the raw pk set. */
export const GET = withMobileAuth(async ({ actor, requestId }) => {
  const service = createServiceRoleSupabaseClient();
  const consumerPk = await resolveConsumerProfilePk(service, { iamProfilePk: actor.profilePk });
  if (!consumerPk) return mobileResponseErr("NOT_FOUND", "Consumer profile not found.", requestId);

  const followedAtByPk = await getFollowedRowsByRestaurant(service, consumerPk);
  const restaurantPks = [...followedAtByPk.keys()];

  if (restaurantPks.length === 0) {
    return mobileResponseOk({ restaurantPks, restaurants: [] }, requestId);
  }

  const all = await loadPublicRestaurants();
  const byPk = new Map(all.map((restaurant) => [restaurant.restaurantPk, restaurant]));
  const restaurants: MobileFollowedRestaurant[] = restaurantPks
    .map((pk) => {
      const r = byPk.get(pk);
      if (!r) return null;
      return {
        restaurantPk: r.restaurantPk,
        restaurantSlug: r.restaurantSlug,
        restaurantName: r.restaurantName,
        cityName: r.cityName,
        neighborhoodName: r.neighborhoodName,
        headline: r.headline,
        activeDropCount: r.activeDropCount,
        followerCount: r.followerCount,
        followedAt: followedAtByPk.get(pk) ?? new Date(0).toISOString(),
        coverImage: r.coverImage ?? null,
      } satisfies MobileFollowedRestaurant;
    })
    .filter((r): r is MobileFollowedRestaurant => r !== null);

  return mobileResponseOk({ restaurantPks, restaurants }, requestId);
});

/** POST — follow a restaurant (idempotent). Body: `{ restaurantPk }`. */
export const POST = withMobileAuth(async ({ req, actor, requestId }) => {
  const parsed = followToggleRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Pick a valid restaurant to follow.", requestId, {
      fieldErrors: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "restaurantPk"), message: i.message })),
    });
  }
  const service = createServiceRoleSupabaseClient();
  const consumerPk = await resolveConsumerProfilePk(service, { iamProfilePk: actor.profilePk });
  if (!consumerPk) return mobileResponseErr("FORBIDDEN", "Finish setting up your profile before following.", requestId);

  const state = await followRestaurant(service, consumerPk, parsed.data.restaurantPk);
  return mobileResponseOk({ restaurantPk: parsed.data.restaurantPk, ...state }, requestId);
});

/** DELETE — unfollow a restaurant (idempotent). Body: `{ restaurantPk }`. */
export const DELETE = withMobileAuth(async ({ req, actor, requestId }) => {
  const parsed = followToggleRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Pick a valid restaurant to unfollow.", requestId, {
      fieldErrors: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "restaurantPk"), message: i.message })),
    });
  }
  const service = createServiceRoleSupabaseClient();
  const consumerPk = await resolveConsumerProfilePk(service, { iamProfilePk: actor.profilePk });
  if (!consumerPk) return mobileResponseErr("FORBIDDEN", "Finish setting up your profile before unfollowing.", requestId);

  const state = await unfollowRestaurant(service, consumerPk, parsed.data.restaurantPk);
  return mobileResponseOk({ restaurantPk: parsed.data.restaurantPk, ...state }, requestId);
});
