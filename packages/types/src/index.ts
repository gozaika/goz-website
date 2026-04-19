/**
 * @file packages/types/src/index.ts
 * @description Shared cross-app TypeScript contracts for goZaika apps.
 */

/**
 * Core site route contract used by navigation, metadata, and sitemap logic.
 */
export interface SiteRoute {
  readonly href: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly indexable: boolean;
}

/**
 * Generic API response shape for server route handlers.
 */
export interface ApiResponse {
  readonly ok: boolean;
  readonly error?: string;
}
