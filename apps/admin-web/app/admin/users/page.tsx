import { ShellHeader } from "@gozaika/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";
import { searchAdminUsers } from "@/lib/users";
import { AdminUsersClient } from "./users-client";

export const dynamic = "force-dynamic";

function safeQuery(value: string | string[] | undefined): string {
  const text = Array.isArray(value) ? value[0] : value;
  return (text ?? "").trim().slice(0, 80);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly q?: string | string[] }>;
}) {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const query = safeQuery((await searchParams).q);
  const users = query.length >= 2 ? await searchAdminUsers(query) : [];

  return (
    <main>
      <ShellHeader>
        <nav className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link className="text-[#1A5C38]" href="/admin/ops">Ops</Link>
          <Link className="text-[#1A5C38]" href="/admin/users">Users</Link>
          <Link className="text-[#1A5C38]" href="/admin/finance">Finance</Link>
          <Link className="text-[#1A5C38]" href="/admin/reports">Reports</Link>
        </nav>
      </ShellHeader>
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Admin user management</p>
            <h1 className="mt-2 text-3xl font-bold">Bounded user search</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Search one user at a time by safe identifiers. Results are limited, list PII is masked, and this slice does not create account merge, broad export, or destructive user tooling.
            </p>
          </div>
          <Link className="min-h-11 rounded-lg border border-[#1A5C38]/25 px-4 py-3 text-sm font-semibold text-[#1A5C38]" href="/admin">
            Admin home
          </Link>
        </div>
        <div className="mt-6">
          <AdminUsersClient initialQuery={query} users={users} actorRoleCodes={actor.roleCodes} />
        </div>
      </section>
    </main>
  );
}
