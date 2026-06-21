// Slice 7 live role-denial smoke. Mints real bearer tokens for FINANCE and
// PICKUP_STAFF members of Bawarchi, then exercises the counter BFF endpoints to
// prove the role matrix + tenant isolation enforce as designed. Run with the BFF
// dev server up on :3001 and local Supabase reachable.
//
//   ANON_KEY=... SUPABASE_URL=http://127.0.0.1:54321 node scripts/smoke/slice7-role-smoke.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const BFF = process.env.BFF_ORIGIN ?? "http://127.0.0.1:3001";
const BASE = `${BFF}/api/mobile/v1`;

const BAWARCHI = "20000000-0000-0000-0000-300000000001";
const SATTVIK = "20000000-0000-0000-0000-300000000002";
const FAKE_ORDER = "40000000-0000-0000-0000-000000000099";

const USERS = {
  FINANCE: { phone: "+919876530004", otp: "300004" },
  PICKUP_STAFF: { phone: "+919876530003", otp: "300003" },
};

async function mintToken({ phone, otp }) {
  const sb = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const req = await sb.auth.signInWithOtp({ phone });
  if (req.error) throw new Error(`signInWithOtp(${phone}): ${req.error.message}`);
  const ver = await sb.auth.verifyOtp({ phone, token: otp, type: "sms" });
  if (ver.error) throw new Error(`verifyOtp(${phone}): ${ver.error.message}`);
  return ver.data.session.access_token;
}

async function call(method, path, { token, restaurantPk, body } = {}) {
  const headers = { "x-client-schema-version": "1" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (restaurantPk) headers["x-gozaika-restaurant"] = restaurantPk;
  if (body) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch {}
  const code = json?.ok === false ? json.error?.code : json?.ok === true ? "OK" : "(none)";
  return { status: res.status, code };
}

const results = [];
function check(label, got, expectStatus, expectCode) {
  const pass = got.status === expectStatus && got.code === expectCode;
  results.push({ label, got: `${got.status} ${got.code}`, want: `${expectStatus} ${expectCode}`, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(48)} got ${got.status} ${got.code}  (want ${expectStatus} ${expectCode})`);
}

const verifyBody = { otp: "000000" };
const incidentBody = { typeCode: "QUALITY_ISSUE", descriptionText: "role smoke description" };

// A. Unauthenticated
check("no-token GET /orders", await call("GET", "/orders", { restaurantPk: BAWARCHI }), 401, "UNAUTHENTICATED");

// B. FINANCE — allowed to view, denied to verify/incidents, cross-tenant forbidden
const fin = await mintToken(USERS.FINANCE);
check("FINANCE GET /orders (Bawarchi)", await call("GET", "/orders", { token: fin, restaurantPk: BAWARCHI }), 200, "OK");
check("FINANCE POST verify (Bawarchi)", await call("POST", `/orders/${FAKE_ORDER}/pickup/verify`, { token: fin, restaurantPk: BAWARCHI, body: verifyBody }), 403, "ROLE_DENIED");
check("FINANCE POST incidents (Bawarchi)", await call("POST", `/orders/${FAKE_ORDER}/incidents`, { token: fin, restaurantPk: BAWARCHI, body: incidentBody }), 403, "ROLE_DENIED");
check("FINANCE GET /orders (Sattvik=cross)", await call("GET", "/orders", { token: fin, restaurantPk: SATTVIK }), 403, "FORBIDDEN");

// C. PICKUP_STAFF — allowed to verify/incidents (reaches tenant check), cross-tenant forbidden
const pic = await mintToken(USERS.PICKUP_STAFF);
check("PICKUP GET /orders (Bawarchi)", await call("GET", "/orders", { token: pic, restaurantPk: BAWARCHI }), 200, "OK");
check("PICKUP POST verify (Bawarchi, fake order)", await call("POST", `/orders/${FAKE_ORDER}/pickup/verify`, { token: pic, restaurantPk: BAWARCHI, body: verifyBody }), 404, "NOT_FOUND");
check("PICKUP POST incidents (Bawarchi, fake order)", await call("POST", `/orders/${FAKE_ORDER}/incidents`, { token: pic, restaurantPk: BAWARCHI, body: incidentBody }), 404, "NOT_FOUND");
check("PICKUP GET /orders (Sattvik=cross)", await call("GET", "/orders", { token: pic, restaurantPk: SATTVIK }), 403, "FORBIDDEN");

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
