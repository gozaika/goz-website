"use client";

import { BarChart3, ClipboardList, FileCheck2, HelpCircle, Home, Landmark, LayoutDashboard, PackagePlus, ReceiptText, ShieldCheck, Star, Store, Utensils } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const groups = [
  {
    label: "Operate",
    links: [
      ["Dashboard", "/portal/dashboard", LayoutDashboard],
      ["Drops", "/portal/drops", ClipboardList],
      ["New drop", "/portal/drops/new", PackagePlus],
      ["Orders", "/portal/orders", ReceiptText],
    ],
  },
  {
    label: "Build",
    links: [
      ["Templates", "/portal/templates", Utensils],
      ["Reports", "/portal/reports", BarChart3],
      ["Finance", "/portal/finance", Landmark],
    ],
  },
  {
    label: "Trust",
    links: [
      ["Onboarding", "/portal/onboarding", Home],
      ["Compliance", "/portal/compliance", FileCheck2],
      ["Profile", "/portal/profile", Store],
      ["Reviews", "/portal/reviews", Star],
    ],
  },
] as const;

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Restaurant portal">
      {groups.flatMap((group) =>
        group.links.map(([label, href, Icon]) => {
          const active = pathname === href || (href !== "/portal/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <a
              key={href}
              href={href}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                active
                  ? "border-[#1A5C38] bg-[#F2F8EF] text-[#1A5C38]"
                  : "border-[#1A5C38]/20 text-[#1A5C38] hover:border-[#1A5C38] hover:bg-[#EAF3DE]"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </a>
          );
        }),
      )}
    </nav>
  );
}

export function PortalChrome({
  children,
  restaurantName,
  statusCode,
}: {
  readonly children: ReactNode;
  readonly restaurantName?: string;
  readonly statusCode?: string;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#FAFAF8] lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-black/10 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#FFF8F0] text-[#FF6B35]">
              <ShieldCheck aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Zayka Pro</p>
              <p className="max-w-[180px] truncate font-bold text-[#2D2D2D]">{restaurantName ?? "Restaurant portal"}</p>
            </div>
          </div>
          {statusCode ? (
            <span className="rounded-full border border-[#1A5C38]/20 px-3 py-1 text-xs font-semibold text-[#1A5C38]">
              {statusCode}
            </span>
          ) : null}
        </div>

        {/* Mobile: horizontal scroll grouped nav */}
        <nav
          className="flex gap-4 overflow-x-auto px-4 pb-4 lg:hidden"
          aria-label="Restaurant portal"
        >
          {groups.map((group) => (
            <div key={group.label} className="shrink-0">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#2D2D2D]/40">
                {group.label}
              </p>
              <div className="flex gap-1.5">
                {group.links.map(([label, href, Icon]) => {
                  const active = pathname === href || (href !== "/portal/dashboard" && pathname.startsWith(`${href}/`));
                  return (
                    <a
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                        active ? "bg-[#1A5C38] text-white" : "border border-black/10 bg-white text-[#2D2D2D]/70 hover:border-[#1A5C38]/30 hover:text-[#1A5C38]"
                      }`}
                    >
                      <Icon size={15} aria-hidden="true" />
                      <span>{label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Desktop: vertical grouped nav */}
        <nav className="hidden px-3 lg:grid lg:gap-5" aria-label="Restaurant portal">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#2D2D2D]/45">
                {group.label}
              </p>
              <div className="grid gap-0.5">
                {group.links.map(([label, href, Icon]) => {
                  const active = pathname === href || (href !== "/portal/dashboard" && pathname.startsWith(`${href}/`));
                  return (
                    <a
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                        active ? "bg-[#1A5C38] text-white" : "text-[#2D2D2D]/70 hover:bg-[#F2F8EF] hover:text-[#1A5C38]"
                      }`}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-4">
          <a
            href="mailto:partners@gozaika.in"
            className="flex items-center gap-2 rounded-lg border border-[#D4A017]/40 bg-[#FFF8F0] p-3 text-sm font-semibold text-[#2D2D2D]"
          >
            <HelpCircle size={18} aria-hidden="true" />
            Partner support
          </a>
        </div>
      </aside>
      <section className="min-w-0">{children}</section>
    </main>
  );
}
