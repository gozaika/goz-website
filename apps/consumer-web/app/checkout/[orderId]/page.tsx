import { AllergenChips, DietaryBadge, ShellHeader } from "@gozaika/ui";
import { formatPaise, formatPickupWindow } from "@gozaika/utils";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadClaimIntent } from "@/lib/claims";
import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { createClient } from "@/lib/supabase/server";
import { HoldCountdown } from "./hold-countdown";
import { RazorpayCheckoutPanel } from "./razorpay-checkout-panel";
import { ConsumerNavLinks } from "../../consumer-nav";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/checkout/${orderId}`)}`);
  }

  const claim = await loadClaimIntent(orderId);
  if (!claim) {
    notFound();
  }

  if (claim.statusCode === "CONVERTED") {
    const service = createServiceRoleSupabaseClient();
    const { data: order } = await service
      .from("order_order")
      .select("order_order_pk")
      .eq("drop_inventory_hold_fk", claim.holdPk)
      .maybeSingle();
    if (order?.order_order_pk) {
      redirect(`/orders/${order.order_order_pk}`);
    }
  }

  const expiresAtText = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(claim.expiresAt));
  const serves =
    claim.servesMin && claim.servesMax
      ? claim.servesMin === claim.servesMax
        ? `Serves ${claim.servesMin}`
        : `Serves ${claim.servesMin}-${claim.servesMax}`
      : "Serving guidance pending";
  const paymentDisabledReason =
    claim.statusCode !== "ACTIVE"
      ? claim.statusCode === "CONVERTED"
        ? "This hold has already been converted to an order."
        : "This hold is no longer active. Return to the drop to create a new hold."
      : undefined;

  return (
    <main id="main-content">
      <ShellHeader>
        <ConsumerNavLinks />
      </ShellHeader>
      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_0.75fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Checkout</p>
          <h1 className="mt-2 text-3xl font-bold text-[#2D2D2D]">Pay for your held BAM Bag</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#2D2D2D]/70">
            Your hold reserves availability until the timer expires. The order becomes confirmed only after Razorpay sends a
            verified payment webhook to goZaika.
          </p>

          <section className="mt-6 rounded-lg border border-black/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1A5C38]">{claim.restaurantName}</p>
                <h2 className="mt-1 text-2xl font-bold text-[#2D2D2D]">{claim.bagDisplayName}</h2>
                {claim.bagShortDescription ? (
                  <p className="mt-2 text-sm text-[#2D2D2D]/70">{claim.bagShortDescription}</p>
                ) : null}
              </div>
              <DietaryBadge code={claim.dietaryCategoryCode} />
            </div>

            <div className="mt-5 grid gap-4 text-sm text-[#2D2D2D]/75 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-[#2D2D2D]">Pickup:</span>{" "}
                {formatPickupWindow(claim.pickupStartAt, claim.pickupEndAt)}
              </p>
              <p>
                <span className="font-semibold text-[#2D2D2D]">Quantity held:</span> {claim.quantityHeld}
              </p>
              <p>
                <span className="font-semibold text-[#2D2D2D]">Listed price:</span>{" "}
                {formatPaise(claim.pricePaise)}
              </p>
              <p>
                <span className="font-semibold text-[#2D2D2D]">Serves:</span> {serves}
              </p>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-[#2D2D2D]">Allergens</p>
              <div className="mt-2">
                <AllergenChips codes={claim.allergenCodes} />
              </div>
              {claim.allergenSummaryText ? (
                <p className="mt-2 text-sm font-medium text-[#B42318]">{claim.allergenSummaryText}</p>
              ) : null}
            </div>

            {claim.holdingGuidanceText ? <p className="mt-5 text-sm text-[#2D2D2D]/70">{claim.holdingGuidanceText}</p> : null}
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-black/10 bg-white p-5">
          <p className="text-sm font-semibold text-[#2D2D2D]/60">Hold status</p>
          <p className="mt-1 text-2xl font-bold text-[#2D2D2D]">{claim.statusCode === "ACTIVE" ? "Hold active" : claim.statusCode}</p>
          <div className="mt-5 rounded-lg border border-[#1A5C38]/20 bg-[#F2F8EF] p-4 text-sm">
            <p>
              <HoldCountdown expiresAt={claim.expiresAt} />
            </p>
            <p className="mt-2 text-[#2D2D2D]/70">Expires at {expiresAtText} IST.</p>
          </div>
          <p className="mt-4 text-sm text-[#2D2D2D]/70">
            If this hold expires before payment is confirmed, the release job returns the bag to the drop.
          </p>
          <RazorpayCheckoutPanel
            holdPk={claim.holdPk}
            expiresAt={claim.expiresAt}
            amountPaise={claim.pricePaise * claim.quantityHeld}
            disabledReason={paymentDisabledReason}
          />
          <div className="mt-5 grid gap-2">
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1A5C38] px-4 text-sm font-semibold text-white" href={`/drops/${claim.dropPk}`}>
              Back to drop
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#1A5C38]/25 px-4 text-sm font-semibold text-[#1A5C38]" href="/account">
              View account holds
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
