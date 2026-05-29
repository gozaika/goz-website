import type { CuisineStat, DiscoveryProfile, NeighbourhoodStat, UntriedCuisine } from "@gozaika/types";
import { flavourPersonalityLabel } from "@gozaika/utils";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // 1. Cuisines the user has tried (from COLLECTED orders)
  let triedRpcResult: { data: unknown } = { data: null };
  try {
    triedRpcResult = await supabase.rpc("get_consumer_tried_cuisines", { p_consumer_pk: consumerPk });
  } catch {
    // RPC not yet deployed — fallback below
  }
  const triedRows = triedRpcResult.data;

  // Fallback: manual query if RPC not yet deployed
  let triedCuisines: CuisineStat[] = [];
  if (Array.isArray(triedRows)) {
    triedCuisines = (triedRows as { cuisine_code: string; cuisine_name: string; bag_count: number }[]).map((r) => ({
      cuisineCode: r.cuisine_code,
      cuisineName: r.cuisine_name,
      bagCount: Number(r.bag_count),
    }));
  } else {
    // Fallback query — join order_order → restaurant_cuisine_map → master_cuisine
    const { data: fallbackRows } = await supabase
      .from("order_order")
      .select(`
        restaurant_fk,
        restaurant_cuisine_map!inner(
          master_cuisine!inner(cuisine_code, cuisine_name)
        )
      `)
      .eq("consumer_profile_fk", consumerPk)
      .eq("order_status_code", "COLLECTED");

    if (fallbackRows) {
      const counts = new Map<string, { cuisineCode: string; cuisineName: string; count: number }>();
      for (const row of fallbackRows as unknown as { restaurant_cuisine_map: { master_cuisine: { cuisine_code: string; cuisine_name: string } }[] }[]) {
        for (const cm of row.restaurant_cuisine_map ?? []) {
          const code = cm.master_cuisine.cuisine_code;
          const existing = counts.get(code);
          if (existing) {
            existing.count++;
          } else {
            counts.set(code, { cuisineCode: code, cuisineName: cm.master_cuisine.cuisine_name, count: 1 });
          }
        }
      }
      triedCuisines = [...counts.values()].map((v) => ({
        cuisineCode: v.cuisineCode,
        cuisineName: v.cuisineName,
        bagCount: v.count,
      }));
    }
  }

  // 2. All available cuisines
  const { data: allCuisineRows } = await supabase
    .from("master_cuisine")
    .select("cuisine_code, cuisine_name")
    .eq("is_active", true)
    .order("cuisine_name");

  const allCuisines = (allCuisineRows ?? []) as { cuisine_code: string; cuisine_name: string }[];
  const triedCodes = new Set(triedCuisines.map((c) => c.cuisineCode));

  // 3. Untried cuisines — only those with at least one active drop
  const { data: activeDropRows } = await supabase
    .from("drop_drop")
    .select(`
      drop_drop_pk,
      restaurant_fk,
      drop_status_code,
      pickup_end_at,
      restaurant_cuisine_map!inner(
        master_cuisine!inner(cuisine_code, cuisine_name)
      )
    `)
    .in("drop_status_code", ["ACTIVE", "SCHEDULED"])
    .gt("pickup_end_at", new Date().toISOString());

  const activeDropCuisineCounts = new Map<string, number>();
  for (const row of (activeDropRows ?? []) as unknown as { restaurant_cuisine_map: { master_cuisine: { cuisine_code: string } }[] }[]) {
    for (const cm of row.restaurant_cuisine_map ?? []) {
      const code = cm.master_cuisine.cuisine_code;
      activeDropCuisineCounts.set(code, (activeDropCuisineCounts.get(code) ?? 0) + 1);
    }
  }

  const untriedCuisines: UntriedCuisine[] = allCuisines
    .filter((c) => !triedCodes.has(c.cuisine_code))
    .map((c) => ({
      cuisineCode: c.cuisine_code,
      cuisineName: c.cuisine_name,
      activeDropCount: activeDropCuisineCounts.get(c.cuisine_code) ?? 0,
    }));

  // 4. Tried neighbourhoods
  const { data: neighbourhoodRows } = await supabase
    .from("order_order")
    .select(`
      drop_fk,
      drop_drop!inner(
        geo_neighborhood_fk,
        geo_neighborhood!inner(neighborhood_code, neighborhood_name)
      )
    `)
    .eq("consumer_profile_fk", consumerPk)
    .eq("order_status_code", "COLLECTED");

  const neighbourhoodCounts = new Map<string, { code: string; name: string; count: number }>();
  for (const row of (neighbourhoodRows ?? []) as unknown as { drop_drop: { geo_neighborhood: { neighborhood_code: string; neighborhood_name: string } | null } | null }[]) {
    const n = row.drop_drop?.geo_neighborhood;
    if (!n) continue;
    const existing = neighbourhoodCounts.get(n.neighborhood_code);
    if (existing) {
      existing.count++;
    } else {
      neighbourhoodCounts.set(n.neighborhood_code, { code: n.neighborhood_code, name: n.neighborhood_name, count: 1 });
    }
  }

  const triedNeighbourhoods: NeighbourhoodStat[] = [...neighbourhoodCounts.values()].map((v) => ({
    neighbourhoodCode: v.code,
    neighbourhoodName: v.name,
    bagCount: v.count,
  }));

  // 5. Total active neighbourhoods
  const { count: totalActiveNeighbourhoods } = await supabase
    .from("geo_neighborhood")
    .select("geo_neighborhood_pk", { count: "exact", head: true });

  // 6. Review count for score
  const { count: reviewCount } = await supabase
    .from("review_review")
    .select("review_review_pk", { count: "exact", head: true })
    .eq("consumer_profile_fk", consumerPk)
    .eq("moderation_status_code", "APPROVED");

  // 7. Passport stat for bag count
  const { data: passport } = await supabase
    .from("consumer_passport_stat")
    .select("total_bags_collected")
    .eq("consumer_profile_fk", consumerPk)
    .maybeSingle();

  const totalBags = Number(passport?.total_bags_collected ?? 0);
  const totalAvailableCuisines = allCuisines.length;
  const totalActiveNeighbourhoodsN = totalActiveNeighbourhoods ?? 1;

  const cuisineBreadth = (triedCuisines.length / Math.max(1, totalAvailableCuisines)) * 40;
  const geoBreadth = (triedNeighbourhoods.length / Math.max(1, totalActiveNeighbourhoodsN)) * 30;
  const volumeDepth = (Math.min(totalBags, 30) / 30) * 20;
  const engagement = (Math.min(reviewCount ?? 0, 3) / 3) * 10;
  const score = Math.round(cuisineBreadth + geoBreadth + volumeDepth + engagement);

  const profile: DiscoveryProfile = {
    triedCuisines,
    untriedCuisines,
    totalAvailableCuisines,
    triedNeighbourhoods,
    totalActiveNeighbourhoods: totalActiveNeighbourhoodsN,
    flavourDiversityScore: score,
    flavourPersonalityLabel: flavourPersonalityLabel(score),
  };

  return NextResponse.json({ ok: true, data: profile });
}
