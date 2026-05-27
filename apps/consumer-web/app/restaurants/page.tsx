import { ShellHeader } from "@gozaika/ui";
import Link from "next/link";
import { loadPublicRestaurants } from "@/lib/restaurants";
import { RestaurantDirectoryClient } from "./restaurant-directory-client";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const restaurants = await loadPublicRestaurants();

  return (
    <main>
      <ShellHeader>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/drops">Drops</Link>
          <Link href="/restaurants">Restaurants</Link>
          <Link href="/swaad-club">Swaad Club</Link>
          <Link href="/account">Account</Link>
        </nav>
      </ShellHeader>
      <section className="bg-[#FFF8F0]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-sm font-bold uppercase tracking-wide text-[#1A5C38]">Hyderabad restaurant directory</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-[#2D2D2D]">
            Discover kitchens curating Limited Drops for goZaika.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#2D2D2D]/72">
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
