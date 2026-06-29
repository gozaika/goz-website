"use client";

import { ZaykaPassportCard } from "@gozaika/ui";
import type { ZaykaPassportPayload } from "@gozaika/types";
import { ShellHeader } from "@gozaika/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ConsumerNavLinks } from "../../consumer-nav";

export default function PassportPage() {
  const [passport, setPassport] = useState<ZaykaPassportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/passport")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setPassport(json.data as ZaykaPassportPayload);
        else setError(json.error ?? "Could not load passport.");
      })
      .catch(() => setError("Could not load passport."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <ShellHeader>
        <ConsumerNavLinks />
      </ShellHeader>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <nav className="mb-6 flex items-center gap-2 text-sm text-charcoal/60">
          <Link href="/account" className="hover:text-forest">Account</Link>
          <span>/</span>
          <span className="font-semibold text-charcoal">Zayka Passport</span>
        </nav>

        {loading && (
          <div className="rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-charcoal/60">
            Loading your passport…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error} — <Link href="/auth/login?next=/account/passport" className="font-semibold underline">Sign in</Link>
          </div>
        )}

        {passport && !loading && (
          <div className="grid gap-6">
            <ZaykaPassportCard passport={passport} />

            {/* Tier benefits */}
            <section className="rounded-xl border border-black/10 bg-white p-5">
              <h2 className="text-base font-bold text-charcoal">Tier benefits</h2>
              <div className="mt-4 grid gap-3">
                {[
                  { tier: "BRONZE",   label: "Foodie Explorer",      perks: ["Standard access", "Standard pickup window"] },
                  { tier: "SILVER",   label: "Flavor Nomad",         perks: ["Early Access (30 min before public) on select drops"] },
                  { tier: "GOLD",     label: "Taste Connoisseur",    perks: ["Member-Only Drops (never public)", "Priority support"] },
                  { tier: "PLATINUM", label: "Culinary Ambassador",  perks: ["Concierge drops", "Featured on platform", "Beta features"] },
                ].map((t) => {
                  const isCurrent = t.tier === passport.stat.currentTierCode;
                  return (
                    <div
                      key={t.tier}
                      className={`rounded-lg border p-3 ${isCurrent ? "border-forest bg-success-soft" : "border-black/10 bg-[#FAFAFA]"}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold ${isCurrent ? "text-forest" : "text-charcoal"}`}>
                          {t.tier} — {t.label}
                        </p>
                        {isCurrent && <span className="text-xs font-semibold text-forest">Your tier</span>}
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {t.perks.map((perk) => (
                          <li key={perk} className="text-xs text-charcoal/65">· {perk}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>

            <Link
              href="/account/discovery"
              className="flex items-center justify-between rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm font-semibold text-gold-text transition hover:bg-gold/15"
            >
              <span>View your Flavour Passport →</span>
              <span className="text-xs text-gold-text">Boost your Discovery Score</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
