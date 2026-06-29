import { safeInternalPath } from "@gozaika/mobile-core";
import { deviceRegisterResultSchema } from "@gozaika/types";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { apiClient } from "@/api/client";

// Only navigate to a validated in-app path: a push payload is attacker-influenceable.
function linkFromResponse(response: Notifications.NotificationResponse | null): string | null {
  return safeInternalPath(response?.notification.request.content.data?.link);
}

/**
 * Route a notification tap to its deep link (the `data.link` path), both while the
 * app is running and on cold start. No-op when a notification carries no link.
 */
export function useNotificationDeepLinks(): void {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = linkFromResponse(response);
      if (link) router.push(link as never);
    });
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const link = linkFromResponse(response);
        if (link) router.push(link as never);
      })
      .catch(() => {});
    return () => sub.remove();
  }, []);
}

// Foreground presentation: show the banner + list entry even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Register this device's native push token (Slice 16) once the partner is signed
 * in. Uses the FCM/APNs device token (server sends via FCM HTTP v1). Fails safe:
 * on a simulator, when permission is denied, or before `google-services.json` is
 * embedded, `getDevicePushTokenAsync` throws and we silently no-op.
 */
export function usePushRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const current = await Notifications.getPermissionsAsync();
        let granted = current.granted;
        if (!granted && current.canAskAgain) {
          granted = (await Notifications.requestPermissionsAsync()).granted;
        }
        if (!granted || cancelled) return;

        const token = await Notifications.getDevicePushTokenAsync();
        const pushToken = typeof token.data === "string" ? token.data : String(token.data);
        if (cancelled || pushToken.length < 8) return;

        await apiClient.request("/notifications/device", {
          method: "POST",
          body: { pushToken, platform: Platform.OS === "ios" ? "IOS" : "ANDROID" },
          dataSchema: deviceRegisterResultSchema,
        });
      } catch {
        // No FCM config yet / simulator / denied — registration is best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
