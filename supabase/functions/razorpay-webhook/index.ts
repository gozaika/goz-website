import { jsonResponse, safeLog } from "../_shared/http.ts";
import { requiredEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { paymentEventId, verifyRazorpaySignature } from "../_shared/razorpay.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const verified = await verifyRazorpaySignature(rawBody, signature, requiredEnv("RAZORPAY_WEBHOOK_SECRET"));

  if (!verified) {
    safeLog("razorpay_webhook_signature_failed");
    return jsonResponse({ ok: false, error: "Invalid signature." }, 401);
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const eventId = paymentEventId(payload);
  const eventType = typeof payload.event === "string" ? payload.event : "UNKNOWN";
  const supabase = createServiceClient();

  const { error: insertError } = await supabase.from("payment_webhook_event").insert({
    provider_code: "RAZORPAY",
    provider_event_id: eventId,
    event_type_code: eventType,
    signature_verified_flag: true,
    raw_payload_json: payload,
    processing_status_code: "RECEIVED",
  });

  if (insertError?.code === "23505") {
    return jsonResponse({ ok: true, duplicate: true });
  }

  if (insertError) {
    safeLog("razorpay_webhook_insert_failed", { eventType });
    return jsonResponse({ ok: false, error: "Webhook ledger insert failed." }, 500);
  }

  // TODO/HUMAN_REVIEW: Wire the captured/failed/refunded event processor after the
  // order conversion transaction is implemented. Do not trust client callbacks.
  safeLog("razorpay_webhook_received", { eventType });
  return jsonResponse({ ok: true });
});

