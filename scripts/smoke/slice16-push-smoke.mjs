// Slice 16 FCM HTTP v1 auth smoke. Proves the Firebase service-account can mint an
// OAuth token and is authorized to call FCM v1 for the project — WITHOUT needing a
// real device token or google-services.json. Sends to a deliberately-invalid token
// and asserts FCM rejects the *token* (HTTP 400/404), not the *auth* (401/403).
//
//   FCM_SERVICE_ACCOUNT_PATH="C:\path\to\service-account.json" node scripts/smoke/slice16-push-smoke.mjs
//   # or: FCM_SERVICE_ACCOUNT_JSON='{...}' node scripts/smoke/slice16-push-smoke.mjs

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const results = [];
function check(label, pass, detail = "") {
  results.push({ label, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
}

function loadAccount() {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON
    ? process.env.FCM_SERVICE_ACCOUNT_JSON
    : process.env.FCM_SERVICE_ACCOUNT_PATH
      ? readFileSync(process.env.FCM_SERVICE_ACCOUNT_PATH, "utf8")
      : null;
  if (!raw) throw new Error("Set FCM_SERVICE_ACCOUNT_PATH or FCM_SERVICE_ACCOUNT_JSON");
  const a = JSON.parse(raw);
  a.token_uri = a.token_uri || "https://oauth2.googleapis.com/token";
  return a;
}

const b64url = (i) => Buffer.from(i).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

async function mint(account) {
  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: account.token_uri, iat, exp: iat + 3600 }),
  );
  const sig = b64url(createSign("RSA-SHA256").update(`${header}.${claim}`).sign(account.private_key));
  const res = await fetch(account.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${sig}` }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

(async () => {
  const account = loadAccount();
  check("service-account has project_id + client_email + private_key", Boolean(account.project_id && account.client_email && account.private_key), account.project_id);

  const tok = await mint(account);
  check("OAuth token minted from service-account", tok.status === 200 && Boolean(tok.body.access_token), `status=${tok.status} ${tok.body.error ?? ""}`);
  if (!tok.body.access_token) {
    console.log(`\n${results.filter((r) => r.pass).length}/${results.length} checks passed`);
    process.exit(1);
  }

  const send = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${tok.body.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { token: "smoke-invalid-token-not-a-real-device", notification: { title: "smoke", body: "smoke" } } }),
  });
  const sendBody = await send.json().catch(() => ({}));
  const status = sendBody?.error?.status ?? `HTTP_${send.status}`;
  // 400 INVALID_ARGUMENT / 404 NOT_FOUND = auth OK, token bad (expected).
  check(
    "FCM v1 authorized the project (rejected the token, not the auth)",
    (send.status === 400 || send.status === 404) && send.status !== 401 && send.status !== 403,
    `status=${send.status} code=${status}`,
  );
  check("not an auth/permission failure", send.status !== 401 && send.status !== 403, `status=${send.status}`);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
