import { createSign } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Firebase Cloud Messaging HTTP v1 sender (Slice 16). Mints a short-lived OAuth
 * access token from the Firebase **service-account** (server secret, env-only —
 * never committed) and posts messages to the FCM v1 endpoint. The legacy server
 * key is not used. Credential resolution order: `FCM_SERVICE_ACCOUNT_JSON` (the
 * JSON string) → `FCM_SERVICE_ACCOUNT_PATH` (a file path). When neither is set,
 * push is treated as disabled (the rest of the app is unaffected — the Razorpay
 * gating pattern).
 */

interface ServiceAccount {
  readonly client_email: string;
  readonly private_key: string;
  readonly project_id: string;
  readonly token_uri: string;
}

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

let cachedAccount: ServiceAccount | null = null;
let cachedToken: { value: string; expiresAtMs: number } | null = null;

export function isPushConfigured(): boolean {
  return Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON || process.env.FCM_SERVICE_ACCOUNT_PATH);
}

function loadServiceAccount(): ServiceAccount | null {
  if (cachedAccount) return cachedAccount;
  let raw = process.env.FCM_SERVICE_ACCOUNT_JSON ?? null;
  if (!raw && process.env.FCM_SERVICE_ACCOUNT_PATH) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("node:fs") as typeof import("node:fs");
    raw = fs.readFileSync(process.env.FCM_SERVICE_ACCOUNT_PATH, "utf8");
  }
  if (!raw) return null;
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) return null;
  cachedAccount = { ...parsed, token_uri: parsed.token_uri || "https://oauth2.googleapis.com/token" };
  return cachedAccount;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** Mint (and cache) an OAuth2 access token via a signed JWT bearer grant. */
async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 60_000) return cachedToken.value;

  const iat = Math.floor(now / 1000);
  const claim = { iss: account.client_email, scope: FCM_SCOPE, aud: account.token_uri, iat, exp: iat + 3600 };
  const header = { alg: "RS256", typ: "JWT" };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(account.private_key);
  const assertion = `${signingInput}.${base64url(signature)}`;

  const res = await fetch(account.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`fcm_oauth_failed: ${res.status} ${body.error ?? ""}`.trim());
  }
  cachedToken = { value: body.access_token, expiresAtMs: now + (body.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

export interface PushMessage {
  readonly title: string;
  readonly body: string;
  /** String-valued data payload — carries the deep-link path under `link`. */
  readonly data?: Readonly<Record<string, string>>;
}

export type FcmSendResult =
  | { readonly ok: true; readonly messageName: string }
  | { readonly ok: false; readonly status: number; readonly errorCode: string; readonly unregistered: boolean };

/** Send one message to a device token via FCM HTTP v1. */
export async function sendFcmMessage(deviceToken: string, message: PushMessage): Promise<FcmSendResult> {
  const account = loadServiceAccount();
  if (!account) throw new Error("fcm_not_configured");
  const accessToken = await getAccessToken(account);

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title: message.title, body: message.body },
        data: message.data ?? {},
        android: { priority: "high" },
      },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    name?: string;
    error?: { status?: string; message?: string };
  };
  if (res.ok && body.name) return { ok: true, messageName: body.name };
  const errorCode = body.error?.status ?? `HTTP_${res.status}`;
  // A stale/invalid token is data, not an auth failure.
  const unregistered = errorCode === "NOT_FOUND" || errorCode === "UNREGISTERED" || res.status === 404;
  return { ok: false, status: res.status, errorCode, unregistered };
}

/**
 * Send a push to every active device of a profile. Records a `notification_outbox`
 * row + a `notification_delivery_attempt` per device, and deactivates tokens FCM
 * reports as unregistered. Returns counts. Service-role client required.
 */
export async function sendPushToProfile(
  service: SupabaseClient,
  profilePk: string,
  message: PushMessage,
): Promise<{ sent: number; failed: number; devices: number }> {
  const { data: devices } = await service
    .from("notification_device")
    .select("notification_device_pk, push_token")
    .eq("iam_profile_fk", profilePk)
    .eq("is_active", true);

  const rows = (devices ?? []) as { notification_device_pk: string; push_token: string }[];
  if (rows.length === 0) return { sent: 0, failed: 0, devices: 0 };

  const now = new Date().toISOString();
  const { data: outbox } = await service
    .from("notification_outbox")
    .insert({
      channel_code: "PUSH",
      recipient_profile_fk: profilePk,
      resolved_destination_text: `${rows.length} device(s)`,
      payload_json: { title: message.title, body: message.body, data: message.data ?? {} },
      send_status_code: "SENDING",
      scheduled_at: now,
    })
    .select("notification_outbox_pk")
    .single();
  const outboxPk = (outbox as { notification_outbox_pk: string } | null)?.notification_outbox_pk ?? null;

  let sent = 0;
  let failed = 0;
  let attempt = 0;
  for (const device of rows) {
    attempt += 1;
    let result: FcmSendResult;
    try {
      result = await sendFcmMessage(device.push_token, message);
    } catch (e) {
      result = { ok: false, status: 500, errorCode: e instanceof Error ? e.message : "send_error", unregistered: false };
    }
    if (result.ok) sent += 1;
    else failed += 1;

    if (outboxPk) {
      await service.from("notification_delivery_attempt").insert({
        notification_outbox_fk: outboxPk,
        provider_code: "FCM",
        provider_message_ref: result.ok ? result.messageName : null,
        attempt_status_code: result.ok ? "SENT" : "FAILED",
        attempt_number: attempt,
        error_code: result.ok ? null : result.errorCode,
      });
    }
    if (!result.ok && result.unregistered) {
      await service.from("notification_device").update({ is_active: false, updated_at: now }).eq("notification_device_pk", device.notification_device_pk);
    }
  }

  if (outboxPk) {
    await service
      .from("notification_outbox")
      .update({ send_status_code: sent > 0 ? "SENT" : "FAILED", sent_at: now, updated_at: now })
      .eq("notification_outbox_pk", outboxPk);
  }
  return { sent, failed, devices: rows.length };
}
