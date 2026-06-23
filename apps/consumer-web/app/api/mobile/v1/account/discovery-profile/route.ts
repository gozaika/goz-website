import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import type { DiscoveryProfile } from "@gozaika/types";
import { buildDiscoveryProfile } from "@/lib/discovery-profile";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { getConsumerPkByUserId } from "@/lib/passport";

/**
 * The customer's Flavour-Diversity profile (Slice 11). Read through the user's own
 * token (RLS-scoped). Shares `buildDiscoveryProfile` with the web account route so
 * the cuisine breadth / diversity score stay identical across surfaces.
 */
export const GET = withMobileAuth(async ({ req, actor, requestId }) => {
  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);

  const consumerPk = await getConsumerPkByUserId(authed, actor.authUserId);
  if (!consumerPk) {
    return mobileResponseErr("NOT_FOUND", "Consumer profile not found.", requestId);
  }

  const profile = await buildDiscoveryProfile(authed, consumerPk);
  return mobileResponseOk(profile satisfies DiscoveryProfile, requestId);
});
