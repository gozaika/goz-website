import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import type { ConsumerOrdersData } from "@gozaika/types";
import { mapConsumerOrder } from "@/lib/orders";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { toConsumerOrderDto } from "@/lib/mobile/orders";

/**
 * The customer's paid orders (Slice 10). Read through the user's own token so the
 * `api_consumer_order_summary` view's RLS scopes results to this consumer — no
 * service-role cross-tenant read.
 */
export const GET = withMobileAuth(async ({ req, requestId }) => {
  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);
  const { data, error } = await authed
    .from("api_consumer_order_summary")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("mobile_consumer_orders_failed", { requestId, message: error.message });
    return mobileResponseErr("SERVER_ERROR", "Could not load your orders.", requestId);
  }
  const orders = (data ?? []).map((row) => toConsumerOrderDto(mapConsumerOrder(row as Parameters<typeof mapConsumerOrder>[0])));
  return mobileResponseOk({ orders } satisfies ConsumerOrdersData, requestId);
});
