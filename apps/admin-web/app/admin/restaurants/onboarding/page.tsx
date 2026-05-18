import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { ShellHeader } from "@gozaika/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminRestaurantOnboardingPage() {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const service = createServiceRoleSupabaseClient();
  const { data: restaurants } = await service
    .from("restaurant_restaurant")
    .select(
      "restaurant_restaurant_pk,restaurant_name,restaurant_slug,restaurant_status_code,created_at,geo_city(city_name),geo_neighborhood(neighborhood_name),restaurant_compliance(compliance_status_code),restaurant_document(restaurant_document_pk)",
    )
    .in("restaurant_status_code", ["PENDING", "ONBOARDING", "ACTIVE", "PAUSED", "SUSPENDED"])
    .order("created_at", { ascending: false });

  return (
    <main>
      <ShellHeader>
        <nav className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link className="text-[#1A5C38]" href="/admin/restaurants/onboarding">
            Onboarding
          </Link>
          <Link className="text-[#1A5C38]" href="/admin/drops">
            Drops
          </Link>
        </nav>
      </ShellHeader>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Ops review</p>
            <h1 className="mt-2 text-3xl font-bold">Restaurant onboarding</h1>
          </div>
          <Link className="min-h-11 rounded-lg bg-[#1A5C38] px-4 py-3 text-sm font-semibold text-white" href="/admin">
            Admin home
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-black/10 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-black/[0.03] text-xs uppercase tracking-wide text-black/60">
              <tr>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Restaurant status</th>
                <th className="px-4 py-3">Compliance</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {(restaurants ?? []).map((restaurant) => {
                const city = Array.isArray(restaurant.geo_city) ? restaurant.geo_city[0] : restaurant.geo_city;
                const neighborhood = Array.isArray(restaurant.geo_neighborhood) ? restaurant.geo_neighborhood[0] : restaurant.geo_neighborhood;
                const compliance = Array.isArray(restaurant.restaurant_compliance) ? restaurant.restaurant_compliance[0] : restaurant.restaurant_compliance;
                const documents = restaurant.restaurant_document ?? [];
                return (
                  <tr key={restaurant.restaurant_restaurant_pk} className="border-t border-black/10">
                    <td className="px-4 py-3 font-semibold">{restaurant.restaurant_name}</td>
                    <td className="px-4 py-3">{neighborhood?.neighborhood_name ?? city?.city_name ?? "Hyderabad"}</td>
                    <td className="px-4 py-3">{restaurant.restaurant_status_code}</td>
                    <td className="px-4 py-3">{compliance?.compliance_status_code ?? "PENDING"}</td>
                    <td className="px-4 py-3">{documents.length}</td>
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-[#1A5C38]" href={`/admin/restaurants/${restaurant.restaurant_restaurant_pk}/review`}>
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!restaurants?.length ? <p className="p-6 text-sm text-black/60">No restaurant onboarding records yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
