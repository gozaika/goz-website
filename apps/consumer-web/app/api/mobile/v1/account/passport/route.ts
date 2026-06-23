import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import type { ZaykaPassportPayload } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { buildPassportPayload, getConsumerPkByUserId } from "@/lib/passport";

/**
 * The customer's Zayka Passport (Slice 11). Read through the user's own token so
 * RLS scopes every stat/badge query to this consumer — no service-role
 * cross-tenant read. Shares `buildPassportPayload` with the web account route so
 * the two surfaces cannot drift.
 */
export const GET = withMobileAuth(async ({ req, actor, requestId }) => {
  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);

  const consumerPk = await getConsumerPkByUserId(authed, actor.authUserId);
  if (!consumerPk) {
    return mobileResponseErr("NOT_FOUND", "Consumer profile not found.", requestId);
  }

  const payload = await buildPassportPayload(authed, consumerPk);
  return mobileResponseOk(payload satisfies ZaykaPassportPayload, requestId);
});
