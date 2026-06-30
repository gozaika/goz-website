#!/usr/bin/env node
import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ARTIFACT_ROOT = path.join(ROOT, ".codex-artifacts", "gozaika-images");
const WORKING_ROOT = path.join(ARTIFACT_ROOT, "working");
const GENERATION_ROOT = path.join(ARTIFACT_ROOT, "generation");
const MODEL = process.env.GOZAIKA_IMAGE_MODEL || "gpt-image-2";
const API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const CLEAN_MASTER_ANCHOR = path.join(
  ARTIFACT_ROOT,
  "masters",
  "anchors",
  "master-style-anchor-clean.png",
);
const MAX_REFERENCE_BYTES = 50 * 1024 * 1024;

const MASTER_STYLE_BLOCK = `STYLE: Premium warm editorial illustration-photography hybrid for an Indian
premium food-discovery brand. Dominant warm cream (#FFF8F0) canvas; forest-green
(#1A5C38) depth in the shadows; saffron (#FF6B35) and heritage-gold (#D4A017)
used only as ~10% accents and rim light. Soft directional golden-hour studio
lighting with a gentle gold rim and smooth falloff. Shallow depth of field,
crisp focal subject, generous clean negative space. Materials: eco kraft paper,
tamper-evident seal, matte ceramic, warm brass, fresh herbs, natural wood.
Mood: warm, premium-but-accessible, Indian-contemporary, playful confidence,
mystery and delight. High craft, magazine-quality, tactile, appetising,
trustworthy. No clutter, no neon, no plastic, no greasy food, no stock-photo
cliche. Not cheap, not a clearance/discount aesthetic.

AVOID (negative): real brand logos, real identifiable restaurant dishes, the
words or visuals of discount/sale/%-off/clearance/leftover, plastic packaging,
messy or greasy food, gibberish or misspelled text, busy backgrounds, harsh
flash, watermark, lowres, deformed hands, extra fingers, oversaturation.`;

const ANCHOR_SENTENCE =
  "A single sealed premium kraft-paper goZaika BAM Bag, top folded and closed with a small heritage-gold tamper seal, a kraft tag hanging from it showing a clean QR code and a small 'BEST BEFORE 9:30 PM' label, faint warm steam rising, a subtle saffron flame motif embossed on the bag.";

const P0_SQUARE_PROMPT = `${ANCHOR_SENTENCE}

Create a square hero composition. The bag rests on a warm cream (#FFF8F0) surface with a sprig of fresh curry leaf and a soft brass accent nearby; deep forest-green (#1A5C38) shadow pooling behind. Contents fully concealed: mysterious and premium, never revealing the dishes. Centered with generous negative space around it. Include one subtle BAM flame-drop cue from the brand mark, preferably as an embossed bag mark or tamper-seal mark. Leave the kraft tag clean enough for post-production QR and BEST BEFORE overlay; do not render important final text.

${MASTER_STYLE_BLOCK}`;

const P0_PORTRAIT_PROMPT = `Use the attached clean square master as the definitive style, palette, lighting, material, packaging-construction, and art-direction reference. It is a visual reference, not a canvas to stretch or crop.

Create a NEW dedicated 2:3 vertical portrait hero composition at the requested portrait dimensions. Preserve the reference image's premium sealed kraft BAM Bag construction: top-folded kraft closure, centered heritage-gold tab, hanging blank kraft tag and cord, tactile kraft fibers, warm cream surface, deep forest-green backdrop, soft brass accent, curry leaves, subtle steam, shallow depth of field, and restrained golden studio lighting.

Place the complete bag in the lower-middle with generous uncluttered negative space above and around it. Keep the bag frontal, elegant, fully sealed, and immediately recognizable as the same product family as the reference. Recompose the props naturally for the vertical frame; do not merely extend or distort the square layout. Contents must remain fully concealed.

Leave the gold tab completely blank. Leave the bag face completely blank. Leave the hanging tag completely blank. These three surfaces are reserved for deterministic post-production branding and operational overlays.

Do not render or imitate the goZaika logo, the BAM flame-drop, any brand mark, letters, words, numbers, QR code, label, pseudo-text, decorative emblem, watermark, or signature. Do not introduce a second bag, visible food, restaurant branding, people, hands, plastic packaging, discount cues, clutter, neon colors, or harsh flash.

${MASTER_STYLE_BLOCK}`;

const PLAN = {
  "p0-square": {
    assetId: "p0.hero_bam_bag.square",
    description: "P0 square hero BAM Bag candidates",
    mode: "generate",
    prompt: P0_SQUARE_PROMPT,
    size: "1024x1024",
    count: 6,
    outDir: path.join(WORKING_ROOT, "candidates", "p0-hero", "square"),
  },
  "p0-portrait": {
    assetId: "p0.hero_bam_bag.portrait",
    description: "P0 dedicated portrait hero candidates anchored to the approved clean square master",
    mode: "edit-reference",
    referenceImage: CLEAN_MASTER_ANCHOR,
    prompt: P0_PORTRAIT_PROMPT,
    size: "1024x1536",
    count: 4,
    outDir: path.join(WORKING_ROOT, "candidates", "p0-hero", "portrait"),
  },
};

const REQUIRED_INPUTS = [
  "docs/archived/launch-assets-pre-factory/old-plans/gozaika_image_generation_manifest_v1.md",
  "docs/archived/launch-assets-pre-factory/old-plans/gozaika_image_generation_prompt_pack_v1.md",
  "icons/gozaika-logo.svg",
  "icons/flame.svg",
];

function parseArgs(argv) {
  const args = {
    phase: "dry-run",
    yesPaid: false,
    force: false,
    validateLive: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--phase") args.phase = argv[++i];
    else if (arg === "--yes-paid") args.yesPaid = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--validate-live") args.validateLive = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`goZaika image generation helper

Usage:
  node scripts/gozaika-images/generate-images.mjs --phase dry-run
  node scripts/gozaika-images/generate-images.mjs --phase p0-square --yes-paid
  node scripts/gozaika-images/generate-images.mjs --phase p0-portrait --yes-paid

Options:
  --phase <dry-run|p0-square|p0-portrait>
  --yes-paid        Required for image generation calls.
  --force           Regenerate candidates even if files already exist.
  --validate-live   Validate model availability during dry-run too.

Environment:
  OPENAI_API_KEY       Required for paid phases and --validate-live.
  GOZAIKA_IMAGE_MODEL  Optional. Defaults to ${MODEL}.
`);
}

async function ensureDirs() {
  const dirs = [
    ARTIFACT_ROOT,
    path.join(GENERATION_ROOT, "prompts"),
    path.join(WORKING_ROOT, "contact-sheets"),
  ];
  await Promise.all(dirs.map((dir) => fs.mkdir(dir, { recursive: true })));
}

async function loadDotEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;

  const text = await fs.readFile(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function preflight({ requireKey, validateLive }) {
  const missing = REQUIRED_INPUTS.filter((rel) => !existsSync(path.join(ROOT, rel)));
  if (missing.length > 0) {
    throw new Error(`Missing required input files:\n${missing.map((m) => `- ${m}`).join("\n")}`);
  }

  await validateReferenceInputs();

  if ((requireKey || validateLive) && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required but was not found in the environment or .env.local.");
  }

  if (validateLive) {
    await validateModel();
  }
}

async function validateReferenceInputs() {
  for (const [phase, item] of Object.entries(PLAN)) {
    if (!item.referenceImage) continue;
    if (!existsSync(item.referenceImage)) {
      throw new Error(
        `Missing reference image for ${phase}: ${path.relative(ROOT, item.referenceImage)}`,
      );
    }
    const stats = await fs.stat(item.referenceImage);
    if (!stats.isFile()) {
      throw new Error(
        `Reference input for ${phase} is not a file: ${path.relative(ROOT, item.referenceImage)}`,
      );
    }
    if (stats.size >= MAX_REFERENCE_BYTES) {
      throw new Error(
        `Reference input for ${phase} must be under 50MB: ${path.relative(ROOT, item.referenceImage)}`,
      );
    }
  }
}

async function validateModel() {
  const url = `${API_BASE}/models/${encodeURIComponent(MODEL)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  });

  if (!response.ok) {
    const body = await safeResponseText(response);
    throw new Error(
      `Configured image model "${MODEL}" is not available or could not be validated (${response.status}).\n${body}`,
    );
  }
}

async function safeResponseText(response) {
  const text = await response.text();
  return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
}

async function writePlanFiles() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    apiBase: API_BASE,
    artifactRoot: path.relative(ROOT, ARTIFACT_ROOT),
    pricingNote:
      "GPT-Image-2 pricing is token-based. Use API usage returned by OpenAI/dashboard for exact cost.",
    phases: Object.fromEntries(
      Object.entries(PLAN).map(([phase, item]) => [
        phase,
        {
          assetId: item.assetId,
          description: item.description,
          mode: item.mode,
          referenceImage: item.referenceImage
            ? path.relative(ROOT, item.referenceImage)
            : null,
          size: item.size,
          count: item.count,
          outDir: path.relative(ROOT, item.outDir),
        },
      ]),
    ),
  };

  await fs.writeFile(
    path.join(GENERATION_ROOT, "generation-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  for (const [phase, item] of Object.entries(PLAN)) {
    await fs.writeFile(
      path.join(GENERATION_ROOT, "prompts", `${phase}.txt`),
      item.prompt,
      "utf8",
    );
  }
}

function plannedCallSummary(phases = Object.keys(PLAN)) {
  return phases.map((phase) => {
    const item = PLAN[phase];
    return {
      phase,
      assetId: item.assetId,
      mode: item.mode,
      endpoint: item.referenceImage ? "/v1/images/edits" : "/v1/images/generations",
      reference: item.referenceImage
        ? path.relative(ROOT, item.referenceImage)
        : "none",
      size: item.size,
      calls: item.count,
      outputDir: path.relative(ROOT, item.outDir),
    };
  });
}

async function runDryRun({ validateLive }) {
  await ensureDirs();
  await writePlanFiles();
  await validateRequestConstruction();

  console.log("Dry run complete. No paid image calls were made.");
  console.log(`Model config: ${MODEL}`);
  console.log(`Live model validation: ${validateLive ? "completed" : "skipped"}`);
  console.table(plannedCallSummary());
  console.log(`Artifacts prepared under: ${path.relative(ROOT, ARTIFACT_ROOT)}`);
  console.log("Next paid milestone: npm run image:p0-portrait");
}

async function validateRequestConstruction() {
  for (const [phase, item] of Object.entries(PLAN)) {
    if (!item.referenceImage) continue;
    const form = await buildEditForm({
      prompt: item.prompt,
      size: item.size,
      referenceImage: item.referenceImage,
    });
    const fields = [...form.keys()];
    const expected = ["model", "prompt", "size", "quality", "output_format", "n", "image[]"];
    if (JSON.stringify(fields) !== JSON.stringify(expected)) {
      throw new Error(
        `Unexpected multipart field order for ${phase}: ${fields.join(", ")}`,
      );
    }
    console.log(
      `Validated ${phase} request: POST /v1/images/edits with ${path.relative(ROOT, item.referenceImage)}`,
    );
  }
}

async function generatePhase(phase, { force }) {
  const item = PLAN[phase];
  if (!item) {
    throw new Error(`Unsupported paid phase: ${phase}`);
  }

  await ensureDirs();
  await writePlanFiles();
  await fs.mkdir(item.outDir, { recursive: true });

  const usageLog = [];
  for (let i = 1; i <= item.count; i += 1) {
    const filename = `${phase}-${String(i).padStart(2, "0")}.png`;
    const outPath = path.join(item.outDir, filename);
    const metaPath = outPath.replace(/\.png$/, ".json");

    if (!force && existsSync(outPath)) {
      console.log(`skip existing ${path.relative(ROOT, outPath)}`);
      continue;
    }

    console.log(`generating ${filename} (${item.size})...`);
    const startedAt = Date.now();
    const result = await generateImage({
      prompt: item.prompt,
      size: item.size,
      referenceImage: item.referenceImage,
    });
    const durationMs = Date.now() - startedAt;

    const imageBytes = await imageBytesFromResult(result);
    await fs.writeFile(outPath, imageBytes);

    const metadata = {
      generatedAt: new Date().toISOString(),
      phase,
      assetId: item.assetId,
      model: MODEL,
      mode: item.mode,
      referenceImage: item.referenceImage
        ? path.relative(ROOT, item.referenceImage)
        : null,
      size: item.size,
      outputFile: path.relative(ROOT, outPath),
      durationMs,
      usage: result.usage ?? null,
      revisedPrompt: result.data?.[0]?.revised_prompt ?? null,
    };
    await fs.writeFile(metaPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    usageLog.push(metadata);
  }

  await writeContactSheet(phase);
  await appendUsageLog(phase, usageLog);
  console.log(`Phase complete: ${phase}`);
  console.log(`Review contact sheet: ${path.relative(ROOT, contactSheetPath(phase))}`);
}

async function generateImage({ prompt, size, referenceImage }) {
  if (referenceImage) {
    return editImage({ prompt, size, referenceImage });
  }

  const response = await fetch(`${API_BASE}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size,
      quality: "high",
      output_format: "png",
      n: 1,
    }),
  });

  if (!response.ok) {
    const body = await safeResponseText(response);
    throw new Error(`Image generation failed (${response.status}).\n${body}`);
  }

  return response.json();
}

async function editImage({ prompt, size, referenceImage }) {
  const form = await buildEditForm({ prompt, size, referenceImage });

  const response = await fetch(`${API_BASE}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await safeResponseText(response);
    throw new Error(`Reference-guided image edit failed (${response.status}).\n${body}`);
  }

  return response.json();
}

async function buildEditForm({ prompt, size, referenceImage }) {
  const imageBytes = await fs.readFile(referenceImage);
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("quality", "high");
  form.append("output_format", "png");
  form.append("n", "1");
  form.append(
    "image[]",
    new Blob([imageBytes], { type: "image/png" }),
    path.basename(referenceImage),
  );
  return form;
}

async function imageBytesFromResult(result) {
  const first = result.data?.[0];
  if (!first) {
    throw new Error("Image generation response did not include data[0].");
  }

  if (first.b64_json) {
    return Buffer.from(first.b64_json, "base64");
  }

  if (first.url) {
    const response = await fetch(first.url);
    if (!response.ok) {
      throw new Error(`Could not download generated image URL (${response.status}).`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("Image generation response did not include b64_json or url.");
}

function contactSheetPath(phase) {
  return path.join(WORKING_ROOT, "contact-sheets", `${phase}.html`);
}

async function writeContactSheet(phase) {
  const item = PLAN[phase];
  const files = (await fs.readdir(item.outDir))
    .filter((file) => file.endsWith(".png"))
    .sort();

  const cards = files
    .map((file) => {
      const imgPath = path.relative(path.dirname(contactSheetPath(phase)), path.join(item.outDir, file));
      return `<figure><img src="${toPosix(imgPath)}" alt="${file}"><figcaption>${file}</figcaption></figure>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${phase} contact sheet</title>
  <style>
    body { margin: 24px; font-family: Inter, Arial, sans-serif; background: #fff8f0; color: #2d2d2d; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    p { margin: 0 0 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
    figure { margin: 0; padding: 10px; background: white; border: 1px solid #eadfd3; border-radius: 8px; }
    img { width: 100%; height: auto; display: block; border-radius: 4px; }
    figcaption { font-size: 13px; margin-top: 8px; color: #555; }
  </style>
</head>
<body>
  <h1>${phase} contact sheet</h1>
  <p>${item.description} · ${item.size} · model ${MODEL}</p>
  <div class="grid">
    ${cards || "<p>No generated PNG files found yet.</p>"}
  </div>
</body>
</html>
`;
  await fs.writeFile(contactSheetPath(phase), html, "utf8");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function appendUsageLog(phase, entries) {
  if (entries.length === 0) return;
  const logPath = path.join(GENERATION_ROOT, "api-usage-log.jsonl");
  const lines = entries.map((entry) => JSON.stringify(entry)).join("\n");
  await fs.appendFile(logPath, `${lines}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  await loadDotEnvLocal();

  if (args.phase === "dry-run") {
    await preflight({ requireKey: false, validateLive: args.validateLive });
    await runDryRun({ validateLive: args.validateLive });
    return;
  }

  if (!PLAN[args.phase]) {
    throw new Error(`Unsupported phase "${args.phase}". Use --phase dry-run, p0-square, or p0-portrait.`);
  }

  if (!args.yesPaid) {
    throw new Error(`Refusing paid image calls without --yes-paid. Try:
  npm run image:${args.phase === "p0-square" ? "p0-square" : "p0-portrait"}`);
  }

  await preflight({ requireKey: true, validateLive: true });
  await generatePhase(args.phase, { force: args.force });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
