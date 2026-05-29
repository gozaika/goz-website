import type { PublicDropCard } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { DietaryBadge } from "./index";

export interface AdventureDropCardProps {
  readonly drop: PublicDropCard;
  readonly adventureReason: string;
  readonly firstTimerCount: number;
}

export function AdventureDropCard({ drop, adventureReason, firstTimerCount }: AdventureDropCardProps) {
  const isBlindAdventure = drop.dropTypeCode === "BLIND_ADVENTURE";

  return (
    <article
      className="relative overflow-hidden rounded-xl p-5 text-white"
      style={{ background: "linear-gradient(135deg, #1A5C38 0%, #0F3D25 100%)" }}
    >
      {/* Subtle texture overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />

      <p className="relative text-xs font-bold uppercase tracking-widest text-[#D4A017]">✦ Your next food adventure</p>

      <p className="relative mt-2 text-sm font-medium text-white/70">{adventureReason}</p>

      <h3 className="relative mt-2 text-2xl font-black text-white">
        {isBlindAdventure ? "Mystery Cuisine" : drop.restaurantName}
      </h3>

      <div className="relative mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
        {drop.neighborhoodName && <span>{drop.neighborhoodName}</span>}
        {drop.neighborhoodName && <span>·</span>}
        <span>Pickup closes soon</span>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white">
          {formatPaise(drop.pricePaise)}
        </span>
        <DietaryBadge code={drop.dietaryCategoryCode} />
        {isBlindAdventure && (
          <span className="rounded-full border border-[#D4A017]/60 bg-[#D4A017]/15 px-2.5 py-1 text-xs font-bold text-[#D4A017]">
            Blind Adventure
          </span>
        )}
      </div>

      {firstTimerCount > 0 && (
        <p className="relative mt-3 text-xs text-white/50">
          {firstTimerCount} first-time explorer{firstTimerCount !== 1 ? "s" : ""} this week
        </p>
      )}

      <a
        href={`/drops/${drop.dropPk}?claim=1`}
        className="relative mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-[#FF6B35] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#e85f2f]"
      >
        Claim the adventure
      </a>
    </article>
  );
}
