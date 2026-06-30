// validate-store-assets.mjs — code-side store-asset validator for goZaika mobile.
//
// Checks the raw store package against the launch-readiness plan (§5/§6) without needing
// any cloud/store access. Safe to run any time.
//
//   node scripts/store-launch/validate-store-assets.mjs --all
//   node scripts/store-launch/validate-store-assets.mjs --app gozaika
//   node scripts/store-launch/validate-store-assets.mjs --app gozaika-partner
//
// Exit code: non-zero if any HARD check fails. Warnings (aspect ratio, coverage, banned
// words) are reported but do not fail the run unless --strict is passed.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT = resolve(repo, ".codex-artifacts/archive/launch-assets-pre-factory/gozaika-store-launch");
const RAW = join(ROOT, "screenshots/raw");

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const apps =
  args.includes("--all") || !args.includes("--app")
    ? ["gozaika", "gozaika-partner"]
    : [args[args.indexOf("--app") + 1]];

// Plan §5 banned + plan-wide forbidden words (superset of the mobile-gate list).
const BANNED = /leftover|surplus|\bcheap\b|\bstale\b|clearance|liquidation|food rescue|bargain bin|discount/i;

// Google Play: each side 320..3840 (we want >=1080 masters), max side-ratio 2:1.
const MIN_SIDE = 1080;
const MAX_SIDE = 3840;
const MAX_RATIO = 2.0;

let hard = 0;
let warn = 0;
const log = (s) => process.stdout.write(s + "\n");
const fail = (s) => {
  hard++;
  log("  ✗ " + s);
};
const warning = (s) => {
  warn++;
  log("  ⚠ " + s);
};
const ok = (s) => log("  ✓ " + s);

function pngInfo(file) {
  const b = readFileSync(file);
  if (b.slice(1, 4).toString() !== "PNG") return null;
  const colorTypes = { 0: "gray", 2: "RGB", 3: "palette", 4: "gray+alpha", 6: "RGBA" };
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    colorType: colorTypes[b[25]] ?? String(b[25]),
    hasAlpha: b[25] === 6 || b[25] === 4,
  };
}

// ── Icons (source masters) ──────────────────────────────────────────────────
log("\n▶ App icon masters");
const iconApp = { gozaika: "consumer-mobile", "gozaika-partner": "restaurant-mobile" };
for (const app of apps) {
  const icon = join(repo, "apps", iconApp[app], "assets/icon.png");
  if (!existsSync(icon)) {
    fail(`${app}: missing apps/${iconApp[app]}/assets/icon.png`);
    continue;
  }
  const info = pngInfo(icon);
  if (info.width < 1024 || info.height < 1024)
    fail(`${app}: icon master ${info.width}x${info.height} < 1024 (need >=1024 for Apple export)`);
  else ok(`${app}: icon master ${info.width}x${info.height} ${info.colorType}`);
  if (info.hasAlpha)
    warning(`${app}: icon.png has alpha — Apple 1024 marketing icon must be flattened opaque (caveat I1/B6)`);
}

// ── Screenshots ─────────────────────────────────────────────────────────────
const PLANNED = {
  gozaika: 8,
  "gozaika-partner": 8,
};
for (const app of apps) {
  log(`\n▶ Screenshots — ${app}`);
  const dir = join(RAW, app);
  if (!existsSync(dir)) {
    fail(`${app}: missing ${dir}`);
    continue;
  }
  const pngs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));
  if (pngs.length === 0) fail(`${app}: no screenshots`);
  for (const f of pngs) {
    const info = pngInfo(join(dir, f));
    if (!info) {
      fail(`${app}/${f}: not a PNG`);
      continue;
    }
    const minSide = Math.min(info.width, info.height);
    const maxSide = Math.max(info.width, info.height);
    const ratio = maxSide / minSide;
    const problems = [];
    if (minSide < MIN_SIDE) problems.push(`min side ${minSide} < ${MIN_SIDE}`);
    if (maxSide > MAX_SIDE) problems.push(`max side ${maxSide} > ${MAX_SIDE}`);
    if (problems.length) fail(`${app}/${f} (${info.width}x${info.height}): ${problems.join(", ")}`);
    else if (ratio > MAX_RATIO)
      warning(
        `${app}/${f} (${info.width}x${info.height}): ratio ${ratio.toFixed(2)} > ${MAX_RATIO}:1 — crop/pad to 9:16 for Play (caveat C2)`,
      );
    else ok(`${app}/${f} ${info.width}x${info.height}`);
  }
  if (pngs.length < PLANNED[app])
    warning(`${app}: ${pngs.length}/${PLANNED[app]} planned slots captured (see screenshots/raw/INDEX.md)`);
}

// ── Banned words in reviewer notes + copy deck ──────────────────────────────
log("\n▶ Banned-word scan (reviewer notes + copy/)");
const textTargets = [];
for (const sub of ["reviewer", "copy"]) {
  const d = join(ROOT, sub);
  if (existsSync(d))
    for (const f of readdirSync(d))
      if (/\.(md|json|txt)$/i.test(f)) textTargets.push(join(sub, f));
}
let banned = 0;
for (const rel of textTargets) {
  const txt = readFileSync(join(ROOT, rel), "utf8");
  const m = txt.match(BANNED);
  if (m) {
    warning(`${rel}: contains banned word "${m[0]}" (plan §5) — review`);
    banned++;
  }
}
if (banned === 0) ok(`no banned words in ${textTargets.length} text file(s)`);

// ── Summary ─────────────────────────────────────────────────────────────────
log(`\n${"=".repeat(48)}`);
log(`Store-asset validation: ${hard} hard failure(s), ${warn} warning(s).`);
if (hard > 0 || (STRICT && warn > 0)) {
  log("Result: FAIL");
  process.exit(1);
}
log("Result: PASS (warnings are expected pre-polish — see CAVEATS.md).");
