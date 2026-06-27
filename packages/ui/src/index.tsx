import type { ButtonHTMLAttributes, ImgHTMLAttributes, ReactNode } from "react";
import { Clock, MapPin, ShieldCheck, Store } from "lucide-react";
import type { PublicDropCard, PublicRestaurantProfile } from "@gozaika/types";
import { cn, cuisineCoverKey, dietaryBadgeLabel, formatCountdown, formatPaise, formatPickupWindow, getDropClaimAvailability } from "@gozaika/utils";

export { DropShareActions, LaunchCommsPanel } from "./launch-comms-actions";
export { CuisinePassport } from "./CuisinePassport";
export { AdventureDropCard } from "./AdventureDropCard";
export { FoodStoryCard } from "./FoodStoryCard";
export { ZaykaPassportCard } from "./ZaykaPassportCard";

export const tokens = {
  colors: {
    saffron: "#FF6B35",
    forest: "#1A5C38",
    gold: "#D4A017",
    cream: "#FFF8F0",
    charcoal: "#2D2D2D",
  },
  radius: {
    card: "8px",
    control: "8px",
  },
} as const;

export const brandAssets = {
  logoHorizontal: "/brand/gozaika-logo-horizontal.svg",
  logoWhite: "/brand/gozaika-logo-white.svg",
  heroBamBag: "/brand/hero-bam-bag.webp",
  pickupIllustration: "/brand/pickup-illustration.svg",
} as const;

type BrandImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  readonly alt?: string;
  readonly src?: string;
};

export function GoZaikaLogo({
  alt = "goZaika",
  src = brandAssets.logoHorizontal,
  className,
  ...props
}: BrandImageProps) {
  return <img src={src} alt={alt} className={cn("h-10 w-auto", className)} {...props} />;
}

export function GoZaikaWordmark(props: BrandImageProps) {
  return <GoZaikaLogo {...props} />;
}

export function GoZaikaMark({
  alt = "goZaika app icon",
  src = brandAssets.heroBamBag,
  className,
  ...props
}: BrandImageProps) {
  return <img src={src} alt={alt} className={cn("h-12 w-12 object-contain", className)} {...props} />;
}

export function AppIcon(props: BrandImageProps) {
  return <GoZaikaMark {...props} />;
}

export function BrandIllustration({
  alt = "",
  src = brandAssets.heroBamBag,
  className,
  ...props
}: BrandImageProps) {
  return <img src={src} alt={alt} className={cn("h-auto w-full", className)} {...props} />;
}

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e85f2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A5C38] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function ShellHeader({ children }: { readonly children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <GoZaikaLogo className="h-9" />
        {children}
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  readonly title: string;
  readonly body: string;
  readonly action?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-dashed border-[#1A5C38]/30 bg-white p-8 text-center">
      <p className="text-lg font-semibold text-[#2D2D2D]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#2D2D2D]/70">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export function DietaryBadge({ code }: { readonly code: string }) {
  const colorClass =
    code === "NON_VEG"
      ? "border-red-600 text-red-700"
      : code === "JAIN"
        ? "border-orange-500 text-orange-700"
        : code === "EGG_ONLY"
          ? "border-yellow-500 text-yellow-800"
          : "border-green-600 text-green-700";

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", colorClass)}>
      {dietaryBadgeLabel(code)}
    </span>
  );
}

export function AllergenChips({ codes }: { readonly codes: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Allergen disclosures">
      {codes.map((code) => (
        <span key={code} className="rounded-full bg-[#FFF0E8] px-2 py-1 text-xs font-medium text-[#8A341C]">
          {code.replaceAll("_", " ")}
        </span>
      ))}
    </div>
  );
}

export function ProgressBar({ available, total }: { readonly available: number; readonly total: number }) {
  const percentage = total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((available / total) * 100)));
  const urgent = percentage < 20;

  return (
    <div className="h-2 w-full rounded-full bg-black/10" aria-label={`${available} of ${total} bags available`}>
      <div
        className={cn("h-2 rounded-full", urgent ? "bg-red-600" : "bg-[#1A5C38]")}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function DropCard({
  drop,
  className,
  actions,
  now,
}: {
  readonly drop: PublicDropCard;
  readonly className?: string;
  readonly actions?: ReactNode;
  readonly now?: Date;
}) {
  const nowDate = now ?? new Date();
  const claimAvailability = getDropClaimAvailability(drop, nowDate);
  const soldOut = claimAvailability.code === "SOLD_OUT";
  const isBlindAdventure = drop.dropTypeCode === "BLIND_ADVENTURE";

  const serves =
    drop.servesMin && drop.servesMax
      ? drop.servesMin === drop.servesMax
        ? `Serves ${drop.servesMin}`
        : `Serves ${drop.servesMin}-${drop.servesMax}`
      : null;

  // FOMO signals
  const pickupEndMs = Date.parse(drop.pickupEndAt);
  const pickupStartMs = Date.parse(drop.pickupStartAt);
  const msUntilClose = pickupEndMs - nowDate.getTime();
  const closingSoon = msUntilClose > 0 && msUntilClose < 2 * 60 * 60 * 1000;
  const closingVeryUrgent = msUntilClose > 0 && msUntilClose < 60 * 60 * 1000;
  const goingFast = drop.quantityTotal > 0 && drop.quantityAvailable / drop.quantityTotal <= 0.3 && drop.quantityAvailable > 0;
  const almostGone = drop.quantityAvailable > 0 && drop.quantityAvailable <= 3;
  const isNew = nowDate.getTime() - pickupStartMs < 30 * 60 * 1000 && pickupStartMs <= nowDate.getTime();

  const borderClass = goingFast && !soldOut
    ? "border-[#FF6B35]/60 animate-pulse"
    : isBlindAdventure
      ? "border-[#D4A017]/60"
      : "border-black/10";

  return (
    <article className={cn(
      "relative overflow-hidden rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md",
      borderClass,
      className,
    )}>
      {/* Sold-out overlay */}
      {soldOut ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-white/85">
          <span className="rotate-[-15deg] rounded border-4 border-red-500 px-4 py-1 text-xl font-black text-red-600">
            Sold Out
          </span>
        </div>
      ) : null}

      {/* Cuisine cover art — appetizing banner; real uploaded media can replace this later */}
      <img
        src={`/art/cover-${cuisineCoverKey(drop.restaurantName) ?? "biryani"}.svg`}
        alt=""
        aria-hidden
        className="-mx-4 -mt-4 mb-3 h-28 w-[calc(100%+2rem)] max-w-none object-cover"
      />

      {/* Badges row */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {isNew && (
          <span className="rounded-full bg-[#1A5C38] px-2 py-0.5 text-[10px] font-bold uppercase text-white tracking-wide">
            New
          </span>
        )}
        {isBlindAdventure && (
          <span className="rounded-full border border-[#D4A017]/60 bg-[#D4A017]/10 px-2 py-0.5 text-[10px] font-bold text-[#7C5C00] tracking-wide">
            Blind Adventure
          </span>
        )}
        {almostGone && !soldOut && (
          <span className="rounded-full bg-[#FF6B35] px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
            Only {drop.quantityAvailable} left!
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#1A5C38]">{drop.restaurantName}</p>
          <h3 className="mt-1 text-xl font-semibold text-[#2D2D2D]">
            {isBlindAdventure ? (
              <span className="text-[#D4A017]">Mystery Cuisine</span>
            ) : (
              drop.bagDisplayName
            )}
          </h3>
          {!isBlindAdventure && drop.bagShortDescription ? (
            <p className="mt-1 line-clamp-2 text-sm text-[#2D2D2D]/70">{drop.bagShortDescription}</p>
          ) : null}
          {isBlindAdventure && (
            <p className="mt-1 text-xs text-[#2D2D2D]/55">
              Cuisine revealed after pickup. Allergens always disclosed.
            </p>
          )}
        </div>
        <DietaryBadge code={drop.dietaryCategoryCode} />
      </div>
      <div className="mt-4">
        <AllergenChips codes={drop.allergenCodes} />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-[#2D2D2D]/75">
        <div className="flex items-center gap-2">
          <Clock size={16} aria-hidden="true" />
          {closingSoon ? (
            <span aria-live="polite">
              <span className={cn("font-semibold tabular-nums", closingVeryUrgent ? "text-red-600" : "text-[#FF6B35]")}>
                Closes in {formatCountdown(drop.pickupEndAt, nowDate)}
              </span>
            </span>
          ) : (
            formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)
          )}
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} aria-hidden="true" />
          {drop.neighborhoodName ? `${drop.neighborhoodName} pickup` : "Pickup only"}
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} aria-hidden="true" />
          {serves ? `${serves} · Allergens disclosed` : "Allergens disclosed"}
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar available={drop.quantityAvailable} total={drop.quantityTotal} />
        <p className="mt-2 text-xs font-semibold text-[#2D2D2D]/65">
          {drop.quantityAvailable} of {drop.quantityTotal} bags remaining
          {goingFast && !almostGone ? (
            <span className="ml-2 text-[#FF6B35]">· Going fast</span>
          ) : null}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-2xl font-bold text-[#2D2D2D]">{formatPaise(drop.pricePaise)}</span>
        <a
          href={`/drops/${drop.dropPk}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#1A5C38]/25 px-4 py-2 text-sm font-semibold text-[#1A5C38] transition hover:border-[#1A5C38]"
        >
          View
        </a>
      </div>
      <div className="mt-3">
        {claimAvailability.canClaim ? (
          <a
            href={`/drops/${drop.dropPk}?claim=1`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e85f2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A5C38]"
          >
            Hold this BAM Bag
          </a>
        ) : (
          <Button disabled className="w-full">
            {claimAvailability.reason}
          </Button>
        )}
      </div>
      {actions ? <div className="mt-3">{actions}</div> : null}
    </article>
  );
}

export function RestaurantCard({
  restaurant,
  className,
}: {
  readonly restaurant: PublicRestaurantProfile;
  readonly className?: string;
}) {
  return (
    <article className={cn("overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm", className)}>
      <div className="flex min-h-28 items-start justify-between gap-3 bg-[#FFF8F0] p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#1A5C38]">
            {restaurant.neighborhoodName ? `${restaurant.neighborhoodName} pickup` : restaurant.cityName ?? "Pickup partner"}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-[#2D2D2D]">{restaurant.restaurantName}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-[#2D2D2D]/70">
            {restaurant.headline ?? "Chef-led BAM Bags with published dietary, allergen, and pickup details."}
          </p>
        </div>
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white text-[#FF6B35] shadow-sm">
          <Store aria-hidden="true" />
        </div>
      </div>
      <div className="grid gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {restaurant.cuisineTags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-[#F2F8EF] px-2.5 py-1 text-xs font-semibold text-[#1A5C38]">
              {tag}
            </span>
          ))}
          {restaurant.dietaryTags.slice(0, 3).map((tag) => (
            <DietaryBadge key={tag} code={tag} />
          ))}
        </div>
        <dl className="grid grid-cols-3 gap-2 text-sm text-[#2D2D2D]/70">
          <div>
            <dt className="text-xs font-semibold uppercase text-[#2D2D2D]/45">Active</dt>
            <dd className="mt-1 font-bold text-[#2D2D2D]">{restaurant.activeDropCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[#2D2D2D]/45">History</dt>
            <dd className="mt-1 font-bold text-[#2D2D2D]">{restaurant.totalDropCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[#2D2D2D]/45">Trust</dt>
            <dd className="mt-1 font-bold text-[#2D2D2D]">Disclosed</dd>
          </div>
        </dl>
        <a
          href={`/restaurants/${restaurant.restaurantSlug}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#1A5C38]/25 px-4 py-2 text-sm font-semibold text-[#1A5C38] transition hover:border-[#1A5C38] hover:bg-[#F2F8EF]"
        >
          View profile
        </a>
      </div>
    </article>
  );
}
