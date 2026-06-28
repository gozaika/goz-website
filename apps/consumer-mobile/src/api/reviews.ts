import { STALE_TIMES } from "@gozaika/mobile-core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "./client";

const orderReviewSchema = z.object({
  status: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]),
  canReview: z.boolean(),
});
export type OrderReview = z.infer<typeof orderReviewSchema>;

const submitResultSchema = z.object({ reviewPk: z.string(), status: z.literal("PENDING") });

export interface SubmitReviewInput {
  readonly ratingValue: number;
  readonly reviewText?: string;
  readonly categories?: Record<string, number>;
}

/** Whether the customer can still review this collected order, and current moderation status. */
export function useOrderReview(orderPk: string | null, options: { readonly enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["order-review", orderPk ?? "none"],
    enabled: Boolean(orderPk) && (options.enabled ?? true),
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<OrderReview> => {
      const res = await apiClient.request(`/orders/${orderPk}/review`, { dataSchema: orderReviewSchema });
      return res.data as unknown as OrderReview;
    },
  });
}

/** Submit a review for a collected order. Lands as PENDING moderation. */
export function useSubmitReview(orderPk: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitReviewInput) => {
      const res = await apiClient.request("/reviews", {
        method: "POST",
        body: { orderPk, ...input },
        dataSchema: submitResultSchema,
      });
      return res.data as unknown as z.infer<typeof submitResultSchema>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order-review", orderPk ?? "none"] }),
  });
}
