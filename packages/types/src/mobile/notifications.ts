import { z } from "zod";

/**
 * Push-notification device registration contracts (Slice 16). The app registers
 * its platform push token so the server can target the signed-in profile via
 * `notification_device`. Token send/delivery is server-side (FCM HTTP v1) and
 * respects `consumer_notification_preference`. Shared by both the customer and
 * partner BFFs (registration is per `iam_profile`, not restaurant-scoped).
 */

export const devicePlatformCodes = ["IOS", "ANDROID", "WEB"] as const;
export type DevicePlatformCode = (typeof devicePlatformCodes)[number];

export const deviceRegisterRequestSchema = z.object({
  pushToken: z.string().trim().min(8).max(4096),
  platform: z.enum(devicePlatformCodes),
  deviceLabel: z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(120).nullable().optional()),
});
export type DeviceRegisterRequest = z.infer<typeof deviceRegisterRequestSchema>;

export const deviceRegisterResultSchema = z.object({
  deviceId: z.string(),
  active: z.boolean(),
});
export type DeviceRegisterResult = z.infer<typeof deviceRegisterResultSchema>;

/** Body for deactivating a token (sign-out / token rotation). */
export const deviceDeregisterRequestSchema = z.object({
  pushToken: z.string().trim().min(8).max(4096),
});
