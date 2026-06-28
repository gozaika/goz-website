// Slice 10 live reviews smoke. Mints a real bearer token, finds a COLLECTED order,
// and exercises the customer reviews BFF:
//   GET  /orders                         -> find a COLLECTED order
//   GET  /orders/{id}/review             -> status (NONE|PENDING|APPROVED|REJECTED) + canReview
//   POST /reviews (if canReview)         -> { reviewPk, status:PENDING }
//   POST /reviews again                  -> CONFLICT (already reviewed)
//   GET  /orders/{id}/review             -> now PENDING, canReview=false
//   POST /reviews (no token)             -> 401 UNAUTHENTICATED
//
//   ANON_KEY=... CONSUMER_BFF_ORIGIN=http://127.0.0.1:3003 \
//     REVIEW_PHONE=+91987... REVIEW_OTP=100008 node scripts/smoke/slice10-reviews-smoke.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const BASE = `${process.env.CONSUMER_BFF_ORIGIN ?? "http://127.0.0.1:3003"}/api/mobile/v1`;
const PHONE = process.env.REVIEW_PHONE ?? "+919876510008";
const OTP = process.env.REVIEW_OTP ?? "100008";

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
  const h = { "x-client-schema-version": "1" };
  if (t) h.authorization = `Bearer ${t}`;
  if (body) h["content-type"] = "application/json";
  return h;
}
async function j(method, path, t, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: H(t, body), body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function main() {
  if (!ANON) throw new Error("ANON_KEY env required");
  const t = await token();

  const orders = await j("GET", "/orders", t);
  check("GET /orders 200", orders.status === 200, `status ${orders.status}`);
  const list = orders.body?.data?.orders ?? orders.body?.data ?? [];
  const collected = (Array.isArray(list) ? list : []).find((o) => o.orderStatusCode === "COLLECTED");
  if (!collected) {
    console.log("SKIP — no COLLECTED order for this persona; seed one and re-run.");
    return;
  }
  const id = collected.orderPk ?? collected.id;

  const st = await j("GET", `/orders/${id}/review`, t);
  check("GET review status 200", st.status === 200, JSON.stringify(st.body?.data));

  if (st.body?.data?.canReview) {
    const sub = await j("POST", "/reviews", t, { orderPk: id, ratingValue: 5, reviewText: "Smoke review" });
    check("POST /reviews ok", sub.status === 200 && sub.body?.data?.status === "PENDING", JSON.stringify(sub.body));
    const dup = await j("POST", "/reviews", t, { orderPk: id, ratingValue: 4 });
    check("POST /reviews dedupe -> CONFLICT", dup.status === 409, `status ${dup.status}`);
    const st2 = await j("GET", `/orders/${id}/review`, t);
    check("status now PENDING/!canReview", st2.body?.data?.status === "PENDING" && st2.body?.data?.canReview === false);
  } else {
    check("already-reviewed order reports !canReview", st.body?.data?.canReview === false);
  }

  const noAuth = await j("POST", "/reviews", null, { orderPk: id, ratingValue: 5 });
  check("POST /reviews no token -> 401", noAuth.status === 401, `status ${noAuth.status}`);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
