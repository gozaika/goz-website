import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import { mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { getOrderReviewStatus } from "@/lib/reviews";

/** Review status for one order (Slice 10): NONE | PENDING | APPROVED | REJECTED. RLS-scoped. */
export async function GET(req: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const { orderId } = await params;
  return withMobileAuth(async ({ requestId }) => {
    const token = parseBearerToken(req.headers.get("authorization"));
    const authed = createServerSupabaseClient(token ?? undefined);
    const status = await getOrderReviewStatus(authed, orderId);
    return mobileResponseOk({ status, canReview: status === "NONE" }, requestId);
  })(req);
}
