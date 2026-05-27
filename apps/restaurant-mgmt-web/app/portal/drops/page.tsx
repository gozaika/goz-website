import { formatBasisPoints, formatPaise, formatPickupWindow, rateToBasisPoints } from "@gozaika/utils";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalDrops } from "@/lib/slice3";
import { PortalChrome } from "../portal-nav";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "ACTIVE") return "border-[#1A5C38]/25 bg-[#F2F8EF] text-[#1A5C38]";
  if (status === "SCHEDULED") return "border-[#D4A017]/40 bg-[#FFF8E6] text-[#7A5A00]";
  if (status === "PAUSED") return "border-red-200 bg-red-50 text-red-700";
  return "border-black/10 bg-white text-black/65";
}

export default async function PortalDropsPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant) redirect("/portal/onboarding");

  const drops = await loadPortalDrops(restaurant.restaurantPk);

  return (
    <PortalChrome restaurantName={restaurant.restaurantName} statusCode={restaurant.restaurantStatusCode}>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Limited Drops</p>
            <h1 className="mt-2 text-3xl font-bold">Active drop list</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Scan title, pickup date, price, listed/sold bags, sell-through, status, and safe next actions. Pause/close controls remain in the publish workflow with existing guardrails.
            </p>
          </div>
          <a className="inline-flex min-h-11 items-center rounded-lg bg-[#FF6B35] px-4 text-sm font-semibold text-white" href="/portal/drops/new">
            New drop
          </a>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-black/10 bg-[#FFF8F0] text-xs uppercase text-black/55">
              <tr>
                <th className="px-4 py-3">Drop</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Listed</th>
                <th className="px-4 py-3 text-right">Sold</th>
                <th className="px-4 py-3 text-right">Sell-through</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drops.map((drop) => {
                const sold = Math.max(0, drop.quantityTotal - drop.quantityAvailable);
                return (
                  <tr key={drop.dropPk} className="border-b border-black/5">
                    <td className="px-4 py-3 font-semibold">{drop.dropTitle}</td>
                    <td className="px-4 py-3">{formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatPaise(drop.pricePaise)}</td>
                    <td className="px-4 py-3 text-right">{drop.quantityTotal}</td>
                    <td className="px-4 py-3 text-right">{sold}</td>
                    <td className="px-4 py-3 text-right">{formatBasisPoints(rateToBasisPoints(sold, drop.quantityTotal))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(drop.statusCode)}`}>
                        {drop.statusCode.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <a className="font-semibold text-[#1A5C38]" href={`/portal/drops/new`}>
                          Manage
                        </a>
                        <a className="font-semibold text-[#1A5C38]" href={`/portal/drops/new?duplicate=${drop.dropPk}`}>
                          Duplicate
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {drops.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-black/60">
                    No drops yet. Create a BAM Bag template, then publish your first Limited Drop.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </PortalChrome>
  );
}
