import Link from "next/link";

export function ConsumerFooter() {
  return (
    <footer className="border-t border-black/10 bg-white" aria-label="Site footer">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-bold text-charcoal">goZaika</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Chef-curated BAM Bags, pickup-only, Hyderabad first.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Discover</p>
            <ul className="mt-3 grid gap-2 text-sm" role="list">
              <li><Link href="/drops" className="text-muted hover:text-forest">Browse drops</Link></li>
              <li><Link href="/restaurants" className="text-muted hover:text-forest">Restaurants</Link></li>
              <li><Link href="/swaad-club" className="text-muted hover:text-forest">Swaad Club</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Account</p>
            <ul className="mt-3 grid gap-2 text-sm" role="list">
              <li><Link href="/account" className="text-muted hover:text-forest">Your account</Link></li>
              <li><Link href="/auth/login" className="text-muted hover:text-forest">Sign in</Link></li>
              <li>
                <a href="mailto:support@gozaika.in" className="text-muted hover:text-forest">
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 text-xs text-muted">
          <p>© 2026 goZaika. Hyderabad pilot.</p>
          <p>Allergen disclosures are provided by restaurant partners. Verify before claiming.</p>
        </div>
      </div>
    </footer>
  );
}
