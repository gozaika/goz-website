import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { uuidSchema, type CheckoutStatusData } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { resolveConsumerProfilePk } from "@/lib/mobile/payments";

/** Poll checkout/payment/order status for a hold (Slice 9). Read-only. */
export const GET = withMobileAuth(async ({ req, actor, requestId }) => {
  const parsedHoldPk = uuidSchema.safeParse(new URL(req.url).searchParams.get("holdPk"));
  if (!parsedHoldPk.success) {
    return mobileResponseErr("VALIDATION", "Hold id is required.", requestId);
  }
  const consumerPk = await resolveConsumerProfilePk(actor.profilePk);
  if (!consumerPk) {
    return mobileResponseErr("FORBIDDEN", "Finish setting up your profile.", requestId);
  }

  const service = createServiceRoleSupabaseClient();
  const { data: hold } = await service
    .from("drop_inventory_hold")
    .select("drop_inventory_hold_pk,hold_status_code,converted_order_fk")
    .eq("drop_inventory_hold_pk", parsedHoldPk.data)
    .eq("consumer_profile_fk", consumerPk)
    .maybeSingle<{ drop_inventory_hold_pk: string; hold_status_code: string; converted_order_fk: string | null }>();
  if (!hold) {
    return mobileResponseErr("NOT_FOUND", "Hold not found.", requestId);
  }

  const { data: intent } = await service
    .from("payment_order_intent")
    .select("payment_intent_status_code,order_fk")
    .eq("drop_inventory_hold_fk", parsedHoldPk.data)
    .eq("consumer_profile_fk", consumerPk)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ payment_intent_status_code: string; order_fk: string | null }>();

  const orderPk = hold.converted_order_fk ?? intent?.order_fk ?? null;
  const { data: order } = orderPk
    ? await service.from("order_order").select("order_status_code").eq("order_order_pk", orderPk).maybeSingle<{ order_status_code: string }>()
    : { data: null };

  const data: CheckoutStatusData = {
    holdPk: parsedHoldPk.data,
    holdStatusCode: hold.hold_status_code,
    paymentIntentStatusCode: (intent?.payment_intent_status_code ?? null) as CheckoutStatusData["paymentIntentStatusCode"],
    orderPk,
    orderStatusCode: (order?.order_status_code ?? null) as CheckoutStatusData["orderStatusCode"],
  };
  return mobileResponseOk(data, requestId);
});
