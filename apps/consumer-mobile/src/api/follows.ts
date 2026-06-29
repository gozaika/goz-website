import { queryKeys, STALE_TIMES } from "@gozaika/mobile-core";
import {
  followsListSchema,
  followToggleResultSchema,
  type MobileFollowsList,
  type MobileFollowToggleResult,
} from "@gozaika/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

/** The signed-in consumer's followed restaurants (Home rail) + the followed pk set. */
export function useFollows(options: { readonly enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.follows.list(),
    enabled: options.enabled ?? true,
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<MobileFollowsList> => {
      const res = await apiClient.request("/follows", { dataSchema: followsListSchema });
      return res.data as unknown as MobileFollowsList;
    },
  });
}

/** Whether the consumer follows a given restaurant, derived from the cached follow list. */
export function useIsFollowing(restaurantPk: string | null | undefined): boolean {
  const { data } = useFollows();
  if (!restaurantPk || !data) return false;
  return data.restaurantPks.includes(restaurantPk);
}

/** Follow or unfollow a restaurant. Refreshes the follow list so rails + state stay in sync. */
export function useToggleFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { readonly restaurantPk: string; readonly follow: boolean }): Promise<MobileFollowToggleResult> => {
      const res = await apiClient.request("/follows", {
        method: input.follow ? "POST" : "DELETE",
        body: { restaurantPk: input.restaurantPk },
        dataSchema: followToggleResultSchema,
      });
      return res.data as unknown as MobileFollowToggleResult;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.follows.list() }),
  });
}
