// Slice 9 payment smoke. Drives the full customer payment loop against the consumer
// BFF + local Supabase with a real bearer token: discover a claimable drop -> claim
// -> checkout (simulated) -> simulate SUCCESS -> order CONFIRMED, and a FAILURE path.
// Requires the consumer BFF running with PAYMENTS_SIMULATOR_ENABLED=true.
//
//   ANON_KEY=... CONSUMER_BFF_ORIGIN=http://127.0.0.1:3003 node scripts/smoke/slice9-payment-smoke.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const BASE = `${process.env.CONSUMER_BFF_ORIGIN ?? "http://127.0.0.1:3003"}/api/mobile/v1`;
// Priya (rich demo consumer with a consumer_profile).
const PHONE = "+919876510001";
const OTP = "100001";

const results = [];
function check(label, pass, detail = "") {
  results.push({ label, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
}

async function token() {
  const sb = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  await sb.auth.signInWithOtp({ phone: PHONE });
  const v = await sb.auth.verifyOtp({ phone: PHONE, token: OTP, type: "sms" });
  if (v.error) throw new Error(`verifyOtp: ${v.error.message}`);
  return v.data.session.access_token;
}

function H(t, body) {
  const h = { authorization: `Bearer ${t}`, "x-client-schema-version": "1" };
  if (body) h["content-type"] = "application/json";
  return h;
}
async function j(method, path, t, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: H(t, body), body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function claimableDrop(t) {
  const r = await j("GET", "/discovery/drops", t);
  const drops = Array.isArray(r.body?.data) ? r.body.data : [];
  return drops.find((d) => (d.quantityAvailable ?? 0) > 0) ?? null;
}

async function payOnce(t, outcome) {
  const drop = await claimableDrop(t);
  if (!drop) throw new Error("no claimable drop (run db:seed + publish a drop)");
  const claim = await j("POST", "/claims", t, { dropPk: drop.dropPk, quantity: 1, idempotencyKey: `claim-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  if (claim.status !== 200) throw new Error(`claim ${claim.status} ${JSON.stringify(claim.body?.error)}`);
  const holdPk = claim.body.data.holdPk;
  const co = await j("POST", "/checkout/order", t, { holdPk, idempotencyKey: `intent:${holdPk}` });
  check(`checkout/order mode=simulated (${outcome})`, co.status === 200 && co.body.data?.mode === "simulated", `mode=${co.body.data?.mode}`);
  const sim = await j("POST", "/checkout/simulate", t, { holdPk, outcome });
  const st = await j("GET", `/checkout/status?holdPk=${holdPk}`, t);
  return { sim, st };
}

(async () => {
  if (!ANON) {
    console.error("ANON_KEY not set");
    process.exit(2);
  }
  const t = await token();

  // SUCCESS path.
  const ok = await payOnce(t, "SUCCESS");
  check("simulate SUCCESS -> order created", ok.sim.status === 200 && typeof ok.sim.body.data?.orderPk === "string", `orderPk=${ok.sim.body.data?.orderPk?.slice(0, 8)}`);
  check("status -> CONVERTED + CAPTURED + order", ok.st.body.data?.holdStatusCode === "CONVERTED" && ok.st.body.data?.paymentIntentStatusCode === "CAPTURED" && Boolean(ok.st.body.data?.orderPk), `order=${ok.st.body.data?.orderStatusCode}`);

  // FAILURE path (hold stays usable; no order).
  const bad = await payOnce(t, "FAILURE");
  check("simulate FAILURE -> no order", bad.sim.status === 200 && bad.sim.body.data?.orderPk === null && bad.sim.body.data?.paymentIntentStatusCode === "FAILED");

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
