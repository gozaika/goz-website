import Link from "next/link";
import { DropCard, EmptyState, FoodStoryCard, ShellHeader } from "@gozaika/ui";
import { loadPublicDrops } from "@/lib/drops";
import { loadPublicRestaurants } from "@/lib/restaurants";
import { ConsumerNavLinks } from "./consumer-nav";
import { PassportHomeSection } from "./passport-home-section";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [drops, restaurants] = await Promise.all([loadPublicDrops(), loadPublicRestaurants()]);
  const now = new Date();
  const nowMs = now.getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  const activeDrops = drops.filter(
    (d) => ["ACTIVE", "SCHEDULED"].includes(d.statusCode) && Date.parse(d.pickupEndAt) > nowMs && d.quantityAvailable > 0,
  );
  const closingSoon = activeDrops
    .filter((d) => Date.parse(d.pickupEndAt) - nowMs < twoHoursMs)
    .sort((a, b) => Date.parse(a.pickupEndAt) - Date.parse(b.pickupEndAt))
    .slice(0, 4);
  const liveNow = activeDrops.slice(0, 6);

  // Missed drops: closed in last 24h, quantity was available (sold out or just closed)
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const missedDrops = drops
    .filter(
      (d) =>
        ["SOLD_OUT", "PICKUP_CLOSED", "ACTIVE", "PAUSED"].includes(d.statusCode) &&
        Date.parse(d.pickupEndAt) <= nowMs &&
        Date.parse(d.pickupEndAt) > nowMs - twentyFourHoursMs,
    )
    .slice(0, 4);

  // New to goZaika: first 5 unique restaurants not in active drops (alphabetically)
  const activeRestaurantSlugs = new Set(liveNow.map((d) => d.restaurantSlug));
  const newRestaurants = restaurants
    .filter((r) => !activeRestaurantSlugs.has(r.restaurantSlug) && r.totalDropCount === 0)
    .slice(0, 4);

  // Your Kitchens: unique restaurant set from all drops (most active first)
  const yourKitchens = restaurants
    .filter((r) => r.totalDropCount > 0)
    .sort((a, b) => b.totalDropCount - a.totalDropCount)
    .slice(0, 6);

  // Food story cards from neighbourhood activity
  let foodStories: { neighbourhoodName: string; storyLine: string; activeDropCount: number; neighbourhoodCode: string }[] = [];
  try {
    const statsRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/discovery/cuisine-stats`, { cache: "no-store" }).catch(() => null);
    if (statsRes?.ok) {
      const statsJson = (await statsRes.json()) as { ok: boolean; data?: { neighbourhoodActivity: { neighbourhoodName: string; activeCuisineCount: number; activeDropCount: number }[] } };
      if (statsJson.ok && statsJson.data) {
        foodStories = statsJson.data.neighbourhoodActivity
          .filter((n) => n.activeCuisineCount >= 2)
          .sort((a, b) => b.activeDropCount - a.activeDropCount)
          .slice(0, 4)
          .map((n) => ({
            neighbourhoodName: n.neighbourhoodName,
            storyLine: `${n.activeCuisineCount} cuisine${n.activeCuisineCount !== 1 ? " types" : ""} dropping today — including something you might not have tried.`,
            activeDropCount: n.activeDropCount,
            neighbourhoodCode: n.neighbourhoodName.toUpperCase().replace(/\s+/g, "_"),
          }));
      }
    }
  } catch {
    // Food stories are non-critical; continue without them
  }

  return (
    <main id="main-content">
      <ShellHeader>
        <ConsumerNavLinks />
      </ShellHeader>

      {/* Hero */}
      <section className="bg-[#FFF8F0]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#1A5C38]">Launching in Hyderabad</p>
            <h1 className="mt-3 text-5xl font-bold leading-tight text-[#2D2D2D] md:text-6xl">
              Chef-curated BAM Bags, ready for pickup today.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[#2D2D2D]/75">
              Discover Limited Drops from Hyderabad kitchens. Search by restaurant, cuisine, dietary category, and pickup window with allergens visible before you claim.
            </p>
            <form action="/drops" className="mt-6 flex max-w-xl flex-col gap-3 rounded-lg border border-black/10 bg-white p-2 shadow-sm sm:flex-row">
              <input
                name="q"
                aria-label="Search BAM Bags"
                placeholder="Search biryani, veg, Jubilee Hills..."
                className="min-h-12 flex-1 rounded-md px-3 outline-none"
              />
              <button className="min-h-12 rounded-lg bg-[#FF6B35] px-5 font-semibold text-white">Search</button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Biryani", "Thali", "Dessert", "Snacks", "Chef's Selection"].map((chip) => (
                <Link key={chip} href="/drops" className="rounded-full border border-[#1A5C38]/20 bg-white px-3 py-2 text-sm font-semibold text-[#1A5C38]">
                  {chip}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-lg bg-[#FF6B35] px-5 py-3 font-semibold text-white" href="/drops">
                Browse drops
              </Link>
              <Link className="rounded-lg border border-[#1A5C38] px-5 py-3 font-semibold text-[#1A5C38]" href="/swaad-club">
                Swaad Club
              </Link>
            </div>
            <dl className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-white p-3">
                <dt className="font-semibold text-[#2D2D2D]/55">Active drops</dt>
                <dd className="mt-1 text-2xl font-bold text-[#2D2D2D]">{activeDrops.length}</dd>
              </div>
              <div className="rounded-lg bg-white p-3">
                <dt className="font-semibold text-[#2D2D2D]/55">Partners</dt>
                <dd className="mt-1 text-2xl font-bold text-[#2D2D2D]">{restaurants.length}</dd>
              </div>
              <div className="rounded-lg bg-white p-3">
                <dt className="font-semibold text-[#2D2D2D]/55">Pickup</dt>
                <dd className="mt-1 text-2xl font-bold text-[#2D2D2D]">HYD</dd>
              </div>
            </dl>
          </div>
          <div className="grid gap-4">
            {liveNow.slice(0, 3).length > 0 ? (
              liveNow.slice(0, 3).map((drop) => <DropCard key={drop.dropPk} drop={drop} now={now} />)
            ) : (
              <EmptyState title="First drops are being prepared" body="Approved Hyderabad partners will appear here as their BAM Bags go live." />
            )}
          </div>
        </div>
      </section>

      {/* Section 1 — Live Right Now */}
      {liveNow.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#1A5C38]" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#2D2D2D]">Live Right Now</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {liveNow.map((drop) => (
              <div key={drop.dropPk} className="w-72 shrink-0">
                <DropCard drop={drop} now={now} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2 — Closing Soon */}
      {closingSoon.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <h2 className="mb-4 text-xl font-bold text-[#2D2D2D]">Closing Soon</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {closingSoon.map((drop) => (
              <DropCard key={drop.dropPk} drop={drop} now={now} />
            ))}
          </div>
        </section>
      )}

      {/* What's happening in your city */}
      {foodStories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <div className="mb-4 flex items-center gap-2">
            <span aria-hidden="true">📍</span>
            <h2 className="text-xl font-bold text-[#2D2D2D]">What&apos;s happening in your city</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {foodStories.map((story) => (
              <FoodStoryCard
                key={story.neighbourhoodCode}
                neighbourhoodName={story.neighbourhoodName}
                storyLine={story.storyLine}
                activeDropCount={story.activeDropCount}
                neighbourhoodCode={story.neighbourhoodCode}
              />
            ))}
          </div>
        </section>
      )}

      {/* Missed Drops */}
      {missedDrops.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <h2 className="mb-4 text-xl font-bold text-[#2D2D2D]">Missed Drops</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {missedDrops.map((drop) => (
              <div key={drop.dropPk} className="relative">
                <DropCard drop={drop} now={now} />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                  <span className="rotate-[-15deg] rounded-lg border-4 border-[#B42318] px-3 py-1 text-xl font-black uppercase tracking-wider text-[#B42318] opacity-90">
                    Missed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Your Kitchens */}
      {yourKitchens.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#2D2D2D]">Active Kitchens</h2>
            <Link href="/restaurants" className="text-sm font-semibold text-[#1A5C38] hover:underline">
              See all →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {yourKitchens.map((r) => (
              <Link
                key={r.restaurantSlug}
                href={`/restaurants/${r.restaurantSlug}`}
                className="shrink-0 w-40 rounded-xl border border-black/10 bg-white p-3 hover:border-[#1A5C38]/30 transition"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A5C38]/10 text-xl font-black text-[#1A5C38]">
                  {r.restaurantName.charAt(0)}
                </div>
                <p className="mt-2 text-xs font-bold text-[#2D2D2D] line-clamp-2">{r.restaurantName}</p>
                <p className="mt-0.5 text-[10px] text-[#2D2D2D]/50">{r.totalDropCount} drop{r.totalDropCount !== 1 ? "s" : ""}</p>
                {r.activeDropCount > 0 && (
                  <span className="mt-1.5 inline-block rounded-full bg-[#FF6B35] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {r.activeDropCount} live
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New to goZaika */}
      {newRestaurants.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <h2 className="mb-4 text-xl font-bold text-[#2D2D2D]">New to goZaika</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {newRestaurants.map((r) => (
              <Link
                key={r.restaurantSlug}
                href={`/restaurants/${r.restaurantSlug}`}
                className="flex items-center gap-3 rounded-xl border border-[#D4A017]/25 bg-[#FFFDF5] p-4 hover:border-[#D4A017]/50 transition"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D4A017]/15 text-lg font-black text-[#D4A017]">
                  {r.restaurantName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#2D2D2D]">{r.restaurantName}</p>
                  <p className="text-xs text-[#2D2D2D]/50">{r.neighborhoodName ?? r.cityName ?? "Hyderabad"} · New</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Passport Progress */}
      <PassportHomeSection />

      {/* Discover restaurants */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <h2 className="text-2xl font-bold text-[#2D2D2D]">Discover kitchens</h2>
          <p className="mt-2 text-sm text-[#2D2D2D]/70">
            Browse partner identity, cuisine signals, active drops, and safe disclosure reminders.
          </p>
          <Link
            href="/restaurants"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#1A5C38]/25 px-4 text-sm font-semibold text-[#1A5C38]"
          >
            Explore restaurants
          </Link>
        </div>
      </section>
    </main>
  );
}
