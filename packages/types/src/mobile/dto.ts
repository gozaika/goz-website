import { z } from "zod";

/** Public health/config payload — proves the BFF is reachable and advertises the schema window. */
export const mobileHealthSchema = z.object({
  status: z.literal("ok"),
  schemaVersion: z.number().int(),
  minSupportedSchemaVersion: z.number().int(),
  serverTime: z.string(),
});
export type MobileHealthDto = z.infer<typeof mobileHealthSchema>;

/**
 * Authenticated actor identity resolved from a Supabase bearer token (Slice 3).
 * Membership/role resolution (restaurant) and consumer-profile bootstrap arrive
 * in Slice 4 — this is the minimal identity both surfaces agree on.
 */
export const mobileActorSchema = z.object({
  authUserId: z.string(),
  profilePk: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  displayName: z.string().nullable(),
  isConsumer: z.boolean(),
  isRestaurantUser: z.boolean(),
  isPlatformUser: z.boolean(),
});
export type MobileActorDto = z.infer<typeof mobileActorSchema>;

/** `GET /me` payload (same shape on both surfaces in Slice 3). */
export const mobileMeSchema = z.object({
  actor: mobileActorSchema,
  /** Echoes the app id the server saw, for client self-check. */
  surface: z.enum(["gozaika-customer", "gozaika-restaurant"]),
});
export type MobileMeDto = z.infer<typeof mobileMeSchema>;
