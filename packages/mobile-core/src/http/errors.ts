import type { FieldError, MobileErrorCode } from "@gozaika/types";

/** Stable error codes — single source of truth in @gozaika/types (shared spec §5.2). */
export type ApiErrorCode = MobileErrorCode;
export type { FieldError };

export interface ApiErrorShape {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly requestId?: string;
  readonly fieldErrors?: readonly FieldError[];
}

/** Typed error thrown by the API client. Never carries raw provider/SQL payloads. */
export class ApiError extends Error implements ApiErrorShape {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  readonly status?: number;
  readonly requestId?: string;
  readonly fieldErrors?: readonly FieldError[];

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiError";
    this.code = shape.code;
    this.retryable = shape.retryable;
    this.status = shape.status;
    this.requestId = shape.requestId;
    this.fieldErrors = shape.fieldErrors;
  }

  /** True when the client should force an app update (HTTP 426). */
  get requiresAppUpdate(): boolean {
    return this.code === "APP_UPDATE_REQUIRED";
  }

  /** True when the session is no longer valid and re-auth is required. */
  get requiresReauth(): boolean {
    return this.code === "UNAUTHENTICATED";
  }
}

const STATUS_CODE_MAP: Readonly<Record<number, ApiErrorCode>> = {
  400: "VALIDATION",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION",
  426: "APP_UPDATE_REQUIRED",
  429: "RATE_LIMITED",
};

/** Map an HTTP status to a stable error code, defaulting to SERVER_ERROR for 5xx. */
export function statusToErrorCode(status: number): ApiErrorCode {
  const mapped = STATUS_CODE_MAP[status];
  return mapped ?? "SERVER_ERROR";
}

/** Codes that are safe to auto-retry for idempotent (GET) requests. */
export function isRetryableCode(code: ApiErrorCode): boolean {
  return code === "NETWORK" || code === "SERVER_ERROR" || code === "RATE_LIMITED";
}
