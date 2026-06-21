import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { noShowRequestSchema, type NoShowResultDto } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadOrderRestaurantFk, mobileRpcError } from "@/lib/mobile/counter";
import { createPickupActionIdempotencyKey } from "@/lib/pickup-verification";

type NoShowRpcRow = {
  readonly order_pk: string;
  readonly order_number: string;
  readonly order_status_code: NoShowResultDto["orderStatusCode"];
  readonly message: string;
};

/**
 * Mark a true no-show after the pickup window (Slice 7). Role-gated by
 * `verifyPickup`, tenant-checked, server-authoritative via `api_mark_order_no_show`
 * (the RPC rejects early no-shows). SECURITY REVIEW REQUIRED before production.
 */
export async function POST(req: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const { orderId } = await params;

  return withMobileRestaurantRole("verifyPickup", async ({ actor, restaurantPk, requestId }) => {
    const service = createServiceRoleSupabaseClient();

    const ownerRestaurantPk = await loadOrderRestaurantFk(service, orderId);
    if (!ownerRestaurantPk) {
      return mobileResponseErr("NOT_FOUND", "Order not found.", requestId);
    }
    if (ownerRestaurantPk !== restaurantPk) {
      return mobileResponseErr("FORBIDDEN", "This order belongs to another restaurant.", requestId);
    }

    const parsed = noShowRequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return mobileResponseErr("VALIDATION", "Add a short no-show reason before closing this pickup.", requestId, {
        fieldErrors: parsed.error.issues.map((issue) => ({ field: String(issue.path[0] ?? "reasonText"), message: issue.message })),
      });
    }

    const { data, error } = await service.rpc("api_mark_order_no_show", {
      p_order_pk: orderId,
      p_restaurant_pk: restaurantPk,
      p_actor_profile_pk: actor.profilePk,
      p_reason_text: parsed.data.reasonText,
      p_idempotency_key: createPickupActionIdempotencyKey("no-show", orderId, parsed.data.idempotencyKey),
    });

    if (error) {
      const mapped = mobileRpcError(error.message);
      return mobileResponseErr(mapped.code, mapped.message, requestId);
    }

    const row = Array.isArray(data) ? (data[0] as NoShowRpcRow | undefined) : undefined;
    if (!row) {
      return mobileResponseErr("SERVER_ERROR", "No-show update did not return a result.", requestId);
    }

    const result: NoShowResultDto = {
      orderPk: row.order_pk,
      orderNumber: row.order_number,
      orderStatusCode: row.order_status_code,
      message: row.message,
    };
    return mobileResponseOk(result, requestId);
  })(req);
}
