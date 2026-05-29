import type { PassportBadge, ZaykaPassportPayload } from "@gozaika/types";
import { bagsToNextTier, tierFromBagCount, tierProgressPercent } from "@gozaika/utils";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALL_BADGES: Omit<PassportBadge, "earned">[] = [
  { badgeCode: "BIRYANI_BELIEVER",   badgeName: "Biryani Believer",    description: "Claimed 3+ Biryani drops",                  hintText: "Claim 3 Biryani drops" },
  { badgeCode: "JAIN_JOURNEYS",      badgeName: "Jain Journeys",       description: "Claimed 3+ Jain drops",                    hintText: "Claim 3 Jain drops" },
  { badgeCode: "EARLY_BIRD",         badgeName: "Early Bird",          description: "Claimed a drop within 30 mins of going live (5× times)", hintText: "Claim 5 drops within 30 min of live" },
  { badgeCode: "COLLECTOR",          badgeName: "Collector",           description: "Claimed 5 drops in a single week",         hintText: "Claim 5 drops in one week" },
  { badgeCode: "NEIGHBORHOOD_HOPPER",badgeName: "Neighborhood Hopper", description: "Ordered from 3+ different neighborhoods",  hintText: "Order from 3 different neighbourhoods" },
  { badgeCode: "CRITIC",             badgeName: "Critic",              description: "Submitted 5+ approved reviews",            hintText: "Submit 5 approved reviews" },
];

async function getConsumerPk(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const consumerPk = await getConsumerPk(supabase, user.id);
  if (!consumerPk) {
    return NextResponse.json({ ok: false, error: "Consumer profile not found." }, { status: 404 });
  }

  // Load or create passport stat
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
  const tierCode = passport?.current_tier_code as string ?? tierFromBagCount(bags);

  // Review count
  const { count: reviewCount } = await supabase
    .from("review_review")
    .select("review_review_pk", { count: "exact", head: true })
    .eq("consumer_profile_fk", consumerPk)
    .eq("moderation_status_code", "APPROVED");

  // Compute earned badges (simple heuristics from passport stats + review count)
  const badges: PassportBadge[] = ALL_BADGES.map((b) => {
    let earned = false;
    if (b.badgeCode === "NEIGHBORHOOD_HOPPER") earned = neighbourhoodsVisited >= 3;
    if (b.badgeCode === "CRITIC") earned = (reviewCount ?? 0) >= 5;
    // Remaining badges require deeper order queries — mark as unearned for now;
    // a background job can flip them based on order_order history.
    return { ...b, earned };
  });

  const nextTierCode = (() => {
    if (tierCode === "BRONZE") return "SILVER" as const;
    if (tierCode === "SILVER") return "GOLD" as const;
    if (tierCode === "GOLD") return "PLATINUM" as const;
    return null;
  })();

  const payload: ZaykaPassportPayload = {
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
    nextTierCode,
  };

  return NextResponse.json({ ok: true, data: payload });
}
