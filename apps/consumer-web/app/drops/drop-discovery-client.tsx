"use client";

import { DropCard, DropShareActions, EmptyState } from "@gozaika/ui";
import type { PublicDropCard } from "@gozaika/types";
import { createPublicDropUrl, cuisineCoverKey, dietaryBadgeLabel, formatPickupWindow, generateManualDropAlertText } from "@gozaika/utils";
import { List, Map, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type DropInventoryPayload = {
  readonly drop_drop_pk?: string;
  readonly computed_quantity_available?: number;
  readonly drop_status_code?: PublicDropCard["statusCode"];
};

type ViewMode = "list" | "map";

const cuisineFilters = ["All", "Biryani", "Thali", "Dessert", "Snacks", "Drinks", "Chef's Selection"] as const;

function textFor(drop: PublicDropCard): string {
  return [
    drop.restaurantName,
    drop.restaurantHeadline,
    drop.dropTitle,
    drop.bagDisplayName,
    drop.bagShortDescription,
    drop.neighborhoodName,
    drop.cityName,
    drop.dietaryCategoryCode,
    drop.spiceLevelCode,
    ...drop.allergenCodes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function cuisineFor(drop: PublicDropCard): string {
  const haystack = textFor(drop);
  for (const cuisine of cuisineFilters) {
    if (cuisine !== "All" && cuisine !== "Chef's Selection" && haystack.includes(cuisine.toLowerCase())) {
      return cuisine;
    }
  }
  return "Chef's Selection";
}

function closingSoon(drop: PublicDropCard, generatedAtMs: number): boolean {
  const endMs = Date.parse(drop.pickupEndAt);
  return endMs > generatedAtMs && endMs - generatedAtMs <= 2 * 60 * 60 * 1000;
}

export function DropDiscoveryClient({
  generatedAt,
  initialDrops,
}: {
  readonly generatedAt: string;
  readonly initialDrops: readonly PublicDropCard[];
}) {
  const [drops, setDrops] = useState<PublicDropCard[]>([...initialDrops]);
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<(typeof cuisineFilters)[number]>("All");
  const [dietary, setDietary] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const generatedAtMs = useMemo(() => Date.parse(generatedAt), [generatedAt]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("public-drop-inventory")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "drop_drop" }, (payload) => {
        const next = payload.new as DropInventoryPayload;
        if (!next.drop_drop_pk) return;

        setDrops((current) =>
          current.map((drop) =>
            drop.dropPk === next.drop_drop_pk
              ? {
                  ...drop,
                  quantityAvailable: next.computed_quantity_available ?? drop.quantityAvailable,
                  statusCode: next.drop_status_code ?? drop.statusCode,
                }
              : drop,
          ),
        );
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const dietaryFilters = useMemo(() => ["All", ...Array.from(new Set(drops.map((drop) => drop.dietaryCategoryCode)))], [drops]);
  const filteredDrops = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return drops.filter((drop) => {
      const matchesQuery = !needle || textFor(drop).includes(needle);
      const matchesCuisine = cuisine === "All" || cuisineFor(drop) === cuisine;
      const matchesDietary = dietary === "All" || drop.dietaryCategoryCode === dietary;
      return matchesQuery && matchesCuisine && matchesDietary;
    });
  }, [cuisine, dietary, drops, query]);
  const current = filteredDrops
    .filter((drop) => Date.parse(drop.pickupEndAt) > generatedAtMs)
    .sort((a, b) => Date.parse(a.pickupEndAt) - Date.parse(b.pickupEndAt));
  const missed = filteredDrops
    .filter((drop) => Date.parse(drop.pickupEndAt) <= generatedAtMs)
    .sort((a, b) => Date.parse(b.pickupEndAt) - Date.parse(a.pickupEndAt));
  const closing = current.filter((drop) => closingSoon(drop, generatedAtMs)).slice(0, 4);
  const coordinateDrops = current.filter((drop) => drop.latitude != null && drop.longitude != null);

  if (drops.length === 0) {
    return (
      <EmptyState
        title="No Hyderabad drops are live yet"
        body="Approved restaurant partners will appear here as soon as their first BAM Bags are published."
      />
    );
  }

  return (
    <div className="grid gap-7">
      <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <label className="relative">
          <span className="sr-only">Search drops</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2D2D2D]/45" />
          <input
            className="min-h-12 w-full rounded-lg border border-black/10 pl-10 pr-10 text-base outline-none focus:border-[#1A5C38]"
            placeholder="Search restaurant, BAM Bag, cuisine, dietary, allergen..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#2D2D2D]/60 hover:bg-black/5"
              onClick={() => setQuery("")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Cuisine filters">
          {cuisineFilters.map((nextCuisine) => (
            <button
              key={nextCuisine}
              type="button"
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${
                cuisine === nextCuisine
                  ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                  : "border-[#1A5C38]/20 bg-white text-[#1A5C38]"
              }`}
              onClick={() => setCuisine(nextCuisine)}
            >
              {nextCuisine}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" aria-label="Dietary filters">
            {dietaryFilters.map((nextDietary) => (
              <button
                key={nextDietary}
                type="button"
                className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${
                  dietary === nextDietary
                    ? "border-[#1A5C38] bg-[#F2F8EF] text-[#1A5C38]"
                    : "border-black/10 bg-white text-[#2D2D2D]/70"
                }`}
                onClick={() => setDietary(nextDietary)}
              >
                {nextDietary === "All" ? "All dietary" : dietaryBadgeLabel(nextDietary)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 rounded-lg border border-black/10 bg-white p-1 text-sm font-semibold">
            <button
              type="button"
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 ${viewMode === "list" ? "bg-[#1A5C38] text-white" : "text-[#1A5C38]"}`}
              onClick={() => setViewMode("list")}
            >
              <List size={16} aria-hidden="true" />
              List
            </button>
            <button
              type="button"
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 ${viewMode === "map" ? "bg-[#1A5C38] text-white" : "text-[#1A5C38]"}`}
              onClick={() => setViewMode("map")}
            >
              <Map size={16} aria-hidden="true" />
              Map
            </button>
          </div>
        </div>
      </section>

      {closing.length ? (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#2D2D2D]">Closing soon</h2>
              <p className="mt-1 text-sm text-[#2D2D2D]/65">Limited Drops with pickup windows ending soon.</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {closing.map((drop) => (
              <article key={drop.dropPk} className="min-w-[280px] overflow-hidden rounded-lg border border-[#D4A017]/40 bg-[#FFF8F0] p-4">
                <img
                  src={`/art/cover-${cuisineCoverKey(drop.restaurantName) ?? "biryani"}.svg`}
                  alt=""
                  aria-hidden
                  className="-mx-4 -mt-4 mb-3 h-24 w-[calc(100%+2rem)] max-w-none object-cover"
                />
                <p className="text-sm font-semibold text-[#1A5C38]">{drop.restaurantName}</p>
                <h3 className="mt-1 text-lg font-bold text-[#2D2D2D]">{drop.bagDisplayName}</h3>
                <p className="mt-2 text-sm text-[#2D2D2D]/65">{formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}</p>
                <a className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#FF6B35] px-4 text-sm font-semibold text-white" href={`/drops/${drop.dropPk}`}>
                  View drop
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {viewMode === "map" ? (
        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-xl font-bold text-[#2D2D2D]">Map view</h2>
          {coordinateDrops.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-[#D4A017]/45 bg-[#FFF8F0] p-6 text-sm leading-6 text-[#2D2D2D]/72">
              Map pins need public restaurant coordinates. This environment does not expose any safe public coordinates yet, so list view
              remains the source of truth for BAM Bag claims.
            </div>
          ) : (
            <div className="relative mt-4 h-[520px] overflow-hidden rounded-lg border border-[#1A5C38]/15 bg-[#EAF3DE]">
              {coordinateDrops.map((drop, index) => (
                <a
                  key={drop.dropPk}
                  href={`/drops/${drop.dropPk}`}
                  className="absolute rounded-full bg-[#FF6B35] px-3 py-2 text-xs font-bold text-white shadow-lg"
                  style={{ left: `${18 + (index % 4) * 20}%`, top: `${18 + Math.floor(index / 4) * 18}%` }}
                >
                  {drop.restaurantName} / {drop.quantityAvailable}
                </a>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section>
        {current.length === 0 ? (
          <EmptyState title="No claimable drops match those filters" body="Try clearing search, checking another cuisine, or browsing the recent closed drops below." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {current.map((drop) => (
              <DropCard
                key={drop.dropPk}
                drop={drop}
                actions={
                  <DropShareActions
                    publicUrl={createPublicDropUrl(drop.dropPk)}
                    shareText={generateManualDropAlertText(drop)}
                    className="justify-end"
                  />
                }
              />
            ))}
          </div>
        )}
      </section>

      {missed.length ? (
        <section>
          <div className="mb-3">
            <h2 className="text-2xl font-bold text-[#2D2D2D]">Recently missed</h2>
            <p className="mt-1 text-sm text-[#2D2D2D]/65">Closed pickup windows are read-only and separate from active holds.</p>
          </div>
          <div className="grid gap-4 opacity-80 md:grid-cols-2 xl:grid-cols-3">
            {missed.slice(0, 6).map((drop) => (
              <DropCard key={drop.dropPk} drop={drop} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
