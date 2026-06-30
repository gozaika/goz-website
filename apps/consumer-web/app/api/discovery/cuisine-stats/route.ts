import type { CuisineStatsResult } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase embeds: a to-one relation comes back as an object (or null), a
// to-many relation as an array. These types allow both shapes; `asArray` below
// normalises them before iterating.
type CuisineMap = { master_cuisine_fk: string };
type RestaurantRow = { restaurant_cuisine_map: CuisineMap | CuisineMap[] | null };
type RestaurantCuisineRelation = RestaurantRow | RestaurantRow[] | null;

export async function GET() {
  const supabase = await createClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Neighbourhood activity: distinct cuisines + active drops per neighbourhood today
  const { data: nRows } = await supabase
    .from("geo_neighborhood")
    .select(`
      neighborhood_name,
      drop_drop!left(
        drop_status_code,
        pickup_end_at,
        restaurant_fk,
        restaurant_restaurant!inner(
          restaurant_cuisine_map!left(
            master_cuisine_fk
          )
        )
      )
    `)
    .order("neighborhood_name");

  const neighbourhoodActivity = (nRows ?? []).map((row) => {
    const n = row as {
      neighborhood_name: string;
      drop_drop: { drop_status_code: string; pickup_end_at: string; restaurant_restaurant: RestaurantCuisineRelation }[];
    };
    // Supabase returns a to-one embed as an object (or null), not an array; a
    // to-many embed as an array. Normalise both shapes before flatMapping.
    const asArray = <T,>(value: T | T[] | null | undefined): T[] =>
      Array.isArray(value) ? value : value == null ? [] : [value];

    const activeDrops = (n.drop_drop ?? []).filter(
      (d) => ["ACTIVE", "SCHEDULED"].includes(d.drop_status_code) && Date.parse(d.pickup_end_at) > now.getTime(),
    );
    const cuisines = new Set(
      activeDrops.flatMap((d) =>
        asArray(d.restaurant_restaurant).flatMap((r) =>
          asArray(r?.restaurant_cuisine_map).map((cm) => cm.master_cuisine_fk),
        ),
      ),
    );
    return {
      neighbourhoodName: n.neighborhood_name,
      activeCuisineCount: cuisines.size,
      activeDropCount: activeDrops.length,
    };
  }).filter((n) => n.activeDropCount > 0);

  // Cuisine first-timers (simplified — real implementation needs RPC)
  // Return empty array for now; a future background job can populate this accurately
  const cuisineWeeklyFirstTimers: CuisineStatsResult["cuisineWeeklyFirstTimers"] = [];

  const result: CuisineStatsResult = {
    cuisineWeeklyFirstTimers,
    neighbourhoodActivity,
  };

  return NextResponse.json(
    { ok: true, data: result },
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=600" } },
  );
}
