import { z } from "zod";
import type { RestaurantComplianceStatusCode, RestaurantStatusCode } from "../index";

/**
 * Restaurant profile contracts (Slice 12). Role-gated `GET restaurant/profile`
 * returns basics + location + a compliance *summary*. Compliance deliberately
 * exposes only status + presence flags + expiry — never the raw FSSAI/GSTIN/PAN
 * numbers (sensitive PII; leakage decision E). Edits go through `PATCH basics`.
 *
 * Permissive wire schema + precise TS DTO, narrowed at the client boundary.
 */

export const restaurantComplianceSummaryWireSchema = z.object({
  statusCode: z.string().nullable(),
  fssaiPresent: z.boolean(),
  fssaiExpiryDate: z.string().nullable(),
  gstinPresent: z.boolean(),
  panPresent: z.boolean(),
  lastReviewedAt: z.string().nullable(),
});

export const restaurantProfileDataSchema = z.object({
  restaurantPk: z.string(),
  restaurantName: z.string(),
  restaurantSlug: z.string(),
  legalEntityName: z.string().nullable(),
  statusCode: z.string(),
  pickupInstructions: z.string().nullable(),
  primaryContactEmail: z.string().nullable(),
  primaryContactPhoneE164: z.string().nullable(),
  cityName: z.string().nullable(),
  neighborhoodName: z.string().nullable(),
  compliance: restaurantComplianceSummaryWireSchema,
  /** Whether the actor's role may edit basics (drives the mobile edit affordance). */
  canEditBasics: z.boolean(),
});

export interface RestaurantComplianceSummary {
  readonly statusCode: RestaurantComplianceStatusCode | null;
  readonly fssaiPresent: boolean;
  readonly fssaiExpiryDate: string | null;
  readonly gstinPresent: boolean;
  readonly panPresent: boolean;
  readonly lastReviewedAt: string | null;
}

export interface RestaurantProfileData {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly restaurantSlug: string;
  readonly legalEntityName: string | null;
  readonly statusCode: RestaurantStatusCode;
  readonly pickupInstructions: string | null;
  readonly primaryContactEmail: string | null;
  readonly primaryContactPhoneE164: string | null;
  readonly cityName: string | null;
  readonly neighborhoodName: string | null;
  readonly compliance: RestaurantComplianceSummary;
  readonly canEditBasics: boolean;
}

/** PATCH restaurant/basics body. `restaurantPk` is taken from the selected-restaurant
 *  header server-side, so the client need not send it. */
export interface RestaurantBasicsUpdateRequest {
  readonly restaurantName: string;
  readonly restaurantSlug: string;
  readonly legalEntityName?: string;
  readonly primaryContactEmail: string;
  readonly primaryContactPhoneE164?: string;
  readonly pickupInstructions?: string;
}
