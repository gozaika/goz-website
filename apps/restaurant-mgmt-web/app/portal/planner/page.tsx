import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadActiveRestaurantsForProfile } from "@/lib/slice3";
import { PortalChrome } from "../portal-nav";
import { DropEconomicsPlanner } from "./planner-client";

export const dynamic = "force-dynamic";

export default async function PortalPlannerPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurants = await loadActiveRestaurantsForProfile(actor.profilePk);
  if (restaurants.length === 0) redirect("/portal/onboarding");

  const restaurant = restaurants[0]!;

  return (
    <PortalChrome restaurantName={restaurant.restaurantName} statusCode="ACTIVE">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">Decision support</p>
          <h1 className="mt-2 text-3xl font-bold">Drop economics planner</h1>
          <p className="mt-2 text-sm text-muted">
            Model a drop before you publish it — the fill you&apos;d use, the price you&apos;d set, and how many
            first-timers come back at full price. Every number is editable; the fill mix and conversion are the two
            levers that decide whether a drop is pure surplus revenue or deliberate acquisition spend.
          </p>
        </div>

        <div className="mt-5">
          <DropEconomicsPlanner />
        </div>
      </section>
    </PortalChrome>
  );
}
