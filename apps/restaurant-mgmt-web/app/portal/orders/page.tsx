import type { NotificationSummary, RestaurantOrderSummary } from "@gozaika/types";
import { redirect } from "next/navigation";
import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { getPortalActor } from "@/lib/portal-auth";
import { loadActiveRestaurantsForProfile } from "@/lib/slice3";
import { createClient } from "@/lib/supabase/server";
import { loadRestaurantPickupOrders } from "@/lib/restaurant-orders";
import { PortalChrome } from "../portal-nav";
import { OrdersClient } from "./orders-client";

type NotificationSummaryRow = {
  readonly notification_outbox_pk: string;
  readonly order_pk: string | null;
  readonly order_number: string | null;
  readonly restaurant_fk: string | null;
  readonly restaurant_name: string | null;
  readonly template_code: string;
  readonly audience_code: string;
  readonly channel_code: NotificationSummary["channelCode"];
  readonly send_status_code: NotificationSummary["sendStatusCode"];
  readonly provider_code: string | null;
  readonly delivery_reason_code: string | null;
  readonly scheduled_at: string;
  readonly sent_at: string | null;
  readonly next_attempt_at: string | null;
  readonly retry_count: number | string;
  readonly max_attempts: number | string;
  readonly last_attempt_status_code: NotificationSummary["lastAttemptStatusCode"];
  readonly last_attempt_at: string | null;
  readonly last_error_code: string | null;
  readonly last_error_text: string | null;
  readonly manual_fallback_text: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

function mapNotification(row: NotificationSummaryRow): NotificationSummary {
  return {
    notificationOutboxPk: row.notification_outbox_pk,
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    templateCode: row.template_code,
    audienceCode: row.audience_code,
    channelCode: row.channel_code,
    sendStatusCode: row.send_status_code,
    providerCode: row.provider_code,
    deliveryReasonCode: row.delivery_reason_code,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    nextAttemptAt: row.next_attempt_at,
    retryCount: Number(row.retry_count),
    maxAttempts: Number(row.max_attempts),
    lastAttemptStatusCode: row.last_attempt_status_code,
    lastAttemptAt: row.last_attempt_at,
    lastErrorCode: row.last_error_code,
    lastErrorText: row.last_error_text,
    manualFallbackText: row.manual_fallback_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurants = await loadActiveRestaurantsForProfile(actor.profilePk);
  if (restaurants.length === 0) redirect("/portal/onboarding");
  const restaurantPks = restaurants.map((restaurant) => restaurant.restaurantPk);

  const supabase = await createClient();
  let orders: RestaurantOrderSummary[] = await loadRestaurantPickupOrders({
    viewClient: supabase,
    serviceClient: createServiceRoleSupabaseClient(),
    restaurantPks,
  });

  const orderPks = orders.map((order) => order.orderPk);
  if (orderPks.length > 0) {
    const { data: notificationData, error: notificationError } = await supabase
      .from("api_restaurant_notification_summary")
      .select("*")
      .in("order_pk", orderPks)
      .order("created_at", { ascending: false });

    if (!notificationError) {
      const notificationsByOrder = new Map<string, NotificationSummary[]>();
      for (const notification of ((notificationData ?? []) as NotificationSummaryRow[]).map(mapNotification)) {
        if (!notification.orderPk) continue;
        notificationsByOrder.set(notification.orderPk, [...(notificationsByOrder.get(notification.orderPk) ?? []), notification]);
      }
      orders = orders.map((order) => ({
        ...order,
        notifications: notificationsByOrder.get(order.orderPk) ?? [],
      }));
    }
  }

  return (
    <PortalChrome restaurantName={restaurants[0]?.restaurantName} statusCode="ACTIVE">
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
    </PortalChrome>
  );
}
