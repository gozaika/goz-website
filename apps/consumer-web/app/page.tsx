import Link from "next/link";
import { DropCard, EmptyState, ShellHeader } from "@gozaika/ui";
import { loadPublicDrops } from "@/lib/drops";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const previewDrops = (await loadPublicDrops()).slice(0, 3);

  return (
    <main>
      <ShellHeader>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/drops">Drops</Link>
          <Link href="/restaurants">Restaurants</Link>
          <Link href="/account">Account</Link>
        </nav>
      </ShellHeader>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#1A5C38]">Launching in Hyderabad</p>
          <h1 className="mt-3 text-5xl font-bold leading-tight text-[#2D2D2D]">
            Great food. No menu. No algorithm.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[#2D2D2D]/75">
            Claim chef-curated BAM Bags from Banjara Hills, Jubilee Hills, and Kondapur. Surprise
            contents, visible allergens, pickup-only.
          </p>
          <div className="mt-6 flex gap-3">
            <Link className="rounded-lg bg-[#FF6B35] px-5 py-3 font-semibold text-white" href="/drops">
              Browse drops
            </Link>
            <Link className="rounded-lg border border-[#1A5C38] px-5 py-3 font-semibold text-[#1A5C38]" href="/swaad-club">
              Swaad Club
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          {previewDrops.length > 0 ? (
            previewDrops.map((drop) => <DropCard key={drop.dropPk} drop={drop} />)
          ) : (
            <EmptyState title="First drops are being prepared" body="Approved Hyderabad partners will appear here as their BAM Bags go live." />
          )}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <EmptyState
          title="No drops near you yet"
          body="Get notified when Hyderabad's next BAM Bag lands in your neighborhood."
        />
      </section>
    </main>
  );
}
