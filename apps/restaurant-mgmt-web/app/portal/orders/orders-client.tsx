"use client";

import { AllergenChips, Button, DietaryBadge } from "@gozaika/ui";
import type { ApiResponse, NoShowResult, OrderIncidentSummary, PickupVerificationResult, RestaurantOrderSummary } from "@gozaika/types";
import { formatPaise, formatPickupWindow, safeErrorMessage } from "@gozaika/utils";
import { AlertTriangle, CheckCircle2, ClipboardCheck, PackageX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const incidentTypes = [
  "DIETARY_MISMATCH",
  "FOOD_SAFETY",
  "PACKAGING_BREACH",
  "PICKUP_NOT_HONORED",
  "MISSING_ORDER",
  "QUALITY_ISSUE",
  "PLATFORM_ERROR",
] as const;

function statusBadgeClass(status: string) {
  if (status === "COLLECTED") return "border-[#1A5C38]/30 bg-[#F2F8EF] text-[#1A5C38]";
  if (status === "NO_SHOW") return "border-red-200 bg-red-50 text-red-700";
  return "border-[#D4A017]/40 bg-[#FFF8E6] text-[#7A5A00]";
}

function windowClosed(order: RestaurantOrderSummary) {
  return Date.parse(order.pickupWindowEndAt) <= Date.now();
}

function terminal(order: RestaurantOrderSummary) {
  return order.orderStatusCode === "COLLECTED" || order.orderStatusCode === "NO_SHOW";
}

export function OrdersClient({ initialOrders }: { readonly initialOrders: readonly RestaurantOrderSummary[] }) {
  const router = useRouter();
  const [busyOrderPk, setBusyOrderPk] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [otpByOrder, setOtpByOrder] = useState<Record<string, string>>({});
  const [qrByOrder, setQrByOrder] = useState<Record<string, string>>({});
  const [noShowReasonByOrder, setNoShowReasonByOrder] = useState<Record<string, string>>({});
  const [incidentByOrder, setIncidentByOrder] = useState<Record<string, { typeCode: string; severityCode: string; descriptionText: string; internalNoteText: string }>>({});

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
      <section className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-slate-600">
        No paid pickup orders are ready yet.
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {initialOrders.map((order) => {
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
          <article key={order.orderPk} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1A5C38]">{order.orderNumber}</p>
                <h2 className="mt-1 text-xl font-bold">{order.bagDisplayName}</h2>
                <p className="mt-1 text-sm text-slate-600">{order.dropTitle}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <DietaryBadge code={order.dietaryCategoryCode} />
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.orderStatusCode)}`}>
                  {order.orderStatusCode.replaceAll("_", " ")}
                </span>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-5">
              <div>
                <dt className="font-semibold text-slate-950">Pickup</dt>
                <dd>{formatPickupWindow(order.pickupWindowStartAt, order.pickupWindowEndAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">Quantity</dt>
                <dd>{order.quantity}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">Paid</dt>
                <dd>{formatPaise(order.paidAmountPaise)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">Payment</dt>
                <dd>{order.paymentIntentStatusCode ?? order.paymentStatusCode}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">Pickup support</dt>
                <dd>{order.pickupVerificationAttemptCount ?? 0} attempts, {order.incidentCount ?? 0} incidents</dd>
              </div>
            </dl>

            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-950">Dietary and allergen context</p>
              <div className="mt-2">
                <AllergenChips codes={order.allergenCodes} />
              </div>
              {order.allergenSummaryText ? (
                <p className="mt-2 text-sm font-medium text-[#B42318]">{order.allergenSummaryText}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No allergen summary was snapshotted for this order.</p>
              )}
            </div>

            {messages[order.orderPk] ? (
              <p className="mt-4 rounded-lg border border-[#D4A017]/40 bg-[#FFF8E6] p-3 text-sm font-medium text-slate-800">
                {messages[order.orderPk]}
              </p>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <section className="rounded-lg border border-black/10 bg-black/[0.02] p-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-[#1A5C38]" aria-hidden="true" />
                  <h3 className="font-semibold">Verify pickup</h3>
                </div>
                {order.orderStatusCode === "COLLECTED" ? (
                  <p className="mt-3 text-sm text-[#1A5C38]">Collected {order.collectedAt ? new Date(order.collectedAt).toLocaleString("en-IN") : "successfully"}.</p>
                ) : order.orderStatusCode === "NO_SHOW" ? (
                  <p className="mt-3 text-sm text-red-700">Marked no-show. Pickup proof is no longer usable.</p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    <label className="grid gap-1 text-sm font-medium">
                      6-digit OTP
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        className="min-h-12 rounded-md border border-black/15 px-3 text-2xl font-bold tracking-[0.18em]"
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
                        className="min-h-20 rounded-md border border-black/15 px-3 py-2 text-xs"
                        value={qrByOrder[order.orderPk] ?? ""}
                        onChange={(event) => setQrByOrder((current) => ({ ...current, [order.orderPk]: event.target.value }))}
                        placeholder='{"version":1,...}'
                      />
                    </label>
                    <Button type="button" className="bg-[#1A5C38] hover:bg-[#154b2e]" disabled={busy || !canVerify || !(qrByOrder[order.orderPk] ?? "").trim()} onClick={() => verify(order, "qr")}>
                      Verify QR payload
                    </Button>
                    {!canVerify ? <p className="text-xs text-red-700">Verification is unavailable after pickup window close or terminal pickup state.</p> : null}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-black/10 bg-white p-4">
                <div className="flex items-center gap-2">
                  <PackageX className="h-5 w-5 text-red-700" aria-hidden="true" />
                  <h3 className="font-semibold">No-show and incident</h3>
                </div>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-sm font-medium">
                    No-show reason
                    <textarea
                      className="min-h-20 rounded-md border border-black/15 px-3 py-2"
                      value={noShowReasonByOrder[order.orderPk] ?? ""}
                      onChange={(event) => setNoShowReasonByOrder((current) => ({ ...current, [order.orderPk]: event.target.value }))}
                      placeholder="Customer did not arrive before the pickup window closed."
                    />
                  </label>
                  <Button type="button" className="bg-red-700 hover:bg-red-800" disabled={busy || !canNoShow} onClick={() => markNoShow(order)}>
                    Mark no-show
                  </Button>
                  {!canNoShow && !terminal(order) ? <p className="text-xs text-slate-500">No-show unlocks after the pickup window closes.</p> : null}

                  <div className="mt-2 border-t border-black/10 pt-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-[#B42318]" aria-hidden="true" />
                      <p className="text-sm font-semibold">Log pilot incident</p>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <select
                        className="min-h-11 rounded-md border border-black/15 px-3 text-sm"
                        value={incidentDraft.typeCode}
                        onChange={(event) => setIncidentByOrder((current) => ({ ...current, [order.orderPk]: { ...incidentDraft, typeCode: event.target.value } }))}
                      >
                        {incidentTypes.map((type) => (
                          <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
                        ))}
                      </select>
                      <select
                        className="min-h-11 rounded-md border border-black/15 px-3 text-sm"
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
                      className="mt-2 min-h-20 w-full rounded-md border border-black/15 px-3 py-2 text-sm"
                      value={incidentDraft.descriptionText}
                      onChange={(event) => setIncidentByOrder((current) => ({ ...current, [order.orderPk]: { ...incidentDraft, descriptionText: event.target.value } }))}
                      placeholder="Short description for launch support."
                    />
                    <Button type="button" className="mt-2 w-full bg-[#1A5C38] hover:bg-[#154b2e]" disabled={busy || incidentDraft.descriptionText.trim().length < 10} onClick={() => createIncident(order)}>
                      Log incident
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          </article>
        );
      })}
    </div>
  );
}
