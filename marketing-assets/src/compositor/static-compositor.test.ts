import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildAiBackgroundBrief } from "./ai/background-briefs";
import { protectedScreenRegion, renderStaticCardSvg, type StaticCardInput } from "./templates/static-card";

describe("static compositor", () => {
  it("renders an SVG card with protected screenshot region", async () => {
    const root = mkdtempSync(join(tmpdir(), "gozaika-static-"));
    const screenshotPath = join(root, "screen.png");
    await sharp({
      create: { width: 108, height: 240, channels: 4, background: "#ffffff" },
    })
      .png()
      .toFile(screenshotPath);
    const input: StaticCardInput = {
      assetId: "test-card",
      scenarioId: "consumer-map-discovery",
      template: "app-store-card",
      width: 1290,
      height: 2796,
      safeMarginPx: 96,
      surface: "customer",
      headline: "Find pickup drops nearby",
      subhead: "Real app proof.",
      labels: ["Nearby", "Pickup"],
      screenshotPath,
      sourceSha256: "a".repeat(64),
      sourceRouteOrFlow: "consumer-map-discovery",
      pass: "v1-functional",
    };
    const svg = renderStaticCardSvg(input);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const metadata = await sharp(png).metadata();

    expect(metadata.width).toBe(1290);
    expect(metadata.height).toBe(2796);
    expect(svg).toContain("data:image/png;base64");
    expect(protectedScreenRegion(input).width).toBeGreaterThan(600);
    expect(existsSync(screenshotPath)).toBe(true);
  }, 15000);

  it("creates a background-only AI brief with UI protection", async () => {
    const root = mkdtempSync(join(tmpdir(), "gozaika-ai-"));
    const screenshotPath = join(root, "screen.png");
    await sharp({
      create: { width: 108, height: 240, channels: 4, background: "#ffffff" },
    })
      .png()
      .toFile(screenshotPath);
    const input: StaticCardInput = {
      assetId: "test-card",
      scenarioId: "consumer-map-discovery",
      template: "app-store-card",
      width: 1290,
      height: 2796,
      safeMarginPx: 96,
      surface: "customer",
      headline: "Find pickup drops nearby",
      labels: [],
      screenshotPath,
      sourceSha256: readFileSync(screenshotPath).toString("hex").slice(0, 64),
      sourceRouteOrFlow: "consumer-map-discovery",
      pass: "v1-functional",
    };
    const brief = buildAiBackgroundBrief(input);
    expect(brief.allowedUse).toBe("background-only");
    expect(brief.negativePrompt).toContain("no QR codes");
    expect(brief.protectedRegions).toHaveLength(1);
  });
});
