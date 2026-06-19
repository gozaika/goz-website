import { MOBILE_ERROR_CODES, mobileEnvelopeSchema } from "@gozaika/types";
import type { z } from "zod";
import { ApiError, type ApiErrorCode, type FieldError } from "./errors";

/**
 * Client-side decoding of the canonical BFF envelope (schema lives in
 * @gozaika/types). Throws a sanitized {@link ApiError} for error envelopes,
 * malformed envelopes, or payloads that fail the caller's data schema.
 */

export interface DecodedSuccess<T> {
  readonly data: T;
  readonly requestId: string;
  readonly serverTime: string;
}

const KNOWN_CODES = new Set<ApiErrorCode>(MOBILE_ERROR_CODES);

function normalizeCode(code: string): ApiErrorCode {
  return KNOWN_CODES.has(code as ApiErrorCode) ? (code as ApiErrorCode) : "SERVER_ERROR";
}

export function decodeEnvelope<T>(
  body: unknown,
  dataSchema: z.ZodType<T>,
  context: { readonly status: number; readonly requestId?: string },
): DecodedSuccess<T> {
  const envelope = mobileEnvelopeSchema.safeParse(body);
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
