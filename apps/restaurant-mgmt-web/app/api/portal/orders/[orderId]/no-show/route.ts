import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { noShowRequestSchema, type ApiResponse, type NoShowResult } from "@gozaika/types";
import { NextResponse } from "next/server";
import { getPortalActor } from "@/lib/portal-auth";
import { createPickupActionIdempotencyKey, pickupRpcErrorMessage } from "@/lib/pickup-verification";
import { loadDefaultRestaurant } from "@/lib/slice3";

type NoShowRpcRow = {
  readonly order_pk: string;
  readonly order_number: string;
  readonly order_status_code: NoShowResult["orderStatusCode"];
  readonly message: string;
};

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." } satisfies ApiResponse, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, error: "Restaurant access is required to mark no-show." } satisfies ApiResponse,
      { status: 403 },
    );
  }

  const { orderId } = await params;
  const parsed = noShowRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Add a no-show reason before closing this pickup." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_mark_order_no_show", {
    p_order_pk: orderId,
    p_restaurant_pk: restaurant.restaurantPk,
    p_actor_profile_pk: actor.profilePk,
    p_reason_text: parsed.data.reasonText,
    p_idempotency_key: createPickupActionIdempotencyKey("no-show", orderId, parsed.data.idempotencyKey),
  });

  if (error) {
    const mapped = pickupRpcErrorMessage(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data) ? (data[0] as NoShowRpcRow | undefined) : undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "No-show update did not return a result." } satisfies ApiResponse, { status: 500 });
  }

  const result: NoShowResult = {
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    orderStatusCode: row.order_status_code,
    message: row.message,
  };
  return NextResponse.json({ ok: true, data: result } satisfies ApiResponse<NoShowResult>);
}
