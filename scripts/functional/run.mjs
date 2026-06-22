// Functional (integration) test harness entry point. Exercises the mobile BFF
// (`/api/mobile/v1`) against a running server + local Supabase using real bearer
// tokens for each demo role, asserting the role matrix, happy paths and
// no-leakage invariants across every shipped mobile slice.
//
// Prereqs: BFF running (default http://127.0.0.1:3001) + local Supabase up + the
// demo seed applied. See scripts/functional/README.md (run.ps1 does it all).
//
//   ANON_KEY=... node scripts/functional/run.mjs            # all suites
//   ANON_KEY=... node scripts/functional/run.mjs --filter dashboard

import { preflight, BFF_ORIGIN } from "./context.mjs";
import { runAll } from "./harness.mjs";

// Register suites (import for side effects).
import "./suites/auth.mjs";
import "./suites/counter.mjs";
import "./suites/profile.mjs";
import "./suites/catalog.mjs";
import "./suites/dashboard.mjs";
import "./suites/finance.mjs";

const filterArg = process.argv.indexOf("--filter");
const filter = filterArg >= 0 ? process.argv[filterArg + 1] : undefined;

try {
  await preflight();
} catch (err) {
  console.error(`\n✗ preflight failed: ${err.message}\n`);
  process.exit(2);
}

console.log(`Functional harness → ${BFF_ORIGIN}/api/mobile/v1${filter ? `  (filter: ${filter})` : ""}`);
const ok = await runAll({ filter });
process.exit(ok ? 0 : 1);
