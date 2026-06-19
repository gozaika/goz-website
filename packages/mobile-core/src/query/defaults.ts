import type { QueryClientConfig } from "@tanstack/react-query";
import { ApiError, isRetryableCode } from "../http/errors";

/**
 * Freshness windows (shared spec §6 / restaurant spec §6), in milliseconds.
 * Per-query `staleTime` should be set from these constants.
 */
export const STALE_TIMES = {
  /** Public discovery lists. */
  publicDiscovery: 30_000,
  /** Active drop / order detail and counter queue. */
  active: 10_000,
  /** Profile, finance, reports. */
  profile: 5 * 60_000,
} as const;

const MAX_GET_RETRIES = 3;

/**
 * Shared TanStack Query defaults. Retries network/5xx GETs with bounded
 * exponential backoff; never auto-retries mutations (those carry an idempotency
 * key and are retried explicitly with the same key).
 */
export function createQueryClientConfig(): QueryClientConfig {
  return {
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.active,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (failureCount >= MAX_GET_RETRIES) {
            return false;
          }
          if (error instanceof ApiError) {
            return isRetryableCode(error.code);
          }
          return true;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: false,
      },
    },
  };
}
