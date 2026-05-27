import Link from "next/link";

export function ConsumerFooter() {
  return (
    <footer className="border-t border-black/10 bg-white" aria-label="Site footer">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-bold text-[#2D2D2D]">goZaika</p>
            <p className="mt-2 text-sm leading-6 text-[#2D2D2D]/65">
              Chef-curated BAM Bags, pickup-only, Hyderabad first.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2D2D2D]/45">Discover</p>
            <ul className="mt-3 grid gap-2 text-sm" role="list">
              <li><Link href="/drops" className="text-[#2D2D2D]/70 hover:text-[#1A5C38]">Browse drops</Link></li>
              <li><Link href="/restaurants" className="text-[#2D2D2D]/70 hover:text-[#1A5C38]">Restaurants</Link></li>
              <li><Link href="/swaad-club" className="text-[#2D2D2D]/70 hover:text-[#1A5C38]">Swaad Club</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2D2D2D]/45">Account</p>
            <ul className="mt-3 grid gap-2 text-sm" role="list">
              <li><Link href="/account" className="text-[#2D2D2D]/70 hover:text-[#1A5C38]">Your account</Link></li>
              <li><Link href="/auth/login" className="text-[#2D2D2D]/70 hover:text-[#1A5C38]">Sign in</Link></li>
              <li>
                <a href="mailto:support@gozaika.in" className="text-[#2D2D2D]/70 hover:text-[#1A5C38]">
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 text-xs text-[#2D2D2D]/45">
          <p>© 2026 goZaika. Hyderabad pilot.</p>
          <p>Allergen disclosures are provided by restaurant partners. Verify before claiming.</p>
        </div>
      </div>
    </footer>
  );
}
