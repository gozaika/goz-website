import { z } from "zod";
import { ApiError, type ApiErrorCode, type FieldError } from "./errors";

/**
 * Stable BFF envelope (shared spec §5.2):
 *   success: {"ok":true,"data":{},"requestId":"uuid","serverTime":"ISO-8601"}
 *   error:   {"ok":false,"error":{code,message,retryable,fieldErrors?},"requestId"}
 */

const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

const errorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().optional().default(false),
  fieldErrors: z.array(fieldErrorSchema).optional(),
});

export const successEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.unknown(),
  requestId: z.string(),
  serverTime: z.string(),
});

export const errorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: errorBodySchema,
  requestId: z.string().optional(),
});

export const envelopeSchema = z.discriminatedUnion("ok", [successEnvelopeSchema, errorEnvelopeSchema]);

export interface DecodedSuccess<T> {
  readonly data: T;
  readonly requestId: string;
  readonly serverTime: string;
}

const KNOWN_CODES = new Set<ApiErrorCode>([
  "UNAUTHENTICATED", "FORBIDDEN", "ROLE_DENIED", "MEMBERSHIP_INACTIVE", "RESTAURANT_SUSPENDED",
  "RESTAURANT_SELECTION_REQUIRED", "ROLE_CHANGED", "NOT_FOUND", "CONFLICT", "VALIDATION",
  "RATE_LIMITED", "APP_UPDATE_REQUIRED", "SERVER_ERROR", "NETWORK", "DECODE",
]);

function normalizeCode(code: string): ApiErrorCode {
  return KNOWN_CODES.has(code as ApiErrorCode) ? (code as ApiErrorCode) : "SERVER_ERROR";
}

/**
 * Decode a parsed JSON body into typed data, validating the inner payload with the
 * caller's Zod schema. Throws a sanitized {@link ApiError} for error envelopes,
 * malformed envelopes, or payloads that fail schema validation.
 */
export function decodeEnvelope<T>(
  body: unknown,
  dataSchema: z.ZodType<T>,
  context: { readonly status: number; readonly requestId?: string },
): DecodedSuccess<T> {
  const envelope = envelopeSchema.safeParse(body);
  if (!envelope.success) {
    throw new ApiError({
      code: "DECODE",
      message: "The server returned an unexpected response.",
      retryable: false,
      status: context.status,
      requestId: context.requestId,
    });
  }

  if (envelope.data.ok === false) {
    const { error } = envelope.data;
    throw new ApiError({
      code: normalizeCode(error.code),
      message: error.message,
      retryable: error.retryable,
      status: context.status,
      requestId: envelope.data.requestId ?? context.requestId,
      fieldErrors: error.fieldErrors as readonly FieldError[] | undefined,
    });
  }

  const parsed = dataSchema.safeParse(envelope.data.data);
  if (!parsed.success) {
    throw new ApiError({
      code: "DECODE",
      message: "The server response did not match the expected format.",
      retryable: false,
      status: context.status,
      requestId: envelope.data.requestId,
    });
  }

  return {
    data: parsed.data,
    requestId: envelope.data.requestId,
    serverTime: envelope.data.serverTime,
  };
}
