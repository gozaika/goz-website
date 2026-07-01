import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { z } from "zod";
import { validateCreativeReviews } from "../review/validate-creative-reviews";

const metadataSchema = z
  .object({
    schemaVersion: z.literal(1),
    assetId: z.string().min(1),
    scenarioId: z.string().min(1),
    pass: z.enum(["v1-functional", "v2-polished", "v3-launch-grade"]),
    outputPath: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    dimensions: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    sourceSidecar: z.string().min(1),
    sourceScreenshot: z.string().min(1),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    protectedRegions: z.array(z.unknown()).min(1),
    blocker: z.string().nullable().optional(),
  })
  .passthrough();

type QaRow = {
  readonly assetId: string;
  readonly pass: string;
  readonly outputPath: string;
  readonly status: "pass" | "fail";
  readonly notes: readonly string[];
};

type QaResult = {
  readonly rows: readonly QaRow[];
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly reportPath: string;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) as T;
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
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

function markdownEscape(value: string): string {
  return value.replaceAll("|", "\\|");
}

function buildReport(result: Omit<QaResult, "reportPath">): string {
  const generatedAt = new Date().toISOString();
  const lines = [
    "# Marketing Asset QA Report",
    "",
    `Generated: ${generatedAt}`,
    "",
    `Status: ${result.errors.length === 0 ? "PASS" : "FAIL"}`,
    "",
    "| Asset | Pass | Output | Status | Notes |",
    "| --- | --- | --- | --- | --- |",
    ...result.rows.map((row) =>
      `| ${[
        markdownEscape(row.assetId),
        markdownEscape(row.pass),
        `\`${normalizePath(row.outputPath)}\``,
        row.status.toUpperCase(),
        markdownEscape(row.notes.join("; ")),
      ].join(" | ")} |`,
    ),
    "",
    "## Warnings",
    "",
    ...(result.warnings.length ? result.warnings.map((warning) => `- ${warning}`) : ["- None"]),
    "",
    "## Errors",
    "",
    ...(result.errors.length ? result.errors.map((error) => `- ${error}`) : ["- None"]),
    "",
  ];
  return lines.join("\n");
}

export async function runAssetsQa(root = process.cwd(), reportPath = join("marketing-assets", "qa-reports", "latest.md")): Promise<QaResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: QaRow[] = [];
  const metadataPaths = walkFiles(join(root, "marketing-assets", "composites"), ".json");

  for (const metadataPath of metadataPaths) {
    const metadata = metadataSchema.parse(readJson(metadataPath));
    const notes: string[] = [];
    const outputAbs = join(root, metadata.outputPath);
    const sourceSidecarAbs = join(root, metadata.sourceSidecar);
    const sourceScreenshotAbs = join(root, metadata.sourceScreenshot);

    if (!existsSync(outputAbs)) {
      notes.push("missing output PNG");
      errors.push(`${metadata.outputPath}: output PNG is missing.`);
    } else {
      const image = await sharp(outputAbs).metadata();
      if (image.width !== metadata.dimensions.width || image.height !== metadata.dimensions.height) {
        notes.push(`dimension mismatch ${image.width}x${image.height}`);
        errors.push(`${metadata.outputPath}: dimensions do not match metadata.`);
      } else {
        notes.push(`${image.width}x${image.height}`);
      }
      const bytes = statSync(outputAbs).size;
      if (bytes < 10_000) {
        notes.push("file unexpectedly small");
        errors.push(`${metadata.outputPath}: file is unexpectedly small.`);
      }
      if (bytes > 12_000_000) {
        notes.push("file over 12MB");
        warnings.push(`${metadata.outputPath}: file is over 12MB.`);
      }
    }

    if (!existsSync(sourceSidecarAbs)) {
      notes.push("missing source sidecar");
      errors.push(`${metadata.outputPath}: source sidecar is missing.`);
    }
    if (!existsSync(sourceScreenshotAbs)) {
      notes.push("missing source screenshot");
      errors.push(`${metadata.outputPath}: source screenshot is missing.`);
    }
    if (metadata.blocker) {
      notes.push(`blocker: ${metadata.blocker}`);
      warnings.push(`${metadata.outputPath}: open blocker recorded.`);
    }
    if (metadata.pass === "v3-launch-grade" && metadata.blocker) {
      errors.push(`${metadata.outputPath}: launch-grade output cannot carry a blocker.`);
    }

    rows.push({
      assetId: metadata.assetId,
      pass: metadata.pass,
      outputPath: relative(root, outputAbs),
      status: notes.some((note) => note.includes("missing") || note.includes("mismatch") || note.includes("small")) ? "fail" : "pass",
      notes,
    });
  }

  const reviewResult = validateCreativeReviews(root);
  errors.push(...reviewResult.errors);
  warnings.push(...reviewResult.warnings);

  const resolvedReportPath = join(root, reportPath);
  const report = buildReport({ rows, errors, warnings });
  mkdirSync(dirname(resolvedReportPath), { recursive: true });
  writeFileSync(resolvedReportPath, report);

  return {
    rows,
    errors,
    warnings,
    reportPath: normalizePath(relative(root, resolvedReportPath)),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const reportArgIndex = process.argv.indexOf("--report");
  const reportPath = reportArgIndex >= 0 ? process.argv[reportArgIndex + 1] : undefined;
  runAssetsQa(process.cwd(), reportPath).then((result) => {
    console.log(`Asset QA report written to ${result.reportPath}`);
    if (result.errors.length > 0) {
      for (const error of result.errors) console.error(error);
      process.exitCode = 1;
    } else {
      console.log(`Asset QA passed (${result.rows.length} composite metadata file(s)).`);
    }
  });
}
