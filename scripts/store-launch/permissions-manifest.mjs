#!/usr/bin/env node
// Slice 18 release prep: derive the store privacy / Data-Safety permissions
// manifest from the ACTUAL app configs (not a hand-maintained list), so the
// Play Data-Safety + Apple privacy answers are grounded in what ships.
//
//   node scripts/store-launch/permissions-manifest.mjs
//
// Prints a per-app manifest of declared Android permissions, blocked
// permissions, plugin permission rationales, and the push/location/camera
// capabilities each implies — plus a flag if any high-scrutiny permission
// (microphone, background location) is declared.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const apps = [
  { dir: "consumer-mobile", label: "goZaika (customer)" },
  { dir: "restaurant-mobile", label: "goZaika Partner (restaurant)" },
];

// Android permissions that draw extra Play review / Data-Safety scrutiny.
const HIGH_SCRUTINY = new Set([
  "android.permission.RECORD_AUDIO",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.READ_CONTACTS",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.QUERY_ALL_PACKAGES",
]);

// Map an Android permission to the Play Data-Safety data type it implies.
const DATA_SAFETY = {
  "android.permission.CAMERA": "Camera (QR scan; no image stored)",
  "android.permission.ACCESS_FINE_LOCATION": "Approximate/precise location (pickup pin; foreground only)",
  "android.permission.ACCESS_COARSE_LOCATION": "Approximate location (pickup pin; foreground only)",
  "android.permission.RECORD_AUDIO": "Microphone (NOT used — should be blocked)",
};

function pluginRationales(plugins) {
  const out = {};
  for (const p of plugins ?? []) {
    if (!Array.isArray(p)) continue;
    const [name, opts] = p;
    if (name === "expo-camera" && opts?.cameraPermission) out["expo-camera"] = opts.cameraPermission;
    if (name === "expo-location" && opts?.locationWhenInUsePermission) out["expo-location"] = opts.locationWhenInUsePermission;
  }
  return out;
}

let highScrutinyFindings = 0;

for (const app of apps) {
  const cfg = JSON.parse(readFileSync(join(root, "apps", app.dir, "app.json"), "utf8")).expo;
  const android = cfg.android ?? {};
  const permissions = android.permissions ?? [];
  const blocked = android.blockedPermissions ?? [];
  const plugins = cfg.plugins ?? [];
  const hasPush = Boolean(android.googleServicesFile) && plugins.includes("expo-notifications");
  const rationales = pluginRationales(plugins);

  console.log(`\n=== ${app.label} — ${cfg.android?.package} v${cfg.version} (rt ${JSON.stringify(cfg.runtimeVersion ?? "unset")}) ===`);
  console.log("Declared Android permissions:");
  for (const p of permissions) console.log(`  - ${p}${DATA_SAFETY[p] ? `  → ${DATA_SAFETY[p]}` : ""}`);
  if (permissions.length === 0) console.log("  (none beyond defaults)");
  if (blocked.length) console.log(`Blocked (stripped from manifest): ${blocked.join(", ")}`);
  console.log(`Push (FCM): ${hasPush ? "yes (expo-notifications + google-services.json)" : "no"}`);
  for (const [k, v] of Object.entries(rationales)) console.log(`Rationale [${k}]: ${v}`);

  const flagged = permissions.filter((p) => HIGH_SCRUTINY.has(p) && !blocked.includes(p));
  if (flagged.length) {
    highScrutinyFindings += flagged.length;
    for (const p of flagged) console.log(`  ⚠ HIGH-SCRUTINY declared and not blocked: ${p}`);
  }
}

console.log(`\n${"=".repeat(56)}`);
if (highScrutinyFindings > 0) {
  console.log(`${highScrutinyFindings} high-scrutiny permission(s) declared — review before submit.`);
  process.exit(1);
}
console.log("Permissions manifest: minimal — no unexplained high-scrutiny permissions.");
