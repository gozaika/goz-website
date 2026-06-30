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
    <article className={cn("rounded-xl border border-forest/15 bg-white p-4 transition hover:shadow-md", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-forest">📍 {neighbourhoodName}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal/80">{storyLine}</p>
        </div>
        <span className="shrink-0 rounded-full bg-forest/10 px-2.5 py-1 text-xs font-bold text-forest">
          {activeDropCount} drop{activeDropCount !== 1 ? "s" : ""}
        </span>
      </div>
      <a
        href={`/drops?neighborhood=${encodeURIComponent(neighbourhoodCode)}`}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-saffron-text hover:underline"
      >
        Explore →
      </a>
    </article>
  );
}
