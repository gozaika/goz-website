import { ShellHeader } from "@gozaika/ui";
import type { RestaurantOrderSummary } from "@gozaika/types";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant } from "@/lib/slice3";
import { createClient } from "@/lib/supabase/server";
import { PortalNav } from "../portal-nav";
import { OrdersClient } from "./orders-client";

type PickupOrderRow = {
  readonly order_pk: string;
  readonly order_number: string;
  readonly restaurant_fk: string;
  readonly drop_fk: string;
  readonly order_status_code: RestaurantOrderSummary["orderStatusCode"];
  readonly payment_status_code: string;
  readonly restaurant_name: string;
  readonly drop_title: string;
  readonly bag_display_name: string;
  readonly dietary_category_code: RestaurantOrderSummary["dietaryCategoryCode"];
  readonly spice_level_code: RestaurantOrderSummary["spiceLevelCode"];
  readonly allergen_summary_text: string | null;
  readonly allergen_codes: readonly string[] | null;
  readonly quantity: number | string | null;
  readonly paid_amount_paise: number | string;
  readonly currency_code: string;
  readonly pickup_window_start_at: string;
  readonly pickup_window_end_at: string;
  readonly payment_intent_status_code: RestaurantOrderSummary["paymentIntentStatusCode"];
  readonly payment_captured_at: string | null;
  readonly collected_at: string | null;
  readonly pickup_verification_attempt_count: number | string;
  readonly last_pickup_verification_result_code: RestaurantOrderSummary["lastPickupVerificationResultCode"];
  readonly last_pickup_verification_at: string | null;
  readonly incident_count: number | string;
  readonly created_at: string;
  readonly updated_at: string;
};

function mapPickupOrder(row: PickupOrderRow): RestaurantOrderSummary {
  return {
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    restaurantPk: row.restaurant_fk,
    dropPk: row.drop_fk,
    orderStatusCode: row.order_status_code,
    paymentStatusCode: row.payment_status_code,
    restaurantName: row.restaurant_name,
    dropTitle: row.drop_title,
    bagDisplayName: row.bag_display_name,
    dietaryCategoryCode: row.dietary_category_code,
    spiceLevelCode: row.spice_level_code,
    allergenSummaryText: row.allergen_summary_text,
    allergenCodes: row.allergen_codes ?? [],
    quantity: Number(row.quantity ?? 1),
    paidAmountPaise: Number(row.paid_amount_paise),
    currencyCode: row.currency_code,
    pickupWindowStartAt: row.pickup_window_start_at,
    pickupWindowEndAt: row.pickup_window_end_at,
    paymentIntentStatusCode: row.payment_intent_status_code,
    paymentCapturedAt: row.payment_captured_at,
    collectedAt: row.collected_at,
    pickupVerificationAttemptCount: Number(row.pickup_verification_attempt_count ?? 0),
    lastPickupVerificationResultCode: row.last_pickup_verification_result_code,
    lastPickupVerificationAt: row.last_pickup_verification_at,
    incidentCount: Number(row.incident_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") redirect("/portal/onboarding");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_restaurant_pickup_order_summary")
    .select("*")
    .eq("restaurant_fk", restaurant.restaurantPk)
    .order("pickup_window_start_at", { ascending: false })
    .limit(60);

  if (error) {
    throw new Error("Could not load restaurant pickup orders.");
  }

  const orders = ((data ?? []) as PickupOrderRow[]).map(mapPickupOrder);

  return (
    <main>
      <ShellHeader>
        <PortalNav />
      </ShellHeader>
      <section className="px-4 py-6 sm:px-6">
        <h1 className="text-3xl font-bold">Pickup orders</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Verify paid pickup-ready BAM Bag orders with a customer OTP, paste a QR payload when needed, mark true no-shows
          after the pickup window, and log short pilot incidents.
        </p>
        <div className="mt-6">
          <OrdersClient initialOrders={orders} />
        </div>
      </section>
    </main>
  );
}
