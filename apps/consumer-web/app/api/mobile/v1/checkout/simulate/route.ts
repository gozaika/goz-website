import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { uuidSchema, type SimulateResultDto } from "@gozaika/types";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { resolveConsumerProfilePk, simulatorEnabled } from "@/lib/mobile/payments";

/**
 * DEV/DEMO-ONLY simulated payment (Slice 9). Gated by `PAYMENTS_SIMULATOR_ENABLED`
 * (single env-flag gate, per the reviewed design — MUST be off in production). When
 * off, the endpoint behaves as if it does not exist (NOT_FOUND).
 *
 * A SUCCESS runs the SAME canonical `api_convert_paid_hold_to_order` the real webhook
 * calls, so the resulting order + pickup credential are genuine and server-authoritative
 * — only the Razorpay signature step is bypassed (there is no real payment to sign).
 * Simulated payments are tagged `sim_` and ledgered as SIMULATED webhook events.
 */
const bodySchema = z.object({ holdPk: uuidSchema, outcome: z.enum(["SUCCESS", "FAILURE"]) });

export const POST = withMobileAuth(async ({ req, actor, requestId }) => {
  if (!simulatorEnabled()) {
    return mobileResponseErr("NOT_FOUND", "Not found.", requestId);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Provide holdPk and an outcome.", requestId);
  }
  const consumerPk = await resolveConsumerProfilePk(actor.profilePk);
  if (!consumerPk) {
    return mobileResponseErr("FORBIDDEN", "Finish setting up your profile.", requestId);
  }

  const service = createServiceRoleSupabaseClient();
  // Ownership + the simulated intent for this hold.
  const { data: hold } = await service
    .from("drop_inventory_hold")
    .select("drop_inventory_hold_pk,hold_status_code")
    .eq("drop_inventory_hold_pk", parsed.data.holdPk)
    .eq("consumer_profile_fk", consumerPk)
    .maybeSingle<{ drop_inventory_hold_pk: string; hold_status_code: string }>();
  if (!hold) {
    return mobileResponseErr("NOT_FOUND", "Hold not found.", requestId);
  }

  const { data: intent } = await service
    .from("payment_order_intent")
    .select("payment_order_intent_pk,provider_order_ref,amount_paise,currency_code,order_fk,payment_intent_status_code")
    .eq("drop_inventory_hold_fk", parsed.data.holdPk)
    .eq("consumer_profile_fk", consumerPk)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ payment_order_intent_pk: string; provider_order_ref: string | null; amount_paise: number | string; currency_code: string; order_fk: string | null; payment_intent_status_code: string }>();
  if (!intent?.provider_order_ref) {
    return mobileResponseErr("CONFLICT", "Start checkout before simulating a payment.", requestId);
  }
  if (!intent.provider_order_ref.startsWith("sim_")) {
    return mobileResponseErr("CONFLICT", "This checkout is a real Razorpay order; the simulator cannot complete it.", requestId);
  }
  if (intent.payment_intent_status_code === "CAPTURED" || intent.order_fk) {
    return mobileResponseOk(
      { orderPk: intent.order_fk ?? null, paymentIntentStatusCode: "CAPTURED", message: "Already paid." } satisfies SimulateResultDto,
      requestId,
    );
  }

  // Audit every simulator invocation.
  console.warn("payment_simulate_invoked", { requestId, holdPk: parsed.data.holdPk, outcome: parsed.data.outcome, providerOrderRef: intent.provider_order_ref });

  const amountPaise = Number(intent.amount_paise);
  const currency = intent.currency_code || "INR";
  const providerPaymentRef = `sim_pay_${randomUUID().replaceAll("-", "")}`;
  const eventType = parsed.data.outcome === "SUCCESS" ? "payment.captured" : "payment.failed";

  // Ledger a SIMULATED webhook event so the convert/failed RPC has a reference and
  // the payment is auditable + distinguishable from real Razorpay events.
  const { data: event, error: eventError } = await service
    .from("payment_webhook_event")
    .insert({
      provider_code: "RAZORPAY",
      provider_event_id: `sim_evt_${randomUUID().replaceAll("-", "")}`,
      event_type_code: eventType,
      signature_verified_flag: false,
      raw_payload_json: { simulated: true, provider_order_ref: intent.provider_order_ref, provider_payment_ref: providerPaymentRef, amount: amountPaise, currency },
      processing_status_code: "PROCESSING",
    })
    .select("payment_webhook_event_pk")
    .single<{ payment_webhook_event_pk: string }>();
  if (eventError || !event) {
    console.error("payment_simulate_event_insert_failed", { requestId, message: eventError?.message });
    return mobileResponseErr("SERVER_ERROR", "Could not start the simulated payment.", requestId);
  }

  if (parsed.data.outcome === "FAILURE") {
    await service.rpc("api_record_razorpay_payment_failed", {
      p_provider_order_ref: intent.provider_order_ref,
      p_provider_payment_ref: providerPaymentRef,
      p_amount_paise: amountPaise,
      p_currency_code: currency,
      p_payment_method_code: "SIMULATED",
      p_webhook_event_pk: event.payment_webhook_event_pk,
      p_provider_payload_json: { simulated: true },
    });
    await service.from("payment_webhook_event").update({ processing_status_code: "PROCESSED", processed_at: new Date().toISOString() }).eq("payment_webhook_event_pk", event.payment_webhook_event_pk);
    return mobileResponseOk({ orderPk: null, paymentIntentStatusCode: "FAILED", message: "Simulated payment failed." } satisfies SimulateResultDto, requestId);
  }

  // SUCCESS → the canonical capture path.
  const { data: converted, error: convertError } = await service.rpc("api_convert_paid_hold_to_order", {
    p_provider_order_ref: intent.provider_order_ref,
    p_provider_payment_ref: providerPaymentRef,
    p_amount_paise: amountPaise,
    p_currency_code: currency,
    p_payment_method_code: "SIMULATED",
    p_fee_paise: 0,
    p_tax_paise: 0,
    p_captured_at: new Date().toISOString(),
    p_webhook_event_pk: event.payment_webhook_event_pk,
    p_provider_payload_json: { simulated: true },
  });
  if (convertError) {
    console.error("payment_simulate_convert_failed", { requestId, message: convertError.message });
    return mobileResponseErr("SERVER_ERROR", "Simulated capture failed.", requestId);
  }
  const rows = Array.isArray(converted) ? (converted as { order_pk?: string }[]) : [];
  const orderPk = typeof rows[0]?.order_pk === "string" ? rows[0].order_pk : null;
  if (orderPk) {
    try {
      await service.rpc("api_enqueue_order_notifications", { p_order_pk: orderPk });
    } catch {
      /* notification enqueue is best-effort */
    }
  }
  await service.from("payment_webhook_event").update({ processing_status_code: "PROCESSED", processed_at: new Date().toISOString() }).eq("payment_webhook_event_pk", event.payment_webhook_event_pk);

  return mobileResponseOk({ orderPk, paymentIntentStatusCode: "CAPTURED", message: "Simulated payment captured." } satisfies SimulateResultDto, requestId);
});
