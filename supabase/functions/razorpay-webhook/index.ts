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

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 1000) ?? null,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : null,
      message: typeof record.message === "string" ? record.message : JSON.stringify(record).slice(0, 500),
      code: record.code ?? null,
      details: record.details ?? null,
      hint: record.hint ?? null,
    };
  }

  return {
    name: null,
    message: String(error),
  };
}

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
    safeLog("razorpay_webhook_insert_failed", { eventType, error: errorDetails(insertError) });
    return jsonResponse({ ok: false, error: "Webhook ledger insert failed." }, 500);
  }

  const webhookPk = insertedEvent?.payment_webhook_event_pk;
  const { error: processingUpdateError } = await supabase
    .from("payment_webhook_event")
    .update({ processing_status_code: "PROCESSING" })
    .eq("payment_webhook_event_pk", webhookPk);
  if (processingUpdateError) {
    safeLog("razorpay_webhook_processing_status_update_failed", {
      eventType,
      webhookPk,
      error: errorDetails(processingUpdateError),
    });
    return jsonResponse({ ok: false, error: "Webhook status update failed." }, 500);
  }

  try {
    const entity = paymentEntity(payload);
    safeLog("razorpay_webhook_processing_started", {
      eventType,
      webhookPk,
      providerOrderRef: entity?.order_id ?? null,
      providerPaymentRef: entity?.id ?? null,
      amount: entity?.amount ?? null,
      currency: entity?.currency ?? null,
    });

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
        safeLog("razorpay_webhook_convert_rpc_failed", {
          eventType,
          webhookPk,
          providerOrderRef: entity.order_id,
          providerPaymentRef: entity.id,
          error: errorDetails(error),
        });
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
        safeLog("razorpay_webhook_failed_rpc_failed", {
          eventType,
          webhookPk,
          providerOrderRef: entity.order_id,
          providerPaymentRef: entity.id ?? null,
          error: errorDetails(error),
        });
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
    const details = errorDetails(error);
    const message = typeof details.message === "string" ? details.message.slice(0, 500) : "Webhook processing failed.";
    const { error: failureUpdateError } = await supabase
      .from("payment_webhook_event")
      .update({
        processing_status_code: "FAILED",
        processing_error_text: message,
        processed_at: new Date().toISOString(),
      })
      .eq("payment_webhook_event_pk", webhookPk);
    safeLog("razorpay_webhook_processing_failed", {
      eventType,
      webhookPk,
      error: details,
      failureUpdateError: failureUpdateError ? errorDetails(failureUpdateError) : null,
    });
    return jsonResponse({ ok: false, error: "Webhook processing failed.", detail: message }, 500);
  }
});
