"use client";

import { BarChart3, Calculator, ClipboardList, FileCheck2, HelpCircle, Home, Landmark, LayoutDashboard, PackagePlus, ReceiptText, ShieldCheck, Star, Store, Utensils } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { RestaurantSwitcherIsland, type PortalSwitcherRestaurant } from "./restaurant-switcher-island";

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
      ["Planner", "/portal/planner", Calculator],
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

// The single active nav item is the one whose href is the LONGEST prefix of the
// current path. This stops "/portal/drops" from also lighting up on
// "/portal/drops/new" (which is its own, more-specific nav item).
const NAV_HREFS = groups.flatMap((group) => group.links.map(([, href]) => href));

function activeNavHref(pathname: string): string | null {
  return (
    NAV_HREFS.filter((href) => pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.length - a.length)[0] ?? null
  );
}

export function PortalNav() {
  const pathname = usePathname();
  const activeHref = activeNavHref(pathname);

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Restaurant portal">
      {groups.flatMap((group) =>
        group.links.map(([label, href, Icon]) => {
          const active = href === activeHref;
          return (
            <a
              key={href}
              href={href}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                active
                  ? "border-forest bg-success-soft text-forest"
                  : "border-forest/20 text-forest hover:border-forest hover:bg-success-soft"
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
  switcherRestaurants,
  selectedRestaurantPk,
}: {
  readonly children: ReactNode;
  readonly restaurantName?: string;
  readonly statusCode?: string;
  readonly switcherRestaurants?: readonly PortalSwitcherRestaurant[];
  readonly selectedRestaurantPk?: string | null;
}) {
  const pathname = usePathname();
  const activeHref = activeNavHref(pathname);

  return (
    <main className="min-h-screen bg-cream lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-hairline bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cream text-saffron-text">
              <ShieldCheck aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">goZaika Partner</p>
              <p className="max-w-[180px] truncate font-bold text-charcoal">{restaurantName ?? "Restaurant portal"}</p>
            </div>
          </div>
          {statusCode ? (
            <span className="rounded-full border border-forest/20 px-3 py-1 text-xs font-semibold text-forest">
              {statusCode}
            </span>
          ) : null}
        </div>

        {switcherRestaurants ? (
          <RestaurantSwitcherIsland restaurants={switcherRestaurants} selectedId={selectedRestaurantPk} />
        ) : null}

        {/* Mobile: horizontal scroll grouped nav */}
        <nav
          className="flex gap-4 overflow-x-auto px-4 pb-4 lg:hidden"
          aria-label="Restaurant portal"
        >
          {groups.map((group) => (
            <div key={group.label} className="shrink-0">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                {group.label}
              </p>
              <div className="flex gap-1.5">
                {group.links.map(([label, href, Icon]) => {
                  const active = href === activeHref;
                  return (
                    <a
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                        active ? "bg-forest text-white" : "border border-hairline bg-white text-muted hover:border-forest/30 hover:text-forest"
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
              <p className="mb-1.5 px-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                {group.label}
              </p>
              <div className="grid gap-0.5">
                {group.links.map(([label, href, Icon]) => {
                  const active = href === activeHref;
                  return (
                    <a
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                        active ? "bg-forest text-white" : "text-muted hover:bg-success-soft hover:text-forest"
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
            className="flex items-center gap-2 rounded-lg border border-gold/40 bg-cream p-3 text-sm font-semibold text-charcoal"
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
