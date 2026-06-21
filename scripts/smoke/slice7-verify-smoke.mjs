// Slice 7 verification smoke: proves the server-authoritative SUCCESS path, the
// idempotent replay (same key returns the prior result, never double-collects), and
// the OTP brute-force rate-limit. Inserts a FRESH order each run (the verification
// event table is append-only, so a reused order can't be reset) attached to the
// seeded smoke drop.
//
// Requires: BFF on :3001 started with PICKUP_CREDENTIAL_SECRET matching $SECRET,
// the seed applied (supabase/seed_demo/slice7_counter_pickup_order.sql), and
//   ANON_KEY=.. SERVICE_ROLE_KEY=.. SUPABASE_URL=.. PICKUP_CREDENTIAL_SECRET=.. node scripts/smoke/slice7-verify-smoke.mjs

import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const SERVICE = process.env.SERVICE_ROLE_KEY;
const SECRET = process.env.PICKUP_CREDENTIAL_SECRET ?? "local-smoke-pickup-secret-0123456789-abcdef";
const BASE = `${process.env.BFF_ORIGIN ?? "http://127.0.0.1:3001"}/api/mobile/v1`;

const BAWARCHI = "20000000-0000-0000-0000-300000000001";
const SMOKE_DROP = "70000000-0000-0000-0000-0000000000c1";
const GOOD_OTP = "246810";
const PICKUP = { phone: "+919876530003", otp: "300003" };

const svc = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
const otpHash = createHash("sha256").update(`${SECRET}:${GOOD_OTP}`).digest("hex");

/** Insert a fresh READY_FOR_PICKUP Bawarchi order on the seeded smoke drop. */
async function freshOrder() {
  const pk = randomUUID();
  const future = new Date(Date.now() + 2 * 3600_000).toISOString();
  const { error } = await svc.from("order_order").insert({
    order_order_pk: pk,
    order_number: `GZ-SMOKE-${pk.slice(0, 8)}`,
    consumer_profile_fk: (await svc.from("consumer_profile").select("consumer_profile_pk").limit(1).single()).data.consumer_profile_pk,
    restaurant_fk: BAWARCHI,
    drop_fk: SMOKE_DROP,
    order_status_code: "READY_FOR_PICKUP",
    pickup_window_start_at: new Date(Date.now() - 600_000).toISOString(),
    pickup_window_end_at: future,
    subtotal_paise: 14900,
    total_paise: 14900,
    currency_code: "INR",
    snapshot_restaurant_name: "Bawarchi Biryani Palace",
    snapshot_restaurant_slug: "bawarchi-biryani-palace",
    snapshot_drop_title: "Smoke Evening Thali Drop",
    snapshot_bag_display_name: "BAM Bag · Veg Thali",
    snapshot_dietary_category_code: "VEG",
    pickup_otp_hash: otpHash,
  });
  if (error) throw new Error(`freshOrder insert: ${error.message}`);
  return pk;
}

async function mintToken({ phone, otp }) {
  const sb = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  await sb.auth.signInWithOtp({ phone });
  const ver = await sb.auth.verifyOtp({ phone, token: otp, type: "sms" });
  if (ver.error) throw new Error(`verifyOtp(${phone}): ${ver.error.message}`);
  return ver.data.session.access_token;
}

async function verify(token, orderPk, body) {
  const res = await fetch(`${BASE}/orders/${orderPk}/pickup/verify`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "x-gozaika-restaurant": BAWARCHI, "x-client-schema-version": "1", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, ok: json?.ok, resultCode: json?.data?.resultCode, code: json?.error?.code };
}

const results = [];
function check(label, cond, detail) {
  results.push({ pass: cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${label.padEnd(48)} ${detail}`);
}

const token = await mintToken(PICKUP);

// Phase 1 — SUCCESS + idempotent replay (fresh order, 0 prior attempts).
const o1 = await freshOrder();
const wrong = await verify(token, o1, { otp: "000000" });
check("wrong OTP -> INVALID_CODE", wrong.ok === true && wrong.resultCode === "INVALID_CODE", `(${wrong.status} ${wrong.resultCode})`);

const key = `verify:${o1}:success`;
const ok1 = await verify(token, o1, { otp: GOOD_OTP, idempotencyKey: key });
check("correct OTP -> SUCCESS", ok1.ok === true && ok1.resultCode === "SUCCESS", `(${ok1.status} ${ok1.resultCode})`);
const ok2 = await verify(token, o1, { otp: GOOD_OTP, idempotencyKey: key });
check("replay same key -> SUCCESS (deduped)", ok2.ok === true && ok2.resultCode === "SUCCESS", `(${ok2.status} ${ok2.resultCode})`);
const ok3 = await verify(token, o1, { otp: GOOD_OTP });
check("re-verify collected -> ALREADY_COLLECTED", ok3.ok === true && ok3.resultCode === "ALREADY_COLLECTED", `(${ok3.status} ${ok3.resultCode})`);

// Phase 2 — rate-limit after 5 failed attempts (fresh order).
const o2 = await freshOrder();
let fifth;
for (let i = 1; i <= 5; i++) fifth = await verify(token, o2, { otp: "111111", idempotencyKey: `rl:${o2}:${i}` });
check("5th failed attempt still processes", fifth.ok === true && fifth.resultCode === "INVALID_CODE", `(${fifth.status} ${fifth.resultCode})`);
const sixth = await verify(token, o2, { otp: "111111", idempotencyKey: `rl:${o2}:6` });
check("6th attempt -> RATE_LIMITED", sixth.status === 429 && sixth.code === "RATE_LIMITED", `(${sixth.status} ${sixth.code})`);

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
