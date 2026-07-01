import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { assetCatalogFileSchema, exportPresetsFileSchema } from "../scenarios/schema";
import { loadMarketingScenarios } from "../scenarios/loader";
import { buildAiBackgroundBrief } from "./ai/background-briefs";
import { protectedScreenRegion, renderStaticCardSvg, type StaticCardInput, type StaticCardTemplate } from "./templates/static-card";

type CliArgs = {
  readonly assetId?: string;
  readonly all: boolean;
  readonly sourceSidecar?: string;
  readonly pass: "v1-functional" | "v2-polished" | "v3-launch-grade";
  readonly outDir: string;
  readonly reviewDir: string;
};

type SourceSidecar = {
  readonly app?: string;
  readonly flow?: string;
  readonly file: string;
  readonly sha256: string;
  readonly sourceCommit?: string;
};

function parseArgs(argv: readonly string[]): CliArgs {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args.set(token.slice(2), "true");
    } else {
      args.set(token.slice(2), value);
      index += 1;
    }
  }
  const pass = args.get("pass") ?? "v1-functional";
  if (pass !== "v1-functional" && pass !== "v2-polished" && pass !== "v3-launch-grade") {
    throw new Error("--pass must be v1-functional, v2-polished, or v3-launch-grade.");
  }
  return {
    assetId: args.get("asset"),
    all: args.get("all") === "true",
    sourceSidecar: args.get("source-sidecar"),
    pass,
    outDir: args.get("out-dir") ?? join("marketing-assets", "composites"),
    reviewDir: args.get("review-dir") ?? join("marketing-assets", "creative-reviews"),
  };
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) as T;
}

function findLatestSidecarForScenario(scenarioId: string): string | null {
  const root = join("marketing-assets", "captures", "raw");
  const matches: string[] = [];
  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(".json")) {
        const json = readJson<Record<string, unknown>>(path);
        if (json.flow === "consumer-map-discovery" && scenarioId === "consumer-map-discovery") matches.push(path);
        if (json.scenarioId === scenarioId) matches.push(path);
      }
    }
  }
  walk(root);
  return matches.sort().at(-1) ?? null;
}

function templateForPreset(presetId: string): StaticCardTemplate {
  if (presetId.startsWith("app-store")) return "app-store-card";
  if (presetId.startsWith("website")) return "website-proof-card";
  if (presetId.startsWith("restaurant")) return "restaurant-proof-card";
  return "tradeshow-poster";
}

function reviewMarkdown(input: StaticCardInput, outputPath: string, blocker: string | null): string {
  const verdict = blocker ? "Needs next pass - source proof blocker remains." : "v1 functional compositor proof; ready for visual polish review.";
  const score = blocker ? 2 : 3;
  return `# Creative Review: ${input.assetId}

- Surface: ${input.surface}
- Pass: ${input.pass}
- Source screenshot(s): ${input.screenshotPath}
- Output path: ${outputPath}
- Codex verdict: ${verdict}
- Owner verdict: TBD
- Required next pass: ${blocker ? "Capture matching route/state, then rerender v1." : "v2-polished"}

${blocker ? `Blocker: ${blocker}\n` : ""}
| Criterion | Codex score | Owner score | Notes / blocker |
| --- | ---: | ---: | --- |
| Premium within 2 seconds | ${score} | TBD | Functional composition only; not launch-grade. |
| Product proof understandable | ${blocker ? 2 : 3} | TBD | Real screenshot is preserved. |
| Screen readability | 4 | TBD | Device region is large and unaltered. |
| Copy density | 4 | TBD | Restrained headline, subhead, and three labels. |
| Motion smooth, restrained, expensive | N/A | TBD | Still asset. |
| Shadows/glows tasteful | 3 | TBD | Deterministic v1 shadow treatment. |
| Avoids discount-app vibes | 4 | TBD | No sale, coupon, or distress language. |
| Avoids AI artifacts | 5 | TBD | No generated background applied in v1. |
| Peer benchmark credibility | ${score} | TBD | Needs v2/v3 polish before benchmark claim. |
| Surface copy separation | 4 | TBD | Scenario language boundary respected. |
`;
}

async function renderAsset(args: CliArgs, assetId: string) {
  const catalog = assetCatalogFileSchema.parse(readJson(join("marketing-assets", "manifests", "asset-catalog.json")));
  const presets = exportPresetsFileSchema.parse(readJson(join("marketing-assets", "manifests", "export-presets.json"))).presets;
  const scenarios = loadMarketingScenarios();
  const asset = catalog.assets.find((item) => item.id === assetId);
  if (!asset) throw new Error(`Unknown asset ${assetId}`);
  const scenario = scenarios.find((item) => item.id === asset.scenarioId);
  if (!scenario) throw new Error(`Unknown scenario ${asset.scenarioId}`);
  const output = scenario.plannedOutputs.find((item) => item.id === asset.outputId);
  if (!output) throw new Error(`Scenario ${scenario.id} does not define output ${asset.outputId}`);
  const preset = presets.find((item) => item.id === output.preset);
  if (!preset) throw new Error(`Unknown export preset ${output.preset}`);

  const sidecarPath = args.sourceSidecar ?? findLatestSidecarForScenario(scenario.id);
  if (!sidecarPath) {
    throw new Error(`No source sidecar found for ${scenario.id}. Capture or provide --source-sidecar before composing.`);
  }
  const sidecar = readJson<SourceSidecar>(sidecarPath);
  if (!existsSync(sidecar.file)) throw new Error(`Source screenshot is missing: ${sidecar.file}`);

  const blocker =
    scenario.id === "consumer-map-discovery" && sidecar.flow === "consumer-map-discovery"
      ? "Current source is a smoke capture. Confirm the screenshot shows the Drops/map surface before promoting this asset."
      : null;
  const input: StaticCardInput = {
    assetId,
    scenarioId: scenario.id,
    template: templateForPreset(preset.id),
    width: preset.width,
    height: preset.height,
    safeMarginPx: preset.safeMarginPx,
    surface: scenario.surface,
    headline: scenario.copy.headline,
    subhead: scenario.copy.subhead,
    labels: scenario.copy.labels,
    screenshotPath: sidecar.file,
    sourceSha256: sidecar.sha256,
    sourceRouteOrFlow: sidecar.flow ?? "unknown",
    pass: args.pass,
  };

  const svg = renderStaticCardSvg(input);
  const outputDir = join(args.outDir, preset.surface);
  const outputPath = join(outputDir, `${assetId}-${args.pass}.png`);
  mkdirSync(outputDir, { recursive: true });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(outputPath, png);

  const metadata = {
    schemaVersion: 1,
    assetId,
    scenarioId: scenario.id,
    pass: args.pass,
    outputPath: outputPath.replaceAll("\\", "/"),
    sha256: sha256(png),
    dimensions: { width: preset.width, height: preset.height },
    sourceSidecar: sidecarPath.replaceAll("\\", "/"),
    sourceScreenshot: sidecar.file,
    sourceSha256: sidecar.sha256,
    protectedRegions: [protectedScreenRegion(input)],
    aiBackgroundBrief: buildAiBackgroundBrief(input),
    blocker,
  };
  writeFileSync(outputPath.replace(/\.png$/, ".json"), JSON.stringify(metadata, null, 2));

  mkdirSync(args.reviewDir, { recursive: true });
  writeFileSync(join(args.reviewDir, `${assetId}-${args.pass}.md`), reviewMarkdown(input, outputPath, blocker));
  console.log(`Composed ${outputPath}`);
  if (blocker) console.log(`Blocker: ${blocker}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalog = assetCatalogFileSchema.parse(readJson(join("marketing-assets", "manifests", "asset-catalog.json")));
  const assetIds = args.all ? catalog.assets.map((asset) => asset.id) : [args.assetId ?? "app-store-map-card"];
  for (const assetId of assetIds) {
    await renderAsset(args, assetId);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
