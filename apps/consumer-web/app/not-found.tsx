import { EmptyState } from "@gozaika/ui";

export default function NotFound() {
  return (
    <main id="main-content" className="bg-cream">
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-16">
        <EmptyState
          title="This page isn't on the menu"
          body="The drop, restaurant, or page you're looking for may have closed or moved. Browse today's live BAM Bags instead."
          action={
            <a
              href="/drops"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-saffron px-5 text-sm font-semibold text-charcoal shadow-sm transition hover:opacity-90"
            >
              Browse live drops
            </a>
          }
        />
      </div>
    </main>
  );
}
