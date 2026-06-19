import type { MobileAppConfig } from "../config";

export interface HeaderContext {
  readonly config: MobileAppConfig;
  /** Supabase access token, when authenticated. */
  readonly accessToken?: string | null;
  /** Idempotency key for non-idempotent mutations. */
  readonly idempotencyKey?: string;
  /** Selected restaurant scope (restaurant app only). */
  readonly restaurantPk?: string;
  /** Whether the request has a JSON body. */
  readonly hasBody?: boolean;
}

/**
 * Build the standard mobile request headers (shared spec §5.2). Authorization is
 * a bearer Supabase access token; cookies are never used. Returns a plain record
 * so it is trivial to redact in logs.
 */
export function buildHeaders(ctx: HeaderContext): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-GoZaika-App": ctx.config.appId,
    "X-GoZaika-App-Version": ctx.config.appVersion,
    "X-GoZaika-Platform": ctx.config.platform,
    "X-Client-Schema-Version": String(ctx.config.schemaVersion),
  };

  if (ctx.hasBody) {
    headers["Content-Type"] = "application/json";
  }
  if (ctx.accessToken) {
    headers.Authorization = `Bearer ${ctx.accessToken}`;
  }
  if (ctx.idempotencyKey) {
    headers["X-Idempotency-Key"] = ctx.idempotencyKey;
  }
  if (ctx.restaurantPk) {
    headers["X-GoZaika-Restaurant"] = ctx.restaurantPk;
  }

  return headers;
}
