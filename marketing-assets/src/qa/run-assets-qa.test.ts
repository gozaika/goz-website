import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { runAssetsQa } from "./run-assets-qa";

const hash = "b".repeat(64);

async function writeQaFixture(root: string) {
  const compositeDir = join(root, "marketing-assets", "composites", "app-store");
  const reviewDir = join(root, "marketing-assets", "creative-reviews");
  const manifestDir = join(root, "marketing-assets", "manifests");
  const captureDir = join(root, "marketing-assets", "captures", "curated", "mobile", "consumer-map-discovery");
  mkdirSync(compositeDir, { recursive: true });
  mkdirSync(reviewDir, { recursive: true });
  mkdirSync(manifestDir, { recursive: true });
  mkdirSync(captureDir, { recursive: true });

  const assetId = "app-store-map-card";
  const pass = "v1-functional";
  const outputPath = `marketing-assets/composites/app-store/${assetId}-${pass}.png`;
  const sourceSidecar = "marketing-assets/captures/curated/mobile/consumer-map-discovery/source.json";
  const sourceScreenshot = "marketing-assets/captures/curated/mobile/consumer-map-discovery/source.png";

  await sharp({ create: { width: 24, height: 24, channels: 4, background: "#ffffff" } }).png().toFile(join(root, sourceScreenshot));
  await sharp({ create: { width: 1290, height: 2796, channels: 4, background: "#ffffff" } }).png().toFile(join(root, outputPath));
  writeFileSync(join(root, sourceSidecar), JSON.stringify({ file: sourceScreenshot, sha256: hash }));
  writeFileSync(
    join(manifestDir, "asset-catalog.json"),
    JSON.stringify({
      version: 1,
      assets: [{ id: assetId, scenarioId: "consumer-map-discovery", outputId: assetId, status: pass, reviewPath: `marketing-assets/creative-reviews/${assetId}-${pass}.md` }],
    }),
  );
  writeFileSync(
    join(compositeDir, `${assetId}-${pass}.json`),
    JSON.stringify({
      schemaVersion: 1,
      assetId,
      scenarioId: "consumer-map-discovery",
      pass,
      outputPath,
      sha256: hash,
      dimensions: { width: 1290, height: 2796 },
      sourceSidecar,
      sourceScreenshot,
      sourceSha256: hash,
      protectedRegions: [{ x: 1, y: 1, width: 10, height: 10 }],
      aiBackgroundBrief: {
        allowedUse: "background-only",
        negativePrompt: "no generated UI",
        protectedRegions: [{ x: 1, y: 1, width: 10, height: 10 }],
        sourceSha256: hash,
      },
      blocker: null,
    }),
  );
  writeFileSync(
    join(reviewDir, `${assetId}-${pass}.md`),
    `# Creative Review: ${assetId}

- Surface: customer
- Pass: ${pass}
- Source screenshot(s): ${sourceScreenshot}
- Output path: ${outputPath}
- Codex verdict: Ready for visual polish review.
- Owner verdict: TBD
- Required next pass: v2-polished

| Criterion | Codex score | Owner score | Notes / blocker |
| --- | ---: | ---: | --- |
| Premium within 2 seconds | 3 | TBD | Functional. |
| Product proof understandable | 3 | TBD | Clear. |
| Screen readability | 4 | TBD | Readable. |
| Copy density | 4 | TBD | Tight. |
| Motion smooth, restrained, expensive | N/A | TBD | Still asset. |
| Shadows/glows tasteful | 3 | TBD | Functional. |
| Avoids discount-app vibes | 4 | TBD | Premium. |
| Avoids AI artifacts | 5 | TBD | None. |
| Peer benchmark credibility | 3 | TBD | Needs polish. |
| Surface copy separation | 4 | TBD | Separated. |
`,
  );
}

describe("asset QA runner", () => {
  it("writes a passing QA report for a traced composite", async () => {
    const root = mkdtempSync(join(tmpdir(), "gozaika-assets-qa-"));
    await writeQaFixture(root);

    const result = await runAssetsQa(root);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.reportPath).toBe("marketing-assets/qa-reports/latest.md");
  });
});
