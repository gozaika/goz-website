// Shared context for the functional harness: config, demo-role token minting,
// and a thin HTTP client against the mobile BFF. All identity comes from the
// seeded test_otp map (supabase/config.toml) — no secrets in this file.

import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
export const ANON_KEY = process.env.ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const BFF_ORIGIN = process.env.BFF_ORIGIN ?? "http://127.0.0.1:3001";
const BASE = `${BFF_ORIGIN}/api/mobile/v1`;

/** Seeded restaurants (demo_seed / test_otp). */
export const RESTAURANTS = {
  BAWARCHI: "20000000-0000-0000-0000-300000000001",
  SATTVIK: "20000000-0000-0000-0000-300000000002",
};

/** Seeded role members on Bawarchi (+ a cross-tenant Sattvik owner). phone/otp from config.toml. */
export const ROLES = {
  OWNER: { phone: "+919876520001", otp: "200001" }, // Bawarchi owner
  ADMIN: { phone: "+919876530001", otp: "300001" },
  OPERATIONS: { phone: "+919876530002", otp: "300002" },
  PICKUP_STAFF: { phone: "+919876530003", otp: "300003" },
  FINANCE: { phone: "+919876530004", otp: "300004" },
  OWNER_SATTVIK: { phone: "+919876520002", otp: "200002" }, // cross-tenant
};

const tokenCache = new Map();

/** Mint (and cache) a real Supabase bearer token for a demo role via test_otp. */
export async function tokenFor(roleKey) {
  if (tokenCache.has(roleKey)) return tokenCache.get(roleKey);
  const who = ROLES[roleKey];
  if (!who) throw new Error(`unknown role ${roleKey}`);
  const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const req = await sb.auth.signInWithOtp({ phone: who.phone });
  if (req.error) throw new Error(`signInWithOtp(${roleKey}): ${req.error.message}`);
  const ver = await sb.auth.verifyOtp({ phone: who.phone, token: who.otp, type: "sms" });
  if (ver.error) throw new Error(`verifyOtp(${roleKey}): ${ver.error.message}`);
  const token = ver.data.session.access_token;
  tokenCache.set(roleKey, token);
  return token;
}

/**
 * Call a mobile BFF endpoint. Pass `role` (resolved to a bearer token) or `token`
 * directly; `restaurantPk` sets the selected-restaurant header; `schemaVersion`
 * defaults to 1. Returns { status, ok, code, data, body }.
 */
export async function api(method, path, opts = {}) {
  const headers = { "x-client-schema-version": String(opts.schemaVersion ?? 1) };
  let token = opts.token;
  if (!token && opts.role) token = await tokenFor(opts.role);
  if (token) headers.authorization = `Bearer ${token}`;
  if (opts.restaurantPk) headers["x-gozaika-restaurant"] = opts.restaurantPk;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const ok = body?.ok === true;
  const code = body?.ok === false ? body.error?.code : ok ? "OK" : null;
  return { status: res.status, ok, code, data: body?.data, body };
}

/** Preflight: BFF reachable + ANON_KEY present. Throws a clear message otherwise. */
export async function preflight() {
  if (!ANON_KEY) throw new Error("ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is not set. See scripts/functional/README.md.");
  let res;
  try {
    res = await fetch(`${BASE}/health`);
  } catch {
    throw new Error(`BFF not reachable at ${BFF_ORIGIN}. Start it (npm run -w @gozaika/restaurant-mgmt-web dev -- -p 3001) or set BFF_ORIGIN.`);
  }
  if (res.status !== 200) throw new Error(`BFF health returned ${res.status} at ${BFF_ORIGIN}.`);
}
