import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import {
  dashboardVariantForRole,
  type DashboardData,
  type DashboardFinancials,
  type DashboardOperations,
  type RestaurantStatusCode,
  type RestaurantTeamRoleCode,
} from "@gozaika/types";
import { rateToBasisPoints } from "@gozaika/utils";
import { loadPortalDrops, loadRestaurantOpsGuardrails } from "@/lib/slice3";
import { loadRestaurantPickupOrders } from "@/lib/restaurant-orders";

/**
 * Build the role-shaped dashboard for a restaurant. Computes the full metric set
 * (mirroring the web portal dashboard formulas) then includes only the sections the
 * role may see: PICKUP_STAFF → operations only; FINANCE → financials only;
 * OWNER/ADMIN/OPERATIONS → both.
 */
export async function loadDashboard(params: {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly statusCode: string;
  readonly roleCode: RestaurantTeamRoleCode;
}): Promise<DashboardData> {
  const { restaurantPk, restaurantName, statusCode, roleCode } = params;
  const variant = dashboardVariantForRole(roleCode);
  const isActive = statusCode === "ACTIVE";

  const base: DashboardData = {
    restaurantPk,
    restaurantName,
    statusCode: statusCode as RestaurantStatusCode,
    roleCode,
    variant,
    publishingEnabled: null,
    financials: null,
    operations: null,
  };

  if (!isActive) {
    return base;
  }

  const service = createServiceRoleSupabaseClient();
  const [drops, guardrails, orders] = await Promise.all([
    loadPortalDrops(restaurantPk),
    loadRestaurantOpsGuardrails(restaurantPk),
    loadRestaurantPickupOrders({ viewClient: service, serviceClient: service, restaurantPks: [restaurantPk] }),
  ]);

  const listedBags = drops.reduce((t, d) => t + d.quantityTotal, 0);
  const availableBags = drops.reduce((t, d) => t + d.quantityAvailable, 0);
  const soldBags = drops.reduce((t, d) => t + Math.max(0, d.quantityTotal - d.quantityAvailable), 0);
  const today = new Date().toDateString();
  const todayRevenuePaise = drops
    .filter((d) => new Date(d.pickupStartAt).toDateString() === today)
    .reduce((t, d) => t + Math.max(0, d.quantityTotal - d.quantityAvailable) * d.pricePaise, 0);

  const financials: DashboardFinancials = {
    todayRevenuePaise,
    soldBags,
    listedBags,
    sellThroughBps: rateToBasisPoints(soldBags, listedBags) ?? 0,
    aovPaise: soldBags > 0 ? Math.round(todayRevenuePaise / soldBags) : 0,
  };

  const nowMs = Date.now();
  const next = drops
    .filter((d) => Date.parse(d.pickupEndAt) > nowMs)
    .sort((a, b) => Date.parse(a.pickupStartAt) - Date.parse(b.pickupStartAt))[0];

  const operations: DashboardOperations = {
    activeDrops: drops.filter((d) => d.statusCode === "ACTIVE").length,
    scheduledDrops: drops.filter((d) => d.statusCode === "SCHEDULED").length,
    availableBags,
    pickupReadyCount: orders.filter((o) => o.orderStatusCode === "READY_FOR_PICKUP").length,
    collectedTodayCount: orders.filter(
      (o) => o.orderStatusCode === "COLLECTED" && o.collectedAt && new Date(o.collectedAt).toDateString() === today,
    ).length,
    nextDrop: next
      ? {
          dropPk: next.dropPk,
          dropTitle: next.dropTitle,
          pickupStartAt: next.pickupStartAt,
          quantityAvailable: next.quantityAvailable,
          quantityTotal: next.quantityTotal,
        }
      : null,
  };

  return {
    ...base,
    publishingEnabled: guardrails.publishingEnabled,
    financials: variant === "QUEUE_ONLY" ? null : financials,
    operations: variant === "SUMMARY" ? null : operations,
  };
}
