import type { ButtonHTMLAttributes, ImgHTMLAttributes, ReactNode } from "react";
import { Clock, MapPin, ShieldCheck, Store } from "lucide-react";
import type { PublicDropCard, PublicRestaurantProfile } from "@gozaika/types";
import { palette } from "@gozaika/design-tokens";
import { cn, dietaryBadgeLabel, dropCoverKey, dropTypeRibbon, formatCountdown, formatPaise, formatPickupWindow, getDropClaimAvailability } from "@gozaika/utils";

export { DropShareActions, LaunchCommsPanel } from "./launch-comms-actions";
export { CuisinePassport } from "./CuisinePassport";
export { AdventureDropCard } from "./AdventureDropCard";
export { FoodStoryCard } from "./FoodStoryCard";
export { ZaykaPassportCard } from "./ZaykaPassportCard";

// Shared design tokens + WCAG contrast helpers (single source of truth, also used
// by the native apps). Web code can `import { palette, accentTextColor } from "@gozaika/ui"`.
export * from "@gozaika/design-tokens";
// Web base primitives (Card / Text / Badge / Skeleton / ErrorState).
export * from "./primitives";
// Customer primitives (W2): static + interactive ports of mobile CustomerPrimitives.
export * from "./CustomerPrimitives";
export * from "./CustomerControls";
// Partner primitives (W3): static + interactive ports of mobile PartnerPrimitives.
export * from "./PartnerPrimitives";
export * from "./PartnerControls";

export const tokens = {
  colors: {
    saffron: palette.saffron,
    saffronText: palette.saffronText,
    forest: palette.forest,
    gold: palette.gold,
    goldText: palette.goldText,
    cream: palette.cream,
    charcoal: palette.charcoal,
  },
  radius: {
    card: "8px",
    control: "8px",
  },
} as const;

export const brandAssets = {
  logoHorizontal: "/brand/gozaika-logo-horizontal.svg",
  logoWhite: "/brand/gozaika-logo-white.svg",
  // Icon-only flame mark (carries the BAM story) — canonical §25 asset, shared by
  // every web app's public/brand. Use it for empty/loading/badge brand moments.
  mark: "/brand/gozaika-mark.svg",
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

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

// Token-driven, AA-safe variants. Primary uses charcoal text on the saffron fill
// (white-on-saffron is only 2.84:1 — fails WCAG AA); this is the same resolution
// the native apps adopted in Mobile Slice X1. Saffron/forest/danger fills all
// pair with an AA-readable text color.
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-saffron text-charcoal hover:opacity-90",
  secondary: "bg-forest text-white hover:opacity-90",
  ghost: "border border-forest/30 bg-transparent text-forest hover:bg-forest/5",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { readonly variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
        "disabled:cursor-not-allowed disabled:opacity-60",
        BUTTON_VARIANT[variant],
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
    <section className="rounded-lg border border-dashed border-forest/30 bg-white p-8 text-center">
      {/* Flame motif (carries BAM) — the canonical brand mark on empty moments (§25),
          decorative so it stays out of the a11y tree. */}
      <img src={brandAssets.mark} alt="" aria-hidden className="mx-auto mb-4 h-10 w-10 opacity-80" />
      <p className="text-lg font-semibold text-charcoal">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
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
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={available}
      aria-label={`${available} of ${total} bags available`}
      className="h-2 w-full rounded-full bg-black/10"
    >
      <div
        className={cn("h-2 rounded-full", urgent ? "bg-red-600" : "bg-forest")}
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
    ? "border-saffron/60 animate-pulse"
    : isBlindAdventure
      ? "border-gold/60"
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

      {/* Cuisine cover art — appetizing banner; real uploaded media can replace this later.
          Blind-adventure drops use the cuisine-agnostic surprise cover; premium types get a ribbon. */}
      <div className="relative -mx-4 -mt-4 mb-3">
        <img
          src={`/art/cover-${dropCoverKey(drop) ?? "biryani"}.webp`}
          alt=""
          aria-hidden
          className="h-28 w-full object-cover"
        />
        {dropTypeRibbon(drop.dropTypeCode) ? (
          <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-charcoal shadow-sm">
            ★ {dropTypeRibbon(drop.dropTypeCode)}
          </span>
        ) : null}
      </div>

      {/* Badges row */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {isNew && (
          <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-bold uppercase text-white tracking-wide">
            New
          </span>
        )}
        {isBlindAdventure && (
          <span className="rounded-full border border-gold/60 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-[#7C5C00] tracking-wide">
            Blind Adventure
          </span>
        )}
        {almostGone && !soldOut && (
          <span className="rounded-full bg-saffron px-2 py-0.5 text-[10px] font-bold text-charcoal tracking-wide">
            Only {drop.quantityAvailable} left!
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-forest">{drop.restaurantName}</p>
          <h2 className="mt-1 text-xl font-semibold text-charcoal">
            {isBlindAdventure ? (
              <span className="text-gold-text">A cuisine to discover</span>
            ) : (
              drop.bagDisplayName
            )}
          </h2>
          {!isBlindAdventure ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {drop.bagShortDescription ?? "A chef-curated thali — generously portioned so you get more to try."}
            </p>
          ) : null}
          {isBlindAdventure && (
            <p className="mt-1 text-xs text-muted">
              Know the kitchen — discover the cuisine. Allergens always disclosed.
            </p>
          )}
        </div>
        <DietaryBadge code={drop.dietaryCategoryCode} />
      </div>
      <div className="mt-4">
        <AllergenChips codes={drop.allergenCodes} />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-muted">
        <div className="flex items-center gap-2">
          <Clock size={16} aria-hidden="true" />
          {closingSoon ? (
            <span aria-live="polite">
              <span className={cn("font-semibold tabular-nums", closingVeryUrgent ? "text-red-600" : "text-saffron-text")}>
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
        <p className="mt-2 text-xs font-semibold text-muted">
          {drop.quantityAvailable} of {drop.quantityTotal} bags remaining
          {goingFast && !almostGone ? (
            <span className="ml-2 text-saffron-text">· Going fast</span>
          ) : null}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-2xl font-bold text-charcoal">{formatPaise(drop.pricePaise)}</span>
        <a
          href={`/drops/${drop.dropPk}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-forest/25 px-4 py-2 text-sm font-semibold text-forest transition hover:border-forest"
        >
          View
        </a>
      </div>
      <div className="mt-3">
        {claimAvailability.canClaim ? (
          <a
            href={`/drops/${drop.dropPk}?claim=1`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-charcoal shadow-sm transition hover:bg-[#e85f2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
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
      <div className="flex min-h-28 items-start justify-between gap-3 bg-cream p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-forest">
            {restaurant.neighborhoodName ? `${restaurant.neighborhoodName} pickup` : restaurant.cityName ?? "Pickup partner"}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-charcoal">{restaurant.restaurantName}</h2>
          <p className="mt-2 line-clamp-2 text-sm text-muted">
            {restaurant.headline ?? "Chef-led BAM Bags with published dietary, allergen, and pickup details."}
          </p>
        </div>
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white text-saffron-text shadow-sm">
          <Store aria-hidden="true" />
        </div>
      </div>
      <div className="grid gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {restaurant.cuisineTags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-forest">
              {tag}
            </span>
          ))}
          {restaurant.dietaryTags.slice(0, 3).map((tag) => (
            <DietaryBadge key={tag} code={tag} />
          ))}
        </div>
        <dl className="grid grid-cols-3 gap-2 text-sm text-muted">
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Active</dt>
            <dd className="mt-1 font-bold text-charcoal">{restaurant.activeDropCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">History</dt>
            <dd className="mt-1 font-bold text-charcoal">{restaurant.totalDropCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Trust</dt>
            <dd className="mt-1 font-bold text-charcoal">Disclosed</dd>
          </div>
        </dl>
        <a
          href={`/restaurants/${restaurant.restaurantSlug}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-forest/25 px-4 py-2 text-sm font-semibold text-forest transition hover:border-forest hover:bg-success-soft"
        >
          View profile
        </a>
      </div>
    </article>
  );
}
