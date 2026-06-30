/**
 * seed-marketing-video-data.ts — deterministic demo data for the goZaika marketing
 * video capture package (.codex-artifacts/gozaika-marketing-videos).
 *
 * LOCAL / TEST ONLY. This targets the running local Supabase Postgres container
 * directly via `docker exec ... psql` (the same mechanism as scripts/functional/seed.mjs),
 * so it needs no service-role keys and can never touch a hosted/production database.
 * It refuses to run if no local supabase_db_* container is present.
 *
 * NOTE: this intentionally does NOT use `dotenv -e .env.local` — at this repo `.env.local`
 * points at the CLOUD project (see docs/mobile/CONTINUE-HERE.md). Seeding the local DB by
 * container is the safe, key-free path.
 *
 * What it does (all idempotent):
 *   1. Applies the canonical demo seed (parts 1-4 + phone/OTP linkage) — rich Hyderabad
 *      restaurants, drops, orders, reviews, ROI-ready facts.
 *   2. Applies the functional fixtures (slice13 active template + slice7 counter order).
 *   3. Rolls active drop windows to today (demo_prepare).
 *   4. Applies marketing_video_overlay.sql — pins the HERO claim drop + the COUNTER order
 *      to capture-ready states with open windows and a known OTP.
 *   5. Validates the two stateful screens and writes seed-output.json (personas, login
 *      identities, hero/counter IDs, routes, OTPs — all safe local demo values).
 *
 * Usage:
 *   npm run db:seed:marketing-videos                 # full apply + overlay + validate
 *   npm run db:seed:marketing-videos -- --overlay-only   # just re-pin hero/counter (fast)
 *
 * Cold start: if the local DB is unmigrated, run `npx supabase db reset` first.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const overlayOnly = process.argv.includes("--overlay-only");

const ARTIFACT_DIR = resolve(repo, ".codex-artifacts/gozaika-marketing-videos");
const SEED_OUT = resolve(ARTIFACT_DIR, "seed/seed-output.json");

const PICKUP_CREDENTIAL_SECRET = "local-smoke-pickup-secret-0123456789-abcdef";
const COUNTER_OTP = "246810";
const HERO_DROP_PK = "20000000-0000-0000-0000-700000000012";
const COUNTER_ORDER_NUMBER = "GZ-SMOKE-0001";
const LOCAL_SUPABASE_API = "http://127.0.0.1:54321";

function dbContainer(): string | null {
  const r = spawnSync("docker", ["ps", "--filter", "name=supabase_db", "--format", "{{.Names}}"], { encoding: "utf8" });
  return (r.stdout || "").trim().split("\n").filter(Boolean)[0] ?? null;
}

function applySql(container: string, relPath: string): boolean {
  let sql: string;
  try {
    sql = readFileSync(resolve(repo, relPath), "utf8");
  } catch {
    console.error(`  ✗ missing ${relPath}`);
    return false;
  }
  const r = spawnSync(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input: sql, encoding: "utf8" },
  );
  if (r.status === 0) {
    console.log(`  ✓ ${relPath}`);
    return true;
  }
  console.error(`  ✗ ${relPath}\n${(r.stderr || "").trim()}`);
  return false;
}

function query(container: string, sql: string): string {
  const r = spawnSync(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "|", "-c", sql],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error((r.stderr || "").trim() || "query failed");
  return (r.stdout || "").trim();
}

function main() {
  const container = dbContainer();
  if (!container) {
    console.error("✗ No running supabase_db_* container. Start local Supabase first: npx supabase start");
    process.exit(2);
  }
  console.log(`Seeding marketing-video data into ${container}${overlayOnly ? " (overlay only)" : ""}…`);

  const canonical = [
    "supabase/seed_demo/demo_seed.sql",
    "supabase/seed_demo/demo_seed_part2_catalog_drops.sql",
    "supabase/seed_demo/demo_seed_part3_orders_reviews.sql",
    "supabase/seed_demo/demo_seed_part4_functions.sql",
    "supabase/seed_demo/demo_test_otp_linkage.sql",
    "supabase/seed_demo/slice13_active_template.sql",
    "supabase/seed_demo/slice7_counter_pickup_order.sql",
    "supabase/seed_demo/demo_prepare.sql",
  ];
  const overlay = "supabase/seed_demo/marketing_video_overlay.sql";

  const files = overlayOnly ? [overlay] : [...canonical, overlay];
  let ok = true;
  for (const f of files) ok = applySql(container, f) && ok;
  if (!ok) {
    console.error("✗ One or more seed files failed. If the DB is unmigrated, run `npx supabase db reset` first.");
    process.exit(1);
  }

  // Validate the two capture-critical screens.
  const hero = query(
    container,
    `select drop_status_code, drop_title, quantity_total-quantity_reserved-quantity_sold,
            (pickup_end_at>now()), restaurant_fk
     from drop_drop where drop_drop_pk='${HERO_DROP_PK}';`,
  );
  const [heroStatus, heroTitle, heroClaimable, heroOpen] = hero.split("|");
  const counter = query(
    container,
    `select order_status_code, (pickup_window_end_at>now())
     from order_order where order_number='${COUNTER_ORDER_NUMBER}';`,
  );
  const [counterStatus, counterOpen] = counter.split("|");
  const activeDrops = query(container, `select count(*) from drop_drop where drop_status_code='ACTIVE';`);

  const heroOk = heroStatus === "ACTIVE" && Number(heroClaimable) > 0 && heroOpen === "t";
  const counterOk = counterStatus === "READY_FOR_PICKUP" && counterOpen === "t";
  if (!heroOk) console.error(`✗ Hero drop not capture-ready: status=${heroStatus} claimable=${heroClaimable} open=${heroOpen}`);
  if (!counterOk) console.error(`✗ Counter order not capture-ready: status=${counterStatus} open=${counterOpen}`);

  const output = {
    generatedAt: new Date().toISOString(),
    warning: "LOCAL / TEST demo credentials and IDs only. Never use against production.",
    dbContainer: container,
    supabaseLocalApi: LOCAL_SUPABASE_API,
    pickupCredentialSecret: PICKUP_CREDENTIAL_SECRET,
    personas: {
      "marketing.consumer.asha": "Asha Rao — adventurous, allergy-aware consumer (Jubilee Hills / HITEC City)",
      "marketing.restaurant.imran": "Imran — counter / pickup staff at Bawarchi Biryani Palace",
      "marketing.restaurant.meera": "Meera — restaurant owner / manager (Bawarchi Biryani Palace)",
      "marketing.admin.ops": "goZaika Ops — platform admin reviewer",
    },
    identities: {
      "marketing.consumer.asha": {
        app: "consumer-mobile",
        loginMethod: "phone-otp (test_otp)",
        phoneInput: "9876510008",
        phoneE164: "+919876510008",
        otp: "100008",
        note: "Karthik Reddy slot — PLATINUM Passport with multi-restaurant collected history. Persona label only; no personal name appears in captured scenes.",
      },
      "marketing.restaurant.imran": {
        app: "restaurant-mobile",
        loginMethod: "phone-otp (test_otp)",
        phoneInput: "9876530003",
        phoneE164: "+919876530003",
        otp: "300003",
        role: "PICKUP_STAFF",
        restaurant: "Bawarchi Biryani Palace",
      },
      "marketing.restaurant.meera": {
        app: "restaurant-mgmt-web",
        loginMethod: "phone-otp (test_otp)",
        phoneInput: "9876520001",
        phoneE164: "+919876520001",
        otp: "200001",
        role: "OWNER",
        restaurant: "Bawarchi Biryani Palace",
        note: "ACTIVE restaurant with rich drops/orders/ROI history — populates dashboard + Weekly ROI report.",
      },
      "marketing.admin.ops": {
        app: "admin-web",
        loginMethod: "see scripts/demo/create-demo-admin-user.ts (local admin)",
        note: "Optional — only needed for the optional admin-review tail of Video C.",
      },
      "onboarding.demo.example": {
        app: "restaurant-mgmt-web",
        loginMethod: "email/password (demo login panel)",
        email: "charminar.chai.co@gozaika.example",
        password: "GozaikaDemo@123",
        status: "ONBOARDING / UNDER_REVIEW",
        note: "Optional for Video C's in-progress onboarding look. Requires `npm run db:seed:demo:slice1` (create-demo-auth-users) against the LOCAL project. Falls back to the from-scratch onboarding wizard otherwise.",
      },
    },
    hero: {
      videoId: "customer-day-in-life",
      dropPk: HERO_DROP_PK,
      title: heroTitle,
      restaurant: "Sattvik Kitchen",
      route: `/drops/${HERO_DROP_PK}`,
      claimable: Number(heroClaimable),
    },
    counter: {
      videoId: "restaurant-counter",
      orderNumber: COUNTER_ORDER_NUMBER,
      otp: COUNTER_OTP,
      restaurant: "Bawarchi Biryani Palace",
      requiredBffEnv: { PICKUP_CREDENTIAL_SECRET },
    },
    management: {
      videoId: "restaurant-management",
      restaurant: "Bawarchi Biryani Palace",
      routes: ["/portal/dashboard", "/portal/drops", "/portal/orders", "/portal/reports"],
    },
    validation: {
      heroOk,
      counterOk,
      heroStatus,
      heroClaimable: Number(heroClaimable),
      heroWindowOpen: heroOpen === "t",
      counterStatus,
      counterWindowOpen: counterOpen === "t",
      activeDropsCount: Number(activeDrops),
    },
  };

  mkdirSync(dirname(SEED_OUT), { recursive: true });
  writeFileSync(SEED_OUT, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${SEED_OUT}`);
  console.log(`  hero: ${heroStatus} claimable=${heroClaimable} open=${heroOpen}  →  ${heroTitle}`);
  console.log(`  counter: ${counterStatus} open=${counterOpen}  →  ${COUNTER_ORDER_NUMBER} (OTP ${COUNTER_OTP})`);
  console.log(`  active drops: ${activeDrops}`);

  process.exit(heroOk && counterOk ? 0 : 1);
}

main();
