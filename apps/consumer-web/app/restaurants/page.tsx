import { ShellHeader } from "@gozaika/ui";
import { loadPublicRestaurants } from "@/lib/restaurants";
import { RestaurantDirectoryClient } from "./restaurant-directory-client";
import { ConsumerNavLinks } from "../consumer-nav";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const restaurants = await loadPublicRestaurants();

  return (
    <main id="main-content">
      <ShellHeader>
        <ConsumerNavLinks />
      </ShellHeader>
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-sm font-bold uppercase tracking-wide text-forest">Hyderabad restaurant directory</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-charcoal">
            Discover kitchens curating Limited Drops for goZaika.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Browse active public partners, cuisine signals, pickup neighborhoods, and safe profile details. Private compliance,
            payout, and team data stay off this surface.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <RestaurantDirectoryClient restaurants={restaurants} />
      </section>
    </main>
  );
}
