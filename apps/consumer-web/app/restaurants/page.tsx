import { EmptyState, ShellHeader } from "@gozaika/ui";

export default function RestaurantsPage() {
  return (
    <main>
      <ShellHeader />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-4xl font-bold">Restaurant discovery</h1>
        <div className="mt-6">
          <EmptyState title="Restaurant reveals arrive at launch" body="Follow Hyderabad neighborhoods and get notified when premium partners go live." />
        </div>
      </section>
    </main>
  );
}
