import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { reviewModerationStatusCodes, type ApiResponse } from "@gozaika/types";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsAdminActor } from "@/lib/admin-auth";

const patchSchema = z.object({
  moderationStatusCode: z.enum(reviewModerationStatusCodes),
});

export async function PATCH(
  request: Request,
  { params }: { readonly params: Promise<{ readonly reviewId: string }> },
) {
  const actor = await requireOpsAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { reviewId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid moderation status." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const { moderationStatusCode } = parsed.data;
  const isPublic = moderationStatusCode === "APPROVED";

  const service = createServiceRoleSupabaseClient();
  const { error } = await service
    .from("review_review")
    .update({ moderation_status_code: moderationStatusCode, is_public: isPublic })
    .eq("review_review_pk", reviewId);

  if (error) {
    console.error("admin_review_moderate_failed", { code: error.code, message: error.message });
    return NextResponse.json(
      { ok: false, error: "Could not update review." } satisfies ApiResponse,
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: { reviewPk: reviewId, moderationStatusCode, isPublic } } satisfies ApiResponse);
}
