import { STALE_TIMES } from "@gozaika/mobile-core";
import { dashboardDataSchema, type DashboardData } from "@gozaika/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

/** Role-shaped restaurant dashboard. */
export function useDashboard(restaurantPk: string | null) {
  return useQuery({
    queryKey: ["portal", "dashboard", restaurantPk ?? "none"] as const,
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<DashboardData> => {
      const res = await apiClient.request("/dashboard", { dataSchema: dashboardDataSchema, restaurantPk: restaurantPk ?? undefined });
      return res.data as unknown as DashboardData;
    },
  });
}
