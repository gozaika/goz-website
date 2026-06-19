#!/usr/bin/env node
// Mobile drift gate — run after every mobile slice (and in CI).
//   node scripts/mobile-ci.mjs            # full gate
//   node scripts/mobile-ci.mjs --fast     # skip the slow expo export step
//
// Catches the cheap-to-miss drift: type errors, failing unit/contract tests,
// a route tree that no longer bundles, resurfaced Orbitwell/old identities,
// banned consumer copy, and accidental server-secret leakage into mobile code.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const fast = process.argv.includes("--fast");
const root = process.cwd();
const apps = ["consumer-mobile", "restaurant-mobile"];
const results = [];

function step(name, fn) {
  process.stdout.write(`\n▶ ${name}\n`);
  try {
    fn();
    results.push({ name, ok: true });
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    results.push({ name, ok: false });
    process.stdout.write(`  ✗ ${name}\n${err.stdout ?? ""}${err.message ?? err}\n`);
  }
}

function sh(cmd, opts = {}) {
  execSync(cmd, { stdio: "pipe", encoding: "utf8", cwd: root, ...opts });
}

// 1. Typecheck every mobile workspace.
step("typecheck (packages + apps)", () => {
  sh(
    "npm run typecheck --if-present " +
      "--workspace @gozaika/mobile-core --workspace @gozaika/mobile-ui " +
      "--workspace @gozaika/consumer-mobile --workspace @gozaika/restaurant-mobile",
  );
});

// 2. Unit + contract tests for the shared packages.
step("unit/contract tests", () => {
  sh("npx vitest run packages/mobile-core packages/mobile-ui packages/types packages/supabase");
});

// 3. Route tree + metro resolution: each app must bundle.
if (!fast) {
  for (const app of apps) {
    step(`expo export (${app})`, () => {
      const cwd = `${root}/apps/${app}`;
      sh("npx expo export -p ios", { cwd });
      sh(process.platform === "win32" ? "rmdir /s /q dist" : "rm -rf dist", { cwd, shell: true });
    });
  }
}

// 4. Identity / copy / secret drift scans (tracked files only, via git grep).
function gitGrepMustBeEmpty(label, pattern, pathspec) {
  step(label, () => {
    let hits = "";
    try {
      hits = execSync(`git grep -nIE "${pattern}" -- ${pathspec}`, { cwd: root, encoding: "utf8" });
    } catch {
      hits = ""; // git grep exits 1 when there are no matches — that's success here.
    }
    if (hits.trim()) {
      throw new Error(`Forbidden matches:\n${hits}`);
    }
  });
}

gitGrepMustBeEmpty(
  "no Orbitwell / old identities in mobile apps",
  "orbitwell|gozaika-staff|gozaikastaff|restaurant-staff-mobile|goZaika Staff",
  "apps/consumer-mobile apps/restaurant-mobile",
);

gitGrepMustBeEmpty(
  "no banned consumer copy in mobile apps",
  "leftover|\\bstale\\b|\\bcheap\\b|clearance|liquidation|food rescue|bargain bin",
  "apps/consumer-mobile/app apps/consumer-mobile/src apps/restaurant-mobile/app apps/restaurant-mobile/src",
);

gitGrepMustBeEmpty(
  "no server secrets referenced in mobile code",
  "SERVICE_ROLE|service_role|RAZORPAY_KEY_SECRET|WEBHOOK_SECRET|PICKUP_CREDENTIAL_SECRET",
  "apps/consumer-mobile apps/restaurant-mobile packages/mobile-core packages/mobile-ui",
);

// Summary
const failed = results.filter((r) => !r.ok);
process.stdout.write(`\n${"=".repeat(48)}\n`);
process.stdout.write(`Mobile gate: ${results.length - failed.length}/${results.length} passed\n`);
if (failed.length) {
  process.stdout.write(`FAILED: ${failed.map((f) => f.name).join(", ")}\n`);
  process.exit(1);
}
process.stdout.write("All mobile drift checks passed.\n");
