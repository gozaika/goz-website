import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import { CONSENT_POLICY_VERSION, consentUpdateRequestSchema, type ConsentSettingsData } from "@gozaika/types";
import { loadConsentSettings } from "@/lib/consent";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";

/**
 * Customer DPDP consent settings (Slice 10). Read + per-purpose toggle for the
 * signed-in consumer. Runs on the user's own token so `api_latest_consents` /
 * `api_capture_consents` resolve `rls_current_profile_pk()` to this consumer.
 * Consent is append-only: a toggle records a new GRANTED/REVOKED event stamped
 * with the canonical policy version + ACCOUNT_SETTINGS source. Shares
 * `loadConsentSettings` so the purpose set, ordering and required-locking match web.
 */

export const GET = withMobileAuth(async ({ req, requestId }) => {
  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);
  try {
    const data = await loadConsentSettings(authed);
    return mobileResponseOk(data satisfies ConsentSettingsData, requestId);
  } catch (caught) {
    console.error("mobile_consent_load_failed", { requestId, message: caught instanceof Error ? caught.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Consent settings are unavailable.", requestId);
  }
});

export const POST = withMobileAuth(async ({ req, requestId }) => {
  const json = (await req.json().catch(() => ({}))) as unknown;
  const parsed = consentUpdateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Check the consent choice and try again.", requestId);
  }

  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);

  const { error } = await authed.rpc("api_capture_consents", {
    p_events: [
      {
        purpose_code: parsed.data.purposeCode,
        consent_state_code: parsed.data.state,
        policy_version: CONSENT_POLICY_VERSION,
        capture_source_code: "ACCOUNT_SETTINGS",
        proof_json: {
          uiVersion: "consumer-mobile-slice10",
          sourceRoute: "/account/consent",
          capturedAt: new Date().toISOString(),
        },
      },
    ],
  });

  if (error) {
    // The RPC refuses revoking a service-required purpose (operational); surface
    // that as a validation conflict rather than a 500.
    console.error("mobile_consent_capture_failed", { requestId, message: error.message });
    return mobileResponseErr("VALIDATION", "That consent change isn't allowed.", requestId);
  }

  // Return the refreshed settings so the client updates in one round-trip.
  try {
    const data = await loadConsentSettings(authed);
    return mobileResponseOk(data satisfies ConsentSettingsData, requestId);
  } catch (caught) {
    console.error("mobile_consent_reload_failed", { requestId, message: caught instanceof Error ? caught.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Consent was saved but settings could not be reloaded.", requestId);
  }
});
