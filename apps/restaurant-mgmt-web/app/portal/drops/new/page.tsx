import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalDrops, loadPortalTemplates } from "@/lib/slice3";
import { DropPublishingForm } from "./drop-publishing-form";

export default async function NewDropPage() {
  const actor = await getPortalActor();
  const restaurant = actor ? await loadDefaultRestaurant(actor.profilePk) : null;
  const [templates, drops] = restaurant
    ? await Promise.all([loadPortalTemplates(restaurant.restaurantPk), loadPortalDrops(restaurant.restaurantPk)])
    : [[], []];

  return (
    <main className="px-6 py-6">
      <h1 className="text-3xl font-bold">Create a BAM Bag drop</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Publish scheduled or active inventory to consumer discovery. Checkout, holds, payments, and pickup QR remain out of scope for this slice.
      </p>
      <div className="mt-6">
        <DropPublishingForm templates={templates} drops={drops} />
      </div>
    </main>
  );
}
