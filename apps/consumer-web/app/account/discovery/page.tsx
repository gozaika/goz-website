"use client";

import { CuisinePassport, ShellHeader } from "@gozaika/ui";
import type { DiscoveryProfile } from "@gozaika/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConsumerNavLinks } from "../../consumer-nav";

export default function DiscoveryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DiscoveryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetch("/api/account/discovery-profile")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setProfile(json.data as DiscoveryProfile);
        else setError(json.error ?? "Could not load discovery profile.");
      })
      .catch(() => setError("Could not load discovery profile."))
      .finally(() => setLoading(false));
  }, []);

  function handleCuisineClick(cuisineCode: string, tried: boolean) {
    if (!tried) {
      router.push(`/drops?cuisine=${cuisineCode}`);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const res = await fetch("/api/discovery/share-card");
      if (!res.ok) throw new Error("Share card unavailable");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gozaika-flavour-passport.svg";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate share card.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <main>
      <ShellHeader>
        <ConsumerNavLinks />
      </ShellHeader>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
          <Link href="/account" className="hover:text-forest">Account</Link>
          <span>/</span>
          <span className="font-semibold text-charcoal">Flavour Passport</span>
        </nav>

        {loading && (
          <div className="rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-muted">
            Loading your Flavour Passport…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error} — <Link href="/auth/login?next=/account/discovery" className="font-semibold underline">Sign in</Link> to see your passport.
          </div>
        )}

        {profile && !loading && (
          <div className="grid gap-6">
            {/* Score hero */}
            <div className="rounded-xl border border-forest/20 bg-success-soft p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-forest">Flavour Diversity Score</p>
              <p className="mt-2 text-6xl font-black text-forest">{profile.flavourDiversityScore}</p>
              <p className="mt-1 text-sm font-semibold text-gold-text">{profile.flavourPersonalityLabel}</p>
              <p className="mt-1 text-xs text-muted">
                {profile.triedCuisines.length} of {profile.totalAvailableCuisines} cuisines explored ·{" "}
                {profile.triedNeighbourhoods.length} of {profile.totalActiveNeighbourhoods} neighbourhoods visited
              </p>
            </div>

            {/* Cuisine passport */}
            <CuisinePassport
              triedCuisines={profile.triedCuisines}
              untriedCuisines={profile.untriedCuisines}
              score={profile.flavourDiversityScore}
              personalityLabel={profile.flavourPersonalityLabel}
              onCuisineClick={handleCuisineClick}
            />

            {/* Untried CTAs */}
            {profile.untriedCuisines.filter((c) => c.activeDropCount > 0).length > 0 && (
              <section className="rounded-xl border border-saffron/20 bg-cream p-5">
                <h2 className="text-sm font-bold text-charcoal">Untried cuisines with active drops today</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.untriedCuisines
                    .filter((c) => c.activeDropCount > 0)
                    .slice(0, 8)
                    .map((c) => (
                      <Link
                        key={c.cuisineCode}
                        href={`/drops?cuisine=${c.cuisineCode}`}
                        className="flex items-center gap-1.5 rounded-full border border-saffron/40 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal transition hover:bg-saffron/10"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-saffron" />
                        {c.cuisineName.replace(/_/g, " ")} ({c.activeDropCount})
                      </Link>
                    ))}
                </div>
              </section>
            )}

            {/* Neighbourhood explorer */}
            {profile.triedNeighbourhoods.length > 0 && (
              <section className="rounded-xl border border-black/10 bg-white p-5">
                <h2 className="text-sm font-bold text-charcoal">Neighbourhoods explored</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.triedNeighbourhoods.map((n) => (
                    <span
                      key={n.neighbourhoodCode}
                      className="rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest"
                    >
                      {n.neighbourhoodName} ({n.bagCount})
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-forest px-5 py-3 text-sm font-bold text-forest transition hover:bg-forest/10 disabled:opacity-60"
            >
              {sharing ? "Generating…" : "Share your Flavour Passport"}
            </button>

            <Link
              href="/account/passport"
              className="text-center text-sm font-semibold text-forest hover:underline"
            >
              View Zayka Passport & tier progress →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
