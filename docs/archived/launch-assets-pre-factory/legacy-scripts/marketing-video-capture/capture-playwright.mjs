// capture-playwright.mjs — run the web (Playwright) marketing captures into the artifact
// dir. Produces raw .webm + per-scene PNG stills for the onboarding (C) and management (D)
// videos. Mobile (A/B) capture is Maestro + a device — see capture-all.mjs / README.
//
//   node scripts/marketing-video-capture/capture-playwright.mjs --all
//   node scripts/marketing-video-capture/capture-playwright.mjs --video restaurant-management
//
// Env (defaults shown):
//   MGMT_BASE_URL=http://localhost:3001   ADMIN_BASE_URL=http://localhost:3002
//   ARTIFACT_ROOT=.codex-artifacts/gozaika-marketing-videos
//   CAPTURE_ADMIN_TAIL=false   (set true to also capture the optional admin onboarding-review tail)

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ARTIFACT_ROOT = process.env.ARTIFACT_ROOT ?? ".codex-artifacts/gozaika-marketing-videos";
const MGMT_BASE_URL = process.env.MGMT_BASE_URL ?? "http://localhost:3001";
const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? "http://localhost:3002";

const SPECS = {
  "restaurant-management": [{ spec: "apps/restaurant-mgmt-web/tests/marketing-video/restaurant-management.spec.ts", baseEnv: { MGMT_BASE_URL }, url: MGMT_BASE_URL }],
  "restaurant-onboarding": [
    { spec: "apps/restaurant-mgmt-web/tests/marketing-video/restaurant-onboarding.spec.ts", baseEnv: { MGMT_BASE_URL }, url: MGMT_BASE_URL },
    ...(String(process.env.CAPTURE_ADMIN_TAIL).toLowerCase() === "true"
      ? [{ spec: "apps/admin-web/tests/marketing-video/restaurant-onboarding.spec.ts", baseEnv: { ADMIN_BASE_URL }, url: ADMIN_BASE_URL }]
      : []),
  ],
};

function parseArgs() {
  const a = process.argv.slice(2);
  if (a.includes("--all")) return Object.keys(SPECS);
  const i = a.indexOf("--video");
  if (i >= 0 && a[i + 1]) return [a[i + 1]];
  return Object.keys(SPECS);
}

async function reachable(url) {
  try {
    const res = await fetch(url, { method: "HEAD" }).catch(() => fetch(url));
    return Boolean(res);
  } catch {
    return false;
  }
}

async function main() {
  const videos = parseArgs();
  let failures = 0;

  for (const videoId of videos) {
    const targets = SPECS[videoId];
    if (!targets) {
      console.error(`✗ unknown web video "${videoId}" (known: ${Object.keys(SPECS).join(", ")})`);
      failures += 1;
      continue;
    }
    for (const { spec, baseEnv, url } of targets) {
      if (!(await reachable(url))) {
        console.error(`✗ ${videoId}: server not reachable at ${url}. Start the dev/start server (pointed at LOCAL Supabase) and retry.`);
        failures += 1;
        continue;
      }
      console.log(`▶ capturing ${videoId} via ${spec}`);
      const r = spawnSync("npx", ["tsx", spec], {
        cwd: repo,
        stdio: "inherit",
        env: { ...process.env, ...baseEnv, ARTIFACT_ROOT },
        shell: process.platform === "win32",
      });
      if (r.status !== 0) {
        console.error(`✗ ${videoId}: capture spec failed (${spec})`);
        failures += 1;
      }
    }
  }

  // Refresh the manifest so newly-captured clips/stills are reflected.
  spawnSync("node", ["scripts/marketing-video-capture/generate-manifest.mjs"], { cwd: repo, stdio: "inherit", shell: process.platform === "win32" });

  if (failures) {
    console.error(`\n✗ ${failures} web capture(s) failed.`);
    process.exit(1);
  }
  console.log("\n✓ web captures complete.");
}

main();
