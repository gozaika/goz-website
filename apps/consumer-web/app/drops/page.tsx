import { ShellHeader } from "@gozaika/ui";
import { DropDiscoveryClient } from "./drop-discovery-client";
import { loadPublicDrops } from "@/lib/drops";
import { ConsumerNavLinks } from "../consumer-nav";

export const dynamic = "force-dynamic";

export default async function DropsPage() {
  const drops = await loadPublicDrops();

  return (
    <main id="main-content" data-screen-id="drops-list">
      <ShellHeader>
        <ConsumerNavLinks />
      </ShellHeader>
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-forest">Live Hyderabad discovery</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-charcoal">Find today&apos;s BAM Bags by cuisine, neighborhood, and pickup window.</h1>
            <p className="mt-3 max-w-2xl text-muted">
              Every BAM Bag is a chef-curated thali — a generous spread from one kitchen, portioned so you get more to try, not less. Search by restaurant, cuisine, dietary category, allergen, or pickup neighbourhood. The full lineup is a surprise; every allergen is disclosed before you claim.
            </p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mt-6">
          <DropDiscoveryClient initialDrops={drops} generatedAt={new Date().toISOString()} />
        </div>
      </section>
    </main>
  );
}
