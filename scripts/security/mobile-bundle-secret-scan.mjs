#!/usr/bin/env node
// Release-time security gate (Slice 17): scan the *built* mobile bundles for
// leaked server secrets. The mobile-ci drift gate only `git grep`s source; this
// scans the actual Hermes/JS artifact that ships, catching anything inlined via
// env, app config, or a dependency. String constants survive in Hermes bytecode
// as readable bytes, so a literal/JWT scan over the emitted `.hbc`/`.js`/`.map`
// is meaningful.
//
//   node scripts/security/mobile-bundle-secret-scan.mjs
//
// Exit 0 = clean. Exit 1 = a forbidden secret (or a service-role JWT) is present
// in a shipped bundle — block the release.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const apps = ["consumer-mobile", "restaurant-mobile"];

// Literal secret markers that must NEVER appear in a client bundle. The public
// anon key (a JWT with role "anon") is allowed; the service-role key is not.
const FORBIDDEN = [
  "service_role",
  "SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE",
  "RAZORPAY_KEY_SECRET",
  "WEBHOOK_SECRET",
  "PICKUP_CREDENTIAL_SECRET",
  "FCM_SERVICE_ACCOUNT",
  "BEGIN PRIVATE KEY",
  "BEGIN RSA PRIVATE KEY",
  '"private_key"',
  "client_email", // Google service-account marker
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function decodeJwtRole(token) {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json).role ?? null;
  } catch {
    return null;
  }
}

const findings = [];

for (const app of apps) {
  const cwd = join(root, "apps", app);
  process.stdout.write(`\n▶ export + scan ${app}\n`);
  execSync("npx expo export -p ios", { cwd, stdio: "pipe", encoding: "utf8" });
  const distJs = join(cwd, "dist", "_expo", "static", "js");
  if (!existsSync(distJs)) {
    findings.push(`${app}: no JS output at ${distJs}`);
    continue;
  }
  const files = walk(distJs);
  for (const f of files) {
    const text = readFileSync(f).toString("latin1");
    for (const marker of FORBIDDEN) {
      if (text.includes(marker)) findings.push(`${app}: forbidden marker "${marker}" in ${f.replace(cwd, ".")}`);
    }
    // Any JWT whose payload claims role "service_role" is a hard fail.
    const jwts = text.match(/eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g) ?? [];
    for (const jwt of jwts) {
      if (decodeJwtRole(jwt) === "service_role") findings.push(`${app}: service_role JWT in ${f.replace(cwd, ".")}`);
    }
  }
  rmSync(join(cwd, "dist"), { recursive: true, force: true });
  process.stdout.write(`  ✓ scanned ${files.length} bundle file(s)\n`);
}

process.stdout.write(`\n${"=".repeat(48)}\n`);
if (findings.length) {
  process.stdout.write(`Bundle secret scan: ${findings.length} finding(s) — BLOCK RELEASE\n`);
  for (const f of findings) process.stdout.write(`  ✗ ${f}\n`);
  process.exit(1);
}
process.stdout.write("Bundle secret scan: clean — no server secrets in shipped bundles.\n");
