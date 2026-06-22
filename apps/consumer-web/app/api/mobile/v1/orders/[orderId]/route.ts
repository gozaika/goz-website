import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import { mapConsumerOrder } from "@/lib/orders";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { toConsumerOrderDto } from "@/lib/mobile/orders";

/** A single customer order (Slice 10). RLS-scoped via the user's token. */
export async function GET(req: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const { orderId } = await params;
  return withMobileAuth(async ({ requestId }) => {
    const token = parseBearerToken(req.headers.get("authorization"));
    const authed = createServerSupabaseClient(token ?? undefined);
    const { data, error } = await authed.from("api_consumer_order_summary").select("*").eq("order_pk", orderId).maybeSingle();
    if (error) {
      return mobileResponseErr("SERVER_ERROR", "Could not load this order.", requestId);
    }
    if (!data) {
      return mobileResponseErr("NOT_FOUND", "Order not found.", requestId);
    }
    return mobileResponseOk(toConsumerOrderDto(mapConsumerOrder(data as Parameters<typeof mapConsumerOrder>[0])), requestId);
  })(req);
}
