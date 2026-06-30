import { EmptyState } from "@gozaika/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="bg-cream">
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-16">
        <EmptyState
          title="Page not found"
          body="This goZaika Partner page may have moved. Head back to your dashboard to manage drops, orders, and finance."
          action={
            <Link
              href="/portal/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-forest px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Go to dashboard
            </Link>
          }
        />
      </div>
    </main>
  );
}
