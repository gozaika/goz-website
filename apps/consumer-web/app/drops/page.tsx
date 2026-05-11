import { DropCard, ShellHeader } from "@gozaika/ui";
import type { PublicDropCard } from "@gozaika/types";

const drops: PublicDropCard[] = [
  {
    dropPk: "33333333-3333-4333-8333-333333333333",
    restaurantName: "Jubilee Hearth",
    restaurantSlug: "jubilee-hearth",
    dietaryCategoryCode: "JAIN",
    allergenCodes: ["SESAME", "MUSTARD"],
    pricePaise: 39900,
    pickupStartAt: "2026-04-25T14:00:00.000Z",
    pickupEndAt: "2026-04-25T15:30:00.000Z",
    quantityTotal: 20,
    quantityAvailable: 13,
    statusCode: "ACTIVE",
  },
];

export default function DropsPage() {
  return (
    <main>
      <ShellHeader />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Hyderabad BAM Bag drops</h1>
            <p className="mt-2 text-[#2D2D2D]/70">Filter by cuisine, dietary category, allergens, price, and pickup window.</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-1 text-sm font-semibold">
            <button className="rounded-md bg-[#1A5C38] px-3 py-2 text-white">List</button>
            <button className="px-3 py-2">Map</button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {drops.map((drop) => (
            <DropCard key={drop.dropPk} drop={drop} />
          ))}
        </div>
      </section>
    </main>
  );
}
