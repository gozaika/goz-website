import { resolveMobileBearerActor, type ResolvedMobileActor } from "@gozaika/supabase";
import { mobileErr, mobileErrorStatus, mobileOk, type FieldError, type MobileErrorCode } from "@gozaika/types";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

/** Lowest client schema version this server still accepts (shared spec §5.3). */
const MIN_SCHEMA_VERSION = 1;

export function mobileResponseOk<T>(data: T, requestId: string, serverTime = new Date().toISOString()): NextResponse {
  return NextResponse.json(mobileOk(data, requestId, serverTime), {
    status: 200,
    headers: { "x-request-id": requestId },
  });
}

export function mobileResponseErr(
  code: MobileErrorCode,
  message: string,
  requestId: string,
  options: { readonly retryable?: boolean; readonly fieldErrors?: readonly FieldError[] } = {},
): NextResponse {
  return NextResponse.json(mobileErr(code, message, requestId, options), {
    status: mobileErrorStatus(code),
    headers: { "x-request-id": requestId },
  });
}

/** Server-issued request id (never trusts a client-supplied one). */
export function newRequestId(): string {
  return randomUUID();
}

/** Reject obsolete clients with 426 before doing any work. */
function schemaGate(req: Request, requestId: string): NextResponse | null {
  const raw = req.headers.get("x-client-schema-version");
  const version = raw === null ? MIN_SCHEMA_VERSION : Number(raw);
  if (!Number.isFinite(version) || version < MIN_SCHEMA_VERSION) {
    return mobileResponseErr("APP_UPDATE_REQUIRED", "Please update goZaika to continue.", requestId);
  }
  return null;
}

export interface MobileAuthContext {
  readonly req: Request;
  readonly actor: ResolvedMobileActor;
  readonly requestId: string;
}

export type MobileAuthedHandler = (ctx: MobileAuthContext) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a bearer-authenticated mobile handler: enforces schema version, validates
 * the Supabase token, resolves the actor, and sanitizes any thrown exception into
 * a SERVER_ERROR envelope. Web cookie handlers are untouched.
 */
export function withMobileAuth(handler: MobileAuthedHandler): (req: Request) => Promise<NextResponse> {
  return async (req: Request): Promise<NextResponse> => {
    const requestId = newRequestId();
    const stale = schemaGate(req, requestId);
    if (stale) {
      return stale;
    }
    try {
      const result = await resolveMobileBearerActor(req.headers.get("authorization"));
      if (!result.ok) {
        return mobileResponseErr("UNAUTHENTICATED", "Please sign in to continue.", requestId);
      }
      return await handler({ req, actor: result.actor, requestId });
    } catch (caught) {
      console.error("mobile_handler_error", {
        requestId,
        message: caught instanceof Error ? caught.message : "unknown",
      });
      return mobileResponseErr("SERVER_ERROR", "Something went wrong. Please try again.", requestId);
    }
  };
}
