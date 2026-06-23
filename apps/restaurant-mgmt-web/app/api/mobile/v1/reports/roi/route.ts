import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { RoiReportPayload } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadRoiReport, parseRoiPeriod } from "@/lib/roi-report";

/**
 * Read-only weekly ROI report for the selected restaurant (Slice 15). Gated by
 * `viewReports` (OWNER/ADMIN/MANAGER). Period comes from `?start=&end=` (YYYY-MM-DD,
 * defaulting to the trailing 7 days). Reuses the shared `loadRoiReport` loader +
 * `buildRoiReport` so web and mobile produce identical figures, partner copy, and
 * insights. No payment/settlement state is mutated.
 */
export const GET = withMobileRestaurantRole("viewReports", async ({ req, restaurantPk, membership, requestId }) => {
  const url = new URL(req.url);
  const period = parseRoiPeriod({
    start: url.searchParams.get("start") ?? undefined,
    end: url.searchParams.get("end") ?? undefined,
  });

  const service = createServiceRoleSupabaseClient();
  try {
    const report = await loadRoiReport(service, {
      restaurantPk,
      restaurantName: membership.restaurantName,
      periodStartAt: period.periodStartAt,
      periodEndAt: period.periodEndAt,
    });
    return mobileResponseOk(report satisfies RoiReportPayload, requestId);
  } catch (caught) {
    console.error("mobile_roi_report_failed", { requestId, message: caught instanceof Error ? caught.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Could not load the ROI report.", requestId);
  }
});
