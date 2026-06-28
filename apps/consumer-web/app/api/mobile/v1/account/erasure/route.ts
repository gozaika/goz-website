import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";

/**
 * In-app account/data erasure request (Slice 10). Records a `privacy_erasure_request`
 * for the signed-in profile — removes the email/mailto friction. Idempotent: an open
 * request is returned rather than duplicated. (Owner 2026-06-28: liberal DPDP posture
 * for the early-stage test-data phase; processing/anonymization stays the documented
 * admin step for now — see docs/runbooks/privacy-erasure.md.)
 */
export const POST = withMobileAuth(async ({ actor, requestId }) => {
  const service = createServiceRoleSupabaseClient();

  const { data: open } = await service
    .from("privacy_erasure_request")
    .select("privacy_erasure_request_pk, erasure_status_code")
    .eq("iam_profile_fk", actor.profilePk)
    .eq("erasure_status_code", "REQUESTED")
    .maybeSingle();
  if (open) {
    return mobileResponseOk(
      { status: (open as { erasure_status_code: string }).erasure_status_code, requestPk: (open as { privacy_erasure_request_pk: string }).privacy_erasure_request_pk, alreadyRequested: true },
      requestId,
    );
  }

  const { data, error } = await service
    .from("privacy_erasure_request")
    .insert({ iam_profile_fk: actor.profilePk, requested_reason: "In-app account erasure request" })
    .select("privacy_erasure_request_pk, erasure_status_code")
    .single();
  if (error || !data) {
    console.error("erasure_request_failed", { requestId, code: error?.code });
    return mobileResponseErr("SERVER_ERROR", "Could not submit your erasure request. Please try again.", requestId);
  }
  return mobileResponseOk(
    { status: (data as { erasure_status_code: string }).erasure_status_code, requestPk: (data as { privacy_erasure_request_pk: string }).privacy_erasure_request_pk, alreadyRequested: false },
    requestId,
  );
});
