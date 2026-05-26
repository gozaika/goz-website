"use client";

import { Button } from "@gozaika/ui";
import type {
  ApiResponse,
  FinanceAdjustmentResult,
  FinanceEligibleOrderPreview,
  FinanceInvoiceSummary,
  FinanceSettlementActionResult,
  FinanceSettlementDetailRow,
  FinanceSettlementSummary,
} from "@gozaika/types";
import {
  financeSettlementStatusLabel,
  financeSettlementStatusTone,
  formatPaise,
  formatSignedPaise,
  safeErrorMessage,
} from "@gozaika/utils";
import { Calculator, FileText, LockKeyhole, RefreshCcw, Send, WalletCards } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AdminRestaurantOption } from "@/lib/finance";

function toInputDateTime(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

function statusClass(status: string) {
  const tone = financeSettlementStatusTone(status);
  if (tone === "success") return "border-[#1A5C38]/30 bg-[#F2F8EF] text-[#1A5C38]";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "warning") return "border-[#D4A017]/40 bg-[#FFF8E6] text-[#7A5A00]";
  return "border-black/10 bg-white text-black/70";
}

function periodLabel(summary: FinanceSettlementSummary): string {
  return `${new Date(summary.periodStartAt).toLocaleDateString("en-IN")} - ${new Date(summary.periodEndAt).toLocaleDateString("en-IN")}`;
}

function actionTargets(status: FinanceSettlementSummary["settlementStatusCode"]): FinanceSettlementSummary["settlementStatusCode"][] {
  if (status === "LOCKED") return ["SENT", "CANCELLED"];
  if (status === "SENT") return ["PAID", "CANCELLED"];
  if (status === "PAID") return ["RECONCILED"];
  if (status === "DRAFT" || status === "OPEN") return ["CANCELLED"];
  return [];
}

export function AdminFinanceClient({
  restaurants,
  settlements,
  selectedSettlement,
  details,
}: {
  readonly restaurants: readonly AdminRestaurantOption[];
  readonly settlements: readonly FinanceSettlementSummary[];
  readonly selectedSettlement: FinanceSettlementSummary | null;
  readonly details: readonly FinanceSettlementDetailRow[];
}) {
  const router = useRouter();
  const now = new Date();
  const [restaurantPk, setRestaurantPk] = useState(restaurants[0]?.restaurantPk ?? "");
  const [periodStartAt, setPeriodStartAt] = useState(toInputDateTime(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)));
  const [periodEndAt, setPeriodEndAt] = useState(toInputDateTime(now));
  const [previewRows, setPreviewRows] = useState<FinanceEligibleOrderPreview[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [providerReference, setProviderReference] = useState("");
  const [statusNote, setStatusNote] = useState("Manual payout/status update reviewed by finance.");

  const previewTotals = useMemo(() => {
    const eligible = previewRows.filter((row) => row.eligibilityStatusCode === "ELIGIBLE");
    return {
      eligibleCount: eligible.length,
      excludedCount: previewRows.length - eligible.length,
      gross: eligible.reduce((sum, row) => sum + row.paidAmountPaise, 0),
      commission: eligible.reduce((sum, row) => sum + row.commissionPaise, 0),
      fees: eligible.reduce((sum, row) => sum + row.paymentFeePaise + row.paymentTaxPaise, 0),
      refunds: eligible.reduce((sum, row) => sum + row.refundPaise, 0),
      net: eligible.reduce((sum, row) => sum + row.netPayoutPaise, 0),
    };
  }, [previewRows]);

  async function postJson<T>(url: string, body: unknown, fallback: string): Promise<T> {
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

  async function preview() {
    setBusy("preview");
    setMessage("");
    try {
      const rows = await postJson<FinanceEligibleOrderPreview[]>(
        "/api/admin/finance/preview",
        {
          restaurantPk,
          periodStartAt: new Date(periodStartAt).toISOString(),
          periodEndAt: new Date(periodEndAt).toISOString(),
        },
        "Could not preview settlement.",
      );
      setPreviewRows(rows);
      setMessage(rows.length ? "Preview refreshed. Review excluded rows before creating a draft." : "No orders found in this period.");
    } catch (caught) {
      setMessage(safeErrorMessage(caught, "Could not preview settlement."));
    } finally {
      setBusy(null);
    }
  }

  async function createDraft() {
    setBusy("create");
    setMessage("");
    try {
      const result = await postJson<FinanceSettlementActionResult>(
        "/api/admin/finance/runs",
        {
          restaurantPk,
          periodStartAt: new Date(periodStartAt).toISOString(),
          periodEndAt: new Date(periodEndAt).toISOString(),
          noteText: "Draft created from admin finance surface.",
        },
        "Could not create draft settlement.",
      );
      setMessage(result.message);
      router.push(`/admin/finance?settlement=${result.settlementRunPk}`);
      router.refresh();
    } catch (caught) {
      setMessage(safeErrorMessage(caught, "Could not create draft settlement."));
    } finally {
      setBusy(null);
    }
  }

  async function runAction(action: "lock" | "status" | "adjustment" | "invoice", nextStatus?: string) {
    if (!selectedSettlement) return;
    setBusy(`${action}:${nextStatus ?? selectedSettlement.settlementRunPk}`);
    setMessage("");
    try {
      if (action === "lock") {
        const result = await postJson<FinanceSettlementActionResult>(
          `/api/admin/finance/runs/${selectedSettlement.settlementRunPk}/lock`,
          { reasonText: "Finance reviewed order-level entries, deductions, refunds, and payout account state." },
          "Could not lock settlement.",
        );
        setMessage(result.message);
      } else if (action === "status" && nextStatus) {
        const result = await postJson<FinanceSettlementActionResult>(
          `/api/admin/finance/runs/${selectedSettlement.settlementRunPk}/status`,
          { statusCode: nextStatus, noteText: statusNote, providerReferenceText: providerReference || undefined },
          "Could not update settlement status.",
        );
        setMessage(result.message);
      } else if (action === "adjustment") {
        const result = await postJson<FinanceAdjustmentResult>(
          `/api/admin/finance/runs/${selectedSettlement.settlementRunPk}/adjustments`,
          { amountPaise: Number(adjustmentAmount), descriptionText: adjustmentNote },
          "Could not add adjustment.",
        );
        setMessage(result.message);
        setAdjustmentAmount("");
        setAdjustmentNote("");
      } else if (action === "invoice") {
        const result = await postJson<FinanceInvoiceSummary>(
          `/api/admin/finance/runs/${selectedSettlement.settlementRunPk}/invoice`,
          { invoiceNumber, metadata: { source: "admin_finance" } },
          "Could not issue invoice metadata.",
        );
        setMessage(`Invoice metadata issued: ${result.invoiceNumber}.`);
        setInvoiceNumber("");
      }
      router.refresh();
    } catch (caught) {
      setMessage(safeErrorMessage(caught, "Finance action failed."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="rounded-lg border border-black/10 bg-white p-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-[#1A5C38]" aria-hidden="true" />
          <h2 className="text-lg font-bold">Preview and draft</h2>
        </div>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            Restaurant
            <select className="min-h-11 rounded-md border border-black/15 px-3" value={restaurantPk} onChange={(event) => setRestaurantPk(event.target.value)}>
              {restaurants.map((restaurant) => (
                <option key={restaurant.restaurantPk} value={restaurant.restaurantPk}>
                  {restaurant.restaurantName} ({restaurant.statusCode})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Period start
            <input className="min-h-11 rounded-md border border-black/15 px-3" type="datetime-local" value={periodStartAt} onChange={(event) => setPeriodStartAt(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Period end
            <input className="min-h-11 rounded-md border border-black/15 px-3" type="datetime-local" value={periodEndAt} onChange={(event) => setPeriodEndAt(event.target.value)} />
          </label>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Button type="button" className="bg-[#1A5C38] hover:bg-[#154b2e]" disabled={!restaurantPk || busy === "preview"} onClick={preview}>
              <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview
            </Button>
            <Button type="button" disabled={!restaurantPk || previewTotals.eligibleCount === 0 || busy === "create"} onClick={createDraft}>
              Create / recalc draft
            </Button>
          </div>
        </div>

        {previewRows.length ? (
          <div className="mt-5 rounded-lg border border-black/10 bg-black/[0.02] p-3">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-semibold">Eligible</dt>
                <dd>{previewTotals.eligibleCount}</dd>
              </div>
              <div>
                <dt className="font-semibold">Excluded</dt>
                <dd>{previewTotals.excludedCount}</dd>
              </div>
              <div>
                <dt className="font-semibold">Gross</dt>
                <dd>{formatPaise(previewTotals.gross)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Net</dt>
                <dd>{formatPaise(previewTotals.net)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs font-semibold text-[#7A5A00]">Pilot estimate. Finance review is required before lock; no live payout is triggered.</p>
          </div>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-[#D4A017]/40 bg-[#FFF8E6] p-3 text-sm font-medium text-black">{message}</p>
        ) : null}
      </section>

      <section className="grid gap-5">
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Settlement runs</h2>
              <p className="mt-1 text-sm text-black/60">Manual accounting workflow only. Razorpay transfers and refunds are not available here.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["ALL", "DRAFT", "LOCKED", "SENT", "PAID", "RECONCILED"].map((status) => (
                <Link key={status} className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-black/70" href={status === "ALL" ? "/admin/finance" : `/admin/finance?status=${status}`}>
                  {status}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {settlements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-black/15 p-6 text-sm text-black/60">
                No settlement runs yet. Preview a closed period with captured collected/no-show orders, then create a draft.
              </div>
            ) : (
              settlements.map((settlement) => (
                <Link
                  key={settlement.settlementRunPk}
                  href={`/admin/finance?settlement=${settlement.settlementRunPk}`}
                  className={`rounded-lg border p-4 transition hover:border-[#1A5C38] ${selectedSettlement?.settlementRunPk === settlement.settlementRunPk ? "border-[#1A5C38] bg-[#F2F8EF]" : "border-black/10 bg-white"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1A5C38]">{settlement.restaurantName}</p>
                      <h3 className="mt-1 font-bold">{periodLabel(settlement)}</h3>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(settlement.settlementStatusCode)}`}>
                      {financeSettlementStatusLabel(settlement.settlementStatusCode)}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-black/70 sm:grid-cols-5">
                    <div><dt className="font-semibold text-black">Orders</dt><dd>{settlement.orderCount}</dd></div>
                    <div><dt className="font-semibold text-black">Gross</dt><dd>{formatPaise(settlement.grossSalesPaise)}</dd></div>
                    <div><dt className="font-semibold text-black">Deductions</dt><dd>{formatPaise(settlement.refundPaise + settlement.commissionPaise + settlement.paymentFeePaise + settlement.taxPaise)}</dd></div>
                    <div><dt className="font-semibold text-black">Adjustments</dt><dd>{formatSignedPaise(settlement.adjustmentPaise)}</dd></div>
                    <div><dt className="font-semibold text-black">Net payout</dt><dd>{formatPaise(settlement.netPayoutPaise)}</dd></div>
                  </dl>
                </Link>
              ))
            )}
          </div>
        </div>

        {previewRows.length ? (
          <div className="rounded-lg border border-black/10 bg-white p-4">
            <h2 className="text-lg font-bold">Preview line scan</h2>
            <div className="mt-3 grid gap-2">
              {previewRows.slice(0, 20).map((row) => (
                <div key={row.orderPk} className="grid gap-2 rounded-md bg-black/[0.03] p-3 text-sm md:grid-cols-[1fr_120px_120px_1fr]">
                  <span className="font-semibold">{row.orderNumber}</span>
                  <span>{formatPaise(row.paidAmountPaise)}</span>
                  <span>{formatPaise(row.netPayoutPaise)}</span>
                  <span className={row.eligibilityStatusCode === "ELIGIBLE" ? "text-[#1A5C38]" : "text-red-700"}>
                    {row.eligibilityStatusCode === "ELIGIBLE" ? "Eligible" : row.exclusionReasonText}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {selectedSettlement ? (
          <div className="rounded-lg border border-black/10 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1A5C38]">{selectedSettlement.restaurantName}</p>
                <h2 className="mt-1 text-xl font-bold">Selected settlement</h2>
                <p className="mt-1 text-sm text-black/60">{periodLabel(selectedSettlement)} / account {selectedSettlement.maskedPayoutAccount ?? "not configured"}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(selectedSettlement.settlementStatusCode)}`}>
                {financeSettlementStatusLabel(selectedSettlement.settlementStatusCode)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-md bg-black/[0.03] p-3"><p className="text-xs font-semibold text-black/55">Gross sales</p><p className="mt-1 text-lg font-bold">{formatPaise(selectedSettlement.grossSalesPaise)}</p></div>
              <div className="rounded-md bg-black/[0.03] p-3"><p className="text-xs font-semibold text-black/55">Commission</p><p className="mt-1 text-lg font-bold">{formatPaise(selectedSettlement.commissionPaise)}</p></div>
              <div className="rounded-md bg-black/[0.03] p-3"><p className="text-xs font-semibold text-black/55">Tax/fees/refunds</p><p className="mt-1 text-lg font-bold">{formatPaise(selectedSettlement.taxPaise + selectedSettlement.paymentFeePaise + selectedSettlement.refundPaise)}</p></div>
              <div className="rounded-md bg-[#F2F8EF] p-3"><p className="text-xs font-semibold text-[#1A5C38]">Net payout</p><p className="mt-1 text-lg font-bold">{formatPaise(selectedSettlement.netPayoutPaise)}</p></div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" disabled={!["DRAFT", "OPEN"].includes(selectedSettlement.settlementStatusCode) || Boolean(busy)} onClick={() => runAction("lock")}>
                <LockKeyhole className="mr-2 h-4 w-4" aria-hidden="true" />
                Lock
              </Button>
              {actionTargets(selectedSettlement.settlementStatusCode).map((status) => (
                <Button key={status} type="button" className="bg-[#1A5C38] hover:bg-[#154b2e]" disabled={Boolean(busy)} onClick={() => runAction("status", status)}>
                  <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                  Mark {financeSettlementStatusLabel(status)}
                </Button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-black/10 p-3">
                <div className="flex items-center gap-2">
                  <WalletCards className="h-4 w-4 text-[#1A5C38]" aria-hidden="true" />
                  <h3 className="font-semibold">Manual status note</h3>
                </div>
                <textarea className="mt-2 min-h-20 w-full rounded-md border border-black/15 px-3 py-2 text-sm" value={statusNote} onChange={(event) => setStatusNote(event.target.value)} />
                <input className="mt-2 min-h-11 w-full rounded-md border border-black/15 px-3 text-sm" value={providerReference} onChange={(event) => setProviderReference(event.target.value)} placeholder="Optional UTR/provider reference" />
              </div>
              <div className="rounded-lg border border-black/10 p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1A5C38]" aria-hidden="true" />
                  <h3 className="font-semibold">Invoice metadata</h3>
                </div>
                <input className="mt-2 min-h-11 w-full rounded-md border border-black/15 px-3 text-sm" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="invoice_demo_001 or finance reference" />
                <Button type="button" className="mt-2 w-full bg-[#1A5C38] hover:bg-[#154b2e]" disabled={!["LOCKED", "SENT", "PAID", "RECONCILED"].includes(selectedSettlement.settlementStatusCode) || invoiceNumber.trim().length < 4 || Boolean(busy)} onClick={() => runAction("invoice")}>
                  Issue invoice metadata
                </Button>
                <p className="mt-2 text-xs text-black/55">Current: {selectedSettlement.invoice.invoiceNumber ?? "not issued"} / {selectedSettlement.invoice.invoiceStatusCode ?? "not available"}</p>
              </div>
            </div>

            {["DRAFT", "OPEN"].includes(selectedSettlement.settlementStatusCode) ? (
              <div className="mt-4 rounded-lg border border-black/10 p-3">
                <h3 className="font-semibold">Manual adjustment</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                  <input className="min-h-11 rounded-md border border-black/15 px-3 text-sm" inputMode="numeric" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value.replace(/[^\d-]/g, ""))} placeholder="-2500" />
                  <input className="min-h-11 rounded-md border border-black/15 px-3 text-sm" value={adjustmentNote} onChange={(event) => setAdjustmentNote(event.target.value)} placeholder="Reason for credit/debit adjustment" />
                  <Button type="button" disabled={!adjustmentAmount || adjustmentNote.trim().length < 8 || Boolean(busy)} onClick={() => runAction("adjustment")}>
                    Add
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <h3 className="font-semibold">Line entries</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-black/10 text-xs uppercase text-black/55">
                    <tr>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3">Bag</th>
                      <th className="py-2 pr-3">Basis</th>
                      <th className="py-2 pr-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((entry) => (
                      <tr key={entry.payoutEntryPk} className="border-b border-black/5">
                        <td className="py-2 pr-3 font-semibold">{entry.entryTypeCode.replaceAll("_", " ")}</td>
                        <td className="py-2 pr-3">{entry.orderNumber ?? "Manual"}</td>
                        <td className="py-2 pr-3">{entry.bagDisplayName ?? entry.descriptionText ?? "-"}</td>
                        <td className="py-2 pr-3">{entry.commissionBps == null ? entry.sourceStatusCode ?? "-" : `${entry.commissionBps / 100}% ${entry.commissionPlanCode ?? ""}`}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{formatSignedPaise(entry.amountPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
