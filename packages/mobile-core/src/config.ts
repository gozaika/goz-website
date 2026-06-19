/**
 * Public, non-secret mobile client configuration. Service-role, Razorpay secret,
 * pickup credential secret and store keys never appear here (shared spec §2/§10).
 */
export type MobilePlatform = "ios" | "android";

export type MobileAppId = "gozaika-customer" | "gozaika-restaurant";

export interface MobileAppConfig {
  /** Versioned BFF origin, e.g. https://customer.gozaika.in */
  readonly apiOrigin: string;
  /** Stable client identifier sent as X-GoZaika-App. */
  readonly appId: MobileAppId;
  /** Semantic app version, e.g. "0.1.0". */
  readonly appVersion: string;
  /** Runtime platform. */
  readonly platform: MobilePlatform;
  /** Contract schema version sent as X-Client-Schema-Version. */
  readonly schemaVersion: number;
}

/** The mobile contract schema version this client speaks (shared spec §5.3). */
export const CLIENT_SCHEMA_VERSION = 1 as const;

/** Base path for all mobile BFF endpoints. */
export const MOBILE_API_BASE_PATH = "/api/mobile/v1" as const;
