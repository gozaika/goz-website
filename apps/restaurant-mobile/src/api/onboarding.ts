import { STALE_TIMES } from "@gozaika/mobile-core";
import {
  restaurantOnboardingDataSchema,
  type OnboardingTaskUpdateRequest,
  type RestaurantOnboardingData,
} from "@gozaika/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

function onboardingKey(restaurantPk: string | null) {
  return ["portal", "onboarding", restaurantPk ?? "none"] as const;
}

/** Resumable onboarding progress for the selected restaurant (derived steps + tasks). */
export function useOnboarding(restaurantPk: string | null) {
  return useQuery({
    queryKey: onboardingKey(restaurantPk),
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.profile,
    queryFn: async (): Promise<RestaurantOnboardingData> => {
      const res = await apiClient.request("/restaurant/onboarding", {
        dataSchema: restaurantOnboardingDataSchema,
        restaurantPk: restaurantPk ?? undefined,
      });
      return res.data as unknown as RestaurantOnboardingData;
    },
  });
}

/** Transition a manual-ack onboarding task (OWNER/ADMIN). Writes the refreshed state to cache. */
export function useSetOnboardingTask(restaurantPk: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: OnboardingTaskUpdateRequest): Promise<RestaurantOnboardingData> => {
      const res = await apiClient.request("/restaurant/onboarding", {
        method: "PATCH",
        body,
        restaurantPk: restaurantPk ?? undefined,
        dataSchema: restaurantOnboardingDataSchema,
      });
      return res.data as unknown as RestaurantOnboardingData;
    },
    onSuccess: (data) => queryClient.setQueryData(onboardingKey(restaurantPk), data),
  });
}
