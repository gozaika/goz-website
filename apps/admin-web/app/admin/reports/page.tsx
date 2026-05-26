import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { ShellHeader } from "@gozaika/ui";
import { formatBasisPoints, formatPaise } from "@gozaika/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";
import { mapFinanceSettlementSummary, type AdminRestaurantOption } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import {
  buildRoiReport,
  dateInputValue,
  defaultRoiPeriod,
  mapRoiDrop,
  mapRoiNote,
  parseRoiPeriod,
  periodLabel,
  settlementBasisLabel,
  type RoiDropDetailDbRow,
  type RoiNoteDbRow,
} from "../../../../restaurant-mgmt-web/lib/roi-report";
import { AdminReportsCopyPanel } from "./reports-client";

export const dynamic = "force-dynamic";

function toneClass(tone: string) {
  if (tone === "success") return "border-[#1A5C38]/25 bg-[#F2F8EF] text-[#1A5C38]";
  if (tone === "warning") return "border-[#D4A017]/40 bg-[#FFF8E6] text-[#7A5A00]";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-700";
  return "border-black/10 bg-white text-black";
}

function presetHref(restaurantPk: string, days: number): string {
  const period = defaultRoiPeriod(new Date(Date.now() - (days - 7) * 24 * 60 * 60 * 1000));
  return `/admin/reports?restaurant=${restaurantPk}&start=${dateInputValue(period.periodStartAt)}&end=${dateInputValue(period.periodEndAt)}`;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly restaurant?: string; readonly start?: string; readonly end?: string }>;
}) {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const service = createServiceRoleSupabaseClient();
  const { data: restaurantData, error: restaurantError } = await service
    .from("restaurant_restaurant")
    .select("restaurant_restaurant_pk,restaurant_name,restaurant_status_code")
    .order("restaurant_name", { ascending: true })
    .limit(200);

  if (restaurantError) throw new Error("Could not load restaurants for ROI reporting.");

  const restaurants: AdminRestaurantOption[] = (restaurantData ?? []).map((restaurant) => ({
    restaurantPk: restaurant.restaurant_restaurant_pk,
    restaurantName: restaurant.restaurant_name,
    statusCode: restaurant.restaurant_status_code,
  }));
  const params = await searchParams;
  const selectedRestaurant =
    restaurants.find((restaurant) => restaurant.restaurantPk === params.restaurant) ?? restaurants[0] ?? null;
  const period = parseRoiPeriod(params);

  const report = selectedRestaurant
    ? await loadAdminReport(selectedRestaurant, period.periodStartAt, period.periodEndAt)
    : null;

  return (
    <main>
      <ShellHeader>
        <nav className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link className="text-[#1A5C38]" href="/admin/drops">Drops</Link>
          <Link className="text-[#1A5C38]" href="/admin/notifications">Notifications</Link>
          <Link className="text-[#1A5C38]" href="/admin/finance">Finance</Link>
          <Link className="text-[#1A5C38]" href="/admin/reports">Reports</Link>
        </nav>
      </ShellHeader>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Pilot ROI</p>
            <h1 className="mt-2 text-3xl font-bold">Weekly partner reports</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Select a restaurant and review paid pickup performance without exposing consumer PII, provider payloads, pickup credentials, private documents, or internal-only finance actions.
            </p>
          </div>
          <Link className="min-h-11 rounded-lg border border-[#1A5C38]/25 px-4 py-3 text-sm font-semibold text-[#1A5C38]" href="/admin">
            Admin home
          </Link>
        </div>

        {restaurants.length === 0 ? (
          <section className="mt-6 rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
            No restaurants are available for ROI reporting yet.
          </section>
        ) : (
          <>
            <form className="mt-6 grid gap-3 rounded-lg border border-black/10 bg-white p-4 lg:grid-cols-[1.3fr_1fr_1fr_auto]" action="/admin/reports">
              <label className="grid gap-1 text-sm font-semibold">
                Restaurant
                <select className="min-h-11 rounded-md border border-black/15 px-3" name="restaurant" defaultValue={selectedRestaurant?.restaurantPk}>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.restaurantPk} value={restaurant.restaurantPk}>
                      {restaurant.restaurantName} ({restaurant.statusCode})
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Start
                <input className="min-h-11 rounded-md border border-black/15 px-3" type="date" name="start" defaultValue={dateInputValue(period.periodStartAt)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                End
                <input className="min-h-11 rounded-md border border-black/15 px-3" type="date" name="end" defaultValue={dateInputValue(period.periodEndAt)} />
              </label>
              <button className="min-h-11 self-end rounded-lg bg-[#1A5C38] px-4 text-sm font-semibold text-white" type="submit">
                Refresh
              </button>
            </form>

            {selectedRestaurant ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/65" href={presetHref(selectedRestaurant.restaurantPk, 7)}>
                  Current week
                </Link>
                <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/65" href={presetHref(selectedRestaurant.restaurantPk, 14)}>
                  Previous week
                </Link>
              </div>
            ) : null}

            {report ? (
              <div className="mt-6 grid gap-5">
                <section>
                  <p className="text-sm font-semibold text-[#1A5C38]">
                    {report.summary.restaurantName} / {periodLabel(report.summary.periodStartAt, report.summary.periodEndAt)} / {settlementBasisLabel(report.summary)}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {report.summary.metricCards.map((card) => (
                      <article key={card.code} className={`rounded-lg border p-4 ${toneClass(card.tone)}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-75">{card.label}</p>
                        <p className="mt-2 text-2xl font-bold">{card.valueText}</p>
                        <p className="mt-1 text-sm opacity-80">{card.helperText}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <AdminReportsCopyPanel report={report} />

                <section className="rounded-lg border border-black/10 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">Drop and order metrics</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Open pickup orders: {report.summary.openPickupOrderCount}. Settlement: {report.summary.settlementStatusCode ?? "not locked for exact period"}.
                      </p>
                    </div>
                    {report.summary.settlementRunPk ? (
                      <Link className="rounded-lg border border-[#1A5C38]/25 px-3 py-2 text-sm font-semibold text-[#1A5C38]" href={`/admin/finance?settlement=${report.summary.settlementRunPk}`}>
                        Open settlement
                      </Link>
                    ) : null}
                  </div>
                  {report.dropRows.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-black/15 p-6 text-sm text-slate-600">
                      No drops listed in this period. Publish drops and receive paid orders before ROI appears.
                    </div>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[920px] text-left text-sm">
                        <thead className="border-b border-black/10 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="py-2 pr-3">Drop</th>
                            <th className="py-2 pr-3">Pickup</th>
                            <th className="py-2 pr-3 text-right">Listed</th>
                            <th className="py-2 pr-3 text-right">Sold</th>
                            <th className="py-2 pr-3 text-right">Sell-through</th>
                            <th className="py-2 pr-3 text-right">GMV</th>
                            <th className="py-2 pr-3 text-right">Net</th>
                            <th className="py-2 pr-3 text-right">Collected</th>
                            <th className="py-2 pr-3 text-right">No-show</th>
                            <th className="py-2 pr-3 text-right">Refund/debit</th>
                            <th className="py-2 pr-3 text-right">Incidents</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.dropRows.map((row) => (
                            <tr key={row.dropPk} className="border-b border-black/5">
                              <td className="py-3 pr-3">
                                <p className="font-semibold">{row.dropTitle || row.bagDisplayName}</p>
                                <p className="text-xs text-slate-500">{row.dropStatusCode}</p>
                              </td>
                              <td className="py-3 pr-3">{new Date(row.pickupStartAt).toLocaleDateString("en-IN")}</td>
                              <td className="py-3 pr-3 text-right">{row.quantityListed}</td>
                              <td className="py-3 pr-3 text-right">{row.quantitySold}</td>
                              <td className="py-3 pr-3 text-right">{formatBasisPoints(row.sellThroughBps)}</td>
                              <td className="py-3 pr-3 text-right">{formatPaise(row.gmvPaise)}</td>
                              <td className="py-3 pr-3 text-right">{formatPaise(row.estimatedNetRecoveryPaise)}</td>
                              <td className="py-3 pr-3 text-right">{row.quantityCollected}</td>
                              <td className="py-3 pr-3 text-right">{row.noShowCount}</td>
                              <td className="py-3 pr-3 text-right">{formatPaise(row.refundDebitPaise)}</td>
                              <td className="py-3 pr-3 text-right">{row.incidentCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-black/10 bg-white p-4">
                    <h2 className="font-bold">Ops notes</h2>
                    {report.noteRows.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">No incident or refund/debit notes for this period.</p>
                    ) : (
                      <div className="mt-2 grid gap-2">
                        {report.noteRows.slice(0, 10).map((note) => (
                          <div key={note.rowPk} className="rounded-md bg-black/[0.03] p-3 text-sm">
                            <p className="font-semibold">{note.titleText}</p>
                            <p className="mt-1 text-slate-600">
                              {note.orderNumber ?? "No order"} / {note.amountPaise == null ? note.statusCode : formatPaise(note.amountPaise)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-[#D4A017]/40 bg-[#FFF8E6] p-4">
                    <h2 className="font-bold">Assumptions</h2>
                    <ul className="mt-2 grid gap-1 text-sm text-slate-700">
                      {report.summary.assumptions.map((assumption) => (
                        <li key={assumption}>{assumption}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

async function loadAdminReport(restaurant: AdminRestaurantOption, periodStartAt: string, periodEndAt: string) {
  const supabase = await createClient();
  const [{ data: dropData, error: dropError }, { data: noteData, error: noteError }, { data: settlementData, error: settlementError }] =
    await Promise.all([
      supabase
        .from("api_admin_roi_drop_detail")
        .select("*")
        .eq("restaurant_fk", restaurant.restaurantPk)
        .gte("pickup_start_at", periodStartAt)
        .lt("pickup_start_at", periodEndAt)
        .order("pickup_start_at", { ascending: false }),
      supabase
        .from("api_admin_roi_report_note")
        .select("*")
        .eq("restaurant_fk", restaurant.restaurantPk)
        .gte("occurred_at", periodStartAt)
        .lt("occurred_at", periodEndAt)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("api_admin_finance_settlement_summary")
        .select("*")
        .eq("restaurant_fk", restaurant.restaurantPk)
        .gte("period_end_at", periodStartAt)
        .lte("period_start_at", periodEndAt)
        .limit(20),
    ]);

  if (dropError) throw new Error("Could not load admin ROI drop metrics.");
  if (noteError) throw new Error("Could not load admin ROI report notes.");
  if (settlementError) throw new Error("Could not load admin ROI settlement context.");

  const settlements = (settlementData ?? []).map(mapFinanceSettlementSummary).map((settlement) => ({
    settlementRunPk: settlement.settlementRunPk,
    restaurantPk: settlement.restaurantPk,
    periodStartAt: settlement.periodStartAt,
    periodEndAt: settlement.periodEndAt,
    settlementStatusCode: settlement.settlementStatusCode,
    netPayoutPaise: settlement.netPayoutPaise,
    lockedAt: settlement.lockedAt,
  }));

  return buildRoiReport({
    restaurantPk: restaurant.restaurantPk,
    restaurantName: restaurant.restaurantName,
    periodStartAt,
    periodEndAt,
    dropRows: ((dropData ?? []) as RoiDropDetailDbRow[]).map(mapRoiDrop),
    noteRows: ((noteData ?? []) as RoiNoteDbRow[]).map(mapRoiNote),
    settlements,
  });
}
