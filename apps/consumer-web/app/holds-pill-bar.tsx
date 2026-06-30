"use client";

import { Clock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Fixed, low-clutter reminder shown on every browsing screen while the signed-in
// customer has unpaid, time-limited holds. Taps through to /account, where the
// active holds + "Complete payment" CTA now sit at the top. Hidden on the pages
// where it would be redundant or collide with a bottom CTA (checkout, account,
// auth).
const HIDDEN_PREFIXES = ["/checkout", "/account", "/auth"];

export function HoldsPillBar({ count, expiresLabel }: { readonly count: number; readonly expiresLabel: string }) {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <Link
      href="/account"
      aria-label={`You have ${count} active ${count === 1 ? "hold" : "holds"}; earliest expires at ${expiresLabel}. Open your account to complete payment.`}
      className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit max-w-[92vw] items-center gap-2 rounded-full border border-saffron/50 bg-cream px-4 py-2.5 text-sm font-semibold text-charcoal shadow-lg transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
    >
      <Clock size={16} className="shrink-0 text-saffron-text" aria-hidden="true" />
      <span className="truncate">
        You have {count} {count === 1 ? "hold" : "holds"} · earliest expires {expiresLabel}
      </span>
      <span aria-hidden="true" className="shrink-0 font-bold text-forest">
        Pay →
      </span>
    </Link>
  );
}
