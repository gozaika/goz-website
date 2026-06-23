// Slice 10 live consent-settings smoke. Mints a real bearer token for Priya and
// exercises the customer consent BFF:
//   GET  /account/consent            -> 200, all 6 purposes, currentPolicyVersion
//   POST /account/consent (revoke)   -> MARKETING REVOKED, echoed in refreshed settings
//   POST /account/consent (grant)    -> MARKETING GRANTED again (round-trip)
//   POST revoke OPERATIONAL          -> rejected (required purpose stays granted)
//   GET  no token                    -> 401 UNAUTHENTICATED
//
//   ANON_KEY=... CONSUMER_BFF_ORIGIN=http://127.0.0.1:3003 node scripts/smoke/slice10-consent-smoke.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const BASE = `${process.env.CONSUMER_BFF_ORIGIN ?? "http://127.0.0.1:3003"}/api/mobile/v1`;
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
  const h = { "x-client-schema-version": "1" };
  if (t) h.authorization = `Bearer ${t}`;
  if (body) h["content-type"] = "application/json";
  return h;
}
async function j(method, path, t, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: H(t, body), body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const stateOf = (data, code) => data?.settings?.find((s) => s.purposeCode === code)?.stateCode ?? null;

(async () => {
  if (!ANON) {
    console.error("ANON_KEY not set");
    process.exit(2);
  }
  const t = await token();

  const get = await j("GET", "/account/consent", t);
  const d = get.body?.data;
  const codes = new Set((d?.settings ?? []).map((s) => s.purposeCode));
  const allSix = ["OPERATIONAL", "MARKETING", "ANALYTICS", "REFERRAL_COMMS", "WHATSAPP_TRANSACTIONAL", "WHATSAPP_MARKETING"].every((c) => codes.has(c));
  check("GET 200 + ok envelope", get.status === 200 && get.body?.ok === true, `status=${get.status}`);
  check("all 6 purposes present + policy version", allSix && typeof d?.currentPolicyVersion === "string", `n=${d?.settings?.length} policy=${d?.currentPolicyVersion}`);
  const operational = d?.settings?.find((s) => s.purposeCode === "OPERATIONAL");
  check("operational is required", operational?.isRequiredForService === true);

  const revoke = await j("POST", "/account/consent", t, { purposeCode: "MARKETING", state: "REVOKED" });
  check("POST revoke MARKETING -> REVOKED in refreshed settings", revoke.status === 200 && stateOf(revoke.body?.data, "MARKETING") === "REVOKED", `state=${stateOf(revoke.body?.data, "MARKETING")}`);

  const grant = await j("POST", "/account/consent", t, { purposeCode: "MARKETING", state: "GRANTED" });
  check("POST grant MARKETING -> GRANTED (round-trip)", grant.status === 200 && stateOf(grant.body?.data, "MARKETING") === "GRANTED", `state=${stateOf(grant.body?.data, "MARKETING")}`);

  const badRevoke = await j("POST", "/account/consent", t, { purposeCode: "OPERATIONAL", state: "REVOKED" });
  const opStillGranted = (await j("GET", "/account/consent", t)).body?.data?.settings?.find((s) => s.purposeCode === "OPERATIONAL");
  check("revoking required OPERATIONAL is rejected + stays granted", badRevoke.status >= 400 && opStillGranted?.stateCode !== "REVOKED", `status=${badRevoke.status} op=${opStillGranted?.stateCode}`);

  const anon = await j("GET", "/account/consent", null);
  check("unauthenticated -> 401 UNAUTHENTICATED", anon.status === 401 && anon.body?.error?.code === "UNAUTHENTICATED", `status=${anon.status} code=${anon.body?.error?.code}`);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
