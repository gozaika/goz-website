import { createServerSupabaseClient, createServiceRoleSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import { claimRequestSchema, type ClaimResultDto } from "@gozaika/types";
import { getDropClaimAvailability } from "@gozaika/utils";
import { loadPublicDrop } from "@/lib/drops";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";

/**
 * Claim a drop = create an inventory hold (Slice 9). Calls the canonical
 * `api_create_inventory_hold` with the *user's* token so its `auth.uid()` resolves
 * the consumer; the server enforces availability + the pickup window.
 */
export const POST = withMobileAuth(async ({ req, actor, requestId }) => {
  const parsed = claimRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Check the claim details and try again.", requestId, {
      fieldErrors: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "dropPk"), message: i.message })),
    });
  }

  const drop = await loadPublicDrop(parsed.data.dropPk);
  if (!drop) {
    return mobileResponseErr("NOT_FOUND", "This drop is unavailable or no longer public.", requestId);
  }
  const availability = getDropClaimAvailability(drop);
  if (!availability.canClaim) {
    return mobileResponseErr("CONFLICT", availability.reason, requestId);
  }
  if (drop.quantityAvailable < parsed.data.quantity) {
    return mobileResponseErr("CONFLICT", "This drop no longer has enough bags available.", requestId);
  }

  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);
  const { data: holdPk, error } = await authed.rpc("api_create_inventory_hold", {
    p_drop_pk: parsed.data.dropPk,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_quantity: parsed.data.quantity,
    p_hold_minutes: 10,
  });

  if (error || typeof holdPk !== "string") {
    const msg = error?.message ?? "";
    if (msg.includes("consumer profile")) {
      return mobileResponseErr("FORBIDDEN", "Finish setting up your profile before claiming.", requestId);
    }
    if (msg.includes("insufficient") || msg.includes("unavailable")) {
      return mobileResponseErr("CONFLICT", "This drop is sold out or unavailable right now.", requestId);
    }
    console.error("mobile_claim_failed", { requestId, message: msg });
    return mobileResponseErr("SERVER_ERROR", "We could not hold this BAM Bag. Please try again.", requestId);
  }

  const service = createServiceRoleSupabaseClient();
  const { data: hold } = await service
    .from("drop_inventory_hold")
    .select("drop_inventory_hold_pk,quantity,expires_at")
    .eq("drop_inventory_hold_pk", holdPk)
    .maybeSingle<{ drop_inventory_hold_pk: string; quantity: number | string; expires_at: string }>();

  const quantity = Number(hold?.quantity ?? parsed.data.quantity);
  const result: ClaimResultDto = {
    holdPk,
    dropPk: parsed.data.dropPk,
    quantity,
    amountPaise: drop.pricePaise * quantity,
    currencyCode: "INR",
    expiresAt: hold?.expires_at ?? new Date(Date.now() + 10 * 60_000).toISOString(),
  };
  return mobileResponseOk(result, requestId);
});
