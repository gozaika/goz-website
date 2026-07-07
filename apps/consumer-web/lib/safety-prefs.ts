import type { ConsumerSafetyPrefs } from "@gozaika/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Load a consumer's saved safety preferences — the avoided allergens and dietary
 * categories used by the §16 allergen-conflict gate. Shared by the web claim
 * surface (drop detail server component) and the mobile BFF
 * (`app/api/mobile/v1/account/safety-preferences`) so both compute the gate from
 * the identical source of truth.
 *
 * Pass a Supabase client already scoped to the consumer (web cookie / mobile
 * bearer) plus the resolved `consumer_profile_pk`. RLS restricts both preference
 * tables to the owning consumer, so nothing else is exposed.
 */
export async function loadConsumerSafetyPrefs(
  supabase: SupabaseClient,
  consumerPk: string,
): Promise<ConsumerSafetyPrefs> {
  const [allergenResult, dietaryResult] = await Promise.all([
    supabase
      .from("consumer_allergen_preference")
      .select("avoid_flag, master_allergen!inner(allergen_code)")
      .eq("consumer_profile_fk", consumerPk)
      .eq("avoid_flag", true),
    supabase
      .from("consumer_dietary_preference")
      .select("dietary_category_code")
      .eq("consumer_profile_fk", consumerPk),
  ]);

  const avoidAllergenCodes = ((allergenResult.data ?? []) as unknown as {
    master_allergen: { allergen_code: string } | { allergen_code: string }[] | null;
  }[])
    .flatMap((row) => {
      const embed = row.master_allergen;
      const arr = Array.isArray(embed) ? embed : embed ? [embed] : [];
      return arr.map((a) => a.allergen_code);
    })
    .filter(Boolean);

  const dietaryPreferenceCodes = ((dietaryResult.data ?? []) as { dietary_category_code: string }[])
    .map((row) => row.dietary_category_code)
    .filter(Boolean);

  return { avoidAllergenCodes, dietaryPreferenceCodes };
}

/** Empty prefs — used for signed-out visitors (no gate) without special-casing callers. */
export const EMPTY_SAFETY_PREFS: ConsumerSafetyPrefs = { avoidAllergenCodes: [], dietaryPreferenceCodes: [] };
