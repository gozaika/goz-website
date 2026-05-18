import { ShellHeader } from "@gozaika/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";

export default async function AdminPage() {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  return (
    <main>
      <ShellHeader>
        <span className="text-sm font-semibold text-[#1A5C38]">Admin ops</span>
      </ShellHeader>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">goZaika operations</p>
        <h1 className="mt-2 text-3xl font-bold">Admin home</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/admin/restaurants/onboarding">
            <h2 className="text-xl font-bold">Restaurant onboarding</h2>
            <p className="mt-2 text-sm text-black/65">Review compliance, documents, and activation status.</p>
          </Link>
          <Link className="rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#1A5C38]" href="/admin/drops">
            <h2 className="text-xl font-bold">Drop and hold ops</h2>
            <p className="mt-2 text-sm text-black/65">Copy launch alerts and inspect temporary claim holds for active or scheduled drops.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
