import { STALE_TIMES } from "@gozaika/mobile-core";
import {
  geoOptionsDataSchema,
  restaurantProfileDataSchema,
  type GeoOptionsData,
  type RestaurantBasicsUpdateRequest,
  type RestaurantProfileData,
} from "@gozaika/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

/** Active city + neighborhood options for the location pickers. */
export function useGeoOptions(restaurantPk: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["portal", "geo-options"] as const,
    enabled: enabled && Boolean(restaurantPk),
    staleTime: STALE_TIMES.profile,
    queryFn: async (): Promise<GeoOptionsData> => {
      const res = await apiClient.request("/restaurant/geo-options", {
        dataSchema: geoOptionsDataSchema,
        restaurantPk: restaurantPk ?? undefined,
      });
      return res.data as unknown as GeoOptionsData;
    },
  });
}

function profileKey(restaurantPk: string | null) {
  return ["portal", "profile", restaurantPk ?? "none"] as const;
}

/** Role-safe restaurant profile (basics + location + compliance summary). */
export function useRestaurantProfile(restaurantPk: string | null) {
  return useQuery({
    queryKey: profileKey(restaurantPk),
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.profile,
    queryFn: async (): Promise<RestaurantProfileData> => {
      const res = await apiClient.request("/restaurant/profile", {
        dataSchema: restaurantProfileDataSchema,
        restaurantPk: restaurantPk ?? undefined,
      });
      return res.data as unknown as RestaurantProfileData;
    },
  });
}

/** Edit basics (OWNER/ADMIN). On success the cache is updated with the fresh profile. */
export function useUpdateRestaurantBasics(restaurantPk: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: RestaurantBasicsUpdateRequest): Promise<RestaurantProfileData> => {
      const res = await apiClient.request("/restaurant/basics", {
        method: "PATCH",
        body,
        restaurantPk: restaurantPk ?? undefined,
        dataSchema: restaurantProfileDataSchema,
      });
      return res.data as unknown as RestaurantProfileData;
    },
    onSuccess: (data) => queryClient.setQueryData(profileKey(restaurantPk), data),
  });
}
