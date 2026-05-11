import type { ButtonHTMLAttributes, ImgHTMLAttributes, ReactNode } from "react";
import { Clock, MapPin, ShieldCheck } from "lucide-react";
import type { PublicDropCard } from "@gozaika/types";
import { cn, dietaryBadgeLabel, formatPaise, formatPickupWindow } from "@gozaika/utils";

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
  heroBamBag: "/brand/hero-bam-bag.svg",
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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
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

export function DropCard({ drop, className }: { readonly drop: PublicDropCard; readonly className?: string }) {
  const soldOut = drop.quantityAvailable <= 0 || drop.statusCode === "SOLD_OUT";

  return (
    <article className={cn("relative overflow-hidden rounded-lg border border-black/10 bg-white p-4 shadow-sm", className)}>
      {soldOut ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-white/85 text-lg font-bold text-[#2D2D2D]">
          Sold out
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#1A5C38]">{drop.restaurantName}</p>
          <h3 className="mt-1 text-xl font-semibold text-[#2D2D2D]">Chef-curated BAM Bag</h3>
        </div>
        <DietaryBadge code={drop.dietaryCategoryCode} />
      </div>
      <div className="mt-4">
        <AllergenChips codes={drop.allergenCodes} />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-[#2D2D2D]/75">
        <div className="flex items-center gap-2">
          <Clock size={16} aria-hidden="true" />
          {formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} aria-hidden="true" />
          Pickup only
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} aria-hidden="true" />
          Allergens disclosed
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar available={drop.quantityAvailable} total={drop.quantityTotal} />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-2xl font-bold text-[#2D2D2D]">{formatPaise(drop.pricePaise)}</span>
        <Button disabled={soldOut}>{soldOut ? "Join waitlist" : "Claim"}</Button>
      </div>
    </article>
  );
}
