// capture-store-screenshots.mjs — code-side native store-screenshot capturer for goZaika.
//
// Grabs the CURRENT foreground frame from a connected Android device/emulator via
// `adb exec-out screencap` into the store raw tree under a named slot. Operator-driven:
// you navigate the app to the screen you want, then run this with the slot name. This is
// deliberate — automated taps are brittle and produce QA-grade frames; a human (or a Maestro
// flow paused on the target screen) gets clean store shots.
//
//   # list slots
//   node scripts/store-launch/capture-store-screenshots.mjs --list
//   # capture the current screen into a slot
//   node scripts/store-launch/capture-store-screenshots.mjs --app gozaika --slot 06-orders
//   # capture every slot interactively (prompts you to navigate, press Enter to grab)
//   node scripts/store-launch/capture-store-screenshots.mjs --app gozaika-partner --interactive
//
// Env: ADB_SERIAL (default: first device from `adb devices`).
// IMPORTANT (caveat C1): capture the CUSTOMER app from a preview/production build, not the
// Expo dev client, or the dev-menu gear overlay will appear in every frame.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RAW = resolve(repo, ".codex-artifacts/archive/launch-assets-pre-factory/gozaika-store-launch/screenshots/raw");

// Slot plans mirror screenshots/raw/INDEX.md (plan §6).
const SLOTS = {
  gozaika: [
    "01-home-discover", "02-drops-list", "03-drop-detail", "04-order-confirmed",
    "05-passport", "06-orders", "07-account-consent",
  ],
  "gozaika-partner": [
    "01-pickup-counter", "02-verify-pickup", "03-verify-otp-entered", "04-collected",
    "05-dashboard", "06-drops-manage", "07-profile-compliance", "08-reports-roi", "09-finance",
  ],
};

const args = process.argv.slice(2);
const getArg = (k) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : undefined);

if (args.includes("--list")) {
  for (const [app, slots] of Object.entries(SLOTS)) {
    process.stdout.write(`\n${app}:\n`);
    for (const s of slots) process.stdout.write(`  ${s}\n`);
  }
  process.exit(0);
}

const app = getArg("--app");
if (!app || !SLOTS[app]) {
  process.stderr.write(`--app must be one of: ${Object.keys(SLOTS).join(", ")}\n`);
  process.exit(2);
}

function adbSerial() {
  if (process.env.ADB_SERIAL) return process.env.ADB_SERIAL;
  const r = spawnSync("adb", ["devices"], { encoding: "utf8" });
  const line = (r.stdout || "").split("\n").slice(1).find((l) => /\tdevice$/.test(l));
  if (!line) {
    process.stderr.write("No adb device found. Start an emulator or connect a device.\n");
    process.exit(1);
  }
  return line.split("\t")[0];
}

const serial = adbSerial();

function capture(slot) {
  const outDir = join(RAW, app);
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${slot}.png`);
  const r = spawnSync("adb", ["-s", serial, "exec-out", "screencap", "-p"], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0 || !r.stdout || r.stdout.length < 1000) {
    process.stderr.write(`  ✗ screencap failed for ${slot}\n`);
    return false;
  }
  writeFileSync(out, r.stdout);
  const b = r.stdout;
  const dims = b.slice(1, 4).toString() === "PNG" ? `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}` : "?";
  process.stdout.write(`  ✓ ${app}/${slot}.png (${dims})\n`);
  return true;
}

const slot = getArg("--slot");
if (slot) {
  if (!SLOTS[app].includes(slot))
    process.stderr.write(`(note) "${slot}" is not a known slot for ${app}; capturing anyway.\n`);
  process.stdout.write(`Device ${serial} — capturing current screen → ${app}/${slot}\n`);
  process.exit(capture(slot) ? 0 : 1);
}

if (args.includes("--interactive")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));
  process.stdout.write(`Device ${serial} — interactive capture for ${app}.\n`);
  for (const s of SLOTS[app]) {
    const a = await ask(`\nNavigate to "${s}". Enter=capture, s=skip, q=quit: `);
    if (a.trim().toLowerCase() === "q") break;
    if (a.trim().toLowerCase() === "s") continue;
    capture(s);
  }
  rl.close();
  process.exit(0);
}

process.stderr.write("Nothing to do. Use --slot <name>, --interactive, or --list.\n");
process.exit(2);
