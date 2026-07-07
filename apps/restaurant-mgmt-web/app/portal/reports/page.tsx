import { Sparkline } from "@gozaika/ui";
import { formatBasisPoints, formatPaise, IST_TIME_ZONE } from "@gozaika/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import {
  dateInputValue,
  loadRoiReport,
  parseRoiPeriod,
  periodLabel,
  settlementBasisLabel,
} from "@/lib/roi-report";
import { loadActiveRestaurantsForProfile } from "@/lib/slice3";
import { createClient } from "@/lib/supabase/server";
import { PortalChrome } from "../portal-nav";

export const dynamic = "force-dynamic";

function toneClass(tone: string) {
  if (tone === "success") return "border-forest/25 bg-success-soft text-forest";
  if (tone === "warning") return "border-gold/40 bg-warning-soft text-warning";
  if (tone === "danger") return "border-danger/30 bg-danger-soft text-danger";
  return "border-hairline bg-white text-charcoal";
}

export default async function PortalReportsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly start?: string; readonly end?: string }>;
}) {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurants = await loadActiveRestaurantsForProfile(actor.profilePk);
  if (restaurants.length === 0) redirect("/portal/onboarding");

  const restaurant = restaurants[0]!;
  const params = await searchParams;
  const period = parseRoiPeriod(params);
  const supabase = await createClient();

  const report = await loadRoiReport(supabase, {
    restaurantPk: restaurant.restaurantPk,
    restaurantName: restaurant.restaurantName,
    periodStartAt: period.periodStartAt,
    periodEndAt: period.periodEndAt,
  });

  return (
    <PortalChrome restaurantName={restaurant.restaurantName} statusCode="ACTIVE">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">Partner report</p>
            <h1 className="mt-2 text-3xl font-bold">Weekly ROI report</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              {restaurant.restaurantName} / {periodLabel(report.summary.periodStartAt, report.summary.periodEndAt)} / {settlementBasisLabel(report.summary)}
            </p>
          </div>
          <Link className="min-h-11 rounded-lg border border-forest/25 px-4 py-3 text-sm font-semibold text-forest" href="/portal/finance">
            Finance
          </Link>
        </div>

        <form className="mt-5 grid gap-3 rounded-lg border border-hairline bg-white p-4 sm:grid-cols-[1fr_1fr_auto]" action="/portal/reports">
          <label className="grid gap-1 text-sm font-semibold">
            Start
            <input className="min-h-11 rounded-md border border-black/15 px-3" type="date" name="start" defaultValue={dateInputValue(period.periodStartAt)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            End
            <input className="min-h-11 rounded-md border border-black/15 px-3" type="date" name="end" defaultValue={dateInputValue(period.periodEndAt)} />
          </label>
          <button className="min-h-11 self-end rounded-lg bg-forest px-4 text-sm font-semibold text-white" type="submit">
            Refresh
          </button>
        </form>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {report.summary.metricCards.map((card) => (
            <article key={card.code} className={`rounded-lg border p-4 ${toneClass(card.tone)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-75">{card.label}</p>
              <p className="mt-2 text-2xl font-bold">{card.valueText}</p>
              <p className="mt-1 text-sm opacity-80">{card.helperText}</p>
            </article>
          ))}
        </div>

        <section className="mt-5 rounded-lg border border-gold/40 bg-warning-soft p-4">
          <h2 className="font-bold">Report assumptions</h2>
          <ul className="mt-2 grid gap-1 text-sm text-muted">
            {report.summary.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </section>

        {report.dropRows.length === 0 ? (
          <section className="mt-5 rounded-lg border border-dashed border-black/15 bg-white p-6">
            <h2 className="text-lg font-bold">No drops listed in this period</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Publish a Limited Drop before reviewing ROI. Once paid orders and pickup outcomes exist, this page will show sell-through, GMV, net recovery, pickup completion, no-shows, incidents, and buyer signals.
            </p>
          </section>
        ) : (
          <section className="mt-5 rounded-lg border border-hairline bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Drop performance</h2>
              <p className="text-sm text-muted">Fresh {new Date(report.summary.dataFreshnessAt).toLocaleString("en-IN", { timeZone: IST_TIME_ZONE })}</p>
            </div>
            {report.dropRows.length > 1 ? (
              <div className="mt-3 grid gap-1">
                <p className="text-xs font-medium text-muted">Sell-through across drops (oldest → newest)</p>
                <Sparkline
                  values={[...report.dropRows]
                    .sort((a, b) => Date.parse(a.pickupStartAt) - Date.parse(b.pickupStartAt))
                    .map((row) => row.sellThroughBps ?? 0)}
                  label="Sell-through basis points across drops in this period, oldest to newest"
                />
              </div>
            ) : null}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-hairline text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2 pr-3">Drop</th>
                    <th className="py-2 pr-3">Pickup</th>
                    <th className="py-2 pr-3 text-right">Listed</th>
                    <th className="py-2 pr-3 text-right">Sold</th>
                    <th className="py-2 pr-3 text-right">Sell-through</th>
                    <th className="py-2 pr-3 text-right">GMV</th>
                    <th className="py-2 pr-3 text-right">Net</th>
                    <th className="py-2 pr-3 text-right">Pickup</th>
                    <th className="py-2 pr-3 text-right">No-show</th>
                    <th className="py-2 pr-3 text-right">Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {report.dropRows.map((row) => (
                    <tr key={row.dropPk} className="border-b border-hairline/60">
                      <td className="py-3 pr-3">
                        <p className="font-semibold">{row.dropTitle || row.bagDisplayName}</p>
                        <p className="text-xs text-muted">{row.dropStatusCode}</p>
                      </td>
                      <td className="py-3 pr-3">{new Date(row.pickupStartAt).toLocaleDateString("en-IN", { timeZone: IST_TIME_ZONE })}</td>
                      <td className="py-3 pr-3 text-right">{row.quantityListed}</td>
                      <td className="py-3 pr-3 text-right">{row.quantitySold}</td>
                      <td className="py-3 pr-3 text-right">{formatBasisPoints(row.sellThroughBps)}</td>
                      <td className="py-3 pr-3 text-right font-semibold">{formatPaise(row.gmvPaise)}</td>
                      <td className="py-3 pr-3 text-right font-semibold">{formatPaise(row.estimatedNetRecoveryPaise)}</td>
                      <td className="py-3 pr-3 text-right">{row.quantityCollected}</td>
                      <td className="py-3 pr-3 text-right">{row.noShowCount}</td>
                      <td className="py-3 pr-3 text-right">{row.incidentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-hairline bg-white p-4">
            <h2 className="font-bold">Next actions</h2>
            <ul className="mt-2 grid gap-2 text-sm text-muted">
              {report.summary.nextActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-hairline bg-white p-4">
            <h2 className="font-bold">Exceptions</h2>
            {report.noteRows.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No incidents or refunds/debits are present for this period.</p>
            ) : (
              <div className="mt-2 grid gap-2">
                {report.noteRows.slice(0, 6).map((note) => (
                  <div key={note.rowPk} className="rounded-md bg-black/[0.03] p-3 text-sm">
                    <p className="font-semibold">{note.titleText}</p>
                    <p className="mt-1 text-muted">
                      {note.orderNumber ?? "No order"} / {note.amountPaise == null ? note.statusCode : formatPaise(note.amountPaise)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </PortalChrome>
  );
}
