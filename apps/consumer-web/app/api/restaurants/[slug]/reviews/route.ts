import type { PublicReview, ReviewCategoryScores, ReviewsPayload } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function computeCategoryAverages(reviews: { categories: ReviewCategoryScores | null }[]): ReviewCategoryScores {
  const keys: (keyof ReviewCategoryScores)[] = ["food_quality", "value_for_price", "pickup_experience", "packaging"];
  const acc: Record<string, number> = {};
  for (const key of keys) {
    const values = reviews.map((r) => r.categories?.[key]).filter((v): v is number => typeof v === "number");
    if (values.length > 0) {
      acc[key] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    }
  }
  return acc as unknown as ReviewCategoryScores;
}

export async function GET(
  request: Request,
  { params }: { readonly params: Promise<{ readonly slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "10")));
  const sort = url.searchParams.get("sort") ?? "recent";
  const dietary = url.searchParams.get("dietary");
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  // Resolve restaurant PK from slug
  const { data: restaurant } = await supabase
    .from("restaurant_restaurant")
    .select("restaurant_restaurant_pk, average_rating, rating_count")
    .eq("restaurant_slug", slug)
    .maybeSingle();

  if (!restaurant) {
    return NextResponse.json({ ok: false, error: "Restaurant not found." }, { status: 404 });
  }

  let query = supabase
    .from("api_public_restaurant_reviews")
    .select("*", { count: "exact" })
    .eq("restaurant_fk", restaurant.restaurant_restaurant_pk);

  if (dietary) {
    query = query.eq("order_dietary_code", dietary);
  }

  if (sort === "highest") {
    query = query.order("rating_value", { ascending: false });
  } else if (sort === "lowest") {
    query = query.order("rating_value", { ascending: true });
  } else {
    // recent / relevant — default to newest first
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: rows, error, count } = await query;

  if (error) {
    console.error("reviews_load_failed", { code: error.code });
    return NextResponse.json({ ok: false, error: "Could not load reviews." }, { status: 500 });
  }

  const reviews: PublicReview[] = (rows ?? []).map((row) => ({
    reviewPk: row.review_review_pk as string,
    restaurantPk: row.restaurant_fk as string,
    ratingValue: row.rating_value as number,
    reviewText: (row.review_text as string | null) ?? null,
    categories: (row.categories as ReviewCategoryScores | null) ?? null,
    reviewerDisplayName: (row.reviewer_display_name as string) ?? "Anonymous",
    bagDisplayName: (row.bag_display_name as string | null) ?? null,
    orderDietaryCode: (row.order_dietary_code as string | null) ?? null,
    createdAt: row.created_at as string,
  }));

  const payload: ReviewsPayload = {
    restaurantPk: restaurant.restaurant_restaurant_pk,
    averageRating: restaurant.average_rating != null ? Number(restaurant.average_rating) : null,
    ratingCount: Number(restaurant.rating_count ?? 0),
    categoryAverages: computeCategoryAverages(reviews),
    reviews,
    page,
    totalCount: count ?? 0,
  };

  return NextResponse.json({ ok: true, data: payload });
}
