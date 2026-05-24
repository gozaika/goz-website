import { AllergenChips, DietaryBadge, ShellHeader } from "@gozaika/ui";
import { formatPaise, formatPickupWindow } from "@gozaika/utils";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { issuePickupProof, loadConsumerOrder } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import { PickupProofCard } from "./pickup-proof-card";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/orders/${orderId}`)}`);
  }

  const order = await loadConsumerOrder(orderId);
  if (!order) {
    notFound();
  }

  const pickupTerminal = order.orderStatusCode === "COLLECTED" || order.orderStatusCode === "NO_SHOW";
  let proof = null;
  let proofUnavailableMessage = "";
  if (!pickupTerminal) {
    try {
      proof = await issuePickupProof(order);
    } catch (caught) {
      console.error("pickup_proof_issue_failed", {
        reason: caught instanceof Error && caught.message.includes("PICKUP_CREDENTIAL_SECRET") ? "missing_secret" : "issue_failed",
      });
      proofUnavailableMessage =
        caught instanceof Error && caught.message.includes("PICKUP_CREDENTIAL_SECRET")
          ? "Pickup proof is not configured for this environment yet. Please contact goZaika support before heading to pickup."
          : "Pickup proof is not ready yet. Refresh this page or contact goZaika support before heading to pickup.";
    }
  }
  const capturedAtText = order.paymentCapturedAt
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(
        new Date(order.paymentCapturedAt),
      )
    : "Captured";

  return (
    <main>
      <ShellHeader />
      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_0.75fr]">
        <div className="grid gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">
              {order.orderStatusCode === "COLLECTED"
                ? "Order collected"
                : order.orderStatusCode === "NO_SHOW"
                  ? "Pickup missed"
                  : "Order confirmed"}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#2D2D2D]">{order.orderNumber}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#2D2D2D]/70">
              {order.orderStatusCode === "COLLECTED"
                ? "This BAM Bag was collected at the restaurant. Pickup proof is now closed."
                : order.orderStatusCode === "NO_SHOW"
                  ? "This pickup was marked no-show after the pickup window closed. No automatic refund is promised from this state."
                  : "Payment is captured and your BAM Bag is confirmed for pickup. Keep the dietary and allergen details visible before heading to the restaurant."}
            </p>
          </div>

          <section className="rounded-lg border border-black/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1A5C38]">{order.restaurantName}</p>
                <h2 className="mt-1 text-2xl font-bold text-[#2D2D2D]">{order.bagDisplayName}</h2>
                <p className="mt-1 text-sm text-[#2D2D2D]/65">{order.dropTitle}</p>
              </div>
              <DietaryBadge code={order.dietaryCategoryCode} />
            </div>

            <dl className="mt-5 grid gap-4 text-sm text-[#2D2D2D]/75 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-[#2D2D2D]">Pickup window</dt>
                <dd>{formatPickupWindow(order.pickupWindowStartAt, order.pickupWindowEndAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#2D2D2D]">Paid amount</dt>
                <dd>{formatPaise(order.paidAmountPaise)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#2D2D2D]">Quantity</dt>
                <dd>{order.quantity}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#2D2D2D]">Payment</dt>
                <dd>
                  {order.paymentStatusCode} - {capturedAtText}
                </dd>
              </div>
              {order.servesText ? (
                <div>
                  <dt className="font-semibold text-[#2D2D2D]">Serves</dt>
                  <dd>{order.servesText}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-semibold text-[#2D2D2D]">Status</dt>
                <dd>{order.orderStatusCode.replaceAll("_", " ")}</dd>
              </div>
              {order.collectedAt ? (
                <div>
                  <dt className="font-semibold text-[#2D2D2D]">Collected</dt>
                  <dd>{new Date(order.collectedAt).toLocaleString("en-IN")}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-5">
              <p className="text-sm font-semibold text-[#2D2D2D]">Allergens</p>
              <div className="mt-2">
                <AllergenChips codes={order.allergenCodes} />
              </div>
              {order.allergenSummaryText ? (
                <p className="mt-2 text-sm font-medium text-[#B42318]">{order.allergenSummaryText}</p>
              ) : null}
            </div>
          </section>

          {proof ? (
            <PickupProofCard proof={proof} />
          ) : (
            <section className="rounded-lg border border-[#1A5C38]/20 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#1A5C38]">
                {pickupTerminal ? "Pickup proof closed" : "Pickup proof unavailable"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#2D2D2D]/70">
                {pickupTerminal
                  ? "QR and OTP pickup proof are no longer usable after an order is collected or marked no-show."
                  : proofUnavailableMessage}
              </p>
            </section>
          )}
        </div>

        <aside className="h-fit rounded-lg border border-black/10 bg-white p-5">
          <p className="text-sm font-semibold text-[#2D2D2D]/60">Pickup instructions</p>
          <p className="mt-2 text-sm leading-6 text-[#2D2D2D]/75">
            {order.pickupInstructions ?? "Show your pickup proof at the restaurant counter during the pickup window."}
          </p>
          <div className="mt-5 rounded-lg border border-[#1A5C38]/20 bg-[#F2F8EF] p-4 text-sm text-[#2D2D2D]/75">
            <p className="font-semibold text-[#1A5C38]">Food safety check</p>
            <p className="mt-2">
              Confirm the restaurant name, dietary badge, and allergen disclosure before pickup. Ask staff before collecting if
              anything looks different.
            </p>
          </div>
          <div className="mt-5 grid gap-2">
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1A5C38] px-4 text-sm font-semibold text-white" href="/account">
              View account
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#1A5C38]/25 px-4 text-sm font-semibold text-[#1A5C38]" href="/drops">
              Browse more drops
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
