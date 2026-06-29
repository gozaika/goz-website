import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { deviceDeregisterRequestSchema, deviceRegisterRequestSchema } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";

/**
 * Register / deregister this device's push token (Slice 16). Per-profile, backed
 * by `notification_device` (push_token unique). Upsert reassigns a token to the
 * current profile on reinstall/handover. DELETE deactivates on sign-out.
 */

export const POST = withMobileAuth(async ({ req, actor, requestId }) => {
  const parsed = deviceRegisterRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Check the device registration and try again.", requestId, {
      fieldErrors: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "pushToken"), message: i.message })),
    });
  }

  const service = createServiceRoleSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await service
    .from("notification_device")
    .upsert(
      {
        push_token: parsed.data.pushToken,
        iam_profile_fk: actor.profilePk,
        device_platform_code: parsed.data.platform,
        device_label: parsed.data.deviceLabel ?? null,
        is_active: true,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "push_token" },
    )
    .select("notification_device_pk")
    .single();

  if (error || !data) {
    console.error("notification_device_register_failed", { requestId, code: error?.code });
    return mobileResponseErr("SERVER_ERROR", "Could not register this device for notifications.", requestId);
  }
  return mobileResponseOk({ deviceId: (data as { notification_device_pk: string }).notification_device_pk, active: true }, requestId);
});

export const DELETE = withMobileAuth(async ({ req, actor, requestId }) => {
  const parsed = deviceDeregisterRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Provide the device token to deregister.", requestId);
  }
  const service = createServiceRoleSupabaseClient();
  const { error } = await service
    .from("notification_device")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("push_token", parsed.data.pushToken)
    .eq("iam_profile_fk", actor.profilePk);
  if (error) {
    console.error("notification_device_deregister_failed", { requestId, code: error.code });
    return mobileResponseErr("SERVER_ERROR", "Could not deregister this device.", requestId);
  }
  return mobileResponseOk({ deviceId: "", active: false }, requestId);
});
