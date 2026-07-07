import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import type { ConsumerSafetyPrefs } from "@gozaika/utils";
import { mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { getConsumerPkByUserId } from "@/lib/passport";
import { EMPTY_SAFETY_PREFS, loadConsumerSafetyPrefs } from "@/lib/safety-prefs";

/**
 * The signed-in consumer's saved allergen/dietary preferences (§16 allergen gate).
 * Read through the user's own token (RLS-scoped) and shares `loadConsumerSafetyPrefs`
 * with the web claim surface so the conflict gate is computed from one source of
 * truth. Returns empty prefs (no gate) when the actor has no consumer profile.
 */
export const GET = withMobileAuth(async ({ req, actor, requestId }) => {
  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);

  const consumerPk = await getConsumerPkByUserId(authed, actor.authUserId);
  if (!consumerPk) {
    return mobileResponseOk(EMPTY_SAFETY_PREFS satisfies ConsumerSafetyPrefs, requestId);
  }

  const prefs = await loadConsumerSafetyPrefs(authed, consumerPk);
  return mobileResponseOk(prefs satisfies ConsumerSafetyPrefs, requestId);
});
