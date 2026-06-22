// Apply the idempotent slice seeds the functional harness relies on to the running
// local Supabase DB (the active BAM Bag template for the publish happy path + the
// counter pickup order). Detects the supabase_db_* docker container automatically.
//
//   node scripts/functional/seed.mjs        (or: npm run db:seed:functional)
//
// Cold start: if the local DB is behind migrations or unseeded, run
//   npx supabase db reset
// first to apply all migrations + the base demo seed, then this script.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function dbContainer() {
  const r = spawnSync("docker", ["ps", "--filter", "name=supabase_db", "--format", "{{.Names}}"], { encoding: "utf8" });
  return (r.stdout || "").trim().split("\n").filter(Boolean)[0] ?? null;
}

const container = dbContainer();
if (!container) {
  console.error("✗ No running supabase_db_* container. Start local Supabase first: npx supabase start");
  process.exit(2);
}
console.log(`Applying functional seeds to ${container}…`);

const files = [
  "supabase/seed_demo/slice13_active_template.sql",
  "supabase/seed_demo/slice7_counter_pickup_order.sql",
];

let ok = true;
for (const f of files) {
  let sql;
  try {
    sql = readFileSync(resolve(repo, f), "utf8");
  } catch {
    console.error(`✗ missing ${f}`);
    ok = false;
    continue;
  }
  const r = spawnSync(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input: sql, encoding: "utf8" },
  );
  if (r.status === 0) {
    console.log(`  ✓ ${f}`);
  } else {
    console.error(`  ✗ ${f}\n${(r.stderr || "").trim()}`);
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
