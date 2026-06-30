import type { PublicDropCard } from "@gozaika/types";
import { palette } from "@gozaika/design-tokens";
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
      style={{ background: `linear-gradient(135deg, ${palette.forest} 0%, #0F3D25 100%)` }}
    >
      {/* Subtle texture overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />

      <p className="relative text-xs font-bold uppercase tracking-widest text-gold-text">✦ Your next food adventure</p>

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
          <span className="rounded-full border border-gold/60 bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold-text">
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
        className="relative mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-saffron px-4 py-2 text-sm font-bold text-charcoal transition hover:bg-[#e85f2f]"
      >
        Claim the adventure
      </a>
    </article>
  );
}
