import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { pickupVerificationRequestSchema, type ApiResponse, type PickupVerificationResult } from "@gozaika/types";
import { NextResponse } from "next/server";
import { getPortalActor } from "@/lib/portal-auth";
import { createPickupActionIdempotencyKey, pickupRpcErrorMessage, resolvePickupCredential } from "@/lib/pickup-verification";
import { loadDefaultRestaurant } from "@/lib/slice3";

type PickupRpcRow = {
  readonly order_pk: string;
  readonly order_number: string;
  readonly result_code: PickupVerificationResult["resultCode"];
  readonly order_status_code: PickupVerificationResult["orderStatusCode"];
  readonly collected_at: string | null;
  readonly message: string;
};

function mapPickupResult(row: PickupRpcRow): PickupVerificationResult {
  return {
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    resultCode: row.result_code,
    orderStatusCode: row.order_status_code,
    collectedAt: row.collected_at,
    message: row.message,
  };
}

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." } satisfies ApiResponse, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, error: "Restaurant access is required to verify pickup." } satisfies ApiResponse,
      { status: 403 },
    );
  }

  const { orderId } = await params;
  const parsed = pickupVerificationRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Enter exactly one pickup credential." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  let credential: ReturnType<typeof resolvePickupCredential>;
  try {
    credential = resolvePickupCredential({
      orderPk: orderId,
      restaurantPk: restaurant.restaurantPk,
      otp: parsed.data.otp,
      qrPayload: parsed.data.qrPayload,
    });
  } catch (caught) {
    return NextResponse.json(
      { ok: false, error: caught instanceof Error ? caught.message : "Invalid pickup proof." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_verify_order_pickup", {
    p_order_pk: orderId,
    p_restaurant_pk: restaurant.restaurantPk,
    p_actor_profile_pk: actor.profilePk,
    p_credential_method: credential.method,
    p_credential_hash: credential.hash,
    p_idempotency_key: createPickupActionIdempotencyKey("pickup", orderId, parsed.data.idempotencyKey),
    p_device_label: parsed.data.deviceLabel,
  });

  if (error) {
    const mapped = pickupRpcErrorMessage(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data) ? (data[0] as PickupRpcRow | undefined) : undefined;
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Pickup verification did not return a result." } satisfies ApiResponse,
      { status: 500 },
    );
  }

  const result = mapPickupResult(row);
  const status = result.resultCode === "SUCCESS" ? 200 : result.resultCode === "ALREADY_COLLECTED" ? 409 : 400;
  return NextResponse.json({ ok: result.resultCode === "SUCCESS", data: result, error: result.resultCode === "SUCCESS" ? undefined : result.message }, { status });
}
