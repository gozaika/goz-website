import { STALE_TIMES } from "@gozaika/mobile-core";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "./client";

const restaurantReviewsSchema = z.object({
  summary: z.object({ averageRating: z.number().nullable(), ratingCount: z.number() }),
  reviews: z.array(
    z.object({
      reviewPk: z.string(),
      ratingValue: z.number(),
      reviewText: z.string().nullable(),
      moderationStatusCode: z.string(),
      isPublic: z.boolean(),
      createdAt: z.string(),
      reviewerMasked: z.string(),
    }),
  ),
});
export type RestaurantReviews = z.infer<typeof restaurantReviewsSchema>;

/** Restaurant-owned review summary + list (viewReviews). Read-only; identity masked. */
export function useRestaurantReviews(restaurantPk: string | null) {
  return useQuery({
    queryKey: ["portal", "reviews", restaurantPk ?? "none"] as const,
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.profile,
    queryFn: async (): Promise<RestaurantReviews> => {
      const res = await apiClient.request("/reviews", { dataSchema: restaurantReviewsSchema, restaurantPk: restaurantPk ?? undefined });
      return res.data as unknown as RestaurantReviews;
    },
  });
}
