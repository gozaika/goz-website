import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  createMediaIngestPath,
  createPublicMediaPath,
  PRODUCT_MEDIA_TARGETS,
  safeUploadExtension,
  verifyAndRenderProductMedia,
} from "./product-media";

describe("product media", () => {
  it("uses tenant-scoped random paths and explicit extensions", () => {
    const restaurantPk = "11111111-1111-4111-8111-111111111111";
    expect(createMediaIngestPath(restaurantPk, "image/jpeg")).toMatch(
      /^restaurants\/11111111-1111-4111-8111-111111111111\/pending\/[0-9a-f-]+\.jpg$/,
    );
    expect(createPublicMediaPath(restaurantPk, "RESTAURANT_HERO")).toContain("/profile/hero/");
    expect(() => createPublicMediaPath(restaurantPk, "DROP_PRIMARY")).toThrow("DROP_TARGET_REQUIRED");
    expect(safeUploadExtension("image/webp")).toBe("webp");
  });

  it("decodes bytes and creates the canonical hero rendition", async () => {
    const source = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#d9a45f" },
    })
      .jpeg()
      .toBuffer();
    const rendered = await verifyAndRenderProductMedia(source, "RESTAURANT_HERO");
    expect([rendered.width, rendered.height]).toEqual([
      PRODUCT_MEDIA_TARGETS.RESTAURANT_HERO.width,
      PRODUCT_MEDIA_TARGETS.RESTAURANT_HERO.height,
    ]);
    expect(rendered.sourceMimeType).toBe("image/jpeg");
    expect(rendered.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects undecodable and undersized input", async () => {
    await expect(verifyAndRenderProductMedia(Buffer.from("not an image"), "DROP_PRIMARY")).rejects.toThrow();
    const tiny = await sharp({ create: { width: 100, height: 100, channels: 4, background: "transparent" } })
      .png()
      .toBuffer();
    await expect(verifyAndRenderProductMedia(tiny, "RESTAURANT_LOGO")).rejects.toThrow("IMAGE_DIMENSIONS_TOO_SMALL");
  });
});
