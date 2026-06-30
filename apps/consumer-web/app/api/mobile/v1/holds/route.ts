import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";

/**
 * Active-holds summary for the signed-in customer (mobile holds pill). Holds are
 * unpaid and time-limited, so the pill nudges the user to finish paying the
 * earliest-expiring one. RLS on `drop_inventory_hold` scopes the rows to the
 * caller via their token's auth.uid(). Read-only.
 */
export const GET = withMobileAuth(async ({ req, requestId }) => {
  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);

  const { data, error } = await authed
    .from("drop_inventory_hold")
    .select("drop_inventory_hold_pk,expires_at")
    .eq("hold_status_code", "ACTIVE")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .limit(20);

  if (error) {
    return mobileResponseErr("SERVER_ERROR", "Could not load your holds.", requestId);
  }

  const holds = data ?? [];
  const earliest = holds[0] ?? null;
  return mobileResponseOk(
    {
      count: holds.length,
      earliestExpiresAt: earliest?.expires_at ?? null,
      earliestHoldPk: earliest?.drop_inventory_hold_pk ?? null,
    },
    requestId,
  );
});
