import { cn } from "@gozaika/utils";

export interface FoodStoryCardProps {
  readonly neighbourhoodName: string;
  readonly storyLine: string;
  readonly activeDropCount: number;
  readonly neighbourhoodCode: string;
  readonly className?: string;
}

export function FoodStoryCard({ neighbourhoodName, storyLine, activeDropCount, neighbourhoodCode, className }: FoodStoryCardProps) {
  return (
    <article className={cn("rounded-xl border border-[#1A5C38]/15 bg-white p-4 transition hover:shadow-md", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#1A5C38]">📍 {neighbourhoodName}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-[#2D2D2D]/80">{storyLine}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#1A5C38]/10 px-2.5 py-1 text-xs font-bold text-[#1A5C38]">
          {activeDropCount} drop{activeDropCount !== 1 ? "s" : ""}
        </span>
      </div>
      <a
        href={`/drops?neighborhood=${encodeURIComponent(neighbourhoodCode)}`}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#FF6B35] hover:underline"
      >
        Explore →
      </a>
    </article>
  );
}
