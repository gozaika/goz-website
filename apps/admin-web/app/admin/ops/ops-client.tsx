"use client";

import { Button } from "@gozaika/ui";
import type {
  AdminOpsActionResult,
  AdminOpsAuditRow,
  AdminOpsConfigFlagRow,
  AdminOpsDropSummary,
  AdminOpsIncidentQueueRow,
  AdminOpsRefundQueueRow,
  AdminOpsRestaurantSummary,
  AdminOpsSupportTicketRow,
  ApiResponse,
} from "@gozaika/types";
import {
  adminOpsStatusLabel,
  adminOpsStatusTone,
  formatPaise,
  generateSupportSafeCsv,
  generateSupportSafeText,
  safeErrorMessage,
  slaFreshnessLabel,
} from "@gozaika/utils";
import { Copy, Download, Flag, Pause, Play, RefreshCcw, ShieldAlert, TicketCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

type QueueTab = "restaurants" | "incidents" | "support" | "refunds" | "drops" | "config" | "audit";

function toneClass(statusCode: string) {
  const tone = adminOpsStatusTone(statusCode);
  if (tone === "success") return "border-[#1A5C38]/25 bg-[#F2F8EF] text-[#1A5C38]";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "warning") return "border-[#D4A017]/40 bg-[#FFF8E6] text-[#7A5A00]";
  return "border-black/10 bg-white text-black/65";
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "-";
}

function useReason() {
  const [reason, setReason] = useState("Ops review completed with required human reason.");
  return { reason, setReason };
}

export function AdminOpsClient({
  actorRoleCodes,
  restaurants,
  drops,
  incidents,
  supportTickets,
  refunds,
  configFlags,
  auditRows,
}: {
  readonly actorRoleCodes: readonly string[];
  readonly restaurants: readonly AdminOpsRestaurantSummary[];
  readonly drops: readonly AdminOpsDropSummary[];
  readonly incidents: readonly AdminOpsIncidentQueueRow[];
  readonly supportTickets: readonly AdminOpsSupportTicketRow[];
  readonly refunds: readonly AdminOpsRefundQueueRow[];
  readonly configFlags: readonly AdminOpsConfigFlagRow[];
  readonly auditRows: readonly AdminOpsAuditRow[];
}) {
  const router = useRouter();
  const { reason, setReason } = useReason();
  const [tab, setTab] = useState<QueueTab>("restaurants");
  const [restaurantFilter, setRestaurantFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [ticketSubject, setTicketSubject] = useState("Ops review follow-up");
  const [ticketRestaurantPk, setTicketRestaurantPk] = useState(restaurants[0]?.restaurantPk ?? "");
  const [refundOrderPk, setRefundOrderPk] = useState(refunds[0]?.orderPk ?? "");
  const [refundAmount, setRefundAmount] = useState(refunds[0]?.amountPaise ? String(refunds[0].amountPaise) : "");

  const canOps = actorRoleCodes.some((role) => ["SUPER_ADMIN", "OPS_ADMIN"].includes(role));
  const canSupport = actorRoleCodes.some((role) => ["SUPER_ADMIN", "OPS_ADMIN", "SUPPORT_ADMIN"].includes(role));
  const canRefund = actorRoleCodes.some((role) => ["SUPER_ADMIN", "OPS_ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN"].includes(role));
  const reasonReady = reason.trim().length >= 12;
  const canRunOpsAction = canOps && reasonReady;
  const canRunSupportAction = canSupport && reasonReady;
  const canRunRefundAction = canRefund && reasonReady;

  const statusOptions = useMemo(() => {
    if (tab === "restaurants") return ["ALL", "ACTIVE", "PAUSED", "SUSPENDED", "PENDING", "ONBOARDING"];
    if (tab === "drops") return ["ALL", "ACTIVE", "SCHEDULED", "PAUSED", "SOLD_OUT", "PICKUP_CLOSED"];
    if (tab === "refunds") return ["OPEN", "ALL", "REQUESTED", "OPS_REVIEW", "FINANCE_REVIEW", "APPROVED_MANUAL", "TRACKED_EXTERNALLY", "REJECTED", "CANCELLED"];
    if (tab === "config") return ["ALL", "ENABLED", "DISABLED"];
    if (tab === "audit") return ["ALL"];
    return ["OPEN", "ALL", "TRIAGED", "INVESTIGATING", "IN_PROGRESS", "MERCHANT_ACTION_REQUIRED", "PENDING_MERCHANT", "RESOLVED", "CLOSED", "REJECTED"];
  }, [tab]);

  const restaurantMatches = useCallback((restaurantPk: string | null | undefined) => {
    return restaurantFilter === "ALL" || restaurantPk === restaurantFilter;
  }, [restaurantFilter]);

  const dateMatches = useCallback((value: string) => {
    return !dateFilter || value.slice(0, 10) >= dateFilter;
  }, [dateFilter]);

  const visible = useMemo(() => {
    const openStatuses = new Set(["OPEN", "IN_PROGRESS", "TRIAGED", "INVESTIGATING", "MERCHANT_ACTION_REQUIRED", "REQUESTED", "OPS_REVIEW", "FINANCE_REVIEW"]);
    return {
      restaurants: restaurants.filter((row) => restaurantMatches(row.restaurantPk) && (statusFilter === "ALL" || statusFilter === "OPEN" || row.statusCode === statusFilter)),
      drops: drops.filter((row) => restaurantMatches(row.restaurantPk) && (statusFilter === "ALL" || row.statusCode === statusFilter || (statusFilter === "OPEN" && row.statusCode !== "PICKUP_CLOSED")) && dateMatches(row.updatedAt)),
      incidents: incidents.filter((row) => restaurantMatches(row.restaurantPk) && (statusFilter === "ALL" || row.statusCode === statusFilter || (statusFilter === "OPEN" && openStatuses.has(row.statusCode))) && dateMatches(row.updatedAt)),
      support: supportTickets.filter((row) => restaurantMatches(row.restaurantPk) && (statusFilter === "ALL" || row.statusCode === statusFilter || (statusFilter === "OPEN" && openStatuses.has(row.statusCode))) && dateMatches(row.updatedAt)),
      refunds: refunds.filter((row) => restaurantMatches(row.restaurantPk) && (statusFilter === "ALL" || row.trackingStatusCode === statusFilter || (statusFilter === "OPEN" && openStatuses.has(row.trackingStatusCode))) && dateMatches(row.updatedAt)),
      config: configFlags.filter((row) => restaurantMatches(row.scopeEntityPk) && (statusFilter === "ALL" || (statusFilter === "ENABLED" && row.isEnabled) || (statusFilter === "DISABLED" && !row.isEnabled)) && dateMatches(row.updatedAt)),
      audit: auditRows.filter((row) => dateMatches(row.createdAt)),
    };
  }, [auditRows, configFlags, dateMatches, drops, incidents, refunds, restaurantMatches, restaurants, statusFilter, supportTickets]);

  async function post<T>(url: string, body: unknown, fallback: string): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
    if (!payload.ok || payload.data === undefined) {
      throw new Error(payload.error ?? fallback);
    }
    return payload.data;
  }

  async function runAction(key: string, url: string, body: unknown, fallback: string) {
    setBusy(key);
    setMessage("");
    try {
      const result = await post<AdminOpsActionResult>(url, body, fallback);
      setMessage(result.message);
      router.refresh();
    } catch (caught) {
      setMessage(safeErrorMessage(caught, fallback));
    } finally {
      setBusy(null);
    }
  }

  function currentRows(): Record<string, unknown>[] {
    if (tab === "restaurants") {
      return visible.restaurants.map((row) => ({
        restaurant: row.restaurantName,
        status: row.statusCode,
        incidents: row.openIncidentCount,
        support: row.openSupportTicketCount,
        refunds: row.openRefundRequestCount,
        active_drops: row.activeDropCount,
        paused_drops: row.pausedDropCount,
      }));
    }
    if (tab === "incidents") {
      return visible.incidents.map((row) => ({
        restaurant: row.restaurantName,
        order: row.orderNumber,
        severity: row.severityCode,
        status: row.statusCode,
        title: row.titleText,
        latest_event: row.latestEventAt ?? row.updatedAt,
      }));
    }
    if (tab === "support") {
      return visible.support.map((row) => ({
        restaurant: row.restaurantName,
        order: row.orderNumber,
        priority: row.priorityCode,
        status: row.statusCode,
        subject: row.subjectText,
        sla: slaFreshnessLabel(row.slaDueAt),
      }));
    }
    if (tab === "refunds") {
      return visible.refunds.map((row) => ({
        restaurant: row.restaurantName,
        order: row.orderNumber,
        amount: formatPaise(row.amountPaise),
        tracking_status: row.trackingStatusCode,
        reason: row.refundReasonCode,
      }));
    }
    if (tab === "drops") {
      return visible.drops.map((row) => ({
        restaurant: row.restaurantName,
        drop: row.dropTitle,
        status: row.statusCode,
        available: row.quantityAvailable,
        paid_orders: row.paidOrderCount,
        pickup: new Date(row.pickupStartAt).toLocaleString("en-IN"),
      }));
    }
    if (tab === "config") {
      return visible.config.map((row) => ({
        flag: row.flagCode,
        scope: row.scopeLabel,
        enabled: row.isEnabled,
        value: row.numericValue ?? "",
        consumed_by: row.consumedByText,
      }));
    }
    return visible.audit.map((row) => ({
      action: row.actionCode,
      target: row.targetEntityTypeCode,
      target_id: shortId(row.targetEntityPk),
      reason: row.reasonText ?? "",
      created: row.createdAt,
    }));
  }

  async function copyRows() {
    const rows = currentRows();
    const columns = Object.keys(rows[0] ?? { empty: "" });
    const text = generateSupportSafeText(`goZaika admin ops ${tab}`, rows, columns);
    await navigator.clipboard.writeText(text);
    setMessage(`${rows.length} support-safe rows copied.`);
  }

  function downloadRows() {
    const rows = currentRows();
    const columns = Object.keys(rows[0] ?? { empty: "" });
    const csv = generateSupportSafeCsv(rows, columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gozaika-admin-ops-${tab}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`${rows.length} support-safe rows downloaded.`);
  }

  const counts = {
    incidents: incidents.filter((row) => !["RESOLVED", "CLOSED", "REJECTED"].includes(row.statusCode)).length,
    support: supportTickets.filter((row) => !["RESOLVED", "CLOSED", "REJECTED"].includes(row.statusCode)).length,
    refunds: refunds.filter((row) => !["TRACKED_EXTERNALLY", "REJECTED", "CANCELLED"].includes(row.trackingStatusCode)).length,
    pausedRestaurants: restaurants.filter((row) => ["PAUSED", "SUSPENDED"].includes(row.statusCode)).length,
  };

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryChip label="Open incidents" value={counts.incidents} />
        <SummaryChip label="Support tickets" value={counts.support} />
        <SummaryChip label="Refund review" value={counts.refunds} />
        <SummaryChip label="Paused/suspended" value={counts.pausedRestaurants} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Queue filters</h2>
              <p className="mt-1 text-xs text-black/55">Restaurants remain visible as operational targets; date filters activity rows.</p>
            </div>
            <button type="button" className="text-sm font-semibold text-[#1A5C38]" onClick={() => { setRestaurantFilter("ALL"); setStatusFilter(tab === "restaurants" || tab === "drops" || tab === "config" || tab === "audit" ? "ALL" : "OPEN"); setDateFilter(""); }}>
              Reset
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold">
              Restaurant
              <select className="min-h-11 rounded-md border border-black/15 px-3" value={restaurantFilter} onChange={(event) => setRestaurantFilter(event.target.value)}>
                <option value="ALL">All restaurants</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.restaurantPk} value={restaurant.restaurantPk}>{restaurant.restaurantName}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Queue status
              <select className="min-h-11 rounded-md border border-black/15 px-3" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{adminOpsStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Activity since
              <input className="min-h-11 rounded-md border border-black/15 px-3" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            </label>
          </div>
        </section>

        <aside className="grid gap-3 rounded-lg border border-[#1A5C38]/20 bg-[#F7FBF5] p-4 lg:sticky lg:top-4 lg:self-start">
          <div>
            <h2 className="font-bold text-[#1A5C38]">Action reason</h2>
            <p className="mt-1 text-xs text-black/60">Applied only to pause, resume, triage, refund, and config changes.</p>
          </div>
          <textarea
            className="min-h-28 resize-y rounded-md border border-[#1A5C38]/20 bg-white px-3 py-2 text-sm"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <p className={`text-xs font-semibold ${reasonReady ? "text-[#1A5C38]" : "text-[#B42318]"}`}>
            {reasonReady ? "Reason ready for audited actions." : "Enter at least 12 characters before changing state."}
          </p>
        </aside>
      </div>

      <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["restaurants", "drops", "incidents", "support", "refunds", "config", "audit"] as const).map((nextTab) => (
              <button
                key={nextTab}
                type="button"
                className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${tab === nextTab ? "border-[#1A5C38] bg-[#F2F8EF] text-[#1A5C38]" : "border-black/10 bg-white text-black/65"}`}
                onClick={() => {
                  setTab(nextTab);
                  setStatusFilter(nextTab === "incidents" || nextTab === "support" || nextTab === "refunds" ? "OPEN" : "ALL");
                }}
              >
                {nextTab}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-10 bg-white text-[#1A5C38] ring-1 ring-[#1A5C38]/25 hover:bg-[#F2F8EF]" onClick={copyRows}>
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              Copy safe rows
            </Button>
            <Button type="button" className="min-h-10 bg-white text-[#1A5C38] ring-1 ring-[#1A5C38]/25 hover:bg-[#F2F8EF]" onClick={downloadRows}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download CSV
            </Button>
          </div>
        </div>
      </section>

      {message ? <p className="rounded-lg border border-[#D4A017]/40 bg-[#FFF8E6] p-3 text-sm font-medium">{message}</p> : null}

      {tab === "restaurants" ? (
        <section className="grid gap-3">
          {visible.restaurants.length === 0 ? <Empty text={restaurants.length === 0 ? "No restaurant records were returned for ops. Apply the Slice 8B service-role view repair migration, then refresh this page." : "No restaurants match the selected restaurant/status filters."} /> : null}
          {visible.restaurants.map((restaurant) => (
            <article key={restaurant.restaurantPk} className="rounded-lg border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1A5C38]">{restaurant.restaurantName}</p>
                  <h2 className="mt-1 font-bold">{restaurant.restaurantSlug}</h2>
                  <p className="mt-1 text-xs text-black/55">Audit {restaurant.latestAuditAt ? new Date(restaurant.latestAuditAt).toLocaleString("en-IN") : "not yet written"}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(restaurant.statusCode)}`}>{adminOpsStatusLabel(restaurant.statusCode)}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm text-black/70 sm:grid-cols-5">
                <Stat label="Incidents" value={restaurant.openIncidentCount} />
                <Stat label="Support" value={restaurant.openSupportTicketCount} />
                <Stat label="Refunds" value={restaurant.openRefundRequestCount} />
                <Stat label="Active drops" value={restaurant.activeDropCount} />
                <Stat label="Paused drops" value={restaurant.pausedDropCount} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" disabled={!canRunOpsAction || busy !== null || restaurant.statusCode === "PAUSED"} className="min-h-10 bg-[#7A5A00] text-xs hover:bg-[#604600]" onClick={() => runAction(`restaurant:${restaurant.restaurantPk}:PAUSED`, `/api/admin/ops/restaurants/${restaurant.restaurantPk}/status`, { nextStatusCode: "PAUSED", reasonText: reason }, "Could not pause restaurant.")}>
                  <Pause className="mr-2 h-4 w-4" aria-hidden="true" />
                  Pause
                </Button>
                <Button type="button" disabled={!canRunOpsAction || busy !== null || restaurant.statusCode === "SUSPENDED"} className="min-h-10 bg-red-700 text-xs hover:bg-red-800" onClick={() => runAction(`restaurant:${restaurant.restaurantPk}:SUSPENDED`, `/api/admin/ops/restaurants/${restaurant.restaurantPk}/status`, { nextStatusCode: "SUSPENDED", reasonText: reason }, "Could not suspend restaurant.")}>
                  <ShieldAlert className="mr-2 h-4 w-4" aria-hidden="true" />
                  Suspend
                </Button>
                <Button type="button" disabled={!canRunOpsAction || busy !== null || restaurant.statusCode === "ACTIVE"} className="min-h-10 bg-[#1A5C38] text-xs hover:bg-[#154b2e]" onClick={() => runAction(`restaurant:${restaurant.restaurantPk}:ACTIVE`, `/api/admin/ops/restaurants/${restaurant.restaurantPk}/status`, { nextStatusCode: "ACTIVE", reasonText: reason }, "Could not reactivate restaurant.")}>
                  <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                  Reactivate
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {tab === "drops" ? (
        <QueueList empty="No paused or active drops match these filters. Active/scheduled drops appear here while pickup windows are operational.">
          {visible.drops.map((drop) => (
            <article key={drop.dropPk} className="rounded-lg border border-black/10 bg-white p-4">
              <RowHeader title={drop.dropTitle} eyebrow={drop.restaurantName} status={drop.statusCode} />
              <dl className="mt-3 grid gap-2 text-sm text-black/70 sm:grid-cols-5">
                <Stat label="Available" value={`${drop.quantityAvailable}/${drop.quantityTotal}`} />
                <Stat label="Paid orders" value={drop.paidOrderCount} />
                <Stat label="Pickup" value={new Date(drop.pickupStartAt).toLocaleString("en-IN")} />
                <Stat label="Drop id" value={shortId(drop.dropPk)} />
                <Stat label="Updated" value={new Date(drop.updatedAt).toLocaleString("en-IN")} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["PAUSED", "ACTIVE", "SCHEDULED"] as const).map((status) => (
                  <Button key={status} type="button" className="min-h-10 bg-[#1A5C38] text-xs hover:bg-[#154b2e]" disabled={!canRunOpsAction || busy !== null || drop.statusCode === status} onClick={() => runAction(`drop:${drop.dropPk}:${status}`, `/api/admin/ops/drops/${drop.dropPk}/status`, { nextStatusCode: status, reasonText: reason }, "Could not update drop status.")}>
                    {status === "PAUSED" ? <Pause className="mr-2 h-4 w-4" aria-hidden="true" /> : <Play className="mr-2 h-4 w-4" aria-hidden="true" />}
                    {adminOpsStatusLabel(status)}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </QueueList>
      ) : null}

      {tab === "incidents" ? (
        <QueueList empty="No incident rows match these filters. Pickup, dietary, food safety, or platform incidents appear after restaurant/admin logging.">
          {visible.incidents.map((incident) => (
            <article key={incident.incidentPk} className="rounded-lg border border-black/10 bg-white p-4">
              <RowHeader title={incident.titleText} eyebrow={`${incident.restaurantName ?? "Platform"} / ${incident.orderNumber ?? "No order"}`} status={`${incident.severityCode} ${adminOpsStatusLabel(incident.statusCode)}`} />
              <p className="mt-2 text-sm text-black/65">{incident.descriptionText ?? "No description provided."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["TRIAGED", "INVESTIGATING", "MERCHANT_ACTION_REQUIRED", "RESOLVED", "CLOSED"].map((status) => (
                  <Button key={status} type="button" className="min-h-10 bg-[#1A5C38] text-xs hover:bg-[#154b2e]" disabled={!canRunSupportAction || busy !== null || incident.statusCode === status} onClick={() => runAction(`incident:${incident.incidentPk}:${status}`, `/api/admin/ops/incidents/${incident.incidentPk}/triage`, { statusCode: status, reasonText: reason, noteText: reason }, "Could not triage incident.")}>
                    <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                    {adminOpsStatusLabel(status)}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </QueueList>
      ) : null}

      {tab === "support" ? (
        <QueueList empty="No support tickets match these filters. Create one below or wait for order/support intake to log a ticket.">
          <section className="rounded-lg border border-black/10 bg-white p-4">
            <h2 className="font-bold">Create support ticket</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <select className="min-h-11 rounded-md border border-black/15 px-3" value={ticketRestaurantPk} onChange={(event) => setTicketRestaurantPk(event.target.value)}>
                {restaurants.map((restaurant) => <option key={restaurant.restaurantPk} value={restaurant.restaurantPk}>{restaurant.restaurantName}</option>)}
              </select>
              <input className="min-h-11 rounded-md border border-black/15 px-3" value={ticketSubject} onChange={(event) => setTicketSubject(event.target.value)} />
              <Button type="button" disabled={!canRunSupportAction || busy !== null || ticketSubject.trim().length < 4} onClick={() => runAction("support:create", "/api/admin/ops/support-tickets", { restaurantPk: ticketRestaurantPk, subjectText: ticketSubject, descriptionText: "Created from admin ops queue.", typeCode: "GENERAL", priorityCode: "NORMAL", statusCode: "OPEN", reasonText: reason }, "Could not create support ticket.")}>
                <TicketCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                Create
              </Button>
            </div>
          </section>
          {visible.support.map((ticket) => (
            <article key={ticket.supportTicketPk} className="rounded-lg border border-black/10 bg-white p-4">
              <RowHeader title={ticket.subjectText} eyebrow={`${ticket.restaurantName ?? "Platform"} / ${ticket.orderNumber ?? "No order"}`} status={`${ticket.priorityCode} ${adminOpsStatusLabel(ticket.statusCode)}`} />
              <p className="mt-2 text-sm text-black/65">{ticket.descriptionText ?? "No description provided."}</p>
              <p className="mt-2 text-xs font-semibold text-[#7A5A00]">{slaFreshnessLabel(ticket.slaDueAt)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["IN_PROGRESS", "PENDING_MERCHANT", "RESOLVED", "CLOSED", "REJECTED"].map((status) => (
                  <Button key={status} type="button" className="min-h-10 bg-[#1A5C38] text-xs hover:bg-[#154b2e]" disabled={!canRunSupportAction || busy !== null || ticket.statusCode === status} onClick={() => runAction(`ticket:${ticket.supportTicketPk}:${status}`, "/api/admin/ops/support-tickets", { supportTicketPk: ticket.supportTicketPk, restaurantPk: ticket.restaurantPk, orderPk: ticket.orderPk, incidentPk: ticket.incidentPk, refundPk: ticket.refundPk, subjectText: ticket.subjectText, descriptionText: ticket.descriptionText ?? undefined, typeCode: ticket.typeCode, priorityCode: ticket.priorityCode, statusCode: status, noteText: reason, reasonText: reason }, "Could not update support ticket.")}>
                    {adminOpsStatusLabel(status)}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </QueueList>
      ) : null}

      {tab === "refunds" ? (
        <QueueList empty="No refund support rows match these filters. Manual refund tracking appears here after ops records a support artifact.">
          <section className="rounded-lg border border-black/10 bg-white p-4">
            <h2 className="font-bold">Manual refund/debit tracking</h2>
            <p className="mt-1 text-sm text-black/60">Support artifact only. This does not call Razorpay or change settlements/payouts.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_150px_auto]">
              <input className="min-h-11 rounded-md border border-black/15 px-3" value={refundOrderPk} onChange={(event) => setRefundOrderPk(event.target.value)} placeholder="Order UUID" />
              <input className="min-h-11 rounded-md border border-black/15 px-3" inputMode="numeric" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value.replace(/\D/g, ""))} placeholder="Amount paise" />
              <Button type="button" disabled={!canRunRefundAction || busy !== null || refundOrderPk.length < 20 || !refundAmount} onClick={() => runAction("refund:create", "/api/admin/ops/refunds", { orderPk: refundOrderPk, amountPaise: Number(refundAmount), trackingStatusCode: "FINANCE_REVIEW", noteText: "Manual refund support record. Provider refund API was not called.", reasonText: reason }, "Could not save refund support tracking.")}>
                Save tracking
              </Button>
            </div>
          </section>
          {visible.refunds.map((refund) => (
            <article key={refund.refundPk} className="rounded-lg border border-black/10 bg-white p-4">
              <RowHeader title={`${formatPaise(refund.amountPaise)} / ${refund.refundReasonCode}`} eyebrow={`${refund.restaurantName} / ${refund.orderNumber}`} status={adminOpsStatusLabel(refund.trackingStatusCode)} />
              <p className="mt-2 text-sm text-black/65">Provider refund API is not configured here. Payment capture and settlement state remain unchanged.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["OPS_REVIEW", "FINANCE_REVIEW", "APPROVED_MANUAL", "TRACKED_EXTERNALLY", "REJECTED", "CANCELLED"].map((status) => (
                  <Button key={status} type="button" className="min-h-10 bg-[#1A5C38] text-xs hover:bg-[#154b2e]" disabled={!canRunRefundAction || busy !== null || refund.trackingStatusCode === status} onClick={() => runAction(`refund:${refund.refundPk}:${status}`, "/api/admin/ops/refunds", { refundPk: refund.refundPk, orderPk: refund.orderPk, supportTicketPk: refund.supportTicketPk, incidentPk: refund.incidentPk, amountPaise: refund.amountPaise, refundReasonCode: refund.refundReasonCode, trackingStatusCode: status, noteText: `Marked ${status} from admin ops. No provider refund called.`, reasonText: reason }, "Could not update refund tracking.")}>
                    {adminOpsStatusLabel(status)}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </QueueList>
      ) : null}

      {tab === "config" ? (
        <QueueList empty="No config overrides match these filters. Global allowlisted defaults appear after the Slice 8B migration is applied.">
          {visible.config.map((flag) => (
            <article key={flag.configPk} className="rounded-lg border border-black/10 bg-white p-4">
              <RowHeader title={flag.flagName} eyebrow={`${flag.flagCode} / ${flag.scopeLabel}`} status={flag.flagCode === "MAX_BAGS_PER_DROP" ? String(flag.numericValue ?? "") : (flag.isEnabled ? "Enabled" : "Disabled")} />
              <p className="mt-2 text-sm text-black/65">{flag.description}</p>
              <p className="mt-1 text-xs font-semibold text-[#1A5C38]">Consumed by: {flag.consumedByText}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {flag.flagCode === "MAX_BAGS_PER_DROP" ? (
                  [10, 25, 50].map((value) => (
                    <Button key={value} type="button" disabled={!canRunOpsAction || busy !== null || flag.numericValue === value} className="min-h-10 bg-[#1A5C38] text-xs hover:bg-[#154b2e]" onClick={() => runAction(`config:${flag.configPk}:${value}`, "/api/admin/ops/config-flags", { flagCode: flag.flagCode, scopeCode: flag.scopeCode, scopeEntityPk: flag.scopeEntityPk, numericValue: value, reasonText: reason }, "Could not update config flag.")}>
                      <Flag className="mr-2 h-4 w-4" aria-hidden="true" />
                      {value} bags
                    </Button>
                  ))
                ) : (
                  [true, false].map((enabled) => (
                    <Button key={String(enabled)} type="button" disabled={!canRunOpsAction || busy !== null || flag.isEnabled === enabled} className={enabled ? "min-h-10 bg-[#1A5C38] text-xs hover:bg-[#154b2e]" : "min-h-10 bg-red-700 text-xs hover:bg-red-800"} onClick={() => runAction(`config:${flag.configPk}:${enabled}`, "/api/admin/ops/config-flags", { flagCode: flag.flagCode, scopeCode: flag.scopeCode, scopeEntityPk: flag.scopeEntityPk, isEnabled: enabled, reasonText: reason }, "Could not update config flag.")}>
                      {enabled ? "Enable" : "Disable"}
                    </Button>
                  ))
                )}
              </div>
            </article>
          ))}
        </QueueList>
      ) : null}

      {tab === "audit" ? (
        <QueueList empty="No recent privileged audit rows match these filters. Pause, support, refund, settlement, and config actions append rows here.">
          {visible.audit.map((audit) => (
            <article key={audit.auditLogPk} className="rounded-lg border border-black/10 bg-white p-4">
              <RowHeader title={audit.actionCode.replaceAll("_", " ")} eyebrow={`${audit.targetEntityTypeCode ?? "Target"} ${shortId(audit.targetEntityPk)}`} status={new Date(audit.createdAt).toLocaleString("en-IN")} />
              <p className="mt-2 text-sm text-black/65">{audit.reasonText ?? "No reason text was exposed in this support-safe audit row."}</p>
            </article>
          ))}
        </QueueList>
      ) : null}
    </div>
  );
}

function SummaryChip({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </article>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div>
      <dt className="font-semibold text-black">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Empty({ text }: { readonly text: string }) {
  return <section className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">{text}</section>;
}

function QueueList({ empty, children }: { readonly empty: string; readonly children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  return <section className="grid gap-3">{items.length ? children : <Empty text={empty} />}</section>;
}

function RowHeader({ title, eyebrow, status }: { readonly title: string; readonly eyebrow: string; readonly status: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-[#1A5C38]">{eyebrow}</p>
        <h2 className="mt-1 font-bold">{title}</h2>
      </div>
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(status.split(" ").at(-1) ?? status)}`}>{status}</span>
    </div>
  );
}
