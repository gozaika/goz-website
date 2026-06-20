import {
  resolveMobileBearerActor,
  resolveRestaurantMemberships,
  resolveRestaurantRoleScopes,
  type ResolvedMembership,
  type ResolvedMobileActor,
} from "@gozaika/supabase";
import {
  decideRestaurantAccess,
  type MembershipView,
  type RestaurantCapability,
  type RestaurantTeamRoleCode,
  type RoleScopeMap,
} from "@gozaika/types";
import { NextResponse } from "next/server";
import { mobileResponseErr, newRequestId } from "./handler";

const MIN_SCHEMA_VERSION = 1;

/** Selected restaurant from `?restaurantPk=` or the `X-GoZaika-Restaurant` header. */
function selectedRestaurantPk(req: Request): string | null {
  const fromQuery = new URL(req.url).searchParams.get("restaurantPk");
  return fromQuery ?? req.headers.get("x-gozaika-restaurant") ?? null;
}

export interface RestaurantRoleContext {
  readonly req: Request;
  readonly actor: ResolvedMobileActor;
  readonly requestId: string;
  readonly restaurantPk: string;
  /** The authorized membership (with restaurant name/status). */
  readonly membership: ResolvedMembership;
}

export type RestaurantRoleHandler = (ctx: RestaurantRoleContext) => Promise<NextResponse> | NextResponse;

/**
 * Bearer + role-scoped handler wrapper (Slice 4). Resolves the actor, loads every
 * membership, revalidates the selected restaurant, and enforces `capability` via
 * the centralized policy before the handler runs. Returns the precise denial code
 * (UNAUTHENTICATED / RESTAURANT_SELECTION_REQUIRED / FORBIDDEN / MEMBERSHIP_INACTIVE
 * / RESTAURANT_SUSPENDED / ROLE_DENIED).
 */
export function withMobileRestaurantRole(
  capability: RestaurantCapability,
  handler: RestaurantRoleHandler,
): (req: Request) => Promise<NextResponse> {
  return async (req: Request): Promise<NextResponse> => {
    const requestId = newRequestId();

    const raw = req.headers.get("x-client-schema-version");
    const version = raw === null ? MIN_SCHEMA_VERSION : Number(raw);
    if (!Number.isFinite(version) || version < MIN_SCHEMA_VERSION) {
      return mobileResponseErr("APP_UPDATE_REQUIRED", "Please update goZaika Partner to continue.", requestId);
    }

    try {
      const auth = await resolveMobileBearerActor(req.headers.get("authorization"));
      if (!auth.ok) {
        return mobileResponseErr("UNAUTHENTICATED", "Please sign in to continue.", requestId);
      }

      const resolved = await resolveRestaurantMemberships(auth.actor.profilePk);
      const views: MembershipView[] = resolved.map((m) => ({
        restaurantPk: m.restaurantPk,
        roleCode: m.roleCode as RestaurantTeamRoleCode,
        restaurantStatusCode: m.restaurantStatusCode,
        isActive: m.isActive,
      }));

      // Data-driven: resolve role -> scopes from the DB (restaurant_team_role_scope).
      const roleScopes = (await resolveRestaurantRoleScopes()) as unknown as RoleScopeMap;
      const decision = decideRestaurantAccess({
        memberships: views,
        restaurantPk: selectedRestaurantPk(req),
        capability,
        roleScopes,
      });
      if (!decision.ok) {
        return mobileResponseErr(decision.code, decision.message, requestId);
      }

      const membership = resolved.find((m) => m.restaurantPk === decision.membership.restaurantPk);
      if (!membership) {
        return mobileResponseErr("SERVER_ERROR", "Could not resolve restaurant access.", requestId);
      }

      return await handler({ req, actor: auth.actor, requestId, restaurantPk: membership.restaurantPk, membership });
    } catch (caught) {
      console.error("mobile_restaurant_role_error", {
        requestId,
        message: caught instanceof Error ? caught.message : "unknown",
      });
      return mobileResponseErr("SERVER_ERROR", "Something went wrong. Please try again.", requestId);
    }
  };
}
