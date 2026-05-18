import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalTemplates } from "@/lib/slice3";
import { PortalNav } from "../portal-nav";
import { TemplateForm } from "./template-form";

export default async function TemplatesPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") redirect("/portal/onboarding");

  const templates = await loadPortalTemplates(restaurant.restaurantPk);

  return (
    <main>
      <ShellHeader>
        <PortalNav />
      </ShellHeader>
      <section className="px-6 py-6">
        <h1 className="text-3xl font-bold">BAM Bag templates</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Create reusable, allergen-disclosed BAM Bag templates for approved restaurants before publishing drops.
        </p>
        <div className="mt-6">
          <TemplateForm templates={templates} />
        </div>
      </section>
    </main>
  );
}
