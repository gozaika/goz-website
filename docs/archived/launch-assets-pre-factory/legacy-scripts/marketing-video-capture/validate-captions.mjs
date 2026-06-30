// validate-captions.mjs — validate the four marketing caption JSON files against the
// §4 contract + brand rules. Pure (no DB, no servers). Exit non-zero on any failure.
//
//   node scripts/marketing-video-capture/validate-captions.mjs

import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CAPTIONS_DIR = resolve(repo, ".codex-artifacts/gozaika-marketing-videos/captions");
const EXPECTED = ["customer-day-in-life", "restaurant-counter", "restaurant-onboarding", "restaurant-management"];

const errors = [];
const seenClipIds = new Set();
const seenSceneIds = new Set();

function fail(file, msg) {
  errors.push(`${file}: ${msg}`);
}

const files = readdirSync(CAPTIONS_DIR).filter((f) => f.endsWith(".json"));
for (const id of EXPECTED) {
  if (!files.includes(`${id}.json`)) fail(`${id}.json`, "missing caption file");
}

for (const file of files) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(resolve(CAPTIONS_DIR, file), "utf8"));
  } catch (e) {
    fail(file, `invalid JSON: ${e.message}`);
    continue;
  }

  for (const key of ["videoId", "title", "primaryAudience", "defaultAspectRatios", "brandRules", "scenes"]) {
    if (!(key in doc)) fail(file, `missing top-level key "${key}"`);
  }
  if (doc.videoId && `${doc.videoId}.json` !== file) fail(file, `videoId "${doc.videoId}" does not match filename`);

  const rules = doc.brandRules ?? {};
  const forbidden = (rules.forbiddenWords ?? []).map((w) => w.toLowerCase());
  if (rules.brandName && rules.brandName !== "goZaika") fail(file, `brandName must be "goZaika", got "${rules.brandName}"`);

  if (!Array.isArray(doc.scenes) || doc.scenes.length === 0) {
    fail(file, "scenes must be a non-empty array");
    continue;
  }

  for (const scene of doc.scenes) {
    for (const key of ["sceneId", "clipId", "source", "app", "routeOrScreen", "durationTargetSec", "caption"]) {
      if (!(key in scene)) fail(file, `scene missing "${key}" (${scene.sceneId ?? "?"})`);
    }
    if (scene.sceneId) {
      if (seenSceneIds.has(scene.sceneId)) fail(file, `duplicate sceneId "${scene.sceneId}"`);
      seenSceneIds.add(scene.sceneId);
    }
    if (scene.clipId) {
      if (seenClipIds.has(scene.clipId)) fail(file, `duplicate clipId "${scene.clipId}"`);
      seenClipIds.add(scene.clipId);
    }
    if (scene.source && !["maestro", "playwright"].includes(scene.source)) {
      fail(file, `scene ${scene.sceneId} has unknown source "${scene.source}"`);
    }
    const text = scene.caption?.text ?? "";
    if (!text) fail(file, `scene ${scene.sceneId} caption.text is empty`);
    // Brand rule: forbidden words must not appear (whole-word, case-insensitive).
    for (const word of forbidden) {
      const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(text)) fail(file, `scene ${scene.sceneId} caption uses forbidden word "${word}"`);
    }
    // Brand capitalization: any "gozaika" token must be exactly "goZaika".
    for (const m of text.match(/gozaika/gi) ?? []) {
      if (m !== "goZaika") fail(file, `scene ${scene.sceneId} caption uses "${m}" — must be "goZaika"`);
    }
    // Keep overlay copy short for mobile.
    if (text.length > 90) fail(file, `scene ${scene.sceneId} caption is ${text.length} chars (>90; too long for mobile overlay)`);
  }
}

if (errors.length) {
  console.error(`✗ caption validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ captions valid: ${files.length} files, ${seenSceneIds.size} scenes, ${seenClipIds.size} clips, brand rules OK`);
