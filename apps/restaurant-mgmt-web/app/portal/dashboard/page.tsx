import { formatBasisPoints, formatPaise, rateToBasisPoints } from "@gozaika/utils";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalDrops, loadPortalTemplates, loadRestaurantOpsGuardrails } from "@/lib/slice3";
import { PortalChrome } from "../portal-nav";

export default async function DashboardPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant) redirect("/portal/onboarding");

  const [templates, drops, guardrails] =
    restaurant.restaurantStatusCode === "ACTIVE"
      ? await Promise.all([loadPortalTemplates(restaurant.restaurantPk), loadPortalDrops(restaurant.restaurantPk), loadRestaurantOpsGuardrails(restaurant.restaurantPk)])
      : [[], [], null];

  const activeDrops = drops.filter((drop) => drop.statusCode === "ACTIVE").length;
  const scheduledDrops = drops.filter((drop) => drop.statusCode === "SCHEDULED").length;
  const availableBags = drops.reduce((total, drop) => total + drop.quantityAvailable, 0);
  const listedBags = drops.reduce((total, drop) => total + drop.quantityTotal, 0);
  const soldBags = drops.reduce((total, drop) => total + Math.max(0, drop.quantityTotal - drop.quantityAvailable), 0);
  const todayRevenue = drops
    .filter((drop) => new Date(drop.pickupStartAt).toDateString() === new Date().toDateString())
    .reduce((total, drop) => total + Math.max(0, drop.quantityTotal - drop.quantityAvailable) * drop.pricePaise, 0);
  const sellThroughBps = rateToBasisPoints(soldBags, listedBags);
  const aov = soldBags > 0 ? Math.round(todayRevenue / Math.max(1, soldBags)) : 0;
  const nowMs = new Date().getTime();
  const nextDrop = drops
    .filter((drop) => Date.parse(drop.pickupEndAt) > nowMs)
    .sort((left, right) => Date.parse(left.pickupStartAt) - Date.parse(right.pickupStartAt))[0];
  const isActive = restaurant.restaurantStatusCode === "ACTIVE";

  return (
    <PortalChrome restaurantName={restaurant.restaurantName} statusCode={restaurant.restaurantStatusCode}>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1A5C38]">Zayka Pro</p>
          <h1 className="mt-2 text-3xl font-bold">Today at {restaurant.restaurantName}</h1>
          <p className="mt-2 text-sm text-black/65">Production dashboard from existing drops, holds, finance, and ROI-ready facts. No payment or settlement state is changed here.</p>
        </div>

        {!isActive ? (
          <section className="rounded-lg border border-[#D4A017]/40 bg-[#FFF8E6] p-5">
            <h2 className="text-lg font-semibold">Activation required</h2>
            <p className="mt-2 text-sm text-[#7A5A00]">
              Complete onboarding and admin approval before creating templates or publishing drops.
            </p>
            <a className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#1A5C38] px-4 text-sm font-semibold text-white" href="/portal/onboarding">
              Continue onboarding
            </a>
          </section>
        ) : null}

        {isActive && guardrails && !guardrails.publishingEnabled ? (
          <section className="rounded-lg border border-[#D4A017]/40 bg-[#FFF8E6] p-5">
            <h2 className="text-lg font-semibold">Publishing paused by ops</h2>
            <p className="mt-2 text-sm text-[#7A5A00]">
              New Limited Drops are temporarily unavailable while goZaika ops reviews this restaurant. Existing orders, finance, and reports remain read-only.
            </p>
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Today revenue" value={formatPaise(todayRevenue)} helper="Estimated from visible sold quantity" />
          <Metric label="Bags sold/listed" value={`${soldBags}/${listedBags}`} helper={`${availableBags} available across live history`} />
          <Metric label="Sell-through" value={formatBasisPoints(sellThroughBps)} helper={`${activeDrops} active, ${scheduledDrops} scheduled`} />
          <Metric label="AOV" value={formatPaise(aov)} helper={`${templates.length} active template records`} />
        </div>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Sell-through by recent drop</h2>
            <div className="mt-4 grid gap-3">
              {drops.slice(0, 6).map((drop) => {
                const sold = Math.max(0, drop.quantityTotal - drop.quantityAvailable);
                return (
                  <div key={drop.dropPk} className="grid gap-2 rounded-lg border border-black/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{drop.dropTitle}</p>
                      <span className="text-sm text-black/60">{formatBasisPoints(rateToBasisPoints(sold, drop.quantityTotal))}</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/10">
                      <div className="h-2 rounded-full bg-[#1A5C38]" style={{ width: `${Math.min(100, Math.round((sold / Math.max(1, drop.quantityTotal)) * 100))}%` }} />
                    </div>
                  </div>
                );
              })}
              {drops.length === 0 ? <p className="text-sm text-black/60">Publish a Limited Drop to see trend rows.</p> : null}
            </div>
          </div>
          <aside className="rounded-lg border border-[#D4A017]/40 bg-[#FFF8F0] p-5">
            <h2 className="text-xl font-bold">Next drop</h2>
            {nextDrop ? (
              <div className="mt-3">
                <p className="font-semibold">{nextDrop.dropTitle}</p>
                <p className="mt-1 text-sm text-black/65">{new Date(nextDrop.pickupStartAt).toLocaleString("en-IN")}</p>
                <p className="mt-3 text-sm font-semibold text-[#1A5C38]">{nextDrop.quantityAvailable}/{nextDrop.quantityTotal} bags available</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-black/65">No upcoming drop. Create one when publishing is enabled.</p>
            )}
            <div className="mt-5 grid gap-2">
              <a className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FF6B35] px-4 text-sm font-semibold text-white" href="/portal/drops/new">Create drop</a>
              <a className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#1A5C38]/25 px-4 text-sm font-semibold text-[#1A5C38]" href="/portal/drops">View drop list</a>
            </div>
          </aside>
        </section>

        {isActive && guardrails?.publishingEnabled !== false ? (
          <section className="grid gap-4 md:grid-cols-2">
            <a className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/portal/templates">
              <h2 className="text-xl font-bold">Create BAM Bag template</h2>
              <p className="mt-2 text-sm text-black/65">Add reusable dietary, allergen, serving, holding, and pricing disclosures.</p>
            </a>
            <a className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/portal/drops/new">
              <h2 className="text-xl font-bold">Publish a drop</h2>
              <p className="mt-2 text-sm text-black/65">Choose a template, set quantity and pickup window, then publish to consumer discovery.</p>
            </a>
          </section>
        ) : null}
      </section>
    </PortalChrome>
  );
}

function Metric({ label, value, helper }: { readonly label: string; readonly value: string; readonly helper: string }) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </article>
  );
}
