import { AllergenChips, DietaryBadge, DropShareActions, ProgressBar, ShellHeader } from "@gozaika/ui";
import { createPublicDropUrl, formatPaise, formatPickupWindow, generateManualDropAlertText } from "@gozaika/utils";
import { notFound } from "next/navigation";
import { loadPublicDrop } from "@/lib/drops";
import { createClient } from "@/lib/supabase/server";
import { ClaimPanel } from "./claim-panel";

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
    <main>
      <ShellHeader />
      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[1fr_0.75fr]">
        <div>
          <p className="text-sm font-bold uppercase text-[#1A5C38]">{drop.restaurantName}</p>
          <h1 className="mt-2 text-4xl font-bold text-[#2D2D2D]">{drop.bagDisplayName}</h1>
          {drop.bagShortDescription ? <p className="mt-3 text-lg text-[#2D2D2D]/75">{drop.bagShortDescription}</p> : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <DietaryBadge code={drop.dietaryCategoryCode} />
            {drop.spiceLevelCode ? (
              <span className="rounded-full border border-[#D4A017]/50 px-2.5 py-1 text-xs font-semibold text-[#8A630E]">
                {drop.spiceLevelCode.replaceAll("_", " ")}
              </span>
            ) : null}
            <span className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold text-[#2D2D2D]/75">
              Pickup only
            </span>
          </div>

          <section className="mt-8 rounded-lg border border-black/10 bg-white p-5">
            <h2 className="text-lg font-semibold">Disclosure</h2>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-sm font-semibold text-[#2D2D2D]/65">Allergens</p>
                <div className="mt-2">
                  <AllergenChips codes={drop.allergenCodes} />
                </div>
                {drop.allergenSummaryText ? (
                  <p className="mt-2 text-sm font-medium text-[#B42318]">{drop.allergenSummaryText}</p>
                ) : null}
              </div>
              <div className="grid gap-3 text-sm text-[#2D2D2D]/75 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-[#2D2D2D]">Serves:</span> {serves}
                </p>
                <p>
                  <span className="font-semibold text-[#2D2D2D]">Pickup:</span>{" "}
                  {formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}
                </p>
                {drop.maxHoldingMinutes ? (
                  <p>
                    <span className="font-semibold text-[#2D2D2D]">Consume by:</span> within {drop.maxHoldingMinutes} minutes
                  </p>
                ) : null}
                {drop.minMenuValuePaise ? (
                  <p>
                    <span className="font-semibold text-[#2D2D2D]">Minimum menu value:</span>{" "}
                    {formatPaise(drop.minMenuValuePaise)}
                  </p>
                ) : null}
              </div>
              {drop.holdingGuidanceText ? <p className="text-sm text-[#2D2D2D]/70">{drop.holdingGuidanceText}</p> : null}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-black/10 bg-white p-5">
          <p className="text-sm font-semibold text-[#2D2D2D]/60">BAM Bag price</p>
          <p className="mt-1 text-4xl font-bold text-[#2D2D2D]">{formatPaise(drop.pricePaise)}</p>
          <div className="mt-5">
            <ProgressBar available={drop.quantityAvailable} total={drop.quantityTotal} />
            <p className="mt-2 text-sm font-semibold text-[#2D2D2D]/70">
              {drop.quantityAvailable} of {drop.quantityTotal} bags remaining
            </p>
          </div>
          <ClaimPanel drop={drop} isSignedIn={Boolean(user)} autoClaim={query?.claim === "1"} />
          <DropShareActions publicUrl={publicDropUrl} shareText={alertText} className="mt-3" />
          <p className="mt-3 text-xs text-[#2D2D2D]/60">
            Holds are temporary payment intents only. Payment capture, confirmed orders, QR codes, and refunds arrive in later slices.
          </p>
        </aside>
      </section>
    </main>
  );
}
