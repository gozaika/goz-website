import { reviewSubmitSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveConsumerProfilePk, submitReview } from "@/lib/reviews";

const STATUS_BY_CODE: Record<string, number> = {
  ORDER_NOT_FOUND: 404,
  NOT_COLLECTED: 422,
  ALREADY_REVIEWED: 409,
  SERVER_ERROR: 500,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = reviewSubmitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check review details and try again." }, { status: 400 });
  }

  const consumerProfilePk = await resolveConsumerProfilePk(supabase, { authUserId: user.id });
  if (!consumerProfilePk) {
    return NextResponse.json({ ok: false, error: "Consumer profile not found." }, { status: 404 });
  }

  const result = await submitReview(supabase, consumerProfilePk, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: STATUS_BY_CODE[result.code] ?? 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { reviewPk: result.reviewPk, message: "Review submitted for moderation" },
  });
}
