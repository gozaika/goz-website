"use client";

import { Button } from "@gozaika/ui";
import type { AdminNotificationDeliverySummary, ApiResponse, NotificationActionResult } from "@gozaika/types";
import { notificationStatusLabel, safeErrorMessage } from "@gozaika/utils";
import { Copy, RotateCcw, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function canRetry(notification: AdminNotificationDeliverySummary): boolean {
  return notification.sendStatusCode === "FAILED" && !["CONSENT_NOT_GRANTED", "PREFERENCE_DISABLED", "DESTINATION_MISSING"].includes(notification.deliveryReasonCode ?? "");
}

function canSuppress(notification: AdminNotificationDeliverySummary): boolean {
  return ["QUEUED", "SENDING", "FAILED"].includes(notification.sendStatusCode);
}

export function NotificationsClient({ notifications }: { readonly notifications: readonly AdminNotificationDeliverySummary[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function postAction(notification: AdminNotificationDeliverySummary, action: "retry" | "suppress") {
    const reasonText =
      action === "retry"
        ? "Admin retry after reviewing provider configuration."
        : "Admin suppressed queued notification during support review.";
    setBusy(`${action}:${notification.notificationOutboxPk}`);
    setMessages((current) => ({ ...current, [notification.notificationOutboxPk]: "" }));

    try {
      const response = await fetch(`/api/admin/notifications/${notification.notificationOutboxPk}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reasonText }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<NotificationActionResult>;
      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? `Could not ${action} notification.`);
      }
      setMessages((current) => ({ ...current, [notification.notificationOutboxPk]: payload.data!.message }));
      router.refresh();
    } catch (caught) {
      setMessages((current) => ({
        ...current,
        [notification.notificationOutboxPk]: safeErrorMessage(caught, `Could not ${action} notification.`),
      }));
    } finally {
      setBusy(null);
    }
  }

  async function copyFallback(notification: AdminNotificationDeliverySummary) {
    const fallback = notification.manualFallbackText;
    if (!fallback) {
      setMessages((current) => ({ ...current, [notification.notificationOutboxPk]: "No fallback copy is available." }));
      return;
    }

    try {
      await navigator.clipboard.writeText(fallback);
      setMessages((current) => ({ ...current, [notification.notificationOutboxPk]: "Fallback copy copied. This is not proof of delivery." }));
    } catch {
      setMessages((current) => ({ ...current, [notification.notificationOutboxPk]: "Could not copy fallback text." }));
    }
  }

  if (notifications.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
        No notification rows match this filter yet.
      </section>
    );
  }

  return (
    <div className="grid gap-3">
      {notifications.map((notification) => {
        const status = notificationStatusLabel(notification.sendStatusCode, notification.deliveryReasonCode);
        const busyRetry = busy === `retry:${notification.notificationOutboxPk}`;
        const busySuppress = busy === `suppress:${notification.notificationOutboxPk}`;

        return (
          <article key={notification.notificationOutboxPk} className="rounded-lg border border-black/10 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1A5C38]">
                  {notification.templateCode.replaceAll("_", " ")} / {notification.channelCode}
                </p>
                <h2 className="mt-1 font-bold text-black">
                  {notification.orderNumber ?? notification.businessContextTypeCode ?? "Notification"}
                </h2>
                <p className="mt-1 text-xs text-black/55">
                  {notification.restaurantName ?? "Platform"} - destination {notification.destinationMaskedText}
                </p>
              </div>
              <span className="rounded-full border border-[#1A5C38]/25 px-3 py-1 text-xs font-semibold text-[#1A5C38]">
                {status}
              </span>
            </div>

            <dl className="mt-3 grid gap-2 text-sm text-black/70 sm:grid-cols-5">
              <div>
                <dt className="font-semibold text-black">Audience</dt>
                <dd>{notification.audienceCode}</dd>
              </div>
              <div>
                <dt className="font-semibold text-black">Provider</dt>
                <dd>{notification.providerCode ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-black">Scheduled</dt>
                <dd>{new Date(notification.scheduledAt).toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-black">Attempts</dt>
                <dd>{notification.retryCount} / {notification.maxAttempts}</dd>
              </div>
              <div>
                <dt className="font-semibold text-black">Provider ref</dt>
                <dd>{notification.providerMessageRef ? notification.providerMessageRef.slice(0, 24) : "None"}</dd>
              </div>
            </dl>

            {notification.lastErrorCode || notification.lastErrorText ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {notification.lastErrorCode ?? "ERROR"}: {notification.lastErrorText ?? "No detail exposed."}
              </p>
            ) : null}

            {messages[notification.notificationOutboxPk] ? (
              <p className="mt-3 rounded-md border border-[#D4A017]/40 bg-[#FFF8E6] px-3 py-2 text-xs font-medium text-black">
                {messages[notification.notificationOutboxPk]}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" className="min-h-10 bg-[#1A5C38] text-xs hover:bg-[#154b2e]" disabled={!canRetry(notification) || busyRetry} onClick={() => postAction(notification, "retry")}>
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                {busyRetry ? "Retrying..." : "Retry"}
              </Button>
              <Button type="button" className="min-h-10 bg-red-700 text-xs hover:bg-red-800" disabled={!canSuppress(notification) || busySuppress} onClick={() => postAction(notification, "suppress")}>
                <ShieldOff className="mr-2 h-4 w-4" aria-hidden="true" />
                {busySuppress ? "Suppressing..." : "Suppress"}
              </Button>
              <Button type="button" className="min-h-10 bg-white text-xs text-[#1A5C38] ring-1 ring-[#1A5C38]/25 hover:bg-[#F2F8EF]" onClick={() => copyFallback(notification)}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                Copy fallback
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
