import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizeCaptureSidecar } from "./normalize-all";

describe("capture normalization", () => {
  it("normalizes a raw screenshot and writes traceable metadata", async () => {
    const root = mkdtempSync(join(tmpdir(), "gozaika-capture-"));
    const rawDir = join(root, "raw");
    const outDir = join(root, "normalized");
    const pngPath = join(rawDir, "consumer-map-discovery", "web-drops-map-desktop-wide.png");
    const sidecarPath = pngPath.replace(/\.png$/, ".json");
    const image = await sharp({
      create: {
        width: 20,
        height: 10,
        channels: 4,
        background: "#ffffff",
      },
    })
      .png()
      .toBuffer();

    mkdirSync(join(rawDir, "consumer-map-discovery"), { recursive: true });
    await sharp(image).toFile(pngPath);
    writeFileSync(
      sidecarPath,
      JSON.stringify({
        file: pngPath.replaceAll("\\", "/"),
        sha256: "raw-hash",
      }),
    );

    const result = await normalizeCaptureSidecar(sidecarPath, { inDir: rawDir, outDir, width: 10 });
    expect(result.sourceSha256).toBe("raw-hash");
    expect(result.outputDimensions.width).toBe(10);
    expect(result.outputDimensions.height).toBe(5);
    expect(readFileSync(join(outDir, "consumer-map-discovery", "web-drops-map-desktop-wide.json"), "utf8")).toContain(
      "normalizedFile",
    );
  });
});
