import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadActiveRestaurantsForProfile, loadPortalDrops, loadPortalTemplates, loadPublicDropsByDropPks, loadRestaurantOpsGuardrails, loadSelectedRestaurant } from "@/lib/slice3";
import { PortalChrome } from "../../portal-nav";
import { toSwitcherRestaurants } from "../../switcher-data";
import { DropPublishingForm } from "./drop-publishing-form";

export default async function NewDropPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const [restaurant, memberships] = await Promise.all([
    loadSelectedRestaurant(actor.profilePk),
    loadActiveRestaurantsForProfile(actor.profilePk),
  ]);
  if (!restaurant) redirect("/portal/onboarding");

  if (restaurant.restaurantStatusCode !== "ACTIVE") {
    return (
      <PortalChrome restaurantName={restaurant.restaurantName} statusCode={restaurant.restaurantStatusCode} switcherRestaurants={toSwitcherRestaurants(memberships)} selectedRestaurantPk={restaurant.restaurantPk}>
        <section className="mx-auto max-w-3xl px-6 py-8">
          <div className="rounded-lg border border-gold/40 bg-warning-soft p-5">
            <p className="text-sm font-semibold text-warning">Publishing paused</p>
            <h1 className="mt-2 text-2xl font-bold text-charcoal">Drop publishing is unavailable</h1>
            <p className="mt-2 text-sm text-warning">
              goZaika ops must reactivate this restaurant before new Limited Drops can be published. Existing orders and read-only finance/report pages remain available.
            </p>
          </div>
        </section>
      </PortalChrome>
    );
  }

  const [templates, drops] = await Promise.all([
    loadPortalTemplates(restaurant.restaurantPk),
    loadPortalDrops(restaurant.restaurantPk),
  ]);
  const guardrails = await loadRestaurantOpsGuardrails(restaurant.restaurantPk);
  const launchDrops = await loadPublicDropsByDropPks(drops.map((drop) => drop.dropPk));

  return (
    <PortalChrome restaurantName={restaurant.restaurantName} statusCode={restaurant.restaurantStatusCode} switcherRestaurants={toSwitcherRestaurants(memberships)} selectedRestaurantPk={restaurant.restaurantPk}>
      <section className="px-6 py-6">
        <h1 className="text-3xl font-bold text-charcoal">Create a BAM Bag drop</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Publish scheduled or active inventory to consumer discovery. Holds are visible for launch support, but they are not paid orders yet.
        </p>
        <div className="mt-6">
          <DropPublishingForm templates={templates} drops={drops} launchDrops={launchDrops} restaurantPk={restaurant.restaurantPk} restaurantName={restaurant.restaurantName} guardrails={guardrails} />
        </div>
      </section>
    </PortalChrome>
  );
}
