import type { PassportBadge, ZaykaPassportPayload } from "@gozaika/types";
import { bagsToNextTier, tierFromBagCount, tierProgressPercent } from "@gozaika/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared Zayka Passport builder. The web account route
 * (`app/api/account/passport`) and the mobile BFF
 * (`app/api/mobile/v1/account/passport`) both call this, so the badge catalog,
 * tier maths, and payload shape have a single source of truth and cannot drift.
 *
 * Pass a Supabase client already scoped to the consumer (the web cookie client or
 * the mobile bearer-token client) plus the resolved `consumer_profile_pk`.
 */

export const ALL_PASSPORT_BADGES: readonly Omit<PassportBadge, "earned">[] = [
  { badgeCode: "BIRYANI_BELIEVER",    badgeName: "Biryani Believer",    description: "Claimed 3+ Biryani drops",                                hintText: "Claim 3 Biryani drops" },
  { badgeCode: "JAIN_JOURNEYS",       badgeName: "Jain Journeys",       description: "Claimed 3+ Jain drops",                                  hintText: "Claim 3 Jain drops" },
  { badgeCode: "EARLY_BIRD",          badgeName: "Early Bird",          description: "Claimed a drop within 30 mins of going live (5× times)", hintText: "Claim 5 drops within 30 min of live" },
  { badgeCode: "COLLECTOR",           badgeName: "Collector",           description: "Claimed 5 drops in a single week",                       hintText: "Claim 5 drops in one week" },
  { badgeCode: "NEIGHBORHOOD_HOPPER", badgeName: "Neighborhood Hopper", description: "Ordered from 3+ different neighborhoods",                hintText: "Order from 3 different neighbourhoods" },
  { badgeCode: "CRITIC",              badgeName: "Critic",              description: "Submitted 5+ approved reviews",                          hintText: "Submit 5 approved reviews" },
];

/**
 * Resolve a `consumer_profile_pk` from an auth user id. Works for both the web
 * cookie session (`user.id`) and the mobile bearer actor (`actor.authUserId`).
 * Returns `null` when the user has no consumer profile.
 */
export async function getConsumerPkByUserId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: iam } = await supabase
    .from("iam_profile")
    .select("iam_profile_pk")
    .eq("auth_user_fk", userId)
    .single();
  if (!iam) return null;
  const { data: cp } = await supabase
    .from("consumer_profile")
    .select("consumer_profile_pk")
    .eq("iam_profile_fk", iam.iam_profile_pk)
    .single();
  return cp?.consumer_profile_pk ?? null;
}

function nextTierCode(tierCode: string): ZaykaPassportPayload["nextTierCode"] {
  if (tierCode === "BRONZE") return "SILVER";
  if (tierCode === "SILVER") return "GOLD";
  if (tierCode === "GOLD") return "PLATINUM";
  return null;
}

export async function buildPassportPayload(
  supabase: SupabaseClient,
  consumerPk: string,
): Promise<ZaykaPassportPayload> {
  // Load or create passport stat (first visit lazily provisions the row).
  let { data: passport } = await supabase
    .from("consumer_passport_stat")
    .select("*")
    .eq("consumer_profile_fk", consumerPk)
    .maybeSingle();

  if (!passport) {
    const { data: created } = await supabase
      .from("consumer_passport_stat")
      .insert({ consumer_profile_fk: consumerPk })
      .select("*")
      .single();
    passport = created;
  }

  const bags = Number(passport?.total_bags_collected ?? 0);
  const restaurantsVisited = Number(passport?.total_restaurants_visited ?? 0);
  const neighbourhoodsVisited = Number(passport?.total_neighborhoods_visited ?? 0);
  const tierCode = (passport?.current_tier_code as string) ?? tierFromBagCount(bags);

  const { count: reviewCount } = await supabase
    .from("review_review")
    .select("review_review_pk", { count: "exact", head: true })
    .eq("consumer_profile_fk", consumerPk)
    .eq("moderation_status_code", "APPROVED");

  // Compute earned badges (simple heuristics from passport stats + review count).
  // The remaining badges require deeper order queries — a background job can flip
  // them based on order_order history.
  const badges: PassportBadge[] = ALL_PASSPORT_BADGES.map((b) => {
    let earned = false;
    if (b.badgeCode === "NEIGHBORHOOD_HOPPER") earned = neighbourhoodsVisited >= 3;
    if (b.badgeCode === "CRITIC") earned = (reviewCount ?? 0) >= 5;
    return { ...b, earned };
  });

  return {
    stat: {
      consumerProfilePk: consumerPk,
      totalBagsCollected: bags,
      totalRestaurantsVisited: restaurantsVisited,
      totalNeighborhoodsVisited: neighbourhoodsVisited,
      currentTierCode: tierCode as ZaykaPassportPayload["stat"]["currentTierCode"],
      reviewCount: reviewCount ?? 0,
    },
    badges,
    bagsToNextTier: bagsToNextTier(bags),
    progressPercent: tierProgressPercent(bags),
    nextTierCode: nextTierCode(tierCode),
  };
}
