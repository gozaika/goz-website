"use client";

import { EmptyState, RestaurantCard } from "@gozaika/ui";
import type { PublicRestaurantProfile } from "@gozaika/types";
import { Filter, Map, LayoutGrid, Search, Star, X } from "lucide-react";
import { useMemo, useState } from "react";

// Simple map view — uses Google Maps Embed API; no npm package required
function MapView({
  restaurants,
  onClose,
}: {
  readonly restaurants: readonly PublicRestaurantProfile[];
  readonly onClose: () => void;
}) {
  // Snapshot the time once at mount — calling Date.now() during render is impure.
  const [now] = useState(() => Date.now());
  const twoHoursMs = 2 * 60 * 60 * 1000;

  // Restaurants with coordinates
  const located = restaurants.filter((r) => r.latitude != null && r.longitude != null);

  // Color-code: green = active not expiring, orange = expiring ≤2h, gray = no drops
  function pinColor(r: PublicRestaurantProfile) {
    if (r.activeDropCount === 0) return "gray";
    const expiringSoon = r.activeDrops.some(
      (d) => Date.parse(d.pickupEndAt) - now < twoHoursMs,
    );
    return expiringSoon ? "orange" : "green";
  }

  // Build a static maps URL for preview (no API key needed for embeds up to 640px)
  const centerLat = 17.385;
  const centerLng = 78.4867;
  const apiKey = typeof window !== "undefined" ? (window as Window & { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string }).NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : "";

  const embedSrc = apiKey
    ? `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${centerLat},${centerLng}&zoom=12`
    : null;

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#1A5C38]" />Active</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#FF6B35]" />Closing soon</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-black/25" />No drops</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold text-[#2D2D2D]/70 hover:border-black/30"
        >
          <X size={12} /> List view
        </button>
      </div>

      {located.length === 0 ? (
        <div className="flex h-[480px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/15 bg-white">
          <Map size={32} className="text-[#2D2D2D]/25" />
          <p className="text-sm text-[#2D2D2D]/50">No location data available for these restaurants</p>
          <p className="text-xs text-[#2D2D2D]/35">Restaurants set their coordinates via the partner portal.</p>
        </div>
      ) : embedSrc ? (
        <div className="overflow-hidden rounded-xl border border-black/10" style={{ height: 480 }}>
          <iframe
            title="Restaurant map"
            width="100%"
            height="480"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={embedSrc}
            className="rounded-xl"
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/10" style={{ height: 480 }}>
          <iframe
            title="Restaurant map"
            width="100%"
            height="480"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${centerLat},${centerLng}&z=12&output=embed`}
            className="rounded-xl"
          />
        </div>
      )}

      {/* Restaurant cards below map */}
      {located.length > 0 && (
        <div className="mt-4 grid gap-3">
          <p className="text-sm font-semibold text-[#2D2D2D]/60">{located.length} restaurant{located.length !== 1 ? "s" : ""} with location data</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {located.slice(0, 6).map((r) => {
              const color = pinColor(r);
              return (
                <a
                  key={r.restaurantSlug}
                  href={`/restaurants/${r.restaurantSlug}`}
                  className="flex items-center gap-3 rounded-lg border border-black/10 bg-white p-3 hover:border-[#1A5C38]/30 transition"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color === "green" ? "#1A5C38" : color === "orange" ? "#FF6B35" : "#9CA3AF" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#2D2D2D]">{r.restaurantName}</p>
                    <p className="text-xs text-[#2D2D2D]/55">{r.neighborhoodName ?? r.cityName ?? "Hyderabad"}</p>
                  </div>
                  {r.activeDropCount > 0 && (
                    <span className="ml-auto shrink-0 rounded-full bg-[#FF6B35] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {r.activeDropCount}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type SortKey = "recommended" | "most_active" | "highest_rated" | "nearest" | "closing_soon";
type ViewMode = "list" | "map";
type RatingFilter = "any" | "4plus" | "3plus";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended",  label: "Recommended" },
  { value: "most_active",  label: "Most Active Drops" },
  { value: "highest_rated",label: "Highest Rated" },
  { value: "closing_soon", label: "Pickup Closing Soon" },
];

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: "any",   label: "Any" },
  { value: "4plus", label: "4+ Stars" },
  { value: "3plus", label: "3+ Stars" },
];

const DIETARY_OPTIONS = [
  { value: "",         label: "All" },
  { value: "VEG",      label: "Veg Only" },
  { value: "NON_VEG",  label: "Non-Veg" },
  { value: "JAIN",     label: "Jain" },
  { value: "EGG_ONLY", label: "Egg Only" },
];

function countActiveFilters(params: {
  sort: SortKey;
  activeDropsOnly: boolean;
  rating: RatingFilter;
  cuisines: string[];
  dietary: string;
}) {
  let n = 0;
  if (params.sort !== "recommended") n++;
  if (!params.activeDropsOnly) n++;
  if (params.rating !== "any") n++;
  if (params.cuisines.length > 0) n++;
  if (params.dietary) n++;
  return n;
}

export function RestaurantDirectoryClient({
  restaurants,
}: {
  readonly restaurants: readonly PublicRestaurantProfile[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [activeDropsOnly, setActiveDropsOnly] = useState(true);
  const [rating, setRating] = useState<RatingFilter>("any");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [dietary, setDietary] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAllCuisines, setShowAllCuisines] = useState(false);

  const allCuisines = useMemo(
    () => [...new Set(restaurants.flatMap((r) => r.cuisineTags))].slice(0, 50),
    [restaurants],
  );
  const visibleCuisines = showAllCuisines ? allCuisines : allCuisines.slice(0, 12);

  const activeFilterCount = countActiveFilters({ sort, activeDropsOnly, rating, cuisines, dietary });

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    let list = restaurants.filter((r) => {
      if (activeDropsOnly && r.activeDropCount === 0) return false;
      if (rating === "4plus" && (r.averageRating == null || r.averageRating < 4)) return false;
      if (rating === "3plus" && (r.averageRating == null || r.averageRating < 3)) return false;
      if (cuisines.length > 0 && !cuisines.some((c) => r.cuisineTags.includes(c))) return false;
      if (dietary && !r.dietaryTags.includes(dietary as PublicRestaurantProfile["dietaryTags"][number])) return false;
      if (needle && ![r.restaurantName, r.headline, r.neighborhoodName, ...r.cuisineTags, ...r.dietaryTags].filter(Boolean).join(" ").toLowerCase().includes(needle)) return false;
      return true;
    });

    if (sort === "most_active") {
      list = [...list].sort((a, b) => b.activeDropCount - a.activeDropCount);
    } else if (sort === "highest_rated") {
      list = [...list].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    } else if (sort === "closing_soon") {
      // Sort by earliest active drop pickup end
      list = [...list].sort((a, b) => {
        const aEnd = a.activeDrops[0]?.pickupEndAt ? Date.parse(a.activeDrops[0].pickupEndAt) : Infinity;
        const bEnd = b.activeDrops[0]?.pickupEndAt ? Date.parse(b.activeDrops[0].pickupEndAt) : Infinity;
        return aEnd - bEnd;
      });
    }

    return list;
  }, [restaurants, query, sort, activeDropsOnly, rating, cuisines, dietary]);

  function clearAll() {
    setSort("recommended");
    setActiveDropsOnly(true);
    setRating("any");
    setCuisines([]);
    setDietary("");
    setQuery("");
  }

  function toggleCuisine(tag: string) {
    setCuisines((prev) => prev.includes(tag) ? prev.filter((c) => c !== tag) : [...prev, tag]);
  }

  const sortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Recommended";

  const FilterPanel = (
    <div className="grid gap-6">
      {/* Sort */}
      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]/60">Sort by</legend>
        <div className="mt-2 grid gap-1">
          {SORT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="sort"
                value={opt.value}
                checked={sort === opt.value}
                onChange={() => setSort(opt.value)}
                className="accent-[#1A5C38]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Active drops toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#2D2D2D]">Show only restaurants with active drops</span>
        <button
          type="button"
          role="switch"
          aria-checked={activeDropsOnly}
          onClick={() => setActiveDropsOnly((v) => !v)}
          className={`relative h-6 w-11 rounded-full transition-colors ${activeDropsOnly ? "bg-[#1A5C38]" : "bg-black/20"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${activeDropsOnly ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </div>

      {/* Rating */}
      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]/60">Rating</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRating(opt.value)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${rating === opt.value ? "border-[#FF6B35] bg-[#FF6B35] text-white" : "border-black/15 text-[#2D2D2D]/70"}`}
            >
              {opt.value !== "any" && <Star size={10} />} {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Cuisine */}
      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]/60">Cuisine</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {visibleCuisines.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleCuisine(tag)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${cuisines.includes(tag) ? "border-[#1A5C38] bg-[#1A5C38] text-white" : "border-black/15 text-[#2D2D2D]/70"}`}
            >
              {tag}
            </button>
          ))}
          {allCuisines.length > 12 && (
            <button
              type="button"
              onClick={() => setShowAllCuisines((v) => !v)}
              className="rounded-full border border-dashed border-black/20 px-3 py-1 text-xs text-[#2D2D2D]/60"
            >
              {showAllCuisines ? "Show less" : `+ ${allCuisines.length - 12} more`}
            </button>
          )}
        </div>
      </fieldset>

      {/* Dietary */}
      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]/60">Dietary</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDietary(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${dietary === opt.value ? "border-[#FF6B35] bg-[#FF6B35] text-white" : "border-black/15 text-[#2D2D2D]/70"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      {activeFilterCount > 0 && (
        <button type="button" onClick={clearAll} className="text-xs font-semibold text-red-600 hover:underline">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Mobile top bar */}
      <div className="mb-4 flex items-center gap-2 lg:hidden">
        <label className="relative flex-1">
          <span className="sr-only">Search restaurants</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2D2D2D]/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurant, cuisine…"
            className="min-h-11 w-full rounded-lg border border-black/15 pl-9 pr-3 text-sm outline-none focus:border-[#1A5C38]"
          />
        </label>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
          className="relative flex min-h-11 items-center gap-1.5 rounded-lg border border-black/15 px-3 text-sm font-semibold"
        >
          <Filter size={16} /> Filters
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B35] text-[10px] font-black text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile sort chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Sort options">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSort(opt.value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${sort === opt.value ? "border-[#1A5C38] bg-[#1A5C38] text-white" : "border-black/15 text-[#2D2D2D]/70"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Desktop filter sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-28 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            {FilterPanel}
          </div>
        </aside>

        {/* Right column */}
        <div className="min-w-0 flex-1">
          {/* Desktop search + sort + count bar */}
          <div className="mb-4 hidden items-center justify-between gap-3 lg:flex">
            <div className="flex items-center gap-3">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2D2D2D]/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="min-h-10 rounded-lg border border-black/15 pl-9 pr-3 text-sm outline-none focus:border-[#1A5C38]"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#2D2D2D]/40">
                    <X size={14} />
                  </button>
                )}
              </label>
              <p className="text-sm text-[#2D2D2D]/60">
                <strong className="text-[#2D2D2D]">{visible.length}</strong> restaurants · sorted by{" "}
                <span className="font-semibold">{sortLabel}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-black/15 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`rounded p-1.5 ${viewMode === "list" ? "bg-[#1A5C38] text-white" : "text-[#2D2D2D]/60"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                aria-label="Map view"
                className={`rounded p-1.5 ${viewMode === "map" ? "bg-[#1A5C38] text-white" : "text-[#2D2D2D]/60"}`}
              >
                <Map size={16} />
              </button>
            </div>
          </div>

          {/* Mobile result count */}
          <p className="mb-3 text-sm text-[#2D2D2D]/60 lg:hidden">
            <strong className="text-[#2D2D2D]">{visible.length}</strong> restaurants
          </p>

          {viewMode === "map" ? (
            <MapView restaurants={visible} onClose={() => setViewMode("list")} />
          ) : visible.length === 0 ? (
            <EmptyState
              title="No restaurants match those filters"
              body="Try a broader cuisine, dietary, or rating filter. New partners appear after public profile activation."
              action={activeFilterCount > 0 ? (
                <button type="button" onClick={clearAll} className="text-sm font-semibold text-[#1A5C38] hover:underline">
                  Clear all filters
                </button>
              ) : undefined}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((restaurant) => (
                <RestaurantCard key={restaurant.restaurantSlug} restaurant={restaurant} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#2D2D2D]">Filters</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
                <X size={20} className="text-[#2D2D2D]/60" />
              </button>
            </div>
            {FilterPanel}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-[#1A5C38] font-semibold text-white"
            >
              Show {visible.length} result{visible.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Floating Map pill (mobile) */}
      {viewMode === "list" && visible.length > 0 && (
        <button
          type="button"
          onClick={() => setViewMode("map")}
          className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#2D2D2D] px-5 py-2.5 text-sm font-bold text-white shadow-lg lg:hidden"
        >
          <Map size={16} /> Map
        </button>
      )}
    </div>
  );
}
