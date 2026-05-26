import { ShellHeader } from "@gozaika/ui";
import {
  financeSettlementStatusLabel,
  financeSettlementStatusTone,
  formatPaise,
  formatSignedPaise,
} from "@gozaika/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { mapFinanceSettlementDetail, mapFinanceSettlementSummary } from "@/lib/finance";
import { loadActiveRestaurantsForProfile } from "@/lib/slice3";
import { createClient } from "@/lib/supabase/server";
import { PortalNav } from "../portal-nav";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  const tone = financeSettlementStatusTone(status);
  if (tone === "success") return "border-[#1A5C38]/30 bg-[#F2F8EF] text-[#1A5C38]";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "warning") return "border-[#D4A017]/40 bg-[#FFF8E6] text-[#7A5A00]";
  return "border-black/10 bg-white text-black/70";
}

function periodLabel(startAt: string, endAt: string): string {
  return `${new Date(startAt).toLocaleDateString("en-IN")} - ${new Date(endAt).toLocaleDateString("en-IN")}`;
}

export default async function FinancePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly settlement?: string }>;
}) {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurants = await loadActiveRestaurantsForProfile(actor.profilePk);
  if (restaurants.length === 0) redirect("/portal/onboarding");

  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_restaurant_finance_settlement_summary")
    .select("*")
    .in("restaurant_fk", restaurants.map((restaurant) => restaurant.restaurantPk))
    .order("period_end_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error("Could not load restaurant finance settlements.");
  }

  const settlements = (data ?? []).map(mapFinanceSettlementSummary);
  const selectedSettlement = settlements.find((settlement) => settlement.settlementRunPk === params.settlement) ?? settlements[0] ?? null;
  const { data: detailData, error: detailError } = selectedSettlement
    ? await supabase
        .from("api_restaurant_finance_settlement_detail")
        .select("*")
        .eq("settlement_run_pk", selectedSettlement.settlementRunPk)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (detailError) {
    throw new Error("Could not load settlement entries.");
  }

  const details = (detailData ?? []).map(mapFinanceSettlementDetail);

  return (
    <main>
      <ShellHeader>
        <PortalNav />
      </ShellHeader>
      <section className="px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Finance</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Settlement statements for completed paid pickup orders. Payouts are marked manually by goZaika finance; no live bank transfer is triggered from this portal.
            </p>
          </div>
          <Link className="min-h-11 rounded-lg border border-[#1A5C38]/25 px-4 py-3 text-sm font-semibold text-[#1A5C38]" href="/portal/orders">
            Pickup orders
          </Link>
        </div>

        {settlements.length === 0 ? (
          <section className="mt-6 rounded-lg border border-dashed border-black/15 bg-white p-6">
            <h2 className="text-lg font-bold">No settlement yet</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Finance appears after goZaika receives webhook-confirmed captured payments, the pickup window closes, and the order reaches collected or no-show. Payout account basics and human finance review are required before a settlement is locked.
            </p>
          </section>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-[360px_1fr]">
            <section className="grid gap-3">
              {settlements.map((settlement) => (
                <Link
                  key={settlement.settlementRunPk}
                  href={`/portal/finance?settlement=${settlement.settlementRunPk}`}
                  className={`rounded-lg border p-4 transition hover:border-[#1A5C38] ${selectedSettlement?.settlementRunPk === settlement.settlementRunPk ? "border-[#1A5C38] bg-[#F2F8EF]" : "border-black/10 bg-white"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1A5C38]">{settlement.restaurantName}</p>
                      <h2 className="mt-1 font-bold">{periodLabel(settlement.periodStartAt, settlement.periodEndAt)}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(settlement.settlementStatusCode)}`}>
                      {financeSettlementStatusLabel(settlement.settlementStatusCode)}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
                    <div>
                      <dt className="font-semibold text-slate-950">Orders</dt>
                      <dd>{settlement.orderCount}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-950">Net payout</dt>
                      <dd>{formatPaise(settlement.netPayoutPaise)}</dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </section>

            {selectedSettlement ? (
              <section className="rounded-lg border border-black/10 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1A5C38]">{selectedSettlement.restaurantName}</p>
                    <h2 className="mt-1 text-xl font-bold">{periodLabel(selectedSettlement.periodStartAt, selectedSettlement.periodEndAt)}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Payout account: {selectedSettlement.maskedPayoutAccount ?? "not configured"} / {selectedSettlement.payoutAccountStatusCode ?? "PENDING"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(selectedSettlement.settlementStatusCode)}`}>
                    {financeSettlementStatusLabel(selectedSettlement.settlementStatusCode)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-md bg-black/[0.03] p-3">
                    <p className="text-xs font-semibold text-slate-500">Gross sales</p>
                    <p className="mt-1 text-lg font-bold">{formatPaise(selectedSettlement.grossSalesPaise)}</p>
                  </div>
                  <div className="rounded-md bg-black/[0.03] p-3">
                    <p className="text-xs font-semibold text-slate-500">Commission</p>
                    <p className="mt-1 text-lg font-bold">{formatPaise(selectedSettlement.commissionPaise)}</p>
                  </div>
                  <div className="rounded-md bg-black/[0.03] p-3">
                    <p className="text-xs font-semibold text-slate-500">Tax/fees/refunds</p>
                    <p className="mt-1 text-lg font-bold">{formatPaise(selectedSettlement.taxPaise + selectedSettlement.paymentFeePaise + selectedSettlement.refundPaise)}</p>
                  </div>
                  <div className="rounded-md bg-[#F2F8EF] p-3">
                    <p className="text-xs font-semibold text-[#1A5C38]">Net payout</p>
                    <p className="mt-1 text-lg font-bold">{formatPaise(selectedSettlement.netPayoutPaise)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-black/10 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Invoice</p>
                    <p className="mt-1 font-bold">{selectedSettlement.invoice.invoiceNumber ?? "Not issued"}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedSettlement.invoice.invoiceStatusCode ?? "Not available"}</p>
                  </div>
                  <div className="rounded-lg border border-black/10 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Payout status</p>
                    <p className="mt-1 font-bold">{financeSettlementStatusLabel(selectedSettlement.settlementStatusCode)}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedSettlement.payoutProviderReferenceText ? `Reference ${selectedSettlement.payoutProviderReferenceText}` : "Manual finance update pending"}</p>
                  </div>
                  <div className="rounded-lg border border-black/10 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Review note</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedSettlement.statusNoteText ?? "Finance review note will appear here."}</p>
                  </div>
                </div>

                <p className="mt-4 rounded-lg border border-[#D4A017]/40 bg-[#FFF8E6] p-3 text-sm font-medium text-slate-800">
                  Commission, provider fee tax, refunds, and adjustments are pilot settlement facts for review. GST/legal invoice wording remains human-reviewed before final use.
                </p>

                <div className="mt-5">
                  <h3 className="font-semibold">Settlement entries</h3>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="border-b border-black/10 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3">Order</th>
                          <th className="py-2 pr-3">Details</th>
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
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
