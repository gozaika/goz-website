import type { z } from "zod";
import { MOBILE_API_BASE_PATH, type MobileAppConfig } from "../config";
import type { Logger } from "../telemetry/logger";
import { ApiError } from "./errors";
import { decodeEnvelope, type DecodedSuccess } from "./envelope";
import { buildHeaders } from "./headers";
import { newIdempotencyKey } from "./idempotency";
import type { ServerClock } from "./serverTime";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiClientOptions {
  readonly config: MobileAppConfig;
  /** Resolve the current Supabase access token (null when signed out). */
  readonly getAccessToken: () => Promise<string | null> | string | null;
  /** Server clock to keep in sync from each response's serverTime. */
  readonly serverClock: ServerClock;
  /** Redacting logger. */
  readonly logger: Logger;
  /** Injectable fetch (defaults to global fetch) — eases testing. */
  readonly fetchImpl?: typeof fetch;
}

export interface RequestOptions<T> {
  readonly method?: HttpMethod;
  readonly body?: unknown;
  /** Zod schema validating the inner `data` payload. */
  readonly dataSchema: z.ZodType<T>;
  /** Required for non-idempotent mutations; auto-generated if omitted on writes. */
  readonly idempotencyKey?: string;
  readonly restaurantPk?: string;
  readonly signal?: AbortSignal;
}

export interface ApiClient {
  request<T>(path: string, options: RequestOptions<T>): Promise<DecodedSuccess<T>>;
}

function isWrite(method: HttpMethod): boolean {
  return method !== "GET";
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const base = options.config.apiOrigin.replace(/\/$/, "") + MOBILE_API_BASE_PATH;

  return {
    async request<T>(path: string, req: RequestOptions<T>): Promise<DecodedSuccess<T>> {
      const method: HttpMethod = req.method ?? "GET";
      const accessToken = await options.getAccessToken();
      const idempotencyKey = isWrite(method) ? req.idempotencyKey ?? newIdempotencyKey() : undefined;
      const hasBody = req.body !== undefined && isWrite(method);

      const headers = buildHeaders({
        config: options.config,
        accessToken,
        idempotencyKey,
        restaurantPk: req.restaurantPk,
        hasBody,
      });

      const url = base + (path.startsWith("/") ? path : `/${path}`);

      let response: Response;
      try {
        response = await fetchImpl(url, {
          method,
          headers,
          body: hasBody ? JSON.stringify(req.body) : undefined,
          signal: req.signal,
        });
      } catch (cause) {
        // Network failure (offline, DNS, abort). Never log token/body.
        options.logger.warn("api_network_error", { method, path, aborted: req.signal?.aborted ?? false });
        throw new ApiError({
          code: "NETWORK",
          message: "We could not reach goZaika. Check your connection and try again.",
          retryable: !req.signal?.aborted,
        });
      }

      const requestId = response.headers.get("x-request-id") ?? undefined;
      let json: unknown = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      try {
        const decoded = decodeEnvelope<T>(json, req.dataSchema, { status: response.status, requestId });
        options.serverClock.syncFromIso(decoded.serverTime);
        options.logger.debug("api_ok", { method, path, requestId: decoded.requestId, status: response.status });
        return decoded;
      } catch (error) {
        if (error instanceof ApiError) {
          options.logger.warn("api_error", {
            method,
            path,
            status: response.status,
            code: error.code,
            requestId: error.requestId,
          });
          throw error;
        }
        throw new ApiError({
          code: "DECODE",
          message: "The server returned an unexpected response.",
          retryable: false,
          status: response.status,
          requestId,
        });
      }
    },
  };
}
