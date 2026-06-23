import { CONSENT_POLICY_VERSION, type ConsentSettingsData } from "@gozaika/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared DPDP consent-settings loader. `api_latest_consents` already returns all
 * active purposes left-joined to the caller's latest event (purpose_name,
 * is_required_for_service, consent_state_code, recorded_at, policy_version),
 * scoped by `rls_current_profile_pk()` — so it must run on a client carrying the
 * user's token. We enrich each row with the purpose description + display order
 * from `privacy_consent_purpose` for the settings UI.
 *
 * Shared by the mobile BFF (and available to the web account surface) so consent
 * semantics — purpose set, ordering, required-locking — cannot drift.
 */
export async function loadConsentSettings(supabase: SupabaseClient): Promise<ConsentSettingsData> {
  const [{ data: latest, error: latestError }, { data: purposes, error: purposesError }] = await Promise.all([
    supabase.rpc("api_latest_consents"),
    supabase
      .from("privacy_consent_purpose")
      .select("purpose_code, description, display_order"),
  ]);

  if (latestError) throw new Error("Could not load consent settings.");
  if (purposesError) throw new Error("Could not load consent purposes.");

  const meta = new Map<string, { description: string | null; displayOrder: number }>();
  for (const p of (purposes ?? []) as { purpose_code: string; description: string | null; display_order: number | null }[]) {
    meta.set(p.purpose_code, { description: p.description ?? null, displayOrder: Number(p.display_order ?? 999) });
  }

  const rows = (latest ?? []) as {
    purpose_code: string;
    purpose_name: string;
    is_required_for_service: boolean;
    consent_state_code: string | null;
    recorded_at: string | null;
    policy_version: string | null;
  }[];

  const settings = rows
    .map((r) => ({
      purposeCode: r.purpose_code,
      purposeName: r.purpose_name,
      description: meta.get(r.purpose_code)?.description ?? null,
      isRequiredForService: Boolean(r.is_required_for_service),
      displayOrder: meta.get(r.purpose_code)?.displayOrder ?? 999,
      stateCode: (r.consent_state_code as "GRANTED" | "REVOKED" | null) ?? null,
      recordedAt: r.recorded_at,
      policyVersion: r.policy_version,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return { settings, currentPolicyVersion: CONSENT_POLICY_VERSION };
}
