"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/drops", label: "Drops" },
  { href: "/restaurants", label: "Restaurants" },
  { href: "/swaad-club", label: "Swaad Club" },
  { href: "/account", label: "Account" },
] as const;

export function ConsumerNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 text-sm font-semibold" aria-label="Main navigation">
      {navLinks.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-md px-3 transition-colors ${
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
  );
}
