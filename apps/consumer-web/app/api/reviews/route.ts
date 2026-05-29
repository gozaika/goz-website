import { reviewSubmitSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getConsumerProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: iamProfile } = await supabase
    .from("iam_profile")
    .select("iam_profile_pk")
    .eq("auth_user_fk", userId)
    .single();
  if (!iamProfile) return null;
  const { data: consumer } = await supabase
    .from("consumer_profile")
    .select("consumer_profile_pk")
    .eq("iam_profile_fk", iamProfile.iam_profile_pk)
    .single();
  return consumer?.consumer_profile_pk ?? null;
}

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

  const consumerProfilePk = await getConsumerProfile(supabase, user.id);
  if (!consumerProfilePk) {
    return NextResponse.json({ ok: false, error: "Consumer profile not found." }, { status: 404 });
  }

  // Verify order belongs to consumer and has COLLECTED status
  const { data: order } = await supabase
    .from("order_order")
    .select("order_pk, order_status_code, restaurant_fk, consumer_profile_fk")
    .eq("order_pk", parsed.data.orderPk)
    .eq("consumer_profile_fk", consumerProfilePk)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }
  if (order.order_status_code !== "COLLECTED") {
    return NextResponse.json({ ok: false, error: "Reviews are only available after pickup." }, { status: 422 });
  }

  // Check for existing review (uq_review_order enforced at DB level too)
  const { data: existing } = await supabase
    .from("review_review")
    .select("review_review_pk")
    .eq("order_fk", parsed.data.orderPk)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: false, error: "You have already reviewed this order." }, { status: 409 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("review_review")
    .insert({
      order_fk: parsed.data.orderPk,
      consumer_profile_fk: consumerProfilePk,
      restaurant_fk: order.restaurant_fk,
      rating_value: parsed.data.ratingValue,
      review_text: parsed.data.reviewText ?? null,
      categories: parsed.data.categories ?? null,
      moderation_status_code: "PENDING",
      is_public: false,
    })
    .select("review_review_pk")
    .single();

  if (insertError || !inserted) {
    console.error("review_insert_failed", { code: insertError?.code });
    return NextResponse.json({ ok: false, error: "Could not submit review right now." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { reviewPk: inserted.review_review_pk, message: "Review submitted for moderation" },
  });
}
