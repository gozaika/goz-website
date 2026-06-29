// F1 favorites/follows live smoke. Mints a real bearer token and exercises the
// customer follows BFF + verifies the public profile carries an aggregate count:
//   GET    /restaurants                 -> pick a target restaurant (has restaurantPk + followerCount)
//   GET    /follows                     -> baseline list (restaurantPks + cards)
//   POST   /follows {restaurantPk}      -> { following:true, followerCount }
//   GET    /follows                     -> target now present in restaurantPks + a card
//   POST   /follows {restaurantPk}      -> idempotent (still following, count unchanged)
//   GET    /restaurants/{slug}          -> followerCount >= 1 (aggregate surfaced publicly)
//   DELETE /follows {restaurantPk}      -> { following:false }
//   GET    /follows                     -> target gone
//   POST   /follows (no token)          -> 401 UNAUTHENTICATED
//   POST   /follows {bad uuid}          -> 400 VALIDATION
//
//   ANON_KEY=... CONSUMER_BFF_ORIGIN=http://127.0.0.1:3003 \
//     FOLLOW_PHONE=+919876510001 FOLLOW_OTP=100001 node scripts/smoke/f1-follows-smoke.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const BASE = `${process.env.CONSUMER_BFF_ORIGIN ?? "http://127.0.0.1:3003"}/api/mobile/v1`;
const PHONE = process.env.FOLLOW_PHONE ?? "+919876510001";
const OTP = process.env.FOLLOW_OTP ?? "100001";

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

  const restaurants = await j("GET", "/restaurants", t);
  check("GET /restaurants 200", restaurants.status === 200, `status ${restaurants.status}`);
  const list = Array.isArray(restaurants.body?.data) ? restaurants.body.data : [];
  const target = list[0];
  if (!target) {
    console.log("SKIP — no restaurants in discovery; seed and re-run.");
    return;
  }
  const { restaurantPk, restaurantSlug } = target;
  check("restaurant carries followerCount", typeof target.followerCount === "number", JSON.stringify(target.followerCount));

  // Clean baseline: ensure not already following from a prior run.
  await j("DELETE", "/follows", t, { restaurantPk });

  const before = await j("GET", "/follows", t);
  check("GET /follows 200", before.status === 200, `status ${before.status}`);
  check("baseline excludes target", !(before.body?.data?.restaurantPks ?? []).includes(restaurantPk));

  const follow = await j("POST", "/follows", t, { restaurantPk });
  check(
    "POST /follows -> following:true",
    follow.status === 200 && follow.body?.data?.following === true && typeof follow.body?.data?.followerCount === "number",
    JSON.stringify(follow.body?.data),
  );

  const afterFollow = await j("GET", "/follows", t);
  const followedPks = afterFollow.body?.data?.restaurantPks ?? [];
  const cardPks = (afterFollow.body?.data?.restaurants ?? []).map((r) => r.restaurantPk);
  check("target now in restaurantPks", followedPks.includes(restaurantPk));
  check("target has a rail card", cardPks.includes(restaurantPk));

  const followAgain = await j("POST", "/follows", t, { restaurantPk });
  check("POST /follows is idempotent", followAgain.status === 200 && followAgain.body?.data?.following === true);

  const profile = await j("GET", `/restaurants/${restaurantSlug}`, t);
  check("public profile followerCount >= 1", (profile.body?.data?.followerCount ?? 0) >= 1, JSON.stringify(profile.body?.data?.followerCount));

  const unfollow = await j("DELETE", "/follows", t, { restaurantPk });
  check("DELETE /follows -> following:false", unfollow.status === 200 && unfollow.body?.data?.following === false, JSON.stringify(unfollow.body?.data));

  const afterUnfollow = await j("GET", "/follows", t);
  check("target removed after unfollow", !(afterUnfollow.body?.data?.restaurantPks ?? []).includes(restaurantPk));

  const noAuth = await j("POST", "/follows", null, { restaurantPk });
  check("POST /follows no token -> 401", noAuth.status === 401, `status ${noAuth.status}`);

  const bad = await j("POST", "/follows", t, { restaurantPk: "not-a-uuid" });
  check("POST /follows bad uuid -> 400", bad.status === 400, `status ${bad.status}`);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
