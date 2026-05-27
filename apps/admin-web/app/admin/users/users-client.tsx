"use client";

import type { AdminUserSearchRow } from "@/lib/users";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function AdminUsersClient({
  actorRoleCodes,
  initialQuery,
  users,
}: {
  readonly actorRoleCodes: readonly string[];
  readonly initialQuery: string;
  readonly users: readonly AdminUserSearchRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [selectedPk, setSelectedPk] = useState(users[0]?.profilePk ?? "");
  const selected = useMemo(() => users.find((user) => user.profilePk === selectedPk) ?? users[0] ?? null, [selectedPk, users]);
  const canViewDirect = actorRoleCodes.some((role) => ["SUPER_ADMIN", "OPS_ADMIN", "SUPPORT_ADMIN"].includes(role));

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed === initialQuery) return;
      router.replace(trimmed.length >= 2 ? `/admin/users?q=${encodeURIComponent(trimmed)}` : "/admin/users");
    }, 350);
    return () => window.clearTimeout(handle);
  }, [initialQuery, query, router]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid gap-4">
        <label className="grid gap-2 rounded-lg border border-black/10 bg-white p-4 text-sm font-semibold shadow-sm">
          Search phone, email, or name
          <input
            className="min-h-12 rounded-lg border border-black/15 px-3 text-base outline-none focus:border-[#1A5C38]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter at least 2 characters"
          />
        </label>

        <div className="grid gap-3">
          {users.map((user) => (
            <button
              key={user.profilePk}
              type="button"
              className={`rounded-lg border bg-white p-4 text-left shadow-sm transition ${
                selected?.profilePk === user.profilePk ? "border-[#1A5C38]" : "border-black/10 hover:border-[#1A5C38]/50"
              }`}
              onClick={() => setSelectedPk(user.profilePk)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#2D2D2D]">{user.displayName ?? "Unnamed profile"}</p>
                  <p className="mt-1 text-sm text-black/60">
                    {user.maskedPhone || "No phone"} / {user.maskedEmail || "No email"}
                  </p>
                </div>
                <span className="rounded-full border border-[#1A5C38]/20 px-3 py-1 text-xs font-semibold text-[#1A5C38]">
                  {user.isPlatformUser ? "Platform" : user.isRestaurantUser ? "Restaurant" : "Consumer"}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-sm text-black/65">
                <Stat label="Orders" value={user.orderCount} />
                <Stat label="Holds" value={user.holdCount} />
                <Stat label="Consent" value={user.consentCount} />
                <Stat label="Audit" value={user.auditCount} />
              </dl>
            </button>
          ))}
          {initialQuery.length < 2 ? (
            <p className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
              Enter a phone, email, or name fragment to search. The server returns at most 12 matching profiles.
            </p>
          ) : users.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
              No users matched that bounded search.
            </p>
          ) : null}
        </div>
      </section>

      <aside className="h-fit rounded-lg border border-black/10 bg-white p-5 shadow-sm lg:sticky lg:top-4">
        <h2 className="text-xl font-bold text-[#2D2D2D]">User detail</h2>
        {selected ? (
          <div className="mt-4 grid gap-4">
            <Detail label="Name" value={selected.displayName ?? "Not provided"} />
            <Detail label="Phone" value={canViewDirect ? selected.phone ?? "Not provided" : selected.maskedPhone} />
            <Detail label="Email" value={canViewDirect ? selected.email ?? "Not provided" : selected.maskedEmail} />
            <Detail label="Auth provider summary" value={selected.email ? "Email/Google possible; verify Supabase provider config before relying on OAuth." : "Phone OTP primary"} />
            <Detail label="Profile roles" value={[selected.isConsumer && "Consumer", selected.isRestaurantUser && "Restaurant", selected.isPlatformUser && "Platform"].filter(Boolean).join(", ")} />
            <Detail label="Swaad Club" value="No active entitlement surfaced in this slice." />
            <Detail label="Notifications" value={`${selected.notificationCount} transactional rows tied to this profile`} />
            <Detail label="Last seen" value={selected.lastSeenAt ? new Date(selected.lastSeenAt).toLocaleString("en-IN") : "No recent activity"} />
            <div className="rounded-lg border border-[#D4A017]/40 bg-[#FFF8F0] p-3 text-sm text-black/70">
              Mutations are intentionally deferred here. Suspend/reactivate, export, or contact-issue reset should be added only with reasoned server routes and audit rows.
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-black/60">Select a search result to inspect one support-safe profile.</p>
        )}
      </aside>
    </div>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-black/45">{label}</dt>
      <dd className="mt-1 font-bold text-[#2D2D2D]">{value}</dd>
    </div>
  );
}

function Detail({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg bg-black/[0.03] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/45">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#2D2D2D]">{value || "Not available"}</p>
    </div>
  );
}
