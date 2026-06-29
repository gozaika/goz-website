import type { PublicDropCard } from "@gozaika/types";
import { publicStorageUrl, STORAGE_BUCKETS } from "@gozaika/supabase";

/** Image-bearing columns of the public drop-card view (subset of the full row). */
export interface DropImageRow {
  readonly image_bucket_name: string | null;
  readonly image_object_path: string | null;
  readonly image_width_px: number | null;
  readonly image_height_px: number | null;
  readonly image_alt_text: string | null;
}

/**
 * Resolve a drop card's public image, enforcing the media trust boundary: only an
 * object that is actually in the `public-media` bucket (with a path, and a known
 * base URL) becomes a public URL. The untrusted `media-ingest` bucket — or any
 * other bucket — must never be rendered publicly (product-media gate #5).
 * Pure + base-url-injected so the boundary is unit-testable (no `@/` alias).
 */
export function resolveDropImage(row: DropImageRow, baseUrl: string | undefined): PublicDropCard["image"] {
  if (!baseUrl || row.image_bucket_name !== STORAGE_BUCKETS.publicMedia || !row.image_object_path) return null;
  return {
    url: publicStorageUrl(baseUrl, row.image_bucket_name, row.image_object_path),
    width: row.image_width_px,
    height: row.image_height_px,
    alt: row.image_alt_text,
    blurhash: null,
  };
}
