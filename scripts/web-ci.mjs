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
  sh("npx vitest run --passWithNoTests packages/design-tokens packages/utils packages/ui apps/consumer-web apps/restaurant-mgmt-web");
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

// 4c. Brand-hex-literal drift — GLOBAL (W6). Every source file under the two web
//     apps' `app/` trees and `packages/ui/src` must reference tokens, not raw
//     brand-hex. The W4/W5 per-file allowlist is retired now that the whole
//     surface is migrated. The ONLY sanctioned brand-hex lives in
//     `packages/ui/src/theme.css` — the Tailwind @theme mirror of the TS palette
//     (drift-locked separately by theme.test.ts) — so it is excluded here.
const BRAND_HEX = /#(?:FF6B35|1A5C38|D4A017|FFF8F0|2D2D2D)\b/i;
const HEX_SCAN_ROOTS = [
  join(root, "apps", "consumer-web", "app"),
  join(root, "apps", "restaurant-mgmt-web", "app"),
  join(root, "packages", "ui", "src"),
];
const HEX_SCAN_EXCLUDE = new Set([join(root, "packages", "ui", "src", "theme.css")]);

step("no brand-hex literals in web app + @gozaika/ui source (global)", () => {
  const offenders = [];
  for (const scanRoot of HEX_SCAN_ROOTS) {
    if (!existsSync(scanRoot)) continue;
    for (const file of walk(scanRoot)) {
      if (HEX_SCAN_EXCLUDE.has(file)) continue;
      if (!/\.(tsx?|css)$/.test(file)) continue;
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        if (BRAND_HEX.test(line)) offenders.push(`${file.replace(root, ".")}:${i + 1}: ${line.trim().slice(0, 80)}`);
      });
    }
  }
  if (offenders.length) throw new Error(`Raw brand-hex literals (use tokens):\n${offenders.join("\n")}`);
});

// 4d. Built-bundle secret scan (W7): the source scan above forbids secret NAMES
//     in client code; this scans the actually-built CLIENT bundles (`.next/static`)
//     for accidental inlining of secret VALUES from the env. Reports filenames
//     only, never the value. Needs `next build`, so it is skipped in --fast.
if (!fast) {
  step("no server-secret values in built client bundles (.next/static)", () => {
    function envValues(appDir) {
      const envFile = join(appDir, ".env.local");
      const out = [];
      if (!existsSync(envFile)) return out;
      for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
        if (!m) continue;
        const [, name, rawValue] = m;
        const value = rawValue.replace(/^["']|["']$/g, "");
        // Only secret-ish names, and only values long enough to be a real token
        // (avoids false positives on short/placeholder demo values).
        if (SECRET_NAMES.some((s) => name.includes(s)) && value.length >= 16) {
          out.push({ name, value });
        }
      }
      return out;
    }
    const leaks = [];
    for (const app of webApps) {
      const appDir = join(root, "apps", app);
      const staticDir = join(appDir, ".next", "static");
      if (!existsSync(staticDir)) continue;
      const secrets = envValues(appDir);
      if (!secrets.length) continue;
      for (const file of walk(staticDir)) {
        if (!file.endsWith(".js")) continue;
        const text = readFileSync(file, "utf8");
        for (const secret of secrets) {
          if (text.includes(secret.value)) leaks.push(`${file.replace(root, ".")}: inlines ${secret.name} value`);
        }
      }
    }
    if (leaks.length) throw new Error(`Server-secret values found in client bundles:\n${leaks.join("\n")}`);
  });
}

// 5. Accessibility (axe) — structural WCAG rules on the key public shells of both
//    product web apps. Each app's playwright.config boots its own `next start`
//    (reusing the build above). color-contrast is reported non-blocking (locked at
//    the token layer by contrast.test.ts); authed portal axe is opt-in
//    (RUN_AUTHED_A11Y). Needs the build, so it is skipped in --fast.
if (!fast) {
  step("a11y axe + functional smoke (consumer-web + restaurant-mgmt-web)", () => {
    sh("npm run e2e --workspace @gozaika/consumer-web");
    sh("npm run e2e --workspace @gozaika/restaurant-mgmt-web");
  });
}

// Summary
const failed = results.filter((r) => !r.ok);
process.stdout.write(`\n${"=".repeat(48)}\n`);
process.stdout.write(`Web gate: ${results.length - failed.length}/${results.length} passed\n`);
if (failed.length) {
  process.stdout.write(`FAILED: ${failed.map((f) => f.name).join(", ")}\n`);
  process.exit(1);
}
process.stdout.write("All web gate checks passed.\n");
