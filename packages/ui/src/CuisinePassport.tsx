import type { CuisineStat, UntriedCuisine } from "@gozaika/types";
import { cn } from "@gozaika/utils";

export interface CuisinePassportProps {
  readonly triedCuisines: readonly CuisineStat[];
  readonly untriedCuisines: readonly UntriedCuisine[];
  readonly score: number;
  readonly personalityLabel: string;
  readonly onCuisineClick?: (cuisineCode: string, tried: boolean) => void;
}

const CUISINE_ACCENT: Record<string, string> = {
  BIRYANI: "#D4A017",
  SOUTH_INDIAN: "#FF6B35",
  NORTH_INDIAN: "#E0652B",
  MUGHLAI: "#8B4513",
  HYDERABADI: "#C67C2A",
  STREET_FOOD: "#FF6B35",
  DESSERTS: "#D4A017",
  BAKERY: "#B8860B",
  CHINESE: "#CC0000",
  CONTINENTAL: "#1A5C38",
  SEAFOOD: "#0066CC",
  ITALIAN: "#009246",
  MULTI_CUISINE: "#6B21A8",
  CHETTINAD: "#8B2252",
  JAIN: "#228B22",
  SINDHI: "#FF7F00",
};

function tileAccent(cuisineCode: string): string {
  return CUISINE_ACCENT[cuisineCode] ?? "#1A5C38";
}

export function CuisinePassport({ triedCuisines, untriedCuisines, score, personalityLabel, onCuisineClick }: CuisinePassportProps) {
  const totalCount = triedCuisines.length + untriedCuisines.length;

  return (
    <div className="rounded-xl border border-[#1A5C38]/20 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[#1A5C38]">Your Flavour Passport</p>

      {/* Score hero */}
      <div className="mt-4 flex flex-col items-center gap-1 text-center">
        <span className="text-5xl font-black text-[#2D2D2D]">{score}</span>
        <span className="text-sm font-bold text-[#D4A017]">/ 100 · {personalityLabel}</span>
        <p className="mt-1 text-xs text-[#2D2D2D]/60">
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
              <span className="text-xs font-semibold text-[#2D2D2D]">{c.cuisineName.replace(/_/g, " ")}</span>
              <span className="text-[10px] text-[#2D2D2D]/55">{c.bagCount} bag{c.bagCount !== 1 ? "s" : ""}</span>
            </button>
          );
        })}

        {untriedCuisines.map((c) => (
          <button
            key={c.cuisineCode}
            type="button"
            onClick={() => c.activeDropCount > 0 && onCuisineClick?.(c.cuisineCode, false)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border border-dashed border-[#2D2D2D]/20 p-3 text-left transition",
              c.activeDropCount > 0 ? "cursor-pointer hover:border-[#FF6B35]/50 hover:bg-[#FFF8F0]" : "cursor-default opacity-60",
            )}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2D2D2D]/20 text-[10px] text-[#2D2D2D]/40">
              ?
            </span>
            <span className="text-xs font-semibold text-[#2D2D2D]/70">{c.cuisineName.replace(/_/g, " ")}</span>
            {c.activeDropCount > 0 ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[#FF6B35]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B35]" />
                Drop available
              </span>
            ) : (
              <span className="text-[10px] text-[#2D2D2D]/40">Undiscovered</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
