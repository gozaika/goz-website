import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Favorites / follows shared logic (F1) — the single source of truth for the web
 * routes and the mobile BFF, mirroring `lib/reviews.ts`. Backed by
 * `consumer_saved_restaurant` (unique on consumer+restaurant).
 *
 * Privacy: a consumer can only ever read/modify *their own* follow rows; no
 * follower identity is exposed to anyone. The only cross-consumer signal we
 * surface is the aggregate `followerCount`, computed server-side. Callers must
 * pass a service-role client for the count helpers (RLS is self-only) and must
 * always scope mutations to the resolved `consumerProfilePk`.
 */

export interface FollowState {
  readonly following: boolean;
  readonly followerCount: number;
}

/** Restaurant pks the consumer follows, newest first (for the Home rail + state). */
export async function getFollowedRestaurantPks(db: SupabaseClient, consumerProfilePk: string): Promise<string[]> {
  const { data } = await db
    .from("consumer_saved_restaurant")
    .select("restaurant_fk, saved_at")
    .eq("consumer_profile_fk", consumerProfilePk)
    .order("saved_at", { ascending: false });
  return ((data ?? []) as { restaurant_fk: string }[]).map((row) => row.restaurant_fk);
}

/** `restaurant_fk -> saved_at` for the consumer's follows (newest first ordering preserved by Map insertion). */
export async function getFollowedRowsByRestaurant(
  db: SupabaseClient,
  consumerProfilePk: string,
): Promise<Map<string, string>> {
  const { data } = await db
    .from("consumer_saved_restaurant")
    .select("restaurant_fk, saved_at")
    .eq("consumer_profile_fk", consumerProfilePk)
    .order("saved_at", { ascending: false });
  const rows = (data ?? []) as { restaurant_fk: string; saved_at: string }[];
  return new Map(rows.map((row) => [row.restaurant_fk, row.saved_at]));
}

/** Aggregate follower count for one restaurant. Needs a service-role client (RLS is self-only). */
export async function getFollowerCount(service: SupabaseClient, restaurantPk: string): Promise<number> {
  const { count } = await service
    .from("consumer_saved_restaurant")
    .select("consumer_saved_restaurant_pk", { count: "exact", head: true })
    .eq("restaurant_fk", restaurantPk);
  return count ?? 0;
}

/**
 * Follower counts keyed by restaurant pk for every restaurant that has at least
 * one follower. Single read + JS tally (fine at early-stage scale). Service-role.
 */
export async function getFollowerCounts(service: SupabaseClient): Promise<Map<string, number>> {
  const { data } = await service.from("consumer_saved_restaurant").select("restaurant_fk");
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { restaurant_fk: string }[]) {
    counts.set(row.restaurant_fk, (counts.get(row.restaurant_fk) ?? 0) + 1);
  }
  return counts;
}

/** True if the consumer already follows the restaurant. */
export async function isFollowing(db: SupabaseClient, consumerProfilePk: string, restaurantPk: string): Promise<boolean> {
  const { data } = await db
    .from("consumer_saved_restaurant")
    .select("consumer_saved_restaurant_pk")
    .eq("consumer_profile_fk", consumerProfilePk)
    .eq("restaurant_fk", restaurantPk)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Follow a restaurant (idempotent). The unique constraint makes a re-follow a
 * no-op. Returns the resulting state incl. fresh aggregate count.
 */
export async function followRestaurant(
  service: SupabaseClient,
  consumerProfilePk: string,
  restaurantPk: string,
): Promise<FollowState> {
  const { error } = await service
    .from("consumer_saved_restaurant")
    .upsert(
      { consumer_profile_fk: consumerProfilePk, restaurant_fk: restaurantPk },
      { onConflict: "consumer_profile_fk,restaurant_fk", ignoreDuplicates: true },
    );
  if (error) {
    console.error("follow_insert_failed", { code: error.code });
    throw new Error("FOLLOW_FAILED");
  }
  return { following: true, followerCount: await getFollowerCount(service, restaurantPk) };
}

/** Unfollow a restaurant (idempotent). */
export async function unfollowRestaurant(
  service: SupabaseClient,
  consumerProfilePk: string,
  restaurantPk: string,
): Promise<FollowState> {
  const { error } = await service
    .from("consumer_saved_restaurant")
    .delete()
    .eq("consumer_profile_fk", consumerProfilePk)
    .eq("restaurant_fk", restaurantPk);
  if (error) {
    console.error("unfollow_delete_failed", { code: error.code });
    throw new Error("UNFOLLOW_FAILED");
  }
  return { following: false, followerCount: await getFollowerCount(service, restaurantPk) };
}
