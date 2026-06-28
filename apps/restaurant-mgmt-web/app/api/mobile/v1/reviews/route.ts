import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";

/**
 * Restaurant-owned review summary + list (Slice 14). Read-only, gated by `viewReviews`
 * (OWNER/ADMIN/OPERATIONS), scoped to the authorized restaurant. Reviewer identity is
 * masked (first name only). Shows both approved and pending-moderation reviews so the
 * owner sees incoming feedback; no mutation of moderation state from mobile.
 */
function maskReviewer(firstName: string | null | undefined): string {
  const f = (firstName ?? "").trim();
  return f ? (f.split(/\s+/)[0] ?? f) : "Verified customer";
}

export const GET = withMobileRestaurantRole("viewReviews", async ({ restaurantPk, requestId }) => {
  const service = createServiceRoleSupabaseClient();
  try {
    const { data: rest } = await service
      .from("restaurant_restaurant")
      .select("average_rating,rating_count")
      .eq("restaurant_restaurant_pk", restaurantPk)
      .maybeSingle();

    const { data: rows, error } = await service
      .from("review_review")
      .select("review_review_pk,rating_value,review_text,moderation_status_code,is_public,created_at,consumer_profile(first_name)")
      .eq("restaurant_fk", restaurantPk)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;

    const reviews = (rows ?? []).map((r) => {
      const cp = Array.isArray(r.consumer_profile) ? r.consumer_profile[0] : r.consumer_profile;
      return {
        reviewPk: r.review_review_pk as string,
        ratingValue: Number(r.rating_value),
        reviewText: (r.review_text as string | null) ?? null,
        moderationStatusCode: r.moderation_status_code as string,
        isPublic: Boolean(r.is_public),
        createdAt: r.created_at as string,
        reviewerMasked: maskReviewer((cp as { first_name?: string | null } | null)?.first_name),
      };
    });

    const averageRating = (rest as { average_rating: number | null } | null)?.average_rating ?? null;
    const ratingCount = (rest as { rating_count: number | null } | null)?.rating_count ?? 0;

    return mobileResponseOk({ summary: { averageRating: averageRating != null ? Number(averageRating) : null, ratingCount: Number(ratingCount) }, reviews }, requestId);
  } catch (caught) {
    console.error("mobile_partner_reviews_failed", { requestId, message: caught instanceof Error ? caught.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Could not load reviews.", requestId);
  }
});
