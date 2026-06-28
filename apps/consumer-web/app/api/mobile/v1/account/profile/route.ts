import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { z } from "zod";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { resolveConsumerProfilePk } from "@/lib/reviews";

const updateSchema = z.object({
  firstName: z.string().trim().max(80).nullish(),
  lastName: z.string().trim().max(80).nullish(),
  preferredLanguageCode: z.enum(["en", "hi"]).optional(),
});

async function buildPayload(service: ReturnType<typeof createServiceRoleSupabaseClient>, consumerPk: string) {
  const { data: profile } = await service
    .from("consumer_profile")
    .select("first_name, last_name, preferred_language_code")
    .eq("consumer_profile_pk", consumerPk)
    .maybeSingle();
  const { data: codeRow } = await service
    .from("consumer_referral_code")
    .select("referral_code")
    .eq("consumer_profile_fk", consumerPk)
    .eq("is_active", true)
    .maybeSingle();
  const { data: refs } = await service
    .from("consumer_referral")
    .select("referral_status_code")
    .eq("referrer_consumer_profile_fk", consumerPk);

  const rows = (refs ?? []) as { referral_status_code: string }[];
  return {
    firstName: (profile as { first_name: string | null } | null)?.first_name ?? null,
    lastName: (profile as { last_name: string | null } | null)?.last_name ?? null,
    preferredLanguageCode: (profile as { preferred_language_code: string } | null)?.preferred_language_code ?? "en",
    referralCode: (codeRow as { referral_code: string } | null)?.referral_code ?? null,
    referralCounts: {
      total: rows.length,
      qualified: rows.filter((r) => r.referral_status_code === "QUALIFIED" || r.referral_status_code === "REWARDED").length,
      rewarded: rows.filter((r) => r.referral_status_code === "REWARDED").length,
    },
  };
}

/** Consumer profile + referral summary (Slice 10). */
export const GET = withMobileAuth(async ({ actor, requestId }) => {
  const service = createServiceRoleSupabaseClient();
  const consumerPk = await resolveConsumerProfilePk(service, { iamProfilePk: actor.profilePk });
  if (!consumerPk) return mobileResponseErr("NOT_FOUND", "Consumer profile not found.", requestId);
  return mobileResponseOk(await buildPayload(service, consumerPk), requestId);
});

/** Edit consumer profile (first/last name, preferred language). Other fields are immutable. */
export const POST = withMobileAuth(async ({ req, actor, requestId }) => {
  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Check the profile details and try again.", requestId, {
      fieldErrors: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "firstName"), message: i.message })),
    });
  }
  const service = createServiceRoleSupabaseClient();
  const consumerPk = await resolveConsumerProfilePk(service, { iamProfilePk: actor.profilePk });
  if (!consumerPk) return mobileResponseErr("NOT_FOUND", "Consumer profile not found.", requestId);

  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (parsed.data.firstName !== undefined) patch.first_name = parsed.data.firstName ?? null;
  if (parsed.data.lastName !== undefined) patch.last_name = parsed.data.lastName ?? null;
  if (parsed.data.preferredLanguageCode !== undefined) patch.preferred_language_code = parsed.data.preferredLanguageCode;

  const { error } = await service.from("consumer_profile").update(patch).eq("consumer_profile_pk", consumerPk);
  if (error) {
    console.error("profile_update_failed", { requestId, code: error.code });
    return mobileResponseErr("SERVER_ERROR", "Could not update your profile right now.", requestId);
  }
  return mobileResponseOk(await buildPayload(service, consumerPk), requestId);
});
