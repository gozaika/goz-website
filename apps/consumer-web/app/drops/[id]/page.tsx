import { AllergenChips, CountdownChip, DietaryBadge, DropShareActions, ProgressBar, ShellHeader } from "@gozaika/ui";
import { createPublicDropUrl, formatPaise, formatPickupWindow, generateManualDropAlertText } from "@gozaika/utils";
import { notFound } from "next/navigation";
import { loadPublicDrop } from "@/lib/drops";
import { createClient } from "@/lib/supabase/server";
import { ClaimPanel } from "./claim-panel";
import { ConsumerNavLinks } from "../../consumer-nav";

export const dynamic = "force-dynamic";

export default async function DropDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams?: Promise<{ readonly claim?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const drop = await loadPublicDrop(id);

  if (!drop) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const serves =
    drop.servesMin && drop.servesMax
      ? drop.servesMin === drop.servesMax
        ? `Serves ${drop.servesMin}`
        : `Serves ${drop.servesMin}-${drop.servesMax}`
      : "Serving guidance pending";
  const publicDropUrl = createPublicDropUrl(drop.dropPk);
  const alertText = generateManualDropAlertText(drop, publicDropUrl);

  return (
    <main id="main-content">
      <ShellHeader>
        <ConsumerNavLinks />
      </ShellHeader>
      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[1fr_0.75fr]">
        <div>
          <p className="text-sm font-bold uppercase text-forest">{drop.restaurantName}</p>
          <h1 className="mt-2 text-4xl font-bold text-charcoal">{drop.bagDisplayName}</h1>
          {drop.bagShortDescription ? <p className="mt-3 text-lg text-muted">{drop.bagShortDescription}</p> : null}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <DietaryBadge code={drop.dietaryCategoryCode} />
            {drop.spiceLevelCode ? (
              <span className="rounded-full border border-gold/50 px-2.5 py-1 text-xs font-semibold text-gold-text">
                {drop.spiceLevelCode.replaceAll("_", " ")}
              </span>
            ) : null}
            <span className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold text-muted">
              Pickup only
            </span>
            <CountdownChip targetTime={drop.pickupEndAt} />
          </div>

          <section className="mt-8 rounded-lg border border-hairline bg-white p-5">
            <h2 className="text-lg font-semibold">Disclosure</h2>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-sm font-semibold text-muted">Allergens</p>
                <div className="mt-2">
                  <AllergenChips codes={drop.allergenCodes} />
                </div>
                {drop.allergenSummaryText ? (
                  <p className="mt-2 text-sm font-medium text-danger">{drop.allergenSummaryText}</p>
                ) : null}
              </div>
              <div className="grid gap-3 text-sm text-muted sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-charcoal">Serves:</span> {serves}
                </p>
                <p>
                  <span className="font-semibold text-charcoal">Pickup:</span>{" "}
                  {formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}
                </p>
                {drop.maxHoldingMinutes ? (
                  <p>
                    <span className="font-semibold text-charcoal">Consume by:</span> within {drop.maxHoldingMinutes} minutes
                  </p>
                ) : null}
                {drop.minMenuValuePaise ? (
                  <p>
                    <span className="font-semibold text-charcoal">Minimum menu value:</span>{" "}
                    {formatPaise(drop.minMenuValuePaise)}
                  </p>
                ) : null}
              </div>
              {drop.holdingGuidanceText ? <p className="text-sm text-muted">{drop.holdingGuidanceText}</p> : null}
            </div>
          </section>
        </div>

        <div className="h-fit rounded-lg border border-hairline bg-white p-5">
          <p className="text-sm font-semibold text-muted">BAM Bag price</p>
          <p className="mt-1 text-4xl font-bold text-charcoal">{formatPaise(drop.pricePaise)}</p>
          <div className="mt-5">
            <ProgressBar available={drop.quantityAvailable} total={drop.quantityTotal} />
            <p className="mt-2 text-sm font-semibold text-muted">
              {drop.quantityAvailable} of {drop.quantityTotal} bags remaining
            </p>
          </div>
          <ClaimPanel drop={drop} isSignedIn={Boolean(user)} autoClaim={query?.claim === "1"} />
          <DropShareActions publicUrl={publicDropUrl} shareText={alertText} className="mt-3" />
          <p className="mt-3 text-xs text-muted">
            Holds are temporary inventory reservations. Pay from checkout before the timer expires to confirm pickup.
          </p>
        </div>
      </section>
    </main>
  );
}
