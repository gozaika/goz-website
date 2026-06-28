import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import { reviewSubmitSchema, type MobileErrorCode } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { resolveConsumerProfilePk, submitReview } from "@/lib/reviews";

const ERR_CODE: Record<string, MobileErrorCode> = {
  ORDER_NOT_FOUND: "NOT_FOUND",
  NOT_COLLECTED: "CONFLICT",
  ALREADY_REVIEWED: "CONFLICT",
  SERVER_ERROR: "SERVER_ERROR",
};

/** Submit a review for a COLLECTED order (Slice 10). Shared logic with web `/api/reviews`. */
export const POST = withMobileAuth(async ({ req, actor, requestId }) => {
  const parsed = reviewSubmitSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Check the review details and try again.", requestId, {
      fieldErrors: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "ratingValue"), message: i.message })),
    });
  }

  const token = parseBearerToken(req.headers.get("authorization"));
  const authed = createServerSupabaseClient(token ?? undefined);

  const consumerProfilePk = await resolveConsumerProfilePk(authed, { iamProfilePk: actor.profilePk });
  if (!consumerProfilePk) {
    return mobileResponseErr("FORBIDDEN", "Finish setting up your profile before reviewing.", requestId);
  }

  const result = await submitReview(authed, consumerProfilePk, parsed.data);
  if (!result.ok) {
    return mobileResponseErr(ERR_CODE[result.code] ?? "SERVER_ERROR", result.message, requestId);
  }
  return mobileResponseOk({ reviewPk: result.reviewPk, status: "PENDING" as const }, requestId);
});
