import { AllergenChips, DietaryBadge, DropCard, EmptyState, RestaurantCard, ShellHeader } from "@gozaika/ui";
import { createPublicDropUrl, generateManualDropAlertText } from "@gozaika/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicRestaurant } from "@/lib/restaurants";

export const dynamic = "force-dynamic";

export default async function RestaurantProfilePage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await loadPublicRestaurant(slug);

  if (!restaurant) {
    notFound();
  }

  const shareHref = `/restaurants/${restaurant.restaurantSlug}`;

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
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#1A5C38]">
              {restaurant.neighborhoodName ?? restaurant.cityName ?? "goZaika partner"}
            </p>
            <h1 className="mt-3 text-5xl font-bold leading-tight text-[#2D2D2D]">{restaurant.restaurantName}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#2D2D2D]/75">
              {restaurant.headline ?? "A public goZaika partner profile with chef-curated BAM Bag drops and transparent pickup details."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {restaurant.cuisineTags.map((tag) => (
                <span key={tag} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#1A5C38]">
                  {tag}
                </span>
              ))}
              {restaurant.dietaryTags.map((tag) => (
                <DietaryBadge key={tag} code={tag} />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-11 items-center rounded-lg bg-[#FF6B35] px-5 text-sm font-semibold text-white" href="/drops">
                Browse Limited Drops
              </Link>
              <a className="inline-flex min-h-11 items-center rounded-lg border border-[#1A5C38]/25 px-5 text-sm font-semibold text-[#1A5C38]" href={`mailto:?subject=${encodeURIComponent(`goZaika: ${restaurant.restaurantName}`)}&body=${encodeURIComponent(shareHref)}`}>
                Share profile
              </a>
            </div>
          </div>
          <RestaurantCard restaurant={restaurant} />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-8">
          <section>
            <h2 className="text-2xl font-bold text-[#2D2D2D]">Active and upcoming drops</h2>
            <div className="mt-4">
              {restaurant.activeDrops.length === 0 ? (
                <EmptyState
                  title="No active drops from this restaurant right now"
                  body="Follow the directory and check back when the next Chef's Selection goes live."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {restaurant.activeDrops.map((drop) => (
                    <DropCard
                      key={drop.dropPk}
                      drop={drop}
                      actions={
                        <a
                          className="text-sm font-semibold text-[#1A5C38]"
                          href={`https://wa.me/?text=${encodeURIComponent(generateManualDropAlertText(drop, createPublicDropUrl(drop.dropPk)))}`}
                        >
                          Share drop
                        </a>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#2D2D2D]">Recent drop history</h2>
            <div className="mt-4 grid gap-3">
              {restaurant.pastDrops.length === 0 ? (
                <p className="rounded-lg border border-dashed border-black/15 bg-white p-4 text-sm text-[#2D2D2D]/65">
                  Past public drops will appear here after pickup windows close.
                </p>
              ) : (
                restaurant.pastDrops.map((drop) => (
                  <article key={drop.dropPk} className="rounded-lg border border-black/10 bg-white p-4 opacity-85">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#2D2D2D]">{drop.bagDisplayName}</p>
                        <p className="mt-1 text-sm text-[#2D2D2D]/65">{drop.dropTitle}</p>
                      </div>
                      <DietaryBadge code={drop.dietaryCategoryCode} />
                    </div>
                    <div className="mt-3">
                      <AllergenChips codes={drop.allergenCodes} />
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-[#D4A017]/35 bg-[#FFF8F0] p-5">
          <h2 className="text-lg font-bold text-[#2D2D2D]">Food safety and pickup notes</h2>
          <p className="mt-3 text-sm leading-6 text-[#2D2D2D]/72">
            Every BAM Bag shows dietary category and allergen disclosures before claim. Contents remain chef-curated and
            off-menu; check disclosures before paying and pickup only during the stated window.
          </p>
          <p className="mt-4 text-sm font-semibold text-[#1A5C38]">
            {restaurant.pickupInstructions ?? "Pickup instructions appear on drop detail and confirmed order screens."}
          </p>
        </aside>
      </section>
    </main>
  );
}
