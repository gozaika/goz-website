import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve(import.meta.dirname, "../../../supabase/migrations/20260622000000_product_media_pipeline.sql"),
  "utf8",
);

describe("product media migration contract", () => {
  it("keeps ingest private and upload sessions service-only", () => {
    expect(migration).toMatch(/'media-ingest',\r?\n\s*'media-ingest',\r?\n\s*false/);
    expect(migration).toContain("revoke all on media_upload_session from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on media_upload_session to service_role");
  });

  it("publishes only READY public-media metadata", () => {
    expect(migration).toContain("so.media_status_code = 'READY'");
    expect(migration).toContain("so.bucket_name = 'public-media'");
    expect(migration).toContain("media.object_path as image_object_path");
    expect(migration).toContain("hero.object_path as hero_object_path");
  });

  it("prioritizes drop media before immutable template media", () => {
    const dropPriority = migration.indexOf("select 1 as priority");
    const templatePriority = migration.indexOf("select 2 as priority");
    expect(dropPriority).toBeGreaterThan(0);
    expect(templatePriority).toBeGreaterThan(dropPriority);
  });
});
