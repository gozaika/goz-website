import type { ApiResponse, ReorderResultDto } from "@gozaika/types";
import { uuidSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Order Again (§20) — start a full-price reorder of a past order's bag. Uses the
 * signed-in user's cookie client so `api_create_reorder_drop`'s `auth.uid()` resolves
 * the consumer and authorises the source order. The RPC creates a private full-price
 * REORDER drop for the same template + reserves a hold; the client then reuses the
 * existing `/checkout/[holdPk]` rails.
 */
const bodySchema = z.object({ sourceOrderPk: uuidSchema, idempotencyKey: z.string().min(16).max(128) });

type ReorderRow = {
  readonly hold_pk: string | null;
  readonly drop_pk: string | null;
  readonly amount_paise: number | string | null;
  readonly bag_display_name: string | null;
  readonly restaurant_name: string | null;
  readonly pickup_start_at: string | null;
  readonly pickup_end_at: string | null;
  readonly already_held: boolean | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." } satisfies ApiResponse, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the reorder details and try again." } satisfies ApiResponse, { status: 400 });
  }

  const { data, error } = await supabase.rpc("api_create_reorder_drop", {
    p_source_order_pk: parsed.data.sourceOrderPk,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  const row = (Array.isArray(data) ? data[0] : data) as ReorderRow | null;
  if (error || !row?.hold_pk || !row.drop_pk) {
    const msg = error?.message ?? "";
    if (msg.includes("consumer profile")) {
      return NextResponse.json({ ok: false, error: "Please sign in to continue." } satisfies ApiResponse, { status: 401 });
    }
    if (msg.includes("source order not found")) {
      return NextResponse.json({ ok: false, error: "We couldn't find that order to reorder." } satisfies ApiResponse, { status: 404 });
    }
    console.error("web_reorder_failed", { message: msg });
    return NextResponse.json({ ok: false, error: "We couldn't start your reorder. Please try again." } satisfies ApiResponse, { status: 500 });
  }

  const result: ReorderResultDto = {
    holdPk: row.hold_pk,
    dropPk: row.drop_pk,
    amountPaise: Number(row.amount_paise ?? 0),
    currencyCode: "INR",
    bagDisplayName: row.bag_display_name ?? "your bag",
    restaurantName: row.restaurant_name ?? "goZaika partner",
    pickupStartAt: row.pickup_start_at ?? new Date().toISOString(),
    pickupEndAt: row.pickup_end_at ?? new Date().toISOString(),
    alreadyHeld: Boolean(row.already_held),
  };
  const response: ApiResponse<ReorderResultDto> = { ok: true, data: result };
  return NextResponse.json(response);
}
