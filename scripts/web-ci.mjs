#!/usr/bin/env node
// Web parity gate — run after every web-parity slice (and in CI).
//   node scripts/web-ci.mjs            # full gate (incl. next build of both apps)
//   node scripts/web-ci.mjs --fast     # skip the slow next build step
//
// Mirrors scripts/mobile-ci.mjs for the two web apps. Catches: type errors,
// failing unit/contract tests, a route tree that no longer builds, banned
// consumer copy, server secrets leaking into CLIENT code, and brand-hex-literal
// drift in files that have already been migrated to design tokens.
import { execSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const fast = process.argv.includes("--fast");
const root = process.cwd();
const webApps = ["consumer-web", "restaurant-mgmt-web"];
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

// 1. Typecheck the shared tokens + web design system + both web apps.
step("typecheck (@gozaika/design-tokens + @gozaika/ui + web apps)", () => {
  sh(
    "npm run typecheck --if-present " +
      "--workspace @gozaika/design-tokens --workspace @gozaika/ui " +
      "--workspace @gozaika/consumer-web --workspace @gozaika/restaurant-mgmt-web",
  );
});

// 2. Unit + contract tests for the shared tokens + web design system + web app libs.
step("unit/contract tests", () => {
  sh("npx vitest run --passWithNoTests packages/design-tokens packages/ui apps/consumer-web apps/restaurant-mgmt-web");
});

// 3. Route tree + RSC build: each web app must build.
if (!fast) {
  for (const app of webApps) {
    step(`next build (${app})`, () => {
      const appDir = join(root, "apps", app);
      // Next reads .env.local from the app dir; seed it from the repo-root env
      // (the documented dev workflow) so the build is reproducible.
      const appEnv = join(appDir, ".env.local");
      const rootEnv = join(root, ".env.local");
      if (!existsSync(appEnv) && existsSync(rootEnv)) copyFileSync(rootEnv, appEnv);
      sh(`npm run build --workspace @gozaika/${app}`);
    });
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

// 4a. Banned consumer copy. Same word list as the mobile gate, but `stale` is
//     matched with a negative lookahead so the `stale-while-revalidate` HTTP
//     cache directive is not a false positive (web-only collision).
const BANNED_COPY = /\b(?:leftover|cheap|clearance|liquidation|food rescue|bargain bin)\b|\bstale\b(?!-while)/i;
step("no banned consumer copy in web apps", () => {
  const roots = [
    join(root, "apps", "consumer-web", "app"),
    join(root, "apps", "restaurant-mgmt-web", "app"),
    join(root, "packages", "ui", "src"),
  ];
  const hits = [];
  for (const r of roots) {
    for (const file of walk(r)) {
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (BANNED_COPY.test(line)) hits.push(`${file.replace(root, ".")}:${i + 1}: ${line.trim().slice(0, 80)}`);
        });
    }
  }
  if (hits.length) throw new Error(`Banned copy:\n${hits.join("\n")}`);
});

// 4b. Server secrets must never be referenced in CLIENT code. Web server code
//     legitimately uses the service-role key / payment secrets, so we cannot ban
//     them outright (as mobile does) — instead we forbid them in any file that
//     declares "use client", and forbid a NEXT_PUBLIC_ prefix on a secret name.
const SECRET_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE",
  "RAZORPAY_KEY_SECRET",
  "TURNSTILE_SECRET_KEY",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "WEBHOOK_SECRET",
  "PICKUP_CREDENTIAL_SECRET",
  "SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN",
];
const CLIENT_DIRECTIVE = /^\s*["']use client["']/;

step("no server secrets referenced in client code", () => {
  const leaks = [];
  for (const app of webApps) {
    for (const file of walk(join(root, "apps", app))) {
      const text = readFileSync(file, "utf8");
      const firstNonEmpty = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
      const isClient = CLIENT_DIRECTIVE.test(firstNonEmpty) || /^\s*["']use client["']/m.test(text.slice(0, 80));
      if (!isClient) continue;
      for (const secret of SECRET_NAMES) {
        if (text.includes(secret)) leaks.push(`${file.replace(root, ".")}: references ${secret} in a client component`);
      }
    }
    // A secret must never be exposed via a NEXT_PUBLIC_ name.
    for (const file of walk(join(root, "apps", app))) {
      const text = readFileSync(file, "utf8");
      const m = text.match(/NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*/);
      if (m) leaks.push(`${file.replace(root, ".")}: NEXT_PUBLIC secret name ${m[0]}`);
    }
  }
  if (leaks.length) throw new Error(`Client secret leaks:\n${leaks.join("\n")}`);
});

// 4c. Brand-hex-literal drift, scoped to files already migrated to tokens.
//     This list grows per slice; an empty list means nothing is enforced yet.
//     Once a file is here, it must contain ZERO raw brand-hex literals.
const MIGRATED_FILES = [
  // e.g. "apps/consumer-web/app/page.tsx" — added as each surface is migrated.
];
const BRAND_HEX = /#(?:FF6B35|1A5C38|D4A017|FFF8F0|2D2D2D)\b/i;

step(`no brand-hex literals in migrated files (${MIGRATED_FILES.length})`, () => {
  const offenders = [];
  for (const rel of MIGRATED_FILES) {
    const p = join(root, rel);
    if (!existsSync(p)) {
      offenders.push(`${rel}: listed as migrated but missing`);
      continue;
    }
    const lines = readFileSync(p, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (BRAND_HEX.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 80)}`);
    });
  }
  if (offenders.length) throw new Error(`Raw brand-hex literals in migrated files:\n${offenders.join("\n")}`);
});

// Summary
const failed = results.filter((r) => !r.ok);
process.stdout.write(`\n${"=".repeat(48)}\n`);
process.stdout.write(`Web gate: ${results.length - failed.length}/${results.length} passed\n`);
if (failed.length) {
  process.stdout.write(`FAILED: ${failed.map((f) => f.name).join(", ")}\n`);
  process.exit(1);
}
process.stdout.write("All web gate checks passed.\n");
