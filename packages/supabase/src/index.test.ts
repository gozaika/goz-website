import { describe, expect, it } from "vitest";
import { publicStorageUrl, STORAGE_BUCKETS } from "./index";

describe("storage helpers", () => {
  it("keeps private document storage separate from public media", () => {
    expect(STORAGE_BUCKETS.privateDocuments).not.toBe(STORAGE_BUCKETS.publicMedia);
  });

  it("encodes public object paths", () => {
    expect(publicStorageUrl("https://example.supabase.co", "public-media", "drops/bam bag.jpg")).toBe(
      "https://example.supabase.co/storage/v1/object/public/public-media/drops/bam%20bag.jpg",
    );
  });
});
