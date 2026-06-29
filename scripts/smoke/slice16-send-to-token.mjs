// Slice 16 manual delivery tool. Sends ONE real FCM HTTP v1 notification to a
// specific device token using the Firebase service-account. Used to prove
// end-to-end on-device delivery (and handy for debugging a real device later).
//
//   FCM_SERVICE_ACCOUNT_PATH="C:\path\service-account.json" \
//     node scripts/smoke/slice16-send-to-token.mjs "<device-fcm-token>" "Title" "Body"

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const token = process.argv[2];
const title = process.argv[3] ?? "goZaika";
const body = process.argv[4] ?? "Push notifications are working 🎉";
if (!token) {
  console.error("Usage: node scripts/smoke/slice16-send-to-token.mjs <device-token> [title] [body]");
  process.exit(2);
}

const raw = process.env.FCM_SERVICE_ACCOUNT_JSON
  ? process.env.FCM_SERVICE_ACCOUNT_JSON
  : process.env.FCM_SERVICE_ACCOUNT_PATH
    ? readFileSync(process.env.FCM_SERVICE_ACCOUNT_PATH, "utf8")
    : null;
if (!raw) {
  console.error("Set FCM_SERVICE_ACCOUNT_PATH or FCM_SERVICE_ACCOUNT_JSON");
  process.exit(2);
}
const account = JSON.parse(raw);
account.token_uri = account.token_uri || "https://oauth2.googleapis.com/token";

const b64 = (i) => Buffer.from(i).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

async function mint() {
  const iat = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: account.token_uri, iat, exp: iat + 3600 }));
  const sig = b64(createSign("RSA-SHA256").update(`${header}.${claim}`).sign(account.private_key));
  const res = await fetch(account.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${sig}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`oauth failed: ${JSON.stringify(j)}`);
  return j.access_token;
}

(async () => {
  const accessToken = await mint();
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      message: { token, notification: { title, body }, data: { link: "/(tabs)/drops" }, android: { priority: "high" } },
    }),
  });
  const j = await res.json().catch(() => ({}));
  console.log("status", res.status);
  console.log(JSON.stringify(j, null, 2));
  process.exit(res.ok ? 0 : 1);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
