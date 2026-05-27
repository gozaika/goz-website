import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalDrops, loadPortalTemplates, loadPublicDropsByDropPks, loadRestaurantOpsGuardrails } from "@/lib/slice3";
import { PortalChrome } from "../../portal-nav";
import { DropPublishingForm } from "./drop-publishing-form";

export default async function NewDropPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant) redirect("/portal/onboarding");

  if (restaurant.restaurantStatusCode !== "ACTIVE") {
    return (
      <PortalChrome restaurantName={restaurant.restaurantName} statusCode={restaurant.restaurantStatusCode}>
        <section className="mx-auto max-w-3xl px-6 py-8">
          <div className="rounded-lg border border-[#D4A017]/40 bg-[#FFF8E6] p-5">
            <p className="text-sm font-semibold text-[#7A5A00]">Publishing paused</p>
            <h1 className="mt-2 text-2xl font-bold">Drop publishing is unavailable</h1>
            <p className="mt-2 text-sm text-[#7A5A00]">
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
    <PortalChrome restaurantName={restaurant.restaurantName} statusCode={restaurant.restaurantStatusCode}>
      <section className="px-6 py-6">
        <h1 className="text-3xl font-bold">Create a BAM Bag drop</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Publish scheduled or active inventory to consumer discovery. Holds are visible for launch support, but they are not paid orders yet.
        </p>
        <div className="mt-6">
          <DropPublishingForm templates={templates} drops={drops} launchDrops={launchDrops} restaurantName={restaurant.restaurantName} guardrails={guardrails} />
        </div>
      </section>
    </PortalChrome>
  );
}
