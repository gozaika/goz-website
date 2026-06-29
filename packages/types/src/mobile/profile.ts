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
  cityPk: z.string().nullable(),
  cityName: z.string().nullable(),
  neighborhoodPk: z.string().nullable(),
  neighborhoodName: z.string().nullable(),
  /** Pickup-pin coordinates (WGS-84), set via the mobile location pin. Null until pinned. */
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  headline: z.string().nullable(),
  storyMarkdown: z.string().nullable(),
  compliance: restaurantComplianceSummaryWireSchema,
  /** Whether the actor's role may edit basics (drives the mobile edit affordance). */
  canEditBasics: z.boolean(),
});

/**
 * PATCH restaurant/location body (Slice 12 location pin). Both coordinates move
 * together — supply both to set, or both null to clear. `restaurantPk` is taken
 * from the authorized context server-side, never the body.
 */
export const restaurantLocationUpdateSchema = z
  .object({
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  })
  .refine((v) => (v.latitude === null) === (v.longitude === null), {
    message: "Provide both latitude and longitude, or clear both.",
  });
export type RestaurantLocationUpdateRequest = z.infer<typeof restaurantLocationUpdateSchema>;

/** Active city + neighborhood options for the location pickers (`GET restaurant/geo-options`). */
export const geoOptionsDataSchema = z.object({
  cities: z.array(z.object({ cityPk: z.string(), cityName: z.string() })),
  neighborhoods: z.array(z.object({ neighborhoodPk: z.string(), cityPk: z.string(), neighborhoodName: z.string() })),
});

export interface GeoCityOption {
  readonly cityPk: string;
  readonly cityName: string;
}
export interface GeoNeighborhoodOption {
  readonly neighborhoodPk: string;
  readonly cityPk: string;
  readonly neighborhoodName: string;
}
export interface GeoOptionsData {
  readonly cities: readonly GeoCityOption[];
  readonly neighborhoods: readonly GeoNeighborhoodOption[];
}

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
  readonly cityPk: string | null;
  readonly cityName: string | null;
  readonly neighborhoodPk: string | null;
  readonly neighborhoodName: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly headline: string | null;
  readonly storyMarkdown: string | null;
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
  readonly cityPk?: string | null;
  readonly neighborhoodPk?: string | null;
  readonly headline?: string;
  readonly storyMarkdown?: string;
}
