import type { CuisineStat, UntriedCuisine } from "@gozaika/types";
import { palette } from "@gozaika/design-tokens";
import { cn } from "@gozaika/utils";

export interface CuisinePassportProps {
  readonly triedCuisines: readonly CuisineStat[];
  readonly untriedCuisines: readonly UntriedCuisine[];
  readonly score: number;
  readonly personalityLabel: string;
  readonly onCuisineClick?: (cuisineCode: string, tried: boolean) => void;
}

const CUISINE_ACCENT: Record<string, string> = {
  BIRYANI: palette.gold,
  SOUTH_INDIAN: palette.saffron,
  NORTH_INDIAN: "#E0652B",
  MUGHLAI: "#8B4513",
  HYDERABADI: "#C67C2A",
  STREET_FOOD: palette.saffron,
  DESSERTS: palette.gold,
  BAKERY: "#B8860B",
  CHINESE: "#CC0000",
  CONTINENTAL: palette.forest,
  SEAFOOD: "#0066CC",
  ITALIAN: "#009246",
  MULTI_CUISINE: "#6B21A8",
  CHETTINAD: "#8B2252",
  JAIN: "#228B22",
  SINDHI: "#FF7F00",
};

function tileAccent(cuisineCode: string): string {
  return CUISINE_ACCENT[cuisineCode] ?? palette.forest;
}

export function CuisinePassport({ triedCuisines, untriedCuisines, score, personalityLabel, onCuisineClick }: CuisinePassportProps) {
  const totalCount = triedCuisines.length + untriedCuisines.length;

  return (
    <div className="rounded-xl border border-forest/20 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-forest">Your Flavour Passport</p>

      {/* Score hero */}
      <div className="mt-4 flex flex-col items-center gap-1 text-center">
        <span className="text-5xl font-black text-charcoal">{score}</span>
        <span className="text-sm font-bold text-gold-text">/ 100 · {personalityLabel}</span>
        <p className="mt-1 text-xs text-muted">
          You've explored {triedCuisines.length} of {totalCount} cuisines
        </p>
      </div>

      {/* Cuisine grid */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {triedCuisines.map((c) => {
          const accent = tileAccent(c.cuisineCode);
          return (
            <button
              key={c.cuisineCode}
              type="button"
              onClick={() => onCuisineClick?.(c.cuisineCode, true)}
              className="flex flex-col items-start gap-1 rounded-lg p-3 text-left transition hover:opacity-90"
              style={{ backgroundColor: accent + "22", borderColor: accent + "55", border: "1px solid" }}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs" style={{ color: accent }}>
                ✓
              </span>
              <span className="text-xs font-semibold text-charcoal">{c.cuisineName.replace(/_/g, " ")}</span>
              <span className="text-[10px] text-muted">{c.bagCount} bag{c.bagCount !== 1 ? "s" : ""}</span>
            </button>
          );
        })}

        {untriedCuisines.map((c) => (
          <button
            key={c.cuisineCode}
            type="button"
            onClick={() => c.activeDropCount > 0 && onCuisineClick?.(c.cuisineCode, false)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border border-dashed border-charcoal/20 p-3 text-left transition",
              c.activeDropCount > 0 ? "cursor-pointer hover:border-saffron/50 hover:bg-cream" : "cursor-default opacity-60",
            )}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-charcoal/20 text-[10px] text-muted">
              ?
            </span>
            <span className="text-xs font-semibold text-muted">{c.cuisineName.replace(/_/g, " ")}</span>
            {c.activeDropCount > 0 ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-saffron-text">
                <span className="h-1.5 w-1.5 rounded-full bg-saffron" />
                Drop available
              </span>
            ) : (
              <span className="text-[10px] text-muted">Undiscovered</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
