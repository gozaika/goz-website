import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";
import { AdminNavHeader } from "./admin-nav";

export default async function AdminPage() {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  return (
    <main id="main-content">
      <AdminNavHeader />
      <section className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">goZaika operations</p>
        <h1 className="mt-2 text-3xl font-bold">Admin home</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/admin/ops">
            <h2 className="text-xl font-bold">Restaurant trust ops</h2>
            <p className="mt-2 text-sm text-black/65">Pause restaurants or drops, triage support/refund queues, review config flags, and inspect audit history.</p>
          </Link>
          <Link className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/admin/restaurants/onboarding">
            <h2 className="text-xl font-bold">Restaurant onboarding</h2>
            <p className="mt-2 text-sm text-black/65">Review compliance, documents, and activation status.</p>
          </Link>
          <Link className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/admin/users">
            <h2 className="text-xl font-bold">User management</h2>
            <p className="mt-2 text-sm text-black/65">Search one profile, inspect consent/order/hold context, and keep broad PII exports out of the pilot surface.</p>
          </Link>
          <Link className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/admin/drops">
            <h2 className="text-xl font-bold">Drop and hold ops</h2>
            <p className="mt-2 text-sm text-black/65">Copy launch alerts and inspect temporary claim holds for active or scheduled drops.</p>
          </Link>
          <Link className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/admin/notifications">
            <h2 className="text-xl font-bold">Notification delivery</h2>
            <p className="mt-2 text-sm text-black/65">Review transactional message state, retry failed sends, suppress queued rows, and copy fallback text.</p>
          </Link>
          <Link className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/admin/finance">
            <h2 className="text-xl font-bold">Finance settlements</h2>
            <p className="mt-2 text-sm text-black/65">Preview eligible paid pickup orders, lock settlement runs, and track manual payout status.</p>
          </Link>
          <Link className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/admin/reports">
            <h2 className="text-xl font-bold">Pilot ROI reports</h2>
            <p className="mt-2 text-sm text-black/65">Review weekly partner metrics, drop performance, incidents, refunds/debits, and copy-safe report text.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
