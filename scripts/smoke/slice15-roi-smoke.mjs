// Slice 15 live ROI-report smoke. Mints real bearer tokens for an OWNER and a
// PICKUP_STAFF member of Bawarchi, then exercises the restaurant ROI BFF:
//   GET /reports/roi (OWNER, viewReports)      -> 200 + well-formed payload
//   GET /reports/roi (PICKUP_STAFF)            -> 403 ROLE_DENIED
//   GET /reports/roi (no token)                -> 401 UNAUTHENTICATED
// Run with the restaurant BFF up on :3001 and local Supabase reachable + seeded.
//
//   ANON_KEY=... BFF_ORIGIN=http://127.0.0.1:3001 node scripts/smoke/slice15-roi-smoke.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const BASE = `${process.env.BFF_ORIGIN ?? "http://127.0.0.1:3001"}/api/mobile/v1`;
const BAWARCHI = "20000000-0000-0000-0000-300000000001";

const USERS = {
  OWNER: { phone: "+919876520001", otp: "200001" },
  PICKUP_STAFF: { phone: "+919876530003", otp: "300003" },
};

const results = [];
function check(label, pass, detail = "") {
  results.push({ label, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
}

async function mintToken({ phone, otp }) {
  const sb = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  await sb.auth.signInWithOtp({ phone });
  const v = await sb.auth.verifyOtp({ phone, token: otp, type: "sms" });
  if (v.error) throw new Error(`verifyOtp(${phone}): ${v.error.message}`);
  return v.data.session.access_token;
}

async function getRoi(token) {
  const headers = { "x-client-schema-version": "1", "x-gozaika-restaurant": BAWARCHI };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(`${BASE}/reports/roi`, { headers });
  return { status: r.status, body: await r.json().catch(() => null) };
}

(async () => {
  if (!ANON) {
    console.error("ANON_KEY not set");
    process.exit(2);
  }

  // OWNER allow path.
  const ownerToken = await mintToken(USERS.OWNER);
  const owner = await getRoi(ownerToken);
  const p = owner.body?.data;
  check("OWNER /reports/roi -> 200 ok", owner.status === 200 && owner.body?.ok === true, `status=${owner.status}`);
  check(
    "payload has summary + >=6 metric cards + partner copy",
    Boolean(p?.summary?.restaurantPk) && Array.isArray(p?.summary?.metricCards) && p.summary.metricCards.length >= 6 && Array.isArray(p?.partnerCopy?.summaryLines),
    `drops=${p?.summary?.dropsListedCount} bagsSold=${p?.summary?.bagsSoldCount} net=${p?.summary?.estimatedNetRecoveryPaise} basis=${p?.summary?.netRecoveryBasisCode}`,
  );
  check(
    "partner copy carries no consumer PII (counts only)",
    typeof p?.partnerCopy === "object" && !/\+91\d{10}/.test(JSON.stringify(p.partnerCopy)) && !/@/.test(JSON.stringify(p.partnerCopy)),
  );

  // PICKUP_STAFF deny path.
  const staffToken = await mintToken(USERS.PICKUP_STAFF);
  const staff = await getRoi(staffToken);
  check("PICKUP_STAFF /reports/roi -> 403 ROLE_DENIED", staff.status === 403 && staff.body?.error?.code === "ROLE_DENIED", `status=${staff.status} code=${staff.body?.error?.code}`);

  // Unauthenticated.
  const anon = await getRoi(null);
  check("unauthenticated -> 401 UNAUTHENTICATED", anon.status === 401 && anon.body?.error?.code === "UNAUTHENTICATED", `status=${anon.status} code=${anon.body?.error?.code}`);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
