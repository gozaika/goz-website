import { z } from "zod";

/**
 * Canonical mobile BFF envelope contract (shared spec §5.2). Both the server
 * (response builders below) and the mobile client (@gozaika/mobile-core decoder)
 * import from here, so the wire shape has a single source of truth.
 *
 *   success: {"ok":true,"data":{},"requestId":"uuid","serverTime":"ISO-8601"}
 *   error:   {"ok":false,"error":{code,message,retryable,fieldErrors?},"requestId"}
 */

/** Stable error codes. NETWORK/DECODE are client-only; the server emits the rest. */
export const MOBILE_ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "ROLE_DENIED",
  "MEMBERSHIP_INACTIVE",
  "RESTAURANT_SUSPENDED",
  "RESTAURANT_SELECTION_REQUIRED",
  "ROLE_CHANGED",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION",
  "RATE_LIMITED",
  "APP_UPDATE_REQUIRED",
  "SERVER_ERROR",
  "NETWORK",
  "DECODE",
] as const;

export type MobileErrorCode = (typeof MOBILE_ERROR_CODES)[number];

export const fieldErrorSchema = z.object({ field: z.string(), message: z.string() });
export type FieldError = z.infer<typeof fieldErrorSchema>;

// `code` stays a permissive string on the wire so an unknown future code is
// normalized (not hard-failed) by the client decoder.
export const mobileErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().optional().default(false),
  fieldErrors: z.array(fieldErrorSchema).optional(),
});

export const mobileSuccessEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.unknown(),
  requestId: z.string(),
  serverTime: z.string(),
});

export const mobileErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: mobileErrorBodySchema,
  requestId: z.string().optional(),
});

export const mobileEnvelopeSchema = z.discriminatedUnion("ok", [
  mobileSuccessEnvelopeSchema,
  mobileErrorEnvelopeSchema,
]);

// ---- Server response builders (pure; no framework dependency) ----

export interface MobileOkEnvelope<T> {
  readonly ok: true;
  readonly data: T;
  readonly requestId: string;
  readonly serverTime: string;
}

export interface MobileErrEnvelope {
  readonly ok: false;
  readonly error: {
    readonly code: MobileErrorCode;
    readonly message: string;
    readonly retryable: boolean;
    readonly fieldErrors?: readonly FieldError[];
  };
  readonly requestId: string;
}

export function mobileOk<T>(data: T, requestId: string, serverTime = new Date().toISOString()): MobileOkEnvelope<T> {
  return { ok: true, data, requestId, serverTime };
}

export function mobileErr(
  code: MobileErrorCode,
  message: string,
  requestId: string,
  options: { readonly retryable?: boolean; readonly fieldErrors?: readonly FieldError[] } = {},
): MobileErrEnvelope {
  return {
    ok: false,
    error: { code, message, retryable: options.retryable ?? false, fieldErrors: options.fieldErrors },
    requestId,
  };
}

const ERROR_STATUS: Readonly<Record<MobileErrorCode, number>> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  ROLE_DENIED: 403,
  MEMBERSHIP_INACTIVE: 403,
  RESTAURANT_SUSPENDED: 403,
  ROLE_CHANGED: 403,
  RESTAURANT_SELECTION_REQUIRED: 409,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 400,
  RATE_LIMITED: 429,
  APP_UPDATE_REQUIRED: 426,
  SERVER_ERROR: 500,
  NETWORK: 503,
  DECODE: 502,
};

/** HTTP status a server should return for a given error code. */
export function mobileErrorStatus(code: MobileErrorCode): number {
  return ERROR_STATUS[code];
}
