import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalTemplates } from "@/lib/slice3";
import { TemplateForm } from "./template-form";

export default async function TemplatesPage() {
  const actor = await getPortalActor();
  const restaurant = actor ? await loadDefaultRestaurant(actor.profilePk) : null;
  const templates = restaurant ? await loadPortalTemplates(restaurant.restaurantPk) : [];

  return (
    <main className="px-6 py-6">
      <h1 className="text-3xl font-bold">BAM Bag templates</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Create reusable, allergen-disclosed BAM Bag templates for approved restaurants before publishing drops.
      </p>
      <div className="mt-6">
        <TemplateForm templates={templates} />
      </div>
    </main>
  );
}
