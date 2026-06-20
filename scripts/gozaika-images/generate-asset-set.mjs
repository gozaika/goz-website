#!/usr/bin/env node

import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(
  ROOT,
  "scripts",
  "gozaika-images",
  "asset-replacement-manifest.json",
);
const ARTIFACT_ROOT = path.join(ROOT, ".codex-artifacts", "gozaika-images");
const GENERATION_ROOT = path.join(ARTIFACT_ROOT, "generation");
const WORKING_ROOT = path.join(ARTIFACT_ROOT, "working");
const API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const MAX_REFERENCE_BYTES = 50 * 1024 * 1024;

function parseArgs(argv) {
  const args = {
    phase: "dry-run",
    asset: null,
    group: null,
    priority: null,
    all: false,
    list: false,
    yesPaid: false,
    force: false,
    validateLive: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--phase") args.phase = argv[++index];
    else if (arg === "--asset") args.asset = argv[++index];
    else if (arg === "--group") args.group = argv[++index];
    else if (arg === "--priority") args.priority = Number(argv[++index]);
    else if (arg === "--all") args.all = true;
    else if (arg === "--list") args.list = true;
    else if (arg === "--yes-paid") args.yesPaid = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--validate-live") args.validateLive = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`goZaika manifest-driven asset generator

Usage:
  node scripts/gozaika-images/generate-asset-set.mjs --list
  node scripts/gozaika-images/generate-asset-set.mjs --phase dry-run
  node scripts/gozaika-images/generate-asset-set.mjs --asset restaurant-hero --yes-paid
  node scripts/gozaika-images/generate-asset-set.mjs --group social --yes-paid
  node scripts/gozaika-images/generate-asset-set.mjs --priority 1 --yes-paid
  node scripts/gozaika-images/generate-asset-set.mjs --all --yes-paid

Selection (choose one):
  --asset <id>       Run one manifest asset.
  --group <name>     Run generation-enabled assets in a manifest group.
  --priority <n>     Run generation-enabled assets at one priority.
  --all              Run every generation-enabled asset in priority order.

Safety:
  --phase dry-run    Validate and print the plan without paid calls (default).
  --yes-paid         Required before any image API generation call.
  --validate-live    Validate model access during a dry run.
  --force            Replace existing candidate files intentionally.
`);
}

async function loadDotEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;

  const text = await fs.readFile(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function loadManifest() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  validateManifest(manifest);
  return manifest;
}

function validateManifest(manifest) {
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported manifest schemaVersion: ${manifest.schemaVersion}`);
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    throw new Error("Manifest must define at least one asset.");
  }

  const ids = new Set();
  for (const asset of manifest.assets) {
    if (!asset.id || ids.has(asset.id)) {
      throw new Error(`Missing or duplicate asset id: ${asset.id}`);
    }
    ids.add(asset.id);
    if (!Number.isInteger(asset.priority) || asset.priority < 1) {
      throw new Error(`${asset.id}: priority must be a positive integer.`);
    }
    if (!asset.classification || !asset.group || !asset.generation) {
      throw new Error(`${asset.id}: classification, group and generation are required.`);
    }
    if (asset.generation.enabled) {
      if (asset.generation.mode !== "edit-reference") {
        throw new Error(`${asset.id}: only edit-reference generation is supported.`);
      }
      if (!asset.generation.size || !asset.generation.prompt) {
        throw new Error(`${asset.id}: generated assets require size and prompt.`);
      }
      if (!Number.isInteger(asset.generation.candidateCount) || asset.generation.candidateCount < 1) {
        throw new Error(`${asset.id}: candidateCount must be a positive integer.`);
      }
    }
  }
}

function selectedAssets(manifest, args) {
  let assets = manifest.assets;
  const selectors = [args.asset, args.group, args.priority, args.all].filter(Boolean);
  if (selectors.length > 1) {
    throw new Error("Choose only one of --asset, --group, --priority or --all.");
  }

  if (args.asset) assets = assets.filter((asset) => asset.id === args.asset);
  else if (args.group) assets = assets.filter((asset) => asset.group === args.group);
  else if (args.priority) assets = assets.filter((asset) => asset.priority === args.priority);
  else if (!args.all && args.phase !== "dry-run") {
    throw new Error("Paid execution requires --asset, --group, --priority or --all.");
  }

  if (assets.length === 0) throw new Error("No manifest assets matched the selection.");
  return [...assets].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

function modelFor(manifest) {
  return process.env.GOZAIKA_IMAGE_MODEL || manifest.model;
}

function referencePath(manifest) {
  return path.join(ROOT, manifest.referenceImage);
}

function fullPrompt(manifest, asset) {
  return `${asset.generation.prompt}\n\nSTYLE: ${manifest.styleBlock}\n\nAVOID: ${manifest.globalAvoid}`;
}

async function validateInputs(manifest, assets) {
  const required = [
    manifest.referenceImage,
    manifest.canonicalBrandAssets.logo,
    manifest.canonicalBrandAssets.bamFlameDrop,
  ];

  const missing = [...new Set(required)].filter((relative) => !existsSync(path.join(ROOT, relative)));
  if (missing.length > 0) {
    throw new Error(`Missing manifest inputs:\n${missing.map((item) => `- ${item}`).join("\n")}`);
  }

  const reference = referencePath(manifest);
  const stats = await fs.stat(reference);
  if (!stats.isFile() || stats.size >= MAX_REFERENCE_BYTES) {
    throw new Error("The clean style anchor must be a file smaller than 50MB.");
  }

  for (const asset of assets) {
    for (const currentFile of asset.currentFiles) {
      if (!existsSync(path.join(ROOT, currentFile))) {
        console.warn(`${asset.id}: inventory source already absent: ${currentFile}`);
      }
    }
    for (const activeReference of asset.activeReferences) {
      if (!existsSync(path.join(ROOT, activeReference))) {
        throw new Error(`${asset.id}: active reference does not exist: ${activeReference}`);
      }
    }
  }
}

function planRows(manifest, assets) {
  return assets.map((asset) => ({
    priority: asset.priority,
    id: asset.id,
    group: asset.group,
    classification: asset.classification,
    action: asset.generation.enabled ? "reference generation" : "no paid generation",
    size: asset.generation.size || asset.composition?.size || "n/a",
    calls: asset.generation.enabled ? asset.generation.candidateCount : 0,
    finalOutput: asset.finalOutput || "delete",
  }));
}

async function persistPlan(manifest) {
  await fs.mkdir(path.join(GENERATION_ROOT, "prompts"), { recursive: true });
  await fs.writeFile(
    path.join(GENERATION_ROOT, "asset-replacement-manifest.snapshot.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  for (const asset of manifest.assets.filter((item) => item.generation.enabled)) {
    await fs.writeFile(
      path.join(GENERATION_ROOT, "prompts", `${asset.id}.txt`),
      `${fullPrompt(manifest, asset)}\n`,
      "utf8",
    );
  }
}

async function validateModel(model) {
  const response = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}`, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  });
  if (!response.ok) {
    const body = await safeResponseText(response);
    throw new Error(`Model validation failed for ${model} (${response.status}).\n${body}`);
  }
}

async function safeResponseText(response) {
  const text = await response.text();
  return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
}

async function buildEditForm({ manifest, asset, model }) {
  const imageBytes = await fs.readFile(referencePath(manifest));
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", fullPrompt(manifest, asset));
  form.append("size", asset.generation.size);
  form.append("quality", manifest.quality);
  form.append("output_format", "png");
  form.append("n", "1");
  form.append(
    "image[]",
    new Blob([imageBytes], { type: "image/png" }),
    path.basename(referencePath(manifest)),
  );
  return form;
}

async function validateRequestConstruction(manifest, assets, model) {
  for (const asset of assets.filter((item) => item.generation.enabled)) {
    const form = await buildEditForm({ manifest, asset, model });
    const fields = [...form.keys()];
    const expected = ["model", "prompt", "size", "quality", "output_format", "n", "image[]"];
    if (JSON.stringify(fields) !== JSON.stringify(expected)) {
      throw new Error(`${asset.id}: unexpected multipart fields: ${fields.join(", ")}`);
    }
  }
}

function assetWorkingDir(asset) {
  return path.join(WORKING_ROOT, `${String(asset.priority).padStart(2, "0")}-${asset.id}`);
}

async function generateCandidate({ manifest, asset, model }) {
  const form = await buildEditForm({ manifest, asset, model });
  const response = await fetch(`${API_BASE}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!response.ok) {
    const body = await safeResponseText(response);
    throw new Error(`${asset.id}: image generation failed (${response.status}).\n${body}`);
  }
  return response.json();
}

async function imageBytesFromResult(result) {
  const first = result.data?.[0];
  if (!first) throw new Error("Image response did not include data[0].");
  if (first.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first.url) {
    const response = await fetch(first.url);
    if (!response.ok) throw new Error(`Could not download image URL (${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error("Image response did not include b64_json or url.");
}

async function generateAsset({ manifest, asset, model, force }) {
  if (!asset.generation.enabled) {
    console.log(`skip ${asset.id}: ${asset.generation.reason}`);
    return [];
  }

  const directory = assetWorkingDir(asset);
  await fs.mkdir(directory, { recursive: true });
  const records = [];

  for (let index = 1; index <= asset.generation.candidateCount; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const outputPath = path.join(directory, `${asset.id}-${suffix}.png`);
    const metadataPath = path.join(directory, `${asset.id}-${suffix}.json`);
    if (!force && existsSync(outputPath)) {
      console.log(`skip existing ${path.relative(ROOT, outputPath)}`);
      continue;
    }

    console.log(`generating ${asset.id} candidate ${index}/${asset.generation.candidateCount}...`);
    const startedAt = Date.now();
    const result = await generateCandidate({ manifest, asset, model });
    const record = {
      generatedAt: new Date().toISOString(),
      assetId: asset.id,
      priority: asset.priority,
      model,
      mode: asset.generation.mode,
      referenceImage: manifest.referenceImage,
      size: asset.generation.size,
      outputFile: path.relative(ROOT, outputPath),
      durationMs: Date.now() - startedAt,
      usage: result.usage ?? null,
      revisedPrompt: result.data?.[0]?.revised_prompt ?? null,
    };
    await fs.writeFile(outputPath, await imageBytesFromResult(result));
    await fs.writeFile(metadataPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    records.push(record);
  }

  await writeContactSheet(asset);
  return records;
}

async function writeContactSheet(asset) {
  const directory = assetWorkingDir(asset);
  const images = (await fs.readdir(directory)).filter((file) => file.endsWith(".png")).sort();
  const cards = images
    .map(
      (file) => `<figure><img src="${file}" alt="${file}"><figcaption>${file}</figcaption></figure>`,
    )
    .join("\n");
  const checks = (asset.reviewGate || []).map((item) => `<li>${item}</li>`).join("");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${asset.id} review</title><style>
body{margin:0;padding:28px;background:#fff8f0;color:#2d2d2d;font:15px/1.5 system-ui,sans-serif}
h1{color:#1a5c38}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
figure{margin:0;padding:12px;background:white;border:1px solid #eadfd4;border-radius:16px;box-shadow:0 8px 30px #1a5c3814}
img{display:block;width:100%;height:auto;border-radius:10px}figcaption{padding:10px 2px 2px;font-weight:700}
</style></head><body><h1>${asset.id}</h1><p>${asset.description}</p><h2>Review gate</h2><ul>${checks}</ul><div class="grid">${cards}</div></body></html>`;
  await fs.writeFile(path.join(directory, "contact-sheet.html"), html, "utf8");
}

async function appendUsage(records) {
  if (records.length === 0) return;
  await fs.mkdir(GENERATION_ROOT, { recursive: true });
  await fs.appendFile(
    path.join(GENERATION_ROOT, "api-usage-log.jsonl"),
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    "utf8",
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();
  await loadDotEnvLocal();
  const manifest = await loadManifest();
  const assets = selectedAssets(manifest, args);
  const model = modelFor(manifest);

  if (args.list) {
    console.table(planRows(manifest, manifest.assets));
    return;
  }

  await validateInputs(manifest, assets);
  await persistPlan(manifest);
  await validateRequestConstruction(manifest, assets, model);

  const generationAssets = assets.filter((asset) => asset.generation.enabled);
  const plannedCalls = generationAssets.reduce(
    (total, asset) => total + asset.generation.candidateCount,
    0,
  );
  console.table(planRows(manifest, assets));
  console.log(`Configured model: ${model}`);
  console.log(`Paid calls in this plan: ${plannedCalls}`);

  if (args.phase === "dry-run") {
    if (args.validateLive) {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for live validation.");
      await validateModel(model);
      console.log("Live model validation completed.");
    }
    console.log("Dry run complete. No paid image calls were made.");
    return;
  }

  if (plannedCalls === 0) {
    console.log("Selection contains no paid-generation assets. Use the deterministic compositor stage.");
    return;
  }
  if (!args.yesPaid) throw new Error("Refusing paid generation without --yes-paid.");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for paid generation.");
  await validateModel(model);

  const records = [];
  for (const asset of assets) {
    records.push(...(await generateAsset({ manifest, asset, model, force: args.force })));
  }
  await appendUsage(records);
  console.log(`Generation complete. Review candidates under ${path.relative(ROOT, WORKING_ROOT)}.`);
}

await main();
