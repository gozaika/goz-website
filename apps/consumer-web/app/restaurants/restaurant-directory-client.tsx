"use client";

import { EmptyState, RestaurantCard } from "@gozaika/ui";
import type { PublicRestaurantProfile } from "@gozaika/types";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

export function RestaurantDirectoryClient({
  restaurants,
}: {
  readonly restaurants: readonly PublicRestaurantProfile[];
}) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");
  const tags = useMemo(
    () => ["All", ...Array.from(new Set(restaurants.flatMap((restaurant) => restaurant.cuisineTags))).slice(0, 10)],
    [restaurants],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const matchesTag = tag === "All" || restaurant.cuisineTags.includes(tag);
      const matchesQuery =
        !needle ||
        [
          restaurant.restaurantName,
          restaurant.headline,
          restaurant.neighborhoodName,
          restaurant.cityName,
          ...restaurant.cuisineTags,
          ...restaurant.dietaryTags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return matchesTag && matchesQuery;
    });
  }, [query, restaurants, tag]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <label className="relative">
          <span className="sr-only">Search restaurants</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2D2D2D]/45" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search restaurant, cuisine, neighborhood, dietary..."
            className="min-h-12 w-full rounded-lg border border-black/10 pl-10 pr-10 text-base outline-none focus:border-[#1A5C38]"
          />
          {query ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#2D2D2D]/60 hover:bg-black/5"
              onClick={() => setQuery("")}
              aria-label="Clear restaurant search"
            >
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Cuisine filters">
          {tags.map((nextTag) => (
            <button
              key={nextTag}
              type="button"
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${
                tag === nextTag
                  ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                  : "border-[#1A5C38]/20 bg-white text-[#1A5C38]"
              }`}
              onClick={() => setTag(nextTag)}
            >
              {nextTag}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No restaurants match those filters"
          body="Try a broader cuisine, neighborhood, or dietary search. New partners appear here after their public profile is safe to show."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((restaurant) => (
            <RestaurantCard key={restaurant.restaurantSlug} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
}
