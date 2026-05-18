import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalDrops, loadPortalTemplates, loadPublicDropsByDropPks } from "@/lib/slice3";
import { PortalNav } from "../../portal-nav";
import { DropPublishingForm } from "./drop-publishing-form";

export default async function NewDropPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") redirect("/portal/onboarding");

  const [templates, drops] = await Promise.all([
    loadPortalTemplates(restaurant.restaurantPk),
    loadPortalDrops(restaurant.restaurantPk),
  ]);
  const launchDrops = await loadPublicDropsByDropPks(drops.map((drop) => drop.dropPk));

  return (
    <main>
      <ShellHeader>
        <PortalNav />
      </ShellHeader>
      <section className="px-6 py-6">
        <h1 className="text-3xl font-bold">Create a BAM Bag drop</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Publish scheduled or active inventory to consumer discovery. Holds are visible for launch support, but they are not paid orders yet.
        </p>
        <div className="mt-6">
          <DropPublishingForm templates={templates} drops={drops} launchDrops={launchDrops} restaurantName={restaurant.restaurantName} />
        </div>
      </section>
    </main>
  );
}
