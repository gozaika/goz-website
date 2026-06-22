import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { CheckoutProviderMode } from "@gozaika/types";

/**
 * Resolve the consumer_profile for a mobile actor (by their IAM profile). The
 * consumer profile is bootstrapped by the customer app's `/me` flow; if it's missing
 * here the caller returns a clear "finish setting up your profile" error rather than
 * silently creating partial payment state.
 */
export async function resolveConsumerProfilePk(profilePk: string): Promise<string | null> {
  const service = createServiceRoleSupabaseClient();
  const { data } = await service
    .from("consumer_profile")
    .select("consumer_profile_pk")
    .eq("iam_profile_fk", profilePk)
    .maybeSingle<{ consumer_profile_pk: string }>();
  return data?.consumer_profile_pk ?? null;
}

/**
 * Whether the payment simulator is enabled. Single env-flag gate (per the Slice 9
 * design decision): the flag must be the explicit string "true" and MUST be false in
 * any production/live environment (see docs/mobile/slice9-payment-design.md).
 */
export function simulatorEnabled(): boolean {
  return process.env.PAYMENTS_SIMULATOR_ENABLED === "true";
}

/** Active provider mode for new checkouts: simulated when the flag is on, else razorpay. */
export function checkoutMode(): CheckoutProviderMode {
  return simulatorEnabled() ? "simulated" : "razorpay";
}

/** Public Razorpay key id (never the secret). Empty when unconfigured. */
export function razorpayKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "";
}
