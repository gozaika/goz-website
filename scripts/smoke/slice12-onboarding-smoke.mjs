// Slice 12 live onboarding + location-pin smoke. Mints OWNER + PICKUP_STAFF
// tokens for Bawarchi and exercises the restaurant onboarding/location BFF:
//   GET   /restaurant/onboarding (OWNER)        -> 200, 6 steps + tasks, canManage
//   GET   /restaurant/profile (OWNER)           -> has latitude/longitude fields
//   PATCH /restaurant/location {lat,lng} (OWNER)-> 200, profile coords set
//   GET   /restaurant/onboarding (OWNER)        -> LOCATION step done=true
//   PATCH /restaurant/onboarding {task,DONE}    -> 200, task COMPLETED
//   PATCH /restaurant/onboarding {bogus task}   -> 404 NOT_FOUND
//   PATCH /restaurant/location {null,null}      -> 200, coords cleared (restore)
//   PATCH /restaurant/location (PICKUP_STAFF)   -> 403 ROLE_DENIED
//   GET   /restaurant/onboarding (no token)     -> 401 UNAUTHENTICATED
// Run with the restaurant BFF up on :3001 and local Supabase reachable + seeded.
//
//   ANON_KEY=... BFF_ORIGIN=http://127.0.0.1:3001 node scripts/smoke/slice12-onboarding-smoke.mjs

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

async function call(method, path, token, body) {
  const headers = { "x-client-schema-version": "1", "x-gozaika-restaurant": BAWARCHI };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body) headers["content-type"] = "application/json";
  const r = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}

(async () => {
  if (!ANON) {
    console.error("ANON_KEY not set");
    process.exit(2);
  }

  const ownerToken = await mintToken(USERS.OWNER);

  const onboarding = await call("GET", "/restaurant/onboarding", ownerToken);
  const ob = onboarding.body?.data;
  check("OWNER /restaurant/onboarding -> 200", onboarding.status === 200 && onboarding.body?.ok === true, `status=${onboarding.status}`);
  check(
    "onboarding has 6 derived steps + canManage",
    Array.isArray(ob?.steps) && ob.steps.length === 6 && ob?.canManage === true && typeof ob?.completedSteps === "number",
    `steps=${ob?.steps?.length} done=${ob?.completedSteps}`,
  );

  const profile0 = await call("GET", "/restaurant/profile", ownerToken);
  check(
    "profile exposes latitude/longitude fields",
    profile0.status === 200 && "latitude" in (profile0.body?.data ?? {}) && "longitude" in (profile0.body?.data ?? {}),
  );

  const setLoc = await call("PATCH", "/restaurant/location", ownerToken, { latitude: 17.4126, longitude: 78.4482 });
  check(
    "PATCH location -> 200 + coords set",
    setLoc.status === 200 && setLoc.body?.data?.latitude === 17.4126 && setLoc.body?.data?.longitude === 78.4482,
    `status=${setLoc.status} lat=${setLoc.body?.data?.latitude}`,
  );

  const afterPin = await call("GET", "/restaurant/onboarding", ownerToken);
  const locStep = (afterPin.body?.data?.steps ?? []).find((s) => s.key === "LOCATION");
  check("LOCATION step now done", locStep?.done === true, `done=${locStep?.done}`);

  // Transition the first manual task (if any) to COMPLETED, then verify.
  const firstTask = (ob?.tasks ?? [])[0];
  if (firstTask) {
    const setTask = await call("PATCH", "/restaurant/onboarding", ownerToken, { taskCode: firstTask.taskCode, statusCode: "COMPLETED" });
    const updated = (setTask.body?.data?.tasks ?? []).find((t) => t.taskCode === firstTask.taskCode);
    check("PATCH onboarding task -> COMPLETED", setTask.status === 200 && updated?.statusCode === "COMPLETED", `status=${setTask.status} now=${updated?.statusCode}`);
    // restore prior status
    await call("PATCH", "/restaurant/onboarding", ownerToken, { taskCode: firstTask.taskCode, statusCode: firstTask.statusCode === "COMPLETED" ? "COMPLETED" : "PENDING" });
  } else {
    check("PATCH onboarding task -> COMPLETED (skipped: no seeded tasks)", true);
  }

  const bogus = await call("PATCH", "/restaurant/onboarding", ownerToken, { taskCode: "NOT_A_TASK", statusCode: "COMPLETED" });
  check("bogus task -> 404 NOT_FOUND", bogus.status === 404 && bogus.body?.error?.code === "NOT_FOUND", `status=${bogus.status} code=${bogus.body?.error?.code}`);

  // Restore: clear the pin we set (idempotent for re-runs).
  const clearLoc = await call("PATCH", "/restaurant/location", ownerToken, { latitude: null, longitude: null });
  check("PATCH location clear -> 200 + null coords", clearLoc.status === 200 && clearLoc.body?.data?.latitude === null, `status=${clearLoc.status}`);

  const staffToken = await mintToken(USERS.PICKUP_STAFF);
  const staffLoc = await call("PATCH", "/restaurant/location", staffToken, { latitude: 17.4, longitude: 78.4 });
  check("PICKUP_STAFF location -> 403 ROLE_DENIED", staffLoc.status === 403 && staffLoc.body?.error?.code === "ROLE_DENIED", `status=${staffLoc.status} code=${staffLoc.body?.error?.code}`);

  const anon = await call("GET", "/restaurant/onboarding", null);
  check("unauthenticated -> 401 UNAUTHENTICATED", anon.status === 401 && anon.body?.error?.code === "UNAUTHENTICATED", `status=${anon.status} code=${anon.body?.error?.code}`);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
