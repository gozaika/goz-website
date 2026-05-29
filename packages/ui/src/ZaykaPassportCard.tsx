import type { ZaykaPassportPayload } from "@gozaika/types";
import { bagsToNextTier, tierLabel, tierProgressPercent } from "@gozaika/utils";

const TIER_STYLES: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  BRONZE:   { bg: "#FDF6EC", border: "#CD7F32", badge: "#CD7F32", text: "#7C4A1A" },
  SILVER:   { bg: "#F8F8F8", border: "#A8A9AD", badge: "#A8A9AD", text: "#4A4A4A" },
  GOLD:     { bg: "#FFFBEB", border: "#D4A017", badge: "#D4A017", text: "#7C5C00" },
  PLATINUM: { bg: "#F0F9F4", border: "#1A5C38", badge: "#1A5C38", text: "#0F3D25" },
};

export interface ZaykaPassportCardProps {
  readonly passport: ZaykaPassportPayload;
  readonly compact?: boolean;
}

export function ZaykaPassportCard({ passport, compact = false }: ZaykaPassportCardProps) {
  const { stat, badges, bagsToNextTier: bNext, progressPercent, nextTierCode } = passport;
  const styles = TIER_STYLES[stat.currentTierCode] ?? TIER_STYLES.BRONZE!;
  const isPlatinum = stat.currentTierCode === "PLATINUM";

  return (
    <div
      className="rounded-xl border-2 p-5"
      style={{ backgroundColor: styles.bg, borderColor: styles.border }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: styles.text }}>
            Zayka Passport · Hyderabad
          </p>
          <p className="mt-1 text-xs text-[#2D2D2D]/55">goZaika</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-black tracking-wider"
          style={{ backgroundColor: styles.badge + "22", color: styles.badge, border: `1.5px solid ${styles.badge}` }}
        >
          {stat.currentTierCode}
        </span>
      </div>

      {/* Tier label */}
      <p className="mt-3 text-xl font-black" style={{ color: styles.text }}>
        {tierLabel(stat.currentTierCode)}
      </p>

      {/* Stats row */}
      {!compact && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Bags Claimed", value: stat.totalBagsCollected },
            { label: "Kitchens", value: stat.totalRestaurantsVisited },
            { label: "Reviews", value: stat.reviewCount },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-white/70 p-2">
              <p className="text-lg font-black text-[#2D2D2D]">{s.value}</p>
              <p className="text-[10px] text-[#2D2D2D]/55">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress to next tier */}
      <div className="mt-4">
        {isPlatinum ? (
          <p className="text-xs font-semibold" style={{ color: styles.text }}>
            Top tier achieved — you're a Culinary Ambassador
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-[#2D2D2D]/60">
              <span>{bNext} more bags to {nextTierCode}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%`, backgroundColor: styles.badge }}
              />
            </div>
          </>
        )}
      </div>

      {/* Badges row (compact shows first 4) */}
      {!compact && badges.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]/50">Stamps</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.slice(0, 6).map((badge) => (
              <div
                key={badge.badgeCode}
                title={badge.earned ? badge.description : `Locked: ${badge.hintText}`}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
                style={
                  badge.earned
                    ? { backgroundColor: styles.badge + "18", borderColor: styles.badge, color: styles.text }
                    : { backgroundColor: "#f5f5f5", borderColor: "#e0e0e0", color: "#9CA3AF" }
                }
              >
                {badge.earned ? "⬡" : "🔒"} {badge.badgeName}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
