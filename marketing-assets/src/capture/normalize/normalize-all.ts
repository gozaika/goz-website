import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

type CliArgs = {
  readonly inDir: string;
  readonly outDir: string;
  readonly width?: number;
  readonly height?: number;
  readonly allowEmpty: boolean;
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

  return {
    inDir: args.get("in-dir") ?? join("marketing-assets", "captures", "raw"),
    outDir: args.get("out-dir") ?? join("marketing-assets", "captures", "normalized"),
    width: args.has("width") ? Number(args.get("width")) : undefined,
    height: args.has("height") ? Number(args.get("height")) : undefined,
    allowEmpty: args.get("allow-empty") === "true",
  };
}

function findSidecars(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findSidecars(path);
    return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
  });
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function normalizeCaptureSidecar(sidecarPath: string, args: Pick<CliArgs, "inDir" | "outDir" | "width" | "height">) {
  const rawMetadata = JSON.parse(readFileSync(sidecarPath, "utf8")) as { file: string; sha256?: string };
  const inputPath = sidecarPath.replace(/\.json$/, ".png");
  const relativePath = relative(args.inDir, inputPath);
  const outputPath = join(args.outDir, relativePath);
  const image = sharp(inputPath);
  const inputMetadata = await image.metadata();

  const normalized = await image
    .resize(args.width, args.height, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const outputMetadata = await sharp(normalized).metadata();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, normalized);

  const normalizedMetadata = {
    schemaVersion: 1,
    sourceSidecar: sidecarPath.replaceAll("\\", "/"),
    sourceFile: rawMetadata.file,
    sourceSha256: rawMetadata.sha256 ?? sha256(readFileSync(inputPath)),
    normalizedFile: outputPath.replaceAll("\\", "/"),
    sha256: sha256(normalized),
    normalizedAt: new Date().toISOString(),
    inputDimensions: { width: inputMetadata.width, height: inputMetadata.height },
    outputDimensions: { width: outputMetadata.width, height: outputMetadata.height },
    crop: { mode: "full-frame", x: 0, y: 0, width: inputMetadata.width, height: inputMetadata.height },
    resize: { mode: args.width || args.height ? "fit-inside" : "passthrough", width: args.width ?? null, height: args.height ?? null },
    protectedRegions: [],
  };

  writeFileSync(outputPath.replace(/\.png$/, ".json"), JSON.stringify(normalizedMetadata, null, 2));
  return normalizedMetadata;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sidecars = findSidecars(args.inDir);
  if (sidecars.length === 0 && !args.allowEmpty) {
    throw new Error(`No raw capture sidecars found in ${args.inDir}. Run npm run assets:capture:web first.`);
  }

  for (const sidecar of sidecars) {
    const metadata = await normalizeCaptureSidecar(sidecar, args);
    console.log(`Normalized ${metadata.normalizedFile}`);
  }
  if (sidecars.length === 0) console.log("No raw captures to normalize.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
