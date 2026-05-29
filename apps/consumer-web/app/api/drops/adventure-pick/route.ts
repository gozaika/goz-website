import type { AdventurePickResult } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadPublicDrops } from "@/lib/drops";

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

  let consumerPk: string | null = null;
  let triedRestaurantPks = new Set<string>();
  let triedCuisineCodes = new Set<string>();

  if (user) {
    consumerPk = await getConsumerPk(supabase, user.id);
    if (consumerPk) {
      // Restaurants already ordered from
      const { data: orderRows } = await supabase
        .from("order_order")
        .select("restaurant_fk")
        .eq("consumer_profile_fk", consumerPk)
        .eq("order_status_code", "COLLECTED");
      triedRestaurantPks = new Set((orderRows ?? []).map((r) => (r as { restaurant_fk: string }).restaurant_fk));

      // Cuisines already tried (via restaurant cuisine map)
      if (triedRestaurantPks.size > 0) {
        const { data: cuisineRows } = await supabase
          .from("restaurant_cuisine_map")
          .select("master_cuisine!inner(cuisine_code)")
          .in("restaurant_fk", [...triedRestaurantPks]);
        triedCuisineCodes = new Set(
          (cuisineRows ?? []).flatMap((r) => (r as { master_cuisine: { cuisine_code: string }[] }).master_cuisine.map((c) => c.cuisine_code)),
        );
      }
    }
  }

  const now = new Date();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const allDrops = await loadPublicDrops();

  const activeDrops = allDrops.filter(
    (d) =>
      ["ACTIVE", "SCHEDULED"].includes(d.statusCode) &&
      d.quantityAvailable > 0 &&
      Date.parse(d.pickupEndAt) > now.getTime(),
  );

  // Prefer drops from restaurants not yet tried by user
  // Then prefer cuisines not yet tried
  // Cuisine rarity = fewest total city orders for that cuisine (proxy: just pick first untried with active drop)
  let candidates = activeDrops;
  if (consumerPk) {
    const novel = activeDrops.filter((d) => !triedRestaurantPks.has(d.restaurantPk));
    if (novel.length > 0) candidates = novel;
  }

  // Not closing within 1 hour (prefer less urgent)
  const notClosingSoon = candidates.filter((d) => Date.parse(d.pickupEndAt) - now.getTime() >= twoHoursMs);
  if (notClosingSoon.length > 0) candidates = notClosingSoon;

  // Prefer cuisines not yet tried
  // We don't have direct cuisine on drop, so use restaurant pk as proxy
  const pick = candidates[0] ?? allDrops[0];

  if (!pick) {
    return NextResponse.json({ ok: false, error: "No drops available right now." }, { status: 404 });
  }

  const adventureReason = consumerPk
    ? "A cuisine you haven't explored yet — off-menu discovery."
    : "Something new is dropping in Hyderabad.";

  // First-timer count: aggregate proxy (quantityTotal - quantityAvailable for this drop)
  const firstTimerCount = Math.max(0, pick.quantityTotal - pick.quantityAvailable);

  const result: AdventurePickResult = {
    drop: pick,
    adventureReason,
    firstTimerCount,
  };

  return NextResponse.json({ ok: true, data: result });
}
