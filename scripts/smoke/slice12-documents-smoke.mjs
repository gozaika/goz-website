// Slice 12 live private-document smoke. Drives the full restaurant compliance
// document loop against the restaurant BFF + local Supabase with real tokens:
//   OWNER sign-upload -> upload bytes to the signed URL -> list shows PENDING_REVIEW
//   -> signed download URL is fetchable -> bogus doc 404
//   PICKUP_STAFF list -> 403 ROLE_DENIED (manageCompliance)
//   no token -> 401 UNAUTHENTICATED
// Run with the restaurant BFF up on :3001 and local Supabase seeded.
//
//   ANON_KEY=... BFF_ORIGIN=http://127.0.0.1:3001 node scripts/smoke/slice12-documents-smoke.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const BFF = process.env.BFF_ORIGIN ?? "http://127.0.0.1:3001";
const BASE = `${BFF}/api/mobile/v1`;
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

function sbClient() {
  return createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
}
async function mint(sb, { phone, otp }) {
  await sb.auth.signInWithOtp({ phone });
  const v = await sb.auth.verifyOtp({ phone, token: otp, type: "sms" });
  if (v.error) throw new Error(`verifyOtp(${phone}): ${v.error.message}`);
  return v.data.session.access_token;
}
function H(t, body) {
  const h = { "x-client-schema-version": "1", "x-gozaika-restaurant": BAWARCHI };
  if (t) h.authorization = `Bearer ${t}`;
  if (body) h["content-type"] = "application/json";
  return h;
}
async function j(method, path, t, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: H(t, body), body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}

(async () => {
  if (!ANON) {
    console.error("ANON_KEY not set");
    process.exit(2);
  }
  const ownerSb = sbClient();
  const ownerToken = await mint(ownerSb, USERS.OWNER);

  // 1. Sign-upload.
  const fileName = `smoke-fssai-${Date.now()}.pdf`;
  const sign = await j("POST", "/restaurant/documents", ownerToken, {
    restaurantPk: BAWARCHI,
    documentTypeCode: "FSSAI_LICENSE",
    fileName,
    mimeType: "application/pdf",
    sizeBytes: 20,
  });
  const ticket = sign.body?.data;
  check("OWNER sign-upload -> 200 ticket", sign.status === 200 && Boolean(ticket?.token) && Boolean(ticket?.documentPk), `bucket=${ticket?.bucket}`);

  // 2. Upload bytes straight to the private bucket via the signed URL.
  let uploaded = false;
  if (ticket?.token) {
    const bytes = new TextEncoder().encode("%PDF-1.4 smoke\n");
    const up = await ownerSb.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, bytes, { contentType: "application/pdf" });
    uploaded = !up.error;
  }
  check("upload bytes to signed URL succeeds", uploaded);

  // 3. List shows the new doc as PENDING_REVIEW.
  const list = await j("GET", "/restaurant/documents", ownerToken);
  const mine = (list.body?.data?.documents ?? []).find((d) => d.documentPk === ticket?.documentPk);
  check("list shows the uploaded doc PENDING_REVIEW", list.status === 200 && mine?.statusCode === "PENDING_REVIEW" && mine?.documentTypeCode === "FSSAI_LICENSE", `status=${mine?.statusCode} file=${mine?.originalFilename}`);

  // 4. Signed download URL is issued + fetchable.
  let downloadOk = false;
  if (ticket?.documentPk) {
    const su = await j("GET", `/restaurant/documents/${ticket.documentPk}/signed-url`, ownerToken);
    if (su.status === 200 && su.body?.data?.signedUrl) {
      const r = await fetch(su.body.data.signedUrl);
      downloadOk = r.ok;
    }
  }
  check("signed download URL is fetchable", downloadOk);

  // 5. Bogus document id -> 404.
  const bogus = await j("GET", "/restaurant/documents/00000000-0000-0000-0000-0000000000ff/signed-url", ownerToken);
  check("bogus document id -> 404 NOT_FOUND", bogus.status === 404 && bogus.body?.error?.code === "NOT_FOUND", `status=${bogus.status}`);

  // 6. PICKUP_STAFF lacks manageCompliance -> 403 ROLE_DENIED.
  const staffToken = await mint(sbClient(), USERS.PICKUP_STAFF);
  const staff = await j("GET", "/restaurant/documents", staffToken);
  check("PICKUP_STAFF list -> 403 ROLE_DENIED", staff.status === 403 && staff.body?.error?.code === "ROLE_DENIED", `status=${staff.status} code=${staff.body?.error?.code}`);

  // 7. Unauthenticated.
  const anon = await j("GET", "/restaurant/documents", null);
  check("unauthenticated -> 401 UNAUTHENTICATED", anon.status === 401 && anon.body?.error?.code === "UNAUTHENTICATED", `status=${anon.status}`);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
