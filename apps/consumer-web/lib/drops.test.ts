import { describe, expect, it } from "vitest";
import { STORAGE_BUCKETS } from "@gozaika/supabase";
import { resolveDropImage } from "./drop-image";

// Product-media gate #5 (discovery-resolution half): a real uploaded image in the
// public-media bucket resolves to a public URL flowing into discovery; everything
// else (the untrusted ingest bucket, a null path, a missing base URL) resolves to
// null so the client renders local fallback art.
const BASE = "https://proj.supabase.co";

function row(over: Partial<Parameters<typeof resolveDropImage>[0]> = {}) {
  return {
    image_bucket_name: STORAGE_BUCKETS.publicMedia,
    image_object_path: "drops/abc.webp",
    image_width_px: 1200,
    image_height_px: 900,
    image_alt_text: "Chef's special bag",
    ...over,
  };
}

describe("resolveDropImage (product-media gate #5)", () => {
  it("resolves a real public-media object to a public URL", () => {
    const img = resolveDropImage(row(), BASE);
    expect(img).not.toBeNull();
    expect(img!.url).toBe(`${BASE}/storage/v1/object/public/public-media/drops/abc.webp`);
    expect(img!.width).toBe(1200);
    expect(img!.alt).toBe("Chef's special bag");
  });

  it("never renders the untrusted media-ingest bucket", () => {
    expect(resolveDropImage(row({ image_bucket_name: STORAGE_BUCKETS.mediaIngest }), BASE)).toBeNull();
  });

  it("returns null for an unknown bucket", () => {
    expect(resolveDropImage(row({ image_bucket_name: "private-documents" }), BASE)).toBeNull();
  });

  it("returns null when the object path is missing", () => {
    expect(resolveDropImage(row({ image_object_path: null }), BASE)).toBeNull();
  });

  it("returns null when the base URL is not configured", () => {
    expect(resolveDropImage(row(), undefined)).toBeNull();
  });
});
