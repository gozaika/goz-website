import { STALE_TIMES } from "@gozaika/mobile-core";
import { financeDataSchema, type FinanceData } from "@gozaika/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

/** Read-only finance settlements for the selected restaurant (viewFinance). */
export function useFinance(restaurantPk: string | null) {
  return useQuery({
    queryKey: ["portal", "finance", restaurantPk ?? "none"] as const,
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.profile,
    queryFn: async (): Promise<FinanceData> => {
      const res = await apiClient.request("/finance", { dataSchema: financeDataSchema, restaurantPk: restaurantPk ?? undefined });
      return res.data as unknown as FinanceData;
    },
  });
}
