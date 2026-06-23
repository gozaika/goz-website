// Slice 11 live smoke. Mints a real bearer token for Priya (rich demo consumer)
// and proves the customer account BFF endpoints return well-formed envelopes:
//   GET /account/passport          -> tier card + 6 badges + progress
//   GET /account/discovery-profile -> tried/untried cuisines + diversity score
// Also proves the endpoints reject an unauthenticated request (401 UNAUTHENTICATED).
//
//   ANON_KEY=... CONSUMER_BFF_ORIGIN=http://127.0.0.1:3003 node scripts/smoke/slice11-passport-smoke.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const BASE = `${process.env.CONSUMER_BFF_ORIGIN ?? "http://127.0.0.1:3003"}/api/mobile/v1`;
// Priya (rich demo consumer with a consumer_profile + order history).
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

function H(t) {
  const h = { "x-client-schema-version": "1" };
  if (t) h.authorization = `Bearer ${t}`;
  return h;
}
async function j(method, path, t) {
  const r = await fetch(`${BASE}${path}`, { method, headers: H(t) });
  return { status: r.status, body: await r.json().catch(() => null) };
}

(async () => {
  if (!ANON) {
    console.error("ANON_KEY not set");
    process.exit(2);
  }
  const t = await token();

  // Passport
  const pass = await j("GET", "/account/passport", t);
  const p = pass.body?.data;
  check("passport 200 + ok envelope", pass.status === 200 && pass.body?.ok === true, `status=${pass.status}`);
  check(
    "passport has stat + 6 badges + tier",
    Boolean(p?.stat?.consumerProfilePk) && Array.isArray(p?.badges) && p.badges.length === 6 && typeof p?.stat?.currentTierCode === "string",
    `tier=${p?.stat?.currentTierCode} bags=${p?.stat?.totalBagsCollected} badges=${p?.badges?.length}`,
  );
  check(
    "passport progress is coherent",
    typeof p?.progressPercent === "number" && p.progressPercent >= 0 && p.progressPercent <= 100 && (p?.bagsToNextTier === null || p.bagsToNextTier >= 0),
    `progress=${p?.progressPercent}% toNext=${p?.bagsToNextTier} next=${p?.nextTierCode}`,
  );

  // Discovery profile
  const disc = await j("GET", "/account/discovery-profile", t);
  const d = disc.body?.data;
  check("discovery 200 + ok envelope", disc.status === 200 && disc.body?.ok === true, `status=${disc.status}`);
  check(
    "discovery has cuisines + bounded score",
    Array.isArray(d?.triedCuisines) && Array.isArray(d?.untriedCuisines) && typeof d?.flavourDiversityScore === "number" && d.flavourDiversityScore >= 0 && d.flavourDiversityScore <= 100,
    `score=${d?.flavourDiversityScore} (${d?.flavourPersonalityLabel}) tried=${d?.triedCuisines?.length}/${d?.totalAvailableCuisines}`,
  );
  const triedCodes = new Set((d?.triedCuisines ?? []).map((c) => c.cuisineCode));
  check(
    "discovery tried/untried are disjoint",
    (d?.untriedCuisines ?? []).every((u) => !triedCodes.has(u.cuisineCode)),
  );

  // Auth gate
  const anon = await j("GET", "/account/passport", null);
  check("unauthenticated passport -> 401 UNAUTHENTICATED", anon.status === 401 && anon.body?.error?.code === "UNAUTHENTICATED", `status=${anon.status} code=${anon.body?.error?.code}`);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
