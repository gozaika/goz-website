import { z } from "zod";
import type { RestaurantStatusCode, RestaurantTeamRoleCode } from "../index";

/**
 * Restaurant dashboard contract (Slice 14). The payload is **role-shaped** per the
 * matrix (role-matrix-enforcement-gap.md §3): OWNER/ADMIN/OPERATIONS get the full
 * view; PICKUP_STAFF gets the operational queue only (no financials); FINANCE gets
 * the financial summary only (no ops queue). The server omits the sections a role
 * may not see — it never sends-then-hides.
 */

export const dashboardVariants = ["FULL", "QUEUE_ONLY", "SUMMARY"] as const;
export type DashboardVariant = (typeof dashboardVariants)[number];

export const dashboardFinancialsSchema = z.object({
  todayRevenuePaise: z.number(),
  soldBags: z.number(),
  listedBags: z.number(),
  sellThroughBps: z.number(),
  aovPaise: z.number(),
});

export const dashboardNextDropSchema = z.object({
  dropPk: z.string(),
  dropTitle: z.string(),
  pickupStartAt: z.string(),
  quantityAvailable: z.number(),
  quantityTotal: z.number(),
});

export const dashboardOperationsSchema = z.object({
  activeDrops: z.number(),
  scheduledDrops: z.number(),
  availableBags: z.number(),
  pickupReadyCount: z.number(),
  collectedTodayCount: z.number(),
  nextDrop: dashboardNextDropSchema.nullable(),
});

export const dashboardDataSchema = z.object({
  restaurantPk: z.string(),
  restaurantName: z.string(),
  statusCode: z.string(),
  roleCode: z.string(),
  variant: z.string(),
  publishingEnabled: z.boolean().nullable(),
  financials: dashboardFinancialsSchema.nullable(),
  operations: dashboardOperationsSchema.nullable(),
});

export interface DashboardFinancials {
  readonly todayRevenuePaise: number;
  readonly soldBags: number;
  readonly listedBags: number;
  readonly sellThroughBps: number;
  readonly aovPaise: number;
}
export interface DashboardNextDrop {
  readonly dropPk: string;
  readonly dropTitle: string;
  readonly pickupStartAt: string;
  readonly quantityAvailable: number;
  readonly quantityTotal: number;
}
export interface DashboardOperations {
  readonly activeDrops: number;
  readonly scheduledDrops: number;
  readonly availableBags: number;
  readonly pickupReadyCount: number;
  readonly collectedTodayCount: number;
  readonly nextDrop: DashboardNextDrop | null;
}
export interface DashboardData {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly statusCode: RestaurantStatusCode;
  readonly roleCode: RestaurantTeamRoleCode;
  readonly variant: DashboardVariant;
  readonly publishingEnabled: boolean | null;
  readonly financials: DashboardFinancials | null;
  readonly operations: DashboardOperations | null;
}

/** Which dashboard sections a role sees. */
export function dashboardVariantForRole(role: RestaurantTeamRoleCode): DashboardVariant {
  if (role === "PICKUP_STAFF") return "QUEUE_ONLY";
  if (role === "FINANCE") return "SUMMARY";
  return "FULL";
}
