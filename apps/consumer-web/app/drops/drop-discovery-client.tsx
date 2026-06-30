"use client";

import { DropCard, DropShareActions, EmptyState, FilterChipRow, SegmentedToggle } from "@gozaika/ui";
import { palette } from "@gozaika/design-tokens";
import type { PublicDropCard } from "@gozaika/types";
import { createPublicDropUrl, dietaryBadgeLabel, dropCoverKey, dropTypeRibbon, formatPickupWindow, generateManualDropAlertText } from "@gozaika/utils";
import Image from "next/image";
import { Search, X } from "lucide-react";
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
      <section className="grid gap-3 rounded-lg border border-hairline bg-white p-4 shadow-sm">
        <label className="relative">
          <span className="sr-only">Search drops</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            className="min-h-12 w-full rounded-lg border border-hairline pl-10 pr-10 text-base outline-none focus:border-forest"
            placeholder="Search restaurant, BAM Bag, cuisine, dietary, allergen..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-black/5"
              onClick={() => setQuery("")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <FilterChipRow
          ariaLabel="Cuisine filters"
          chips={cuisineFilters.map((nextCuisine) => ({ id: nextCuisine, label: nextCuisine, selected: cuisine === nextCuisine }))}
          onSelect={(id) => setCuisine(id as (typeof cuisineFilters)[number])}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterChipRow
            ariaLabel="Dietary filters"
            accent={palette.forest}
            chips={dietaryFilters.map((nextDietary) => ({
              id: nextDietary,
              label: nextDietary === "All" ? "All dietary" : dietaryBadgeLabel(nextDietary),
              selected: dietary === nextDietary,
            }))}
            onSelect={(id) => setDietary(id)}
          />
          <SegmentedToggle
            ariaLabel="Drop view mode"
            accent={palette.forest}
            options={[
              { id: "list", label: "List" },
              { id: "map", label: "Map" },
            ]}
            selectedId={viewMode}
            onChange={(id) => setViewMode(id as ViewMode)}
          />
        </div>
      </section>

      {closing.length ? (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Closing soon</h2>
              <p className="mt-1 text-sm text-muted">Limited Drops with pickup windows ending soon.</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {closing.map((drop) => (
              <article key={drop.dropPk} className="min-w-[280px] overflow-hidden rounded-lg border border-gold/40 bg-cream p-4">
                <div className="relative -mx-4 -mt-4 mb-3 h-24">
                  <Image
                    src={`/art/cover-${dropCoverKey(drop) ?? "biryani"}.svg`}
                    alt=""
                    aria-hidden
                    fill
                    unoptimized
                    sizes="280px"
                    className="object-cover"
                  />
                  {dropTypeRibbon(drop.dropTypeCode) ? (
                    <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-charcoal shadow-sm">
                      ★ {dropTypeRibbon(drop.dropTypeCode)}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-forest">{drop.restaurantName}</p>
                <h3 className="mt-1 text-lg font-bold text-charcoal">{drop.bagDisplayName}</h3>
                <p className="mt-2 text-sm text-muted">{formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}</p>
                <a className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-saffron px-4 text-sm font-semibold text-charcoal" href={`/drops/${drop.dropPk}`}>
                  View drop
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {viewMode === "map" ? (
        <section className="rounded-lg border border-hairline bg-white p-4">
          <h2 className="text-xl font-bold text-charcoal">Map view</h2>
          {/* Hyderabad pickup area (Google output=embed — no map SDK/key, same as the
              restaurant directory). Drops with public coordinates are listed below as
              pins; without an SDK we can't plot multiple custom markers on the embed. */}
          <div className="mt-4 overflow-hidden rounded-lg border border-hairline" style={{ height: 480 }}>
            <iframe
              title="Hyderabad pickup map"
              width="100%"
              height="480"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=17.385,78.4867&z=12&output=embed"
            />
          </div>
          {coordinateDrops.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {coordinateDrops.map((drop) => (
                <a
                  key={drop.dropPk}
                  href={`/drops/${drop.dropPk}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-white p-3 transition hover:border-forest/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal">{drop.restaurantName}</p>
                    <p className="text-xs text-muted">{drop.neighborhoodName ?? drop.cityName ?? "Hyderabad"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-saffron px-2.5 py-1 text-xs font-bold text-charcoal">{drop.quantityAvailable} left</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              No live drops expose public coordinates right now, so there are no pins to place — switch to list view for every claimable BAM Bag.
            </p>
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
            <h2 className="text-2xl font-bold text-charcoal">Recently missed</h2>
            <p className="mt-1 text-sm text-muted">Closed pickup windows are read-only and separate from active holds.</p>
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
