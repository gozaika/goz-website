import { ShellHeader } from "@gozaika/ui";
import { DropDiscoveryClient } from "./drop-discovery-client";
import { loadPublicDrops } from "@/lib/drops";

export const dynamic = "force-dynamic";

export default async function DropsPage() {
  const drops = await loadPublicDrops();

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
        <div className="mt-6">
          <DropDiscoveryClient initialDrops={drops} />
        </div>
      </section>
    </main>
  );
}
