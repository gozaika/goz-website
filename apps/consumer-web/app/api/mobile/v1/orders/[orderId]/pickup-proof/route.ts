import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import type { PickupProof } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { issuePickupProofForOrder } from "@/lib/orders";

/**
 * Issue the in-app pickup proof (QR nonce + 6-digit OTP) for a paid order (CM-2).
 * Parity with the web order detail: the plaintext is derived here and only its
 * hashes are persisted, so the customer can complete pickup in-app without relying
 * on SMS delivery. Ownership is enforced by the RLS-scoped order view.
 */
export async function GET(req: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const { orderId } = await params;
  return withMobileAuth(async ({ requestId }) => {
    const token = parseBearerToken(req.headers.get("authorization"));
    const authed = createServerSupabaseClient(token ?? undefined);

    let proof: PickupProof | null;
    try {
      proof = await issuePickupProofForOrder(authed, orderId);
    } catch {
      return mobileResponseErr("SERVER_ERROR", "Could not prepare your pickup proof right now.", requestId);
    }
    if (!proof) {
      return mobileResponseErr("NOT_FOUND", "Order not found.", requestId);
    }
    return mobileResponseOk(proof satisfies PickupProof, requestId);
  })(req);
}
