import { createServerSupabaseClient, createServiceRoleSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import type { ResendPickupResult } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";

/**
 * Re-send the pickup notification for an order (Slice 10). The customer (or whoever
 * they forward the SMS to) collects with the texted code. This re-enqueues the
 * order's notifications WITHOUT rotating the pickup credential, so a previously
 * forwarded code stays valid. Ownership is confirmed via the RLS-scoped view.
 */
export async function POST(req: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const { orderId } = await params;
  return withMobileAuth(async ({ requestId }) => {
    const token = parseBearerToken(req.headers.get("authorization"));
    const authed = createServerSupabaseClient(token ?? undefined);
    const { data: owned, error } = await authed
      .from("api_consumer_order_summary")
      .select("order_pk,order_status_code")
      .eq("order_pk", orderId)
      .maybeSingle<{ order_pk: string; order_status_code: string }>();
    if (error) {
      return mobileResponseErr("SERVER_ERROR", "Could not resend your pickup code.", requestId);
    }
    if (!owned) {
      return mobileResponseErr("NOT_FOUND", "Order not found.", requestId);
    }
    if (owned.order_status_code === "COLLECTED" || owned.order_status_code === "NO_SHOW") {
      return mobileResponseErr("CONFLICT", "This order's pickup is already closed.", requestId);
    }

    const service = createServiceRoleSupabaseClient();
    const { error: enqueueError } = await service.rpc("api_enqueue_order_notifications", { p_order_pk: orderId });
    if (enqueueError) {
      console.error("mobile_resend_pickup_failed", { requestId, message: enqueueError.message });
      return mobileResponseErr("SERVER_ERROR", "Could not resend your pickup code right now.", requestId);
    }
    return mobileResponseOk({ ok: true, message: "We've re-sent your pickup code to your phone." } satisfies ResendPickupResult, requestId);
  })(req);
}
