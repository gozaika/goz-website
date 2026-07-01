import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateCreativeReviews } from "./validate-creative-reviews";

const hash = "a".repeat(64);

function writeFixture(root: string, pass: "v1-functional" | "v2-polished" | "v3-launch-grade", options?: { blocker?: string | null; ownerVerdict?: string }) {
  const compositeDir = join(root, "marketing-assets", "composites", "app-store");
  const reviewDir = join(root, "marketing-assets", "creative-reviews");
  const manifestDir = join(root, "marketing-assets", "manifests");
  const captureDir = join(root, "marketing-assets", "captures", "curated", "mobile", "consumer-map-discovery");
  mkdirSync(compositeDir, { recursive: true });
  mkdirSync(reviewDir, { recursive: true });
  mkdirSync(manifestDir, { recursive: true });
  mkdirSync(captureDir, { recursive: true });

  const assetId = "app-store-map-card";
  const outputPath = `marketing-assets/composites/app-store/${assetId}-${pass}.png`;
  const sourceSidecar = "marketing-assets/captures/curated/mobile/consumer-map-discovery/source.json";
  const sourceScreenshot = "marketing-assets/captures/curated/mobile/consumer-map-discovery/source.png";
  writeFileSync(join(root, outputPath), "png");
  writeFileSync(join(root, sourceScreenshot), "png");
  writeFileSync(join(root, sourceSidecar), JSON.stringify({ file: sourceScreenshot, sha256: hash }));
  writeFileSync(
    join(manifestDir, "asset-catalog.json"),
    JSON.stringify({ version: 1, assets: [{ id: assetId, scenarioId: "consumer-map-discovery", outputId: assetId, status: "planned", reviewPath: "marketing-assets/creative-review.md" }] }),
  );
  writeFileSync(
    join(compositeDir, `${assetId}-${pass}.json`),
    JSON.stringify(
      {
        schemaVersion: 1,
        assetId,
        scenarioId: "consumer-map-discovery",
        pass,
        outputPath,
        sha256: hash,
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
        blocker: options?.blocker ?? null,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(reviewDir, `${assetId}-${pass}.md`),
    `# Creative Review: ${assetId}

- Surface: customer
- Pass: ${pass}
- Source screenshot(s): ${sourceScreenshot}
- Output path: ${outputPath}
- Codex verdict: ${pass === "v3-launch-grade" ? "Launch-grade by Codex." : "Ready for next pass."}
- Owner verdict: ${options?.ownerVerdict ?? "TBD"}
- Required next pass: ${pass === "v3-launch-grade" ? "None" : "v3-launch-grade"}

${options?.blocker ? `Blocker: ${options.blocker}\n` : ""}
| Criterion | Codex score | Owner score | Notes / blocker |
| --- | ---: | ---: | --- |
| Premium within 2 seconds | 4 | TBD | Polished. |
| Product proof understandable | 4 | TBD | Clear. |
| Screen readability | 4 | TBD | Readable. |
| Copy density | 4 | TBD | Tight. |
| Motion smooth, restrained, expensive | N/A | TBD | Still asset. |
| Shadows/glows tasteful | 4 | TBD | Tasteful. |
| Avoids discount-app vibes | 4 | TBD | Premium. |
| Avoids AI artifacts | 4 | TBD | Clean. |
| Peer benchmark credibility | 4 | TBD | Credible. |
| Surface copy separation | 4 | TBD | Separated. |
`,
  );
}

describe("creative review validation", () => {
  it("accepts a complete v1 review while warning on an open blocker", () => {
    const root = mkdtempSync(join(tmpdir(), "gozaika-review-v1-"));
    writeFixture(root, "v1-functional", { blocker: "Needs matching route proof." });

    const result = validateCreativeReviews(root);

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.checkedReviewCount).toBe(1);
  });

  it("blocks v3 launch-grade when owner acceptance is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "gozaika-review-v3-"));
    writeFixture(root, "v3-launch-grade");

    const result = validateCreativeReviews(root);

    expect(result.errors).toContain("marketing-assets/creative-reviews/app-store-map-card-v3-launch-grade.md: v3-launch-grade requires owner acceptance or waiver.");
  });

  it("accepts v3 launch-grade with owner acceptance and no blockers", () => {
    const root = mkdtempSync(join(tmpdir(), "gozaika-review-v3-ok-"));
    writeFixture(root, "v3-launch-grade", { ownerVerdict: "Accepted by owner." });

    const result = validateCreativeReviews(root);

    expect(result.errors).toHaveLength(0);
  });
});
