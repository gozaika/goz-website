import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { assetCatalogFileSchema, reviewPassSchema } from "../scenarios/schema";

const REVIEW_CRITERIA = [
  "Premium within 2 seconds",
  "Product proof understandable",
  "Screen readability",
  "Copy density",
  "Motion smooth, restrained, expensive",
  "Shadows/glows tasteful",
  "Avoids discount-app vibes",
  "Avoids AI artifacts",
  "Peer benchmark credibility",
  "Surface copy separation",
] as const;

const metadataSchema = z
  .object({
    schemaVersion: z.literal(1),
    assetId: z.string().min(1),
    scenarioId: z.string().min(1),
    pass: reviewPassSchema,
    outputPath: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sourceSidecar: z.string().min(1),
    sourceScreenshot: z.string().min(1),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    protectedRegions: z.array(
      z.object({
        x: z.number().int().nonnegative(),
        y: z.number().int().nonnegative(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
    ),
    aiBackgroundBrief: z.object({
      allowedUse: z.literal("background-only"),
      negativePrompt: z.string().min(1),
      protectedRegions: z.array(z.unknown()).min(1),
      sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    blocker: z.string().nullable().optional(),
  })
  .passthrough();

type CompositeMetadata = z.infer<typeof metadataSchema>;
type ValidationResult = {
  readonly errors: string[];
  readonly warnings: string[];
  readonly checkedReviewCount: number;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) as T;
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function fileExistsFromRoot(root: string, path: string): boolean {
  return existsSync(join(root, path));
}

function walkFiles(dir: string, suffix: string): string[] {
  const matches: string[] = [];
  function walk(current: string) {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(suffix)) matches.push(path);
    }
  }
  walk(dir);
  return matches.sort();
}

function parseFrontMatterLine(markdown: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^- ${escapedLabel}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function parseCriterionRows(markdown: string): Map<string, { codexScore: string; ownerScore: string; notes: string }> {
  const rows = new Map<string, { codexScore: string; ownerScore: string; notes: string }>();
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("| ")) continue;
    if (line.includes("---")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 4 || cells[0] === "Criterion") continue;
    rows.set(cells[0], { codexScore: cells[1], ownerScore: cells[2], notes: cells[3] });
  }
  return rows;
}

function numericScore(score: string): number | null {
  if (score === "N/A") return null;
  const parsed = Number(score);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : Number.NaN;
}

function validateReviewMarkdown(markdown: string, metadata: CompositeMetadata, reviewPath: string): string[] {
  const errors: string[] = [];
  const pass = parseFrontMatterLine(markdown, "Pass");
  const source = parseFrontMatterLine(markdown, "Source screenshot(s)");
  const output = parseFrontMatterLine(markdown, "Output path");
  const verdict = parseFrontMatterLine(markdown, "Codex verdict");
  const ownerVerdict = parseFrontMatterLine(markdown, "Owner verdict");

  if (pass !== metadata.pass) errors.push(`${reviewPath}: pass ${pass ?? "missing"} does not match ${metadata.pass}.`);
  if (!source || normalizePath(source) !== normalizePath(metadata.sourceScreenshot)) {
    errors.push(`${reviewPath}: source screenshot does not match composite metadata.`);
  }
  if (!output || normalizePath(output) !== normalizePath(metadata.outputPath)) {
    errors.push(`${reviewPath}: output path does not match composite metadata.`);
  }
  if (!verdict || verdict === "TBD") errors.push(`${reviewPath}: Codex verdict is required.`);
  if (!ownerVerdict) errors.push(`${reviewPath}: Owner verdict field is required, even when TBD.`);

  const rows = parseCriterionRows(markdown);
  for (const criterion of REVIEW_CRITERIA) {
    const row = rows.get(criterion);
    if (!row) {
      errors.push(`${reviewPath}: missing criterion row "${criterion}".`);
      continue;
    }
    const score = numericScore(row.codexScore);
    if (Number.isNaN(score)) errors.push(`${reviewPath}: invalid Codex score for "${criterion}".`);
    if (row.ownerScore !== "TBD" && Number.isNaN(numericScore(row.ownerScore))) {
      errors.push(`${reviewPath}: invalid owner score for "${criterion}".`);
    }
    if (!row.notes) errors.push(`${reviewPath}: notes are required for "${criterion}".`);
  }

  return errors;
}

function validatePromotionRules(metadata: CompositeMetadata, markdown: string, reviewPath: string): string[] {
  const errors: string[] = [];
  const rows = parseCriterionRows(markdown);
  const codexScores = REVIEW_CRITERIA.map((criterion) => numericScore(rows.get(criterion)?.codexScore ?? ""));
  const numericScores = codexScores.filter((score): score is number => score !== null && !Number.isNaN(score));
  const hasBlocker = Boolean(metadata.blocker) || /^Blocker:/m.test(markdown);

  if (metadata.pass === "v2-polished") {
    const average = numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length;
    if (hasBlocker) errors.push(`${reviewPath}: v2-polished cannot carry an open blocker.`);
    if (numericScores.some((score) => score < 3)) errors.push(`${reviewPath}: v2-polished cannot have a score below 3.`);
    if (average < 4) errors.push(`${reviewPath}: v2-polished average score must be at least 4.`);
  }

  if (metadata.pass === "v3-launch-grade") {
    const ownerVerdict = parseFrontMatterLine(markdown, "Owner verdict");
    if (hasBlocker) errors.push(`${reviewPath}: v3-launch-grade cannot carry an open blocker.`);
    if (numericScores.some((score) => score < 4)) errors.push(`${reviewPath}: v3-launch-grade requires every Codex score to be 4 or 5.`);
    if (!ownerVerdict || ownerVerdict === "TBD") errors.push(`${reviewPath}: v3-launch-grade requires owner acceptance or waiver.`);
  }

  return errors;
}

export function validateCreativeReviews(root = process.cwd()): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const catalog = assetCatalogFileSchema.parse(readJson(join(root, "marketing-assets", "manifests", "asset-catalog.json")));
  const metadataPaths = walkFiles(join(root, "marketing-assets", "composites"), ".json");

  for (const metadataPath of metadataPaths) {
    const relativeMetadataPath = normalizePath(relative(root, metadataPath));
    const metadata = metadataSchema.parse(readJson(metadataPath));
    const expectedReviewPath = join(root, "marketing-assets", "creative-reviews", `${metadata.assetId}-${metadata.pass}.md`);
    const relativeReviewPath = normalizePath(relative(root, expectedReviewPath));

    if (!fileExistsFromRoot(root, metadata.outputPath)) errors.push(`${relativeMetadataPath}: output PNG is missing.`);
    if (!fileExistsFromRoot(root, metadata.sourceSidecar)) errors.push(`${relativeMetadataPath}: source sidecar is missing.`);
    if (!fileExistsFromRoot(root, metadata.sourceScreenshot)) errors.push(`${relativeMetadataPath}: source screenshot is missing.`);
    if (metadata.aiBackgroundBrief.sourceSha256 !== metadata.sourceSha256) {
      errors.push(`${relativeMetadataPath}: AI background brief source hash must match source screenshot hash.`);
    }
    if (!existsSync(expectedReviewPath)) {
      errors.push(`${relativeMetadataPath}: missing review ${relativeReviewPath}.`);
      continue;
    }

    const markdown = readFileSync(expectedReviewPath, "utf8");
    errors.push(...validateReviewMarkdown(markdown, metadata, relativeReviewPath));
    errors.push(...validatePromotionRules(metadata, markdown, relativeReviewPath));
    if (metadata.blocker) warnings.push(`${relativeReviewPath}: open blocker recorded: ${metadata.blocker}`);
  }

  for (const asset of catalog.assets) {
    if (asset.status === "planned") continue;
    const expectedMetadata = metadataPaths.find((path) => {
      const metadata = metadataSchema.parse(readJson(path));
      return metadata.assetId === asset.id && metadata.pass === asset.status;
    });
    if (!expectedMetadata) errors.push(`asset-catalog.json: ${asset.id} is ${asset.status} but has no matching composite metadata.`);
  }

  return { errors, warnings, checkedReviewCount: metadataPaths.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateCreativeReviews();
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log(`Creative review validation passed (${result.checkedReviewCount} composite metadata file(s)).`);
  }
}
