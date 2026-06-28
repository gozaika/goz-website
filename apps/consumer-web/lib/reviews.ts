import type { SupabaseClient } from "@supabase/supabase-js";
import { reviewSubmitSchema } from "@gozaika/types";
import type { z } from "zod";

export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;

export type OrderReviewStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export type SubmitReviewResult =
  | { readonly ok: true; readonly reviewPk: string }
  | { readonly ok: false; readonly code: "ORDER_NOT_FOUND" | "NOT_COLLECTED" | "ALREADY_REVIEWED" | "SERVER_ERROR"; readonly message: string };

function normalizeStatus(code: string | null | undefined): OrderReviewStatus {
  const c = (code ?? "").toUpperCase();
  return c === "PENDING" || c === "APPROVED" || c === "REJECTED" ? c : "PENDING";
}

/**
 * Resolve the consumer_profile_pk for a signed-in user. Pass either the auth user id
 * (web session) or the already-known iam_profile_pk (mobile actor). Shared so the web
 * route and the mobile BFF agree on identity resolution.
 */
export async function resolveConsumerProfilePk(
  supabase: SupabaseClient,
  by: { readonly authUserId?: string; readonly iamProfilePk?: string },
): Promise<string | null> {
  let iamProfilePk = by.iamProfilePk ?? null;
  if (!iamProfilePk && by.authUserId) {
    const { data } = await supabase.from("iam_profile").select("iam_profile_pk").eq("auth_user_fk", by.authUserId).maybeSingle();
    iamProfilePk = (data as { iam_profile_pk?: string } | null)?.iam_profile_pk ?? null;
  }
  if (!iamProfilePk) return null;
  const { data: consumer } = await supabase.from("consumer_profile").select("consumer_profile_pk").eq("iam_profile_fk", iamProfilePk).maybeSingle();
  return (consumer as { consumer_profile_pk?: string } | null)?.consumer_profile_pk ?? null;
}

/** Moderation status of the review on an order (RLS-scoped), or NONE if not reviewed. */
export async function getOrderReviewStatus(supabase: SupabaseClient, orderPk: string): Promise<OrderReviewStatus> {
  const { data } = await supabase.from("review_review").select("moderation_status_code").eq("order_fk", orderPk).maybeSingle();
  if (!data) return "NONE";
  return normalizeStatus((data as { moderation_status_code?: string }).moderation_status_code);
}

/**
 * Submit a review for a COLLECTED order owned by the consumer. The single source of
 * truth shared by the web `/api/reviews` route and the mobile BFF. Reviews land as
 * PENDING + non-public (moderation gate). DB also enforces uq_review_order.
 */
export async function submitReview(
  supabase: SupabaseClient,
  consumerProfilePk: string,
  input: ReviewSubmitInput,
): Promise<SubmitReviewResult> {
  const { data: order } = await supabase
    .from("order_order")
    .select("order_pk, order_status_code, restaurant_fk, consumer_profile_fk")
    .eq("order_pk", input.orderPk)
    .eq("consumer_profile_fk", consumerProfilePk)
    .maybeSingle();

  if (!order) return { ok: false, code: "ORDER_NOT_FOUND", message: "Order not found." };
  if ((order as { order_status_code: string }).order_status_code !== "COLLECTED") {
    return { ok: false, code: "NOT_COLLECTED", message: "Reviews are only available after pickup." };
  }

  const { data: existing } = await supabase.from("review_review").select("review_review_pk").eq("order_fk", input.orderPk).maybeSingle();
  if (existing) return { ok: false, code: "ALREADY_REVIEWED", message: "You have already reviewed this order." };

  const { data: inserted, error } = await supabase
    .from("review_review")
    .insert({
      order_fk: input.orderPk,
      consumer_profile_fk: consumerProfilePk,
      restaurant_fk: (order as { restaurant_fk: string }).restaurant_fk,
      rating_value: input.ratingValue,
      review_text: input.reviewText ?? null,
      categories: input.categories ?? null,
      moderation_status_code: "PENDING",
      is_public: false,
    })
    .select("review_review_pk")
    .single();

  if (error || !inserted) {
    console.error("review_insert_failed", { code: error?.code });
    return { ok: false, code: "SERVER_ERROR", message: "Could not submit review right now." };
  }
  return { ok: true, reviewPk: (inserted as { review_review_pk: string }).review_review_pk };
}
