import { jsonResponse, safeLog } from "../_shared/http.ts";
import { requiredEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { paymentEventId, verifyRazorpaySignature } from "../_shared/razorpay.ts";

type RazorpayPaymentEntity = {
  readonly id?: string;
  readonly order_id?: string;
  readonly amount?: number;
  readonly currency?: string;
  readonly status?: string;
  readonly method?: string;
  readonly fee?: number;
  readonly tax?: number;
  readonly captured_at?: number;
};

function paymentEntity(payload: Record<string, unknown>): RazorpayPaymentEntity | null {
  const outerPayload = payload.payload;
  if (!outerPayload || typeof outerPayload !== "object") return null;
  const payment = (outerPayload as Record<string, unknown>).payment;
  if (!payment || typeof payment !== "object") return null;
  const entity = (payment as Record<string, unknown>).entity;
  return entity && typeof entity === "object" ? (entity as RazorpayPaymentEntity) : null;
}

function capturedAt(entity: RazorpayPaymentEntity): string {
  return typeof entity.captured_at === "number"
    ? new Date(entity.captured_at * 1000).toISOString()
    : new Date().toISOString();
}

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

  const { data: insertedEvent, error: insertError } = await supabase
    .from("payment_webhook_event")
    .insert({
      provider_code: "RAZORPAY",
      provider_event_id: eventId,
      event_type_code: eventType,
      signature_verified_flag: true,
      raw_payload_json: payload,
      processing_status_code: "RECEIVED",
    })
    .select("payment_webhook_event_pk")
    .single();

  if (insertError?.code === "23505") {
    return jsonResponse({ ok: true, duplicate: true });
  }

  if (insertError) {
    safeLog("razorpay_webhook_insert_failed", { eventType });
    return jsonResponse({ ok: false, error: "Webhook ledger insert failed." }, 500);
  }

  const webhookPk = insertedEvent?.payment_webhook_event_pk;
  await supabase
    .from("payment_webhook_event")
    .update({ processing_status_code: "PROCESSING" })
    .eq("payment_webhook_event_pk", webhookPk);

  try {
    const entity = paymentEntity(payload);
    if ((eventType === "payment.captured" || eventType === "order.paid") && entity?.order_id && entity.id) {
      const { data, error } = await supabase.rpc("api_convert_paid_hold_to_order", {
        p_provider_order_ref: entity.order_id,
        p_provider_payment_ref: entity.id,
        p_amount_paise: entity.amount ?? 0,
        p_currency_code: entity.currency ?? "INR",
        p_payment_method_code: entity.method ?? null,
        p_fee_paise: entity.fee ?? 0,
        p_tax_paise: entity.tax ?? 0,
        p_captured_at: capturedAt(entity),
        p_webhook_event_pk: webhookPk,
        p_provider_payload_json: entity,
      });

      if (error) {
        throw error;
      }

      await supabase
        .from("payment_webhook_event")
        .update({ processing_status_code: "PROCESSED", processed_at: new Date().toISOString() })
        .eq("payment_webhook_event_pk", webhookPk);
      safeLog("razorpay_webhook_processed", { eventType, converted: Array.isArray(data) ? data.length : 1 });
      return jsonResponse({ ok: true, processed: true });
    }

    if (eventType === "payment.failed" && entity?.order_id) {
      const { error } = await supabase.rpc("api_record_razorpay_payment_failed", {
        p_provider_order_ref: entity.order_id,
        p_provider_payment_ref: entity.id ?? null,
        p_amount_paise: entity.amount ?? 0,
        p_currency_code: entity.currency ?? "INR",
        p_payment_method_code: entity.method ?? null,
        p_webhook_event_pk: webhookPk,
        p_provider_payload_json: entity,
      });

      if (error) {
        throw error;
      }

      await supabase
        .from("payment_webhook_event")
        .update({ processing_status_code: "PROCESSED", processed_at: new Date().toISOString() })
        .eq("payment_webhook_event_pk", webhookPk);
      safeLog("razorpay_webhook_processed", { eventType });
      return jsonResponse({ ok: true, processed: true });
    }

    await supabase
      .from("payment_webhook_event")
      .update({ processing_status_code: "IGNORED", processed_at: new Date().toISOString() })
      .eq("payment_webhook_event_pk", webhookPk);
    safeLog("razorpay_webhook_ignored", { eventType });
    return jsonResponse({ ok: true, ignored: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Webhook processing failed.";
    await supabase
      .from("payment_webhook_event")
      .update({
        processing_status_code: "FAILED",
        processing_error_text: message,
        processed_at: new Date().toISOString(),
      })
      .eq("payment_webhook_event_pk", webhookPk);
    safeLog("razorpay_webhook_processing_failed", { eventType });
    return jsonResponse({ ok: false, error: "Webhook processing failed." }, 500);
  }
});
