import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadPortalDrops, loadPortalTemplates } from "@/lib/slice3";
import { PortalNav } from "../portal-nav";

export default async function DashboardPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant) redirect("/portal/onboarding");

  const [templates, drops] =
    restaurant.restaurantStatusCode === "ACTIVE"
      ? await Promise.all([loadPortalTemplates(restaurant.restaurantPk), loadPortalDrops(restaurant.restaurantPk)])
      : [[], []];

  const activeDrops = drops.filter((drop) => drop.statusCode === "ACTIVE").length;
  const availableBags = drops.reduce((total, drop) => total + drop.quantityAvailable, 0);
  const isActive = restaurant.restaurantStatusCode === "ACTIVE";

  return (
    <main>
      <ShellHeader>
        <PortalNav />
      </ShellHeader>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8">
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1A5C38]">Zayka Pro</p>
          <h1 className="mt-2 text-3xl font-bold">{restaurant.restaurantName}</h1>
          <p className="mt-2 text-sm text-black/65">Status: {restaurant.restaurantStatusCode}</p>
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

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-black/10 bg-white p-4">
            <p className="text-sm text-slate-500">Templates</p>
            <p className="mt-2 text-3xl font-bold">{templates.length}</p>
          </article>
          <article className="rounded-lg border border-black/10 bg-white p-4">
            <p className="text-sm text-slate-500">Active drops</p>
            <p className="mt-2 text-3xl font-bold">{activeDrops}</p>
          </article>
          <article className="rounded-lg border border-black/10 bg-white p-4">
            <p className="text-sm text-slate-500">Available bags</p>
            <p className="mt-2 text-3xl font-bold">{availableBags}</p>
          </article>
        </div>

        {isActive ? (
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
    </main>
  );
}
