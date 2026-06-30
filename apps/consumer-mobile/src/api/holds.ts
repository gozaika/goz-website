import { STALE_TIMES } from "@gozaika/mobile-core";
import { activeHoldsSummarySchema, type ActiveHoldsSummaryDto } from "@gozaika/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

/**
 * The signed-in customer's active (unpaid, unexpired) holds — count + the
 * earliest-expiring one. Powers the global holds pill that nudges the user to
 * finish paying before the hold releases the bags.
 */
export function useActiveHolds(options: { readonly enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["holds", "active"],
    enabled: options.enabled ?? true,
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<ActiveHoldsSummaryDto> => {
      const res = await apiClient.request("/holds", { dataSchema: activeHoldsSummarySchema });
      return res.data as unknown as ActiveHoldsSummaryDto;
    },
  });
}
