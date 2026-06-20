import { queryKeys, STALE_TIMES } from "@gozaika/mobile-core";
import {
  discoveryDropsSchema,
  publicDropCardSchema,
  publicRestaurantProfileSchema,
  restaurantsListSchema,
} from "@gozaika/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export function useDrops() {
  return useQuery({
    queryKey: queryKeys.discovery.drops(),
    queryFn: async () => (await apiClient.request("/discovery/drops", { dataSchema: discoveryDropsSchema })).data,
    staleTime: STALE_TIMES.publicDiscovery,
  });
}

export function useDrop(dropPk: string) {
  return useQuery({
    queryKey: queryKeys.discovery.drop(dropPk),
    queryFn: async () =>
      (await apiClient.request(`/discovery/drops/${dropPk}`, { dataSchema: publicDropCardSchema })).data,
    staleTime: STALE_TIMES.active,
    enabled: Boolean(dropPk),
  });
}

export function useRestaurants() {
  return useQuery({
    queryKey: queryKeys.restaurants.list(),
    queryFn: async () => (await apiClient.request("/restaurants", { dataSchema: restaurantsListSchema })).data,
    staleTime: STALE_TIMES.publicDiscovery,
  });
}

export function useRestaurant(slug: string) {
  return useQuery({
    queryKey: queryKeys.restaurants.detail(slug),
    queryFn: async () =>
      (await apiClient.request(`/restaurants/${slug}`, { dataSchema: publicRestaurantProfileSchema })).data,
    staleTime: STALE_TIMES.publicDiscovery,
    enabled: Boolean(slug),
  });
}
