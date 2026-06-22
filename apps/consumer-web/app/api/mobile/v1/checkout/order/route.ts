import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { uuidSchema, type CheckoutOrderData } from "@gozaika/types";
import { z } from "zod";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { checkoutMode, razorpayKeyId, resolveConsumerProfilePk } from "@/lib/mobile/payments";

const bodySchema = z.object({ holdPk: uuidSchema, idempotencyKey: z.string().min(16).max(128) });
const CURRENCY = "INR";
const REUSABLE = ["CREATED", "RAZORPAY_ORDER_CREATED", "AUTHORIZED"];

type IntentRow = {
  readonly payment_order_intent_pk: string;
  readonly provider_order_ref: string | null;
  readonly payment_intent_status_code: string;
  readonly amount_paise: number | string;
};

function rel<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export const POST = withMobileAuth(async ({ req, actor, requestId }) => {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Check the checkout details and try again.", requestId);
  }

  const consumerPk = await resolveConsumerProfilePk(actor.profilePk);
  if (!consumerPk) {
    return mobileResponseErr("FORBIDDEN", "Finish setting up your profile before checking out.", requestId);
  }

  const service = createServiceRoleSupabaseClient();
  const { data: hold } = await service
    .from("drop_inventory_hold")
    .select("drop_inventory_hold_pk,drop_fk,hold_status_code,quantity,expires_at")
    .eq("drop_inventory_hold_pk", parsed.data.holdPk)
    .eq("consumer_profile_fk", consumerPk)
    .maybeSingle<{ drop_inventory_hold_pk: string; drop_fk: string; hold_status_code: string; quantity: number | string; expires_at: string }>();
  if (!hold) {
    return mobileResponseErr("NOT_FOUND", "Hold not found.", requestId);
  }
  if (hold.hold_status_code === "CONVERTED") {
    return mobileResponseErr("CONFLICT", "This hold is already converted to a paid order.", requestId);
  }
  if (hold.hold_status_code !== "ACTIVE" || Date.parse(hold.expires_at) <= Date.now()) {
    return mobileResponseErr("CONFLICT", "This hold is no longer active. Please hold a bag again.", requestId);
  }

  const { data: drop } = await service
    .from("drop_drop")
    .select("drop_drop_pk,drop_title,price_paise,pickup_end_at,restaurant_restaurant(restaurant_name),catalog_bag_template_revision(display_name)")
    .eq("drop_drop_pk", hold.drop_fk)
    .maybeSingle<{ drop_title: string; price_paise: number | string; pickup_end_at: string; restaurant_restaurant: { restaurant_name: string } | { restaurant_name: string }[] | null; catalog_bag_template_revision: { display_name: string } | { display_name: string }[] | null }>();
  if (!drop || Date.parse(drop.pickup_end_at) <= Date.now()) {
    return mobileResponseErr("CONFLICT", "The pickup window has closed for this drop.", requestId);
  }

  const quantity = Number(hold.quantity);
  const amountPaise = Number(drop.price_paise) * quantity;
  const restaurantName = rel(drop.restaurant_restaurant)?.restaurant_name ?? "goZaika partner";
  const bagDisplayName = rel(drop.catalog_bag_template_revision)?.display_name ?? drop.drop_title;
  const description = `${bagDisplayName} from ${restaurantName}`;
  const mode = checkoutMode();

  // Reuse an in-flight intent if one already has a provider order ref.
  const { data: existing } = await service
    .from("payment_order_intent")
    .select("payment_order_intent_pk,provider_order_ref,payment_intent_status_code,amount_paise")
    .eq("drop_inventory_hold_fk", hold.drop_inventory_hold_pk)
    .eq("consumer_profile_fk", consumerPk)
    .eq("amount_paise", amountPaise)
    .in("payment_intent_status_code", [...REUSABLE, "CAPTURED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<IntentRow>();

  const holdId = hold.drop_inventory_hold_pk;
  const holdExpiresAt = hold.expires_at;
  const idempotencyKey = parsed.data.idempotencyKey;
  const base = { holdPk: holdId, amountPaise, currencyCode: CURRENCY, restaurantName, bagDisplayName, description };
  const prefill = { name: actor.displayName, email: actor.email, contact: actor.phone?.replace(/^\+91/, "") ?? null };

  async function ensureIntent(): Promise<string> {
    if (existing?.payment_order_intent_pk) return existing.payment_order_intent_pk;
    const { data: created, error } = await service
      .from("payment_order_intent")
      .insert({
        drop_inventory_hold_fk: holdId,
        consumer_profile_fk: consumerPk,
        provider_code: "RAZORPAY",
        payment_intent_status_code: "CREATED",
        amount_paise: amountPaise,
        currency_code: CURRENCY,
        idempotency_key: idempotencyKey,
        expires_at: holdExpiresAt,
      })
      .select("payment_order_intent_pk")
      .single<{ payment_order_intent_pk: string }>();
    if (error || !created) throw new Error(error?.message ?? "intent insert failed");
    return created.payment_order_intent_pk;
  }

  // ---- Simulated provider: no Razorpay call; assign a sim_ order ref. ----
  if (mode === "simulated") {
    const intentPk = await ensureIntent();
    const providerOrderRef = existing?.provider_order_ref ?? `sim_${intentPk.replaceAll("-", "")}`;
    if (!existing?.provider_order_ref) {
      await service
        .from("payment_order_intent")
        .update({ provider_order_ref: providerOrderRef, payment_intent_status_code: "RAZORPAY_ORDER_CREATED", updated_at: new Date().toISOString() })
        .eq("payment_order_intent_pk", intentPk);
    }
    const data: CheckoutOrderData = { mode: "simulated", intentPk, razorpay: null, ...base };
    return mobileResponseOk(data, requestId);
  }

  // ---- Real Razorpay: mirrors consumer-web/app/api/checkout/razorpay-order. ----
  const keyId = razorpayKeyId();
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) {
    return mobileResponseErr("SERVER_ERROR", "Razorpay checkout is not configured yet.", requestId);
  }
  const intentPk = await ensureIntent();
  let providerOrderRef = existing?.provider_order_ref ?? null;
  if (!providerOrderRef) {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`, "content-type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: CURRENCY, payment_capture: 1, receipt: `gz_${intentPk.replaceAll("-", "").slice(0, 32)}`, notes: { hold_pk: hold.drop_inventory_hold_pk, payment_order_intent_pk: intentPk } }),
    });
    const order = (await res.json().catch(() => ({}))) as { id?: string };
    if (!res.ok || !order.id) {
      await service.from("payment_order_intent").update({ payment_intent_status_code: "FAILED", updated_at: new Date().toISOString() }).eq("payment_order_intent_pk", intentPk);
      return mobileResponseErr("SERVER_ERROR", "Razorpay is unavailable right now. Please retry while your hold is active.", requestId);
    }
    providerOrderRef = order.id;
    await service.from("payment_order_intent").update({ provider_order_ref: providerOrderRef, payment_intent_status_code: "RAZORPAY_ORDER_CREATED", updated_at: new Date().toISOString() }).eq("payment_order_intent_pk", intentPk);
  }
  const data: CheckoutOrderData = { mode: "razorpay", intentPk, razorpay: { keyId, providerOrderRef, prefill }, ...base };
  return mobileResponseOk(data, requestId);
});
