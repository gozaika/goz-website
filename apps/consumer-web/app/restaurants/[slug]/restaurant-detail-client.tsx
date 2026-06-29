"use client";

import { DietaryBadge, DropCard } from "@gozaika/ui";
import type { PublicRestaurantProfile, PublicReview, ReviewsPayload } from "@gozaika/types";
import { cuisineCoverKey, formatCountdown, formatPaise, ratingLabel } from "@gozaika/utils";
import { useEffect, useRef, useState } from "react";
import { Flag, Heart, MapPin, Star } from "lucide-react";

type Tab = "overview" | "active-drops" | "history" | "reviews" | "location";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",     label: "Overview" },
  { id: "active-drops", label: "Active Drops" },
  { id: "history",      label: "Drop History" },
  { id: "reviews",      label: "Reviews" },
  { id: "location",     label: "Location" },
];

function FollowButton({
  restaurantPk,
  initialFollowing,
  initialFollowerCount,
}: {
  readonly restaurantPk: string;
  readonly initialFollowing: boolean;
  readonly initialFollowerCount: number;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/follows", {
        method: following ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ restaurantPk }),
      });
      const json = await res.json();
      if (res.status === 401) {
        window.location.href = "/auth/login";
        return;
      }
      if (json.ok) {
        setFollowing(json.data.following as boolean);
        setFollowerCount(json.data.followerCount as number);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      aria-label={following ? "Unfollow this restaurant" : "Follow this restaurant"}
      className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
        following
          ? "border-white/40 bg-white/10 text-white hover:bg-white/20"
          : "border-[#D4A017] bg-[#D4A017] text-[#2D2D2D] hover:bg-[#c2920f]"
      }`}
    >
      <Heart size={13} className={following ? "fill-white text-white" : "fill-[#2D2D2D] text-[#2D2D2D]"} />
      {following ? "Following" : "Follow"}
      <span className="opacity-70">· {followerCount}</span>
    </button>
  );
}

function StarRow({ value }: { readonly value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= Math.round(value) ? "fill-[#D4A017] text-[#D4A017]" : "fill-black/10 text-black/10"}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { readonly review: PublicReview }) {
  const [expanded, setExpanded] = useState(false);
  const label = ratingLabel(review.ratingValue);
  const date = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(review.createdAt));

  return (
    <article className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#2D2D2D]">{review.ratingValue}/5</span>
            <span className="text-sm text-[#2D2D2D]/60">{label}</span>
            <StarRow value={review.ratingValue} />
          </div>
          <p className="mt-1 text-xs text-[#2D2D2D]/60">
            {review.reviewerDisplayName}
            {review.orderDietaryCode ? ` · ${review.orderDietaryCode.replace("_", "-")} order` : ""}
            {" · "}{date}
          </p>
        </div>
        <button
          type="button"
          aria-label="Report review"
          className="rounded p-1 text-[#2D2D2D]/30 hover:text-red-500 transition"
        >
          <Flag size={14} />
        </button>
      </div>

      {review.reviewText && (
        <div className="mt-3">
          <p className={`text-sm text-[#2D2D2D]/80 leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}>
            {review.reviewText}
          </p>
          {(review.reviewText?.length ?? 0) > 160 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 text-xs font-semibold text-[#1A5C38]"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {review.bagDisplayName && (
        <p className="mt-3 text-xs text-[#2D2D2D]/50">
          BAM Bag: {review.bagDisplayName} · Verified order ⓘ
        </p>
      )}
    </article>
  );
}

function ReviewsSection({ restaurantSlug }: { readonly restaurantSlug: string }) {
  const [payload, setPayload] = useState<ReviewsPayload | null>(null);
  const [sort, setSort] = useState("recent");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const currentKey = `${restaurantSlug}:${sort}`;
  // Loading is derived: while the latest fetched key trails the current one,
  // a request is in flight. Avoids calling setState synchronously in the effect.
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/restaurants/${restaurantSlug}/reviews?limit=10&sort=${sort}`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.ok) setPayload(json.data as ReviewsPayload); })
      .finally(() => { if (!cancelled) setLoadedKey(currentKey); });
    return () => { cancelled = true; };
  }, [restaurantSlug, sort, currentKey]);

  if (loading) return <p className="py-4 text-sm text-[#2D2D2D]/60">Loading reviews…</p>;

  if (!payload || payload.ratingCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#1A5C38]/20 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#2D2D2D]">Be the first to review</p>
        <p className="mt-1 text-xs text-[#2D2D2D]/60">Order a BAM Bag and share your experience.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Aggregate header */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <span className="text-4xl font-black text-[#1A5C38]">
            {payload.averageRating?.toFixed(1) ?? "—"}/5
          </span>
          {payload.averageRating != null && (
            <span className="ml-2 text-sm font-semibold text-[#2D2D2D]/70">{ratingLabel(payload.averageRating)}</span>
          )}
        </div>
        <div>
          <p className="text-sm text-[#2D2D2D]/60" title="From verified BAM Bag orders only">
            {payload.ratingCount} verified review{payload.ratingCount !== 1 ? "s" : ""} ⓘ
          </p>
        </div>
      </div>

      {/* Category bars */}
      {Object.entries(payload.categoryAverages).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(payload.categoryAverages).map(([key, val]) => (
            <div key={key}>
              <div className="flex items-center justify-between text-xs text-[#2D2D2D]/70">
                <span className="capitalize">{key.replace(/_/g, " ")}</span>
                <span className="font-semibold">{(val as number).toFixed(1)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-1.5 rounded-full bg-[#1A5C38]"
                  style={{ width: `${((val as number) / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sort bar */}
      <div className="flex flex-wrap items-center gap-2">
        {["recent", "relevant", "highest", "lowest"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              sort === s ? "border-[#1A5C38] bg-[#1A5C38] text-white" : "border-black/15 text-[#2D2D2D]/70"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Review cards */}
      <div className="grid gap-3">
        {payload.reviews.map((r) => <ReviewCard key={r.reviewPk} review={r} />)}
      </div>
    </div>
  );
}

export function RestaurantDetailClient({
  restaurant,
  initialFollowing,
}: {
  readonly restaurant: PublicRestaurantProfile;
  readonly initialFollowing: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [now, setNow] = useState(new Date());
  const contentRef = useRef<HTMLDivElement>(null);

  // Live countdown tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const firstActiveDrop = restaurant.activeDrops[0];
  const closingIn = firstActiveDrop
    ? formatCountdown(firstActiveDrop.pickupEndAt, now)
    : null;

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {/* Photo strip / hero — cuisine art behind a forest overlay (keeps white text AA-readable) */}
      <section className="relative overflow-hidden px-4 py-12">
        <img
          src={`/art/cover-${cuisineCoverKey(restaurant.restaurantName, restaurant.cuisineTags) ?? "biryani"}.svg`}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A5C38]/92 to-[#0F3D25]/96" />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#D4A017]">
                {restaurant.neighborhoodName ?? restaurant.cityName ?? "goZaika partner"}
              </p>
              <h1 className="mt-2 text-4xl font-black text-white lg:text-5xl">{restaurant.restaurantName}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {restaurant.averageRating != null && restaurant.ratingCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <StarRow value={restaurant.averageRating} />
                    <span className="text-sm text-white/80">
                      {restaurant.averageRating.toFixed(1)} · {restaurant.ratingCount} review{restaurant.ratingCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => switchTab("reviews")}
                  className="text-xs font-semibold text-[#D4A017] hover:underline"
                >
                  See reviews
                </button>
                <FollowButton
                  restaurantPk={restaurant.restaurantPk}
                  initialFollowing={initialFollowing}
                  initialFollowerCount={restaurant.followerCount}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key info bar */}
      <div className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-3 overflow-x-auto px-4 py-3">
          {restaurant.neighborhoodName && (
            <span className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-xs text-[#2D2D2D]/70">
              <MapPin size={12} /> {restaurant.neighborhoodName}, Hyderabad
            </span>
          )}
          {restaurant.cuisineTags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full border border-black/10 px-3 py-1 text-xs text-[#2D2D2D]/70">
              🍽️ {tag}
            </span>
          ))}
          {closingIn && (
            <span className="flex items-center gap-1.5 rounded-full border border-[#FF6B35]/30 bg-[#FFF8F0] px-3 py-1 text-xs font-semibold text-[#FF6B35]">
              🕐 Next pickup closes in {closingIn}
            </span>
          )}
          {restaurant.dietaryTags.slice(0, 2).map((tag) => (
            <DietaryBadge key={tag} code={tag} />
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-16 z-10 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#1A5C38] text-[#1A5C38]"
                  : "border-transparent text-[#2D2D2D]/60 hover:text-[#2D2D2D]"
              }`}
            >
              {tab.label}
              {tab.id === "active-drops" && restaurant.activeDropCount > 0 && (
                <span className="ml-1.5 rounded-full bg-[#FF6B35] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {restaurant.activeDropCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column body */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_320px]">
        {/* Left column — tab content */}
        <div ref={contentRef} className="min-w-0">

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="grid gap-6">
              {restaurant.storyMarkdown ? (
                <section>
                  <h2 className="text-xl font-bold text-[#2D2D2D]">About {restaurant.restaurantName}</h2>
                  <p className="mt-3 leading-7 text-[#2D2D2D]/80">{restaurant.storyMarkdown}</p>
                </section>
              ) : (
                <section>
                  <h2 className="text-xl font-bold text-[#2D2D2D]">About {restaurant.restaurantName}</h2>
                  <p className="mt-3 leading-7 text-[#2D2D2D]/75">
                    Chef-curated BAM Bags with full allergen disclosure and pickup-only trust.
                    Check active drops for today&apos;s selection.
                  </p>
                </section>
              )}

              {/* Pickup policy */}
              <div className="rounded-lg border border-[#1A5C38]/30 bg-[#F0F9F4] p-4">
                <h3 className="text-sm font-bold text-[#1A5C38]">Pickup policy</h3>
                <p className="mt-2 text-sm leading-6 text-[#2D2D2D]/75">
                  {restaurant.pickupInstructions ??
                    "Pickup instructions appear on drop detail and confirmed order screens. Show QR code or 6-digit OTP at the counter."}
                </p>
              </div>

              {/* How BAM Bags work (collapsed on mobile) */}
              <details className="rounded-lg border border-black/10 bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-[#2D2D2D]">
                  How BAM Bags work
                </summary>
                <ol className="grid gap-3 px-4 pb-4 pt-2 text-sm text-[#2D2D2D]/75">
                  {["Discover drops from this restaurant", "Pay online — allergens always shown before checkout", "Show QR or OTP at pickup counter"].map((step, i) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1A5C38] text-[10px] font-black text-white">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </details>
            </div>
          )}

          {/* Active Drops tab */}
          {activeTab === "active-drops" && (
            <div className="grid gap-4">
              {restaurant.activeDropCount > 0 && closingIn && (
                <div className="rounded-lg border border-[#FF6B35]/30 bg-[#FFF8F0] px-4 py-3">
                  <p className="text-sm font-semibold text-[#FF6B35]" aria-live="polite">
                    Pickup closes in <span className="tabular-nums">{closingIn}</span>
                  </p>
                </div>
              )}
              {restaurant.activeDrops.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#1A5C38]/20 bg-white p-8 text-center">
                  <p className="text-sm font-semibold text-[#2D2D2D]">No active drops right now</p>
                  <p className="mt-1 text-xs text-[#2D2D2D]/60">Follow this restaurant for alerts.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {restaurant.activeDrops.map((drop) => (
                    <DropCard key={drop.dropPk} drop={drop} now={now} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drop History tab */}
          {activeTab === "history" && (
            <div className="grid gap-3">
              <h2 className="text-xl font-bold text-[#2D2D2D]">Drop history</h2>
              {restaurant.pastDrops.length === 0 ? (
                <p className="rounded-lg border border-dashed border-black/15 bg-white p-4 text-sm text-[#2D2D2D]/65">
                  Past public drops appear here after pickup windows close.
                </p>
              ) : (
                restaurant.pastDrops.map((drop) => (
                  <article key={drop.dropPk} className="rounded-lg border border-black/10 bg-white p-4 opacity-80">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#2D2D2D]">{drop.bagDisplayName}</p>
                        <p className="mt-0.5 text-xs text-[#2D2D2D]/55">
                          {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(drop.pickupStartAt))}
                        </p>
                      </div>
                      <DietaryBadge code={drop.dietaryCategoryCode} />
                    </div>
                    {/* Sell-through ratio bar */}
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                        <div
                          className="h-1.5 rounded-full bg-[#1A5C38]"
                          style={{
                            width: drop.quantityTotal > 0
                              ? `${Math.round(((drop.quantityTotal - drop.quantityAvailable) / drop.quantityTotal) * 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-[#2D2D2D]/45">
                        {drop.quantityTotal - drop.quantityAvailable}/{drop.quantityTotal} claimed
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            <ReviewsSection restaurantSlug={restaurant.restaurantSlug} />
          )}

          {/* Location tab */}
          {activeTab === "location" && (
            <div className="grid gap-4">
              <h2 className="text-xl font-bold text-[#2D2D2D]">Pickup location</h2>
              {restaurant.latitude != null && restaurant.longitude != null ? (
                <div className="overflow-hidden rounded-lg border border-black/10">
                  <iframe
                    title={`Map for ${restaurant.restaurantName}`}
                    width="100%"
                    height="400"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}&z=16&output=embed`}
                  />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-black/15 bg-white">
                  <p className="text-sm text-[#2D2D2D]/50">Location not set by restaurant</p>
                </div>
              )}
              {restaurant.pickupInstructions && (
                <p className="rounded-lg border border-[#1A5C38]/20 bg-[#F0F9F4] p-4 text-sm text-[#2D2D2D]/80">
                  {restaurant.pickupInstructions}
                </p>
              )}
              {restaurant.latitude != null && restaurant.longitude != null && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#1A5C38] px-4 py-2 text-sm font-semibold text-[#1A5C38] transition hover:bg-[#1A5C38]/10"
                >
                  Get directions →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right column — claim panel (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-xl border border-[#1A5C38]/25 bg-white p-5 shadow-sm">
            {restaurant.activeDrops.length === 0 ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-[#2D2D2D]/60">No active drops right now</p>
                <p className="mt-1 text-xs text-[#2D2D2D]/45">Check back when the next Chef&apos;s Selection goes live.</p>
              </div>
            ) : (
              <>
                <p className="flex items-center gap-1.5 text-sm font-bold text-[#1A5C38]">
                  <span className="h-2 w-2 rounded-full bg-[#1A5C38]" />
                  {restaurant.activeDropCount} Active Drop{restaurant.activeDropCount !== 1 ? "s" : ""} Now
                </p>
                <div className="mt-3 grid gap-3">
                  {restaurant.activeDrops.slice(0, 3).map((drop) => (
                    <div key={drop.dropPk} className="rounded-lg bg-[#FFF8F0] p-3">
                      <p className="text-sm font-bold text-[#2D2D2D]">{drop.bagDisplayName}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-base font-black text-[#2D2D2D]">{formatPaise(drop.pricePaise)}</span>
                        <DietaryBadge code={drop.dietaryCategoryCode} />
                      </div>
                      {closingIn && (
                        <p className="mt-1 text-[10px] font-semibold text-[#FF6B35]" aria-live="polite">
                          Closes in {closingIn}
                        </p>
                      )}
                      <a
                        href={`/drops/${drop.dropPk}?claim=1`}
                        className="mt-3 flex min-h-10 items-center justify-center rounded-lg bg-[#FF6B35] text-sm font-bold text-white transition hover:bg-[#e85f2f]"
                      >
                        Claim This Drop
                      </a>
                    </div>
                  ))}
                  {restaurant.activeDropCount > 3 && (
                    <button
                      type="button"
                      onClick={() => switchTab("active-drops")}
                      className="text-xs font-semibold text-[#1A5C38] hover:underline"
                    >
                      View all {restaurant.activeDropCount} drops →
                    </button>
                  )}
                </div>
              </>
            )}

            {restaurant.averageRating != null && restaurant.ratingCount > 0 && (
              <div className="mt-4 border-t border-black/10 pt-4 text-xs text-[#2D2D2D]/60">
                <div className="flex items-center gap-1.5">
                  <StarRow value={restaurant.averageRating} />
                  <span>{restaurant.averageRating.toFixed(1)}/5 · {restaurant.ratingCount} review{restaurant.ratingCount !== 1 ? "s" : ""}</span>
                </div>
                <p className="mt-1">All reviews from verified BAM Bag orders ✅</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile sticky bottom claim bar */}
      {restaurant.activeDrops.length > 0 && firstActiveDrop && (
        <div className="sticky bottom-0 z-20 border-t border-black/10 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#2D2D2D]">{firstActiveDrop.bagDisplayName}</p>
              <p className="text-xs text-[#2D2D2D]/60">{formatPaise(firstActiveDrop.pricePaise)}</p>
            </div>
            <a
              href={`/drops/${firstActiveDrop.dropPk}?claim=1`}
              className="shrink-0 rounded-full bg-[#FF6B35] px-5 py-2.5 text-sm font-bold text-white"
            >
              Claim Drop
            </a>
          </div>
        </div>
      )}
    </>
  );
}
