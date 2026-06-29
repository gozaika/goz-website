import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";
import { isPushConfigured, sendPushToProfile } from "@/lib/push/fcm";

/**
 * Send a test push notification to the caller's own registered devices (Slice 16).
 * Real "send me a test notification" feature + the on-device delivery-proof hook.
 * Returns a disabled state (not an error) when FCM credentials aren't configured,
 * so the UI can degrade gracefully (Razorpay-style gating).
 */
export const POST = withMobileAuth(async ({ actor, requestId }) => {
  if (!isPushConfigured()) {
    return mobileResponseOk({ configured: false, sent: 0, failed: 0, devices: 0 }, requestId);
  }
  const service = createServiceRoleSupabaseClient();
  try {
    const result = await sendPushToProfile(service, actor.profilePk, {
      title: "goZaika",
      body: "Push notifications are working 🎉",
      data: { link: "/(tabs)" },
    });
    return mobileResponseOk({ configured: true, ...result }, requestId);
  } catch (e) {
    console.error("notification_test_send_failed", { requestId, message: e instanceof Error ? e.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Could not send a test notification.", requestId);
  }
});
