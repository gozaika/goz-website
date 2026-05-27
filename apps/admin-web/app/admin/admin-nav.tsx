"use client";

import { ShellHeader } from "@gozaika/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { readonly href: string; readonly label: string; readonly exact?: boolean };

const navLinks: NavLink[] = [
  { href: "/admin", label: "Home", exact: true },
  { href: "/admin/ops", label: "Ops" },
  { href: "/admin/restaurants/onboarding", label: "Onboarding" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/drops", label: "Drops" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/reports", label: "Reports" },
];

export function AdminNavHeader() {
  const pathname = usePathname();

  return (
    <ShellHeader>
      <nav
        className="flex flex-wrap items-center gap-0.5 text-sm font-semibold"
        aria-label="Admin navigation"
      >
        {navLinks.map(({ href, label, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-9 items-center rounded-md px-3 transition-colors ${
                active
                  ? "bg-[#1A5C38]/10 text-[#1A5C38]"
                  : "text-[#2D2D2D]/65 hover:bg-black/5 hover:text-[#2D2D2D]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </ShellHeader>
  );
}
