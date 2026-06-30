import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalDrops } from "@/lib/slice3";
import { PortalChrome } from "../portal-nav";
import { DropsListClient } from "./drops-list-client";

export const dynamic = "force-dynamic";

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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">Limited Drops</p>
            <h1 className="mt-2 text-3xl font-bold text-charcoal">Active drop list</h1>
            <p className="mt-2 max-w-3xl text-sm text-charcoal/65">
              Filter by status, scan the command-center summary, then read title, pickup, price, listed/reserved bags, and
              sell-through per drop. Pause/close controls remain in the publish workflow with existing guardrails.
            </p>
          </div>
          <a className="inline-flex min-h-11 items-center rounded-lg bg-saffron px-4 text-sm font-semibold text-charcoal shadow-sm transition hover:opacity-90" href="/portal/drops/new">
            New drop
          </a>
        </div>

        <div className="mt-6">
          <DropsListClient drops={drops} />
        </div>
      </section>
    </PortalChrome>
  );
}
