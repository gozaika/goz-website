import Link from "next/link";
import { DropCard, EmptyState, ShellHeader } from "@gozaika/ui";
import { loadPublicDrops } from "@/lib/drops";
import { loadPublicRestaurants } from "@/lib/restaurants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [drops, restaurants] = await Promise.all([loadPublicDrops(), loadPublicRestaurants()]);
  const nowDate = new Date();
  const now = nowDate.getTime();
  const activeDrops = drops.filter((drop) => Date.parse(drop.pickupEndAt) > now);
  const previewDrops = activeDrops.slice(0, 3);
  const closingSoon = activeDrops.filter((drop) => Date.parse(drop.pickupEndAt) - now < 2 * 60 * 60 * 1000).slice(0, 2);

  return (
    <main>
      <ShellHeader>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/drops">Drops</Link>
          <Link href="/restaurants">Restaurants</Link>
          <Link href="/account">Account</Link>
        </nav>
      </ShellHeader>
      <section className="bg-[#FFF8F0]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#1A5C38]">Launching in Hyderabad</p>
          <h1 className="mt-3 text-5xl font-bold leading-tight text-[#2D2D2D] md:text-6xl">
            Chef-curated BAM Bags, ready for pickup today.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[#2D2D2D]/75">
            Discover Limited Drops from Hyderabad kitchens. Search by restaurant, cuisine, dietary category, and pickup window with allergens visible before you claim.
          </p>
          <form action="/drops" className="mt-6 flex max-w-xl flex-col gap-3 rounded-lg border border-black/10 bg-white p-2 shadow-sm sm:flex-row">
            <input
              name="q"
              aria-label="Search BAM Bags"
              placeholder="Search biryani, veg, Jubilee Hills..."
              className="min-h-12 flex-1 rounded-md px-3 outline-none"
            />
            <button className="min-h-12 rounded-lg bg-[#FF6B35] px-5 font-semibold text-white">Search</button>
          </form>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Biryani", "Thali", "Dessert", "Snacks", "Chef's Selection"].map((chip) => (
              <Link key={chip} href="/drops" className="rounded-full border border-[#1A5C38]/20 bg-white px-3 py-2 text-sm font-semibold text-[#1A5C38]">
                {chip}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-[#FF6B35] px-5 py-3 font-semibold text-white" href="/drops">
              Browse drops
            </Link>
            <Link className="rounded-lg border border-[#1A5C38] px-5 py-3 font-semibold text-[#1A5C38]" href="/swaad-club">
              Swaad Club
            </Link>
          </div>
          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-white p-3">
              <dt className="font-semibold text-[#2D2D2D]/55">Active drops</dt>
              <dd className="mt-1 text-2xl font-bold text-[#2D2D2D]">{activeDrops.length}</dd>
            </div>
            <div className="rounded-lg bg-white p-3">
              <dt className="font-semibold text-[#2D2D2D]/55">Partners</dt>
              <dd className="mt-1 text-2xl font-bold text-[#2D2D2D]">{restaurants.length}</dd>
            </div>
            <div className="rounded-lg bg-white p-3">
              <dt className="font-semibold text-[#2D2D2D]/55">Pickup</dt>
              <dd className="mt-1 text-2xl font-bold text-[#2D2D2D]">HYD</dd>
            </div>
          </dl>
        </div>
        <div className="grid gap-4">
          {previewDrops.length > 0 ? (
            previewDrops.map((drop) => <DropCard key={drop.dropPk} drop={drop} />)
          ) : (
            <EmptyState title="First drops are being prepared" body="Approved Hyderabad partners will appear here as their BAM Bags go live." />
          )}
        </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="grid gap-4 py-8 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="text-2xl font-bold text-[#2D2D2D]">Closing soon</h2>
            {closingSoon.length ? (
              <div className="mt-4 grid gap-3">
                {closingSoon.map((drop) => (
                  <Link key={drop.dropPk} href={`/drops/${drop.dropPk}`} className="rounded-lg border border-[#D4A017]/40 bg-[#FFF8F0] p-4">
                    <p className="text-sm font-semibold text-[#1A5C38]">{drop.restaurantName}</p>
                    <p className="mt-1 font-bold text-[#2D2D2D]">{drop.bagDisplayName}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#2D2D2D]/65">No drop is closing in the next two hours.</p>
            )}
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="text-2xl font-bold text-[#2D2D2D]">Restaurant profiles</h2>
            <p className="mt-2 text-sm text-[#2D2D2D]/70">Browse partner identity, cuisine signals, active drops, and safe disclosure reminders.</p>
            <Link href="/restaurants" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#1A5C38]/25 px-4 text-sm font-semibold text-[#1A5C38]">
              Explore restaurants
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
