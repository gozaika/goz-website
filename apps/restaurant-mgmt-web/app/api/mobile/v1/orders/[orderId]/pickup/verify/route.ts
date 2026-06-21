import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { pickupVerificationRequestSchema, type PickupVerifyResultDto } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadOrderRestaurantFk, mobileRpcError } from "@/lib/mobile/counter";
import { createPickupActionIdempotencyKey, resolvePickupCredential } from "@/lib/pickup-verification";

type PickupRpcRow = {
  readonly order_pk: string;
  readonly order_number: string;
  readonly result_code: PickupVerifyResultDto["resultCode"];
  readonly order_status_code: PickupVerifyResultDto["orderStatusCode"];
  readonly collected_at: string | null;
  readonly message: string;
};

/**
 * Server-authoritative pickup verification (Slice 7). Role-gated by `verifyPickup`,
 * tenant-checked against the selected restaurant. The client never decides
 * collection — the `api_verify_order_pickup` RPC does. A *completed* verification
 * (any resultCode incl. INVALID_CODE / ALREADY_COLLECTED) returns `ok:true` with
 * the resultCode so the app can render distinct result states; only transport,
 * validation and RPC failures become error envelopes.
 *
 * SECURITY REVIEW REQUIRED before production (per mobile plan §2): credential
 * hashing, idempotency/replay, offline never-false-collected behavior.
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

    const parsed = pickupVerificationRequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return mobileResponseErr("VALIDATION", "Enter exactly one pickup credential: the 6-digit OTP or a QR scan.", requestId, {
        fieldErrors: parsed.error.issues.map((issue) => ({ field: String(issue.path[0] ?? "otp"), message: issue.message })),
      });
    }

    let credential: ReturnType<typeof resolvePickupCredential>;
    try {
      credential = resolvePickupCredential({
        orderPk: orderId,
        restaurantPk,
        otp: parsed.data.otp,
        qrPayload: parsed.data.qrPayload,
      });
    } catch (caught) {
      if (caught instanceof Error && caught.message.includes("PICKUP_CREDENTIAL_SECRET")) {
        console.error("mobile_pickup_verification_secret_missing", { requestId });
        return mobileResponseErr("SERVER_ERROR", "Pickup verification is not configured for this environment yet.", requestId);
      }
      return mobileResponseErr("VALIDATION", caught instanceof Error ? caught.message : "Invalid pickup proof.", requestId);
    }

    const { data, error } = await service.rpc("api_verify_order_pickup", {
      p_order_pk: orderId,
      p_restaurant_pk: restaurantPk,
      p_actor_profile_pk: actor.profilePk,
      p_credential_method: credential.method,
      p_credential_hash: credential.hash,
      p_idempotency_key: createPickupActionIdempotencyKey("pickup", orderId, parsed.data.idempotencyKey),
      p_device_label: parsed.data.deviceLabel,
    });

    if (error) {
      const mapped = mobileRpcError(error.message);
      return mobileResponseErr(mapped.code, mapped.message, requestId);
    }

    const row = Array.isArray(data) ? (data[0] as PickupRpcRow | undefined) : undefined;
    if (!row) {
      return mobileResponseErr("SERVER_ERROR", "Pickup verification did not return a result.", requestId);
    }

    const result: PickupVerifyResultDto = {
      orderPk: row.order_pk,
      orderNumber: row.order_number,
      resultCode: row.result_code,
      orderStatusCode: row.order_status_code,
      collectedAt: row.collected_at,
      message: row.message,
    };
    return mobileResponseOk(result, requestId);
  })(req);
}
