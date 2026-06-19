import { z } from "zod";
import type { RestaurantStatusCode, RestaurantTeamRoleCode } from "../index";
import { mobileActorSchema } from "./dto";

// Wire schemas keep codes as permissive strings (resilient decoding); the exported
// TS types narrow to the canonical unions. Type-only imports avoid a value cycle
// with the types barrel.

export const mobileMembershipSchema = z.object({
  restaurantPk: z.string(),
  restaurantName: z.string(),
  roleCode: z.string(),
  restaurantStatusCode: z.string(),
  isDefault: z.boolean(),
});
export interface MobileMembershipDto {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly roleCode: RestaurantTeamRoleCode;
  readonly restaurantStatusCode: RestaurantStatusCode;
  readonly isDefault: boolean;
}

/**
 * Restaurant `POST /auth/bootstrap` payload (Slice 4). Actor-safe identity plus
 * active memberships and roles. Must NOT create a consumer profile (fixes D1).
 */
export const mobileRestaurantBootstrapSchema = z.object({
  actor: mobileActorSchema,
  memberships: z.array(mobileMembershipSchema),
  selectedRestaurantPk: z.string().nullable(),
});
export interface MobileRestaurantBootstrapDto {
  readonly actor: z.infer<typeof mobileActorSchema>;
  readonly memberships: readonly MobileMembershipDto[];
  readonly selectedRestaurantPk: string | null;
}

/** Minimal role-scoped restaurant summary returned by the first protected read. */
export const mobileRestaurantSummarySchema = z.object({
  restaurantPk: z.string(),
  restaurantName: z.string(),
  restaurantStatusCode: z.string(),
  roleCode: z.string(),
});
export interface MobileRestaurantSummaryDto {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly restaurantStatusCode: RestaurantStatusCode;
  readonly roleCode: RestaurantTeamRoleCode;
}
