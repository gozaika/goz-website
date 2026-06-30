// capture-all.mjs — single entry point for the marketing video capture package.
// Validates tooling, (optionally) seeds deterministic demo data, runs the web (Playwright)
// captures, prints the documented Maestro commands for the native (mobile) captures, and
// regenerates the manifest. Fails fast with actionable messages.
//
//   npm run video:capture:marketing -- --all
//   npm run video:capture:marketing -- --video restaurant-management
//   npm run video:capture:marketing -- --all --skip-seed
//   npm run video:capture:marketing -- --web-only        # skip the Maestro instructions
//
// Web (C/D) captures run here end-to-end. Native (A/B) captures need a device + screen
// recording, so this prints the exact `maestro record` / `maestro test` commands instead of
// driving the emulator blindly. Drop the resulting .mp4s into raw/<videoId>/ and re-run the
// manifest generator (this script does that automatically at the end).

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const videoArg = (() => { const i = args.indexOf("--video"); return i >= 0 ? args[i + 1] : null; })();

const WEB_VIDEOS = new Set(["restaurant-onboarding", "restaurant-management"]);
const NATIVE_VIDEOS = new Set(["customer-day-in-life", "restaurant-counter", "restaurant-onboarding"]);

const MAESTRO_CMDS = [
  ["customer-day-in-life", "apps/consumer-mobile/.maestro/marketing-customer-day-in-life.yaml", "consumer-mobile"],
  ["restaurant-counter", "apps/restaurant-mobile/.maestro/marketing-restaurant-counter.yaml", "restaurant-mobile"],
  ["restaurant-onboarding", "apps/restaurant-mobile/.maestro/marketing-restaurant-onboarding.yaml", "restaurant-mobile (supplemental b-roll)"],
];

function run(cmd, cmdArgs, opts = {}) {
  return spawnSync(cmd, cmdArgs, { cwd: repo, stdio: "inherit", shell: process.platform === "win32", ...opts });
}

function step(msg) { console.log(`\n=== ${msg} ===`); }

function checkTooling() {
  step("Validating tooling");
  const node = process.versions.node;
  console.log(`  node ${node}`);
  const tsx = run("npx", ["tsx", "--version"], { stdio: "pipe" });
  if (tsx.status !== 0) { console.error("  ✗ tsx not available (needed to run capture specs)."); process.exit(1); }
  console.log(`  tsx ${(tsx.stdout || "").toString().trim() || "ok"}`);
  const docker = spawnSync("docker", ["ps", "--filter", "name=supabase_db", "--format", "{{.Names}}"], { encoding: "utf8" });
  const container = (docker.stdout || "").trim().split("\n").filter(Boolean)[0];
  if (!container) console.warn("  ⚠ no local supabase_db_* container detected — seeding + servers will fail until `npx supabase start`.");
  else console.log(`  supabase db: ${container}`);
}

function seed() {
  if (has("--skip-seed")) { console.log("  (skipped: --skip-seed)"); return; }
  step("Seeding deterministic marketing demo data");
  const r = run("npx", ["tsx", "scripts/demo/seed-marketing-video-data.ts"]);
  if (r.status !== 0) { console.error("  ✗ seed failed. Cold start? run `npx supabase db reset` then retry."); process.exit(1); }
}

function validateCaptions() {
  step("Validating caption JSON (brand rules)");
  const r = run("node", ["scripts/marketing-video-capture/validate-captions.mjs"]);
  if (r.status !== 0) process.exit(1);
}

function webCaptures() {
  const which = videoArg && !WEB_VIDEOS.has(videoArg) ? [] : (videoArg ? [videoArg] : [...WEB_VIDEOS]);
  if (which.length === 0) return;
  step(`Web (Playwright) captures: ${which.join(", ")}`);
  const r = run("node", ["scripts/marketing-video-capture/capture-playwright.mjs", ...(videoArg ? ["--video", videoArg] : ["--all"])]);
  if (r.status !== 0) console.warn("  ⚠ one or more web captures failed (see above). Continuing so the manifest still updates.");
}

function nativeInstructions() {
  if (has("--web-only")) return;
  step("Native (Maestro) captures — run on the connected device/emulator");
  console.log("  JAVA_HOME must point at a JDK (e.g. Android Studio's jbr). Seed first (done above).");
  console.log("  Per flow: `maestro test …` verifies + writes per-scene PNGs; `maestro record …` writes the raw .mp4.\n");
  for (const [videoId, flow, app] of MAESTRO_CMDS) {
    if (videoArg && videoArg !== videoId) continue;
    const out = `.codex-artifacts/gozaika-marketing-videos/raw/${videoId}/${videoId === "restaurant-onboarding" ? "restaurant-onboarding-mobile" : videoId}.mp4`;
    console.log(`  # ${videoId} (${app})`);
    console.log(`  maestro test ${flow}`);
    console.log(`  maestro record ${flow} ${out}\n`);
  }
  console.log("  After recording, drop the .mp4s into raw/<videoId>/ — the manifest step below ingests them.");
}

function manifest() {
  step("Regenerating manifest.json");
  run("node", ["scripts/marketing-video-capture/generate-manifest.mjs"]);
}

function main() {
  if (!has("--all") && !videoArg) {
    console.log("Usage: capture-all.mjs --all | --video <id> [--skip-seed] [--web-only]");
    console.log("Videos: customer-day-in-life, restaurant-counter, restaurant-onboarding, restaurant-management");
  }
  checkTooling();
  validateCaptions();
  seed();
  webCaptures();
  nativeInstructions();
  manifest();
  console.log("\n✓ capture-all complete. Inspect screenshots/ + manifest.json, then hand off for ffmpeg polish.");
}

main();
