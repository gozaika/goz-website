"use client";

import { AllergenChips, Button, DietaryBadge, FilterChipRow, QueueCard, type StatusTone } from "@gozaika/ui";
import { palette } from "@gozaika/design-tokens";
import type { ApiResponse, NoShowResult, OrderIncidentSummary, PickupVerificationResult, RestaurantOrderSummary } from "@gozaika/types";
import { formatPaise, formatPickupWindow, notificationStatusLabel, safeErrorMessage } from "@gozaika/utils";
import { AlertTriangle, CheckCircle2, ClipboardCheck, PackageX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const incidentTypes = [
  "DIETARY_MISMATCH",
  "FOOD_SAFETY",
  "PACKAGING_BREACH",
  "PICKUP_NOT_HONORED",
  "MISSING_ORDER",
  "QUALITY_ISSUE",
  "PLATFORM_ERROR",
] as const;

type OrderFilter = "active" | "all" | "collected" | "issues";

function statusTone(status: string): StatusTone {
  if (status === "COLLECTED") return "success";
  if (status === "NO_SHOW") return "danger";
  return "warning";
}

function windowClosed(order: RestaurantOrderSummary) {
  return Date.parse(order.pickupWindowEndAt) <= Date.now();
}

function terminal(order: RestaurantOrderSummary) {
  return order.orderStatusCode === "COLLECTED" || order.orderStatusCode === "NO_SHOW";
}

function isIssue(order: RestaurantOrderSummary) {
  return (order.incidentCount ?? 0) > 0 || order.orderStatusCode === "NO_SHOW";
}

export function OrdersClient({ initialOrders }: { readonly initialOrders: readonly RestaurantOrderSummary[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<OrderFilter>("active");
  const [busyOrderPk, setBusyOrderPk] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [otpByOrder, setOtpByOrder] = useState<Record<string, string>>({});
  const [qrByOrder, setQrByOrder] = useState<Record<string, string>>({});
  const [noShowReasonByOrder, setNoShowReasonByOrder] = useState<Record<string, string>>({});
  const [incidentByOrder, setIncidentByOrder] = useState<Record<string, { typeCode: string; severityCode: string; descriptionText: string; internalNoteText: string }>>({});

  const counts = useMemo(
    () => ({
      active: initialOrders.filter((order) => !terminal(order)).length,
      all: initialOrders.length,
      collected: initialOrders.filter((order) => order.orderStatusCode === "COLLECTED").length,
      issues: initialOrders.filter(isIssue).length,
    }),
    [initialOrders],
  );

  const visibleOrders = useMemo(
    () =>
      initialOrders.filter((order) => {
        if (filter === "active") return !terminal(order);
        if (filter === "collected") return order.orderStatusCode === "COLLECTED";
        if (filter === "issues") return isIssue(order);
        return true;
      }),
    [initialOrders, filter],
  );

  function setMessage(orderPk: string, message: string) {
    setMessages((current) => ({ ...current, [orderPk]: message }));
  }

  async function verify(order: RestaurantOrderSummary, mode: "otp" | "qr") {
    const otp = otpByOrder[order.orderPk]?.trim();
    const qrPayload = qrByOrder[order.orderPk]?.trim();
    setBusyOrderPk(order.orderPk);
    setMessage(order.orderPk, "");

    try {
      const response = await fetch(`/api/portal/orders/${order.orderPk}/pickup/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "otp" ? { otp, deviceLabel: "Counter web" } : { qrPayload, deviceLabel: "Counter web" }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<PickupVerificationResult>;
      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Pickup verification failed.");
      }
      setMessage(order.orderPk, payload.data.message);
      router.refresh();
    } catch (caught) {
      setMessage(order.orderPk, safeErrorMessage(caught, "Pickup verification failed."));
    } finally {
      setBusyOrderPk(null);
    }
  }

  async function markNoShow(order: RestaurantOrderSummary) {
    setBusyOrderPk(order.orderPk);
    setMessage(order.orderPk, "");

    try {
      const response = await fetch(`/api/portal/orders/${order.orderPk}/no-show`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reasonText: noShowReasonByOrder[order.orderPk] ?? "" }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<NoShowResult>;
      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not mark no-show.");
      }
      setMessage(order.orderPk, payload.data.message);
      router.refresh();
    } catch (caught) {
      setMessage(order.orderPk, safeErrorMessage(caught, "Could not mark no-show."));
    } finally {
      setBusyOrderPk(null);
    }
  }

  async function createIncident(order: RestaurantOrderSummary) {
    const draft = incidentByOrder[order.orderPk] ?? {
      typeCode: "QUALITY_ISSUE",
      severityCode: "P3",
      descriptionText: "",
      internalNoteText: "",
    };
    setBusyOrderPk(order.orderPk);
    setMessage(order.orderPk, "");

    try {
      const response = await fetch(`/api/portal/orders/${order.orderPk}/incidents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<OrderIncidentSummary>;
      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not log incident.");
      }
      setMessage(order.orderPk, `Incident logged: ${payload.data.typeName}.`);
      router.refresh();
    } catch (caught) {
      setMessage(order.orderPk, safeErrorMessage(caught, "Could not log incident."));
    } finally {
      setBusyOrderPk(null);
    }
  }

  if (initialOrders.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-hairline bg-white p-6 text-sm text-muted">
        No paid pickup orders are ready yet.
      </section>
    );
  }

  const filterChips = [
    { id: "active", label: `Active (${counts.active})` },
    { id: "all", label: `All (${counts.all})` },
    { id: "collected", label: `Collected (${counts.collected})` },
    { id: "issues", label: `Issues (${counts.issues})` },
  ];

  return (
    <div className="grid gap-4">
      <FilterChipRow
        ariaLabel="Order filters"
        accent={palette.forest}
        chips={filterChips.map((chip) => ({ ...chip, selected: filter === chip.id }))}
        onSelect={(id) => setFilter(id as OrderFilter)}
      />

      {visibleOrders.length === 0 ? (
        <section className="rounded-lg border border-dashed border-hairline bg-white p-6 text-sm text-muted">
          No orders in this view.
        </section>
      ) : null}

      {visibleOrders.map((order) => {
        const busy = busyOrderPk === order.orderPk;
        const canVerify = !terminal(order) && !windowClosed(order);
        const canNoShow = !terminal(order) && windowClosed(order);
        const incidentDraft = incidentByOrder[order.orderPk] ?? {
          typeCode: "QUALITY_ISSUE",
          severityCode: "P3",
          descriptionText: "",
          internalNoteText: "",
        };

        return (
          <article key={order.orderPk} className="grid gap-3">
            <QueueCard
              orderNumber={order.orderNumber}
              title={`${order.bagDisplayName} · ${order.dropTitle}`}
              statusLabel={order.orderStatusCode.replaceAll("_", " ")}
              statusTone={statusTone(order.orderStatusCode)}
              detailLines={[
                formatPickupWindow(order.pickupWindowStartAt, order.pickupWindowEndAt),
                `Qty ${order.quantity} · ${order.dietaryCategoryCode.replaceAll("_", "-")} · ${order.paymentIntentStatusCode ?? order.paymentStatusCode}`,
                `${order.pickupVerificationAttemptCount ?? 0} verification attempts`,
              ]}
              amountLabel={formatPaise(order.paidAmountPaise)}
              incidentLabel={(order.incidentCount ?? 0) > 0 ? `${order.incidentCount} incident${order.incidentCount === 1 ? "" : "s"}` : undefined}
            />

            <div className="rounded-lg border border-hairline bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-charcoal">Dietary and allergen context</p>
                <DietaryBadge code={order.dietaryCategoryCode} />
              </div>
              <div className="mt-2">
                <AllergenChips codes={order.allergenCodes} />
              </div>
              {order.allergenSummaryText ? (
                <p className="mt-2 text-sm font-medium text-danger">{order.allergenSummaryText}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">No allergen summary was snapshotted for this order.</p>
              )}

            {order.notifications?.length ? (
              <details className="mt-4 rounded-lg border border-hairline bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-charcoal">Notification history</summary>
                <div className="mt-3 grid gap-2">
                  {order.notifications.slice(0, 6).map((notification) => (
                    <div key={notification.notificationOutboxPk} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-black/[0.03] px-3 py-2 text-xs">
                      <span className="font-semibold">
                        {notification.templateCode.replaceAll("_", " ").toLowerCase()} / {notification.channelCode.toLowerCase()}
                      </span>
                      <span>{notificationStatusLabel(notification.sendStatusCode, notification.deliveryReasonCode)}</span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            {messages[order.orderPk] ? (
              <p className="mt-4 rounded-lg border border-gold/40 bg-warning-soft p-3 text-sm font-medium text-charcoal">
                {messages[order.orderPk]}
              </p>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <section className="rounded-lg border border-hairline bg-black/[0.02] p-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-forest" aria-hidden="true" />
                  <h3 className="font-semibold">Verify pickup</h3>
                </div>
                {order.orderStatusCode === "COLLECTED" ? (
                  <p className="mt-3 text-sm text-forest">Collected {order.collectedAt ? new Date(order.collectedAt).toLocaleString("en-IN") : "successfully"}.</p>
                ) : order.orderStatusCode === "NO_SHOW" ? (
                  <p className="mt-3 text-sm text-danger">Marked no-show. Pickup proof is no longer usable.</p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    <label className="grid gap-1 text-sm font-medium">
                      6-digit OTP
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        className="min-h-12 rounded-md border border-hairline px-3 text-2xl font-bold tracking-[0.18em]"
                        value={otpByOrder[order.orderPk] ?? ""}
                        onChange={(event) => setOtpByOrder((current) => ({ ...current, [order.orderPk]: event.target.value.replace(/\D/g, "").slice(0, 6) }))}
                        placeholder="123456"
                      />
                    </label>
                    <Button type="button" disabled={busy || !canVerify || (otpByOrder[order.orderPk] ?? "").length !== 6} onClick={() => verify(order, "otp")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Verify OTP
                    </Button>
                    <label className="grid gap-1 text-sm font-medium">
                      QR payload paste
                      <textarea
                        className="min-h-20 rounded-md border border-hairline px-3 py-2 text-xs"
                        value={qrByOrder[order.orderPk] ?? ""}
                        onChange={(event) => setQrByOrder((current) => ({ ...current, [order.orderPk]: event.target.value }))}
                        placeholder='{"version":1,...}'
                      />
                    </label>
                    <Button type="button" variant="secondary" disabled={busy || !canVerify || !(qrByOrder[order.orderPk] ?? "").trim()} onClick={() => verify(order, "qr")}>
                      Verify QR payload
                    </Button>
                    {!canVerify ? <p className="text-xs text-danger">Verification is unavailable after pickup window close or terminal pickup state.</p> : null}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-hairline bg-white p-4">
                <div className="flex items-center gap-2">
                  <PackageX className="h-5 w-5 text-danger" aria-hidden="true" />
                  <h3 className="font-semibold">No-show and incident</h3>
                </div>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-sm font-medium">
                    No-show reason
                    <textarea
                      className="min-h-20 rounded-md border border-hairline px-3 py-2"
                      value={noShowReasonByOrder[order.orderPk] ?? ""}
                      onChange={(event) => setNoShowReasonByOrder((current) => ({ ...current, [order.orderPk]: event.target.value }))}
                      placeholder="Customer did not arrive before the pickup window closed."
                    />
                  </label>
                  <Button type="button" variant="danger" disabled={busy || !canNoShow} onClick={() => markNoShow(order)}>
                    Mark no-show
                  </Button>
                  {!canNoShow && !terminal(order) ? <p className="text-xs text-muted">No-show unlocks after the pickup window closes.</p> : null}

                  <div className="mt-2 border-t border-hairline pt-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />
                      <p className="text-sm font-semibold">Log pilot incident</p>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <select
                        className="min-h-11 rounded-md border border-hairline px-3 text-sm"
                        value={incidentDraft.typeCode}
                        onChange={(event) => setIncidentByOrder((current) => ({ ...current, [order.orderPk]: { ...incidentDraft, typeCode: event.target.value } }))}
                      >
                        {incidentTypes.map((type) => (
                          <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
                        ))}
                      </select>
                      <select
                        className="min-h-11 rounded-md border border-hairline px-3 text-sm"
                        value={incidentDraft.severityCode}
                        onChange={(event) => setIncidentByOrder((current) => ({ ...current, [order.orderPk]: { ...incidentDraft, severityCode: event.target.value } }))}
                      >
                        <option value="P1">P1 Food safety</option>
                        <option value="P2">P2 High</option>
                        <option value="P3">P3 Standard</option>
                        <option value="P4">P4 Low</option>
                      </select>
                    </div>
                    <textarea
                      className="mt-2 min-h-20 w-full rounded-md border border-hairline px-3 py-2 text-sm"
                      value={incidentDraft.descriptionText}
                      onChange={(event) => setIncidentByOrder((current) => ({ ...current, [order.orderPk]: { ...incidentDraft, descriptionText: event.target.value } }))}
                      placeholder="Short description for launch support."
                    />
                    <Button type="button" variant="secondary" className="mt-2 w-full" disabled={busy || incidentDraft.descriptionText.trim().length < 10} onClick={() => createIncident(order)}>
                      Log incident
                    </Button>
                  </div>
                </div>
              </section>
            </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
