import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import { uuidSchema, type ReorderResultDto } from "@gozaika/types";
import { z } from "zod";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";

/**
 * Order Again (§20) — start a full-price reorder of a past order's bag. Calls the
 * canonical `api_create_reorder_drop` with the *user's* token so its `auth.uid()`
 * resolves the consumer and authorises the source order. The RPC creates a private
 * (INTERNAL_ONLY) full-price single-bag REORDER drop for the same template revision
 * and reserves a hold; the client then reuses the normal `/checkout/*` rails.
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

export const POST = withMobileAuth(async ({ req, requestId }) => {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Check the reorder details and try again.", requestId);
  }

  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);
  const { data, error } = await authed.rpc("api_create_reorder_drop", {
    p_source_order_pk: parsed.data.sourceOrderPk,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  const row = (Array.isArray(data) ? data[0] : data) as ReorderRow | null;
  if (error || !row?.hold_pk || !row.drop_pk) {
    const msg = error?.message ?? "";
    if (msg.includes("consumer profile")) {
      return mobileResponseErr("FORBIDDEN", "Finish setting up your profile before reordering.", requestId);
    }
    if (msg.includes("source order not found")) {
      return mobileResponseErr("NOT_FOUND", "We couldn't find that order to reorder.", requestId);
    }
    console.error("mobile_reorder_failed", { requestId, message: msg });
    return mobileResponseErr("SERVER_ERROR", "We couldn't start your reorder. Please try again.", requestId);
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
  return mobileResponseOk(result, requestId);
});
