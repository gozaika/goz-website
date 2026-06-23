import { queryKeys, STALE_TIMES } from "@gozaika/mobile-core";
import { roiReportPayloadSchema, type RoiReportPayload } from "@gozaika/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

/**
 * Read-only weekly ROI report for the selected restaurant (viewReports). The BFF
 * defaults to the trailing 7-day window; an optional start/end (YYYY-MM-DD) can be
 * passed once a date picker lands.
 */
export function useRoiReport(restaurantPk: string | null, range?: { readonly start: string; readonly end: string }) {
  return useQuery({
    queryKey: queryKeys.restaurantPortal.roi(restaurantPk ?? "none", range),
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.profile,
    queryFn: async (): Promise<RoiReportPayload> => {
      const qs = range ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}` : "";
      const res = await apiClient.request(`/reports/roi${qs}`, {
        dataSchema: roiReportPayloadSchema,
        restaurantPk: restaurantPk ?? undefined,
      });
      return res.data as unknown as RoiReportPayload;
    },
  });
}
