import { ApiError } from "@gozaika/mobile-core";
import { Badge, Card, EmptyState, ErrorState, OfflineBanner, Screen, Text, palette } from "@gozaika/mobile-ui";
import type { CounterOrder } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useCounterOrders } from "@/api/counter";
import { useAuth } from "@/auth/useAuth";
import { OrderActionsPanel } from "@/counter/OrderActionsPanel";
import { orderStatusLabel, orderStatusTone } from "@/counter/status";

/** Tablet landscape threshold for the master-detail split. */
const MASTER_DETAIL_MIN_WIDTH = 900;

function pickupWindowLabel(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

function OrderCardBody({ order }: { readonly order: CounterOrder }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text variant="heading">{order.orderNumber}</Text>
        <Badge label={orderStatusLabel(order.orderStatusCode)} tone={orderStatusTone(order.orderStatusCode)} />
      </View>
      <Text variant="body">{order.bagDisplayName}</Text>
      <Text variant="caption" color={palette.muted}>
        {order.dietaryCategoryCode}
        {order.spiceLevelCode ? ` · ${order.spiceLevelCode}` : ""} · Qty {order.quantity}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text variant="caption" color={palette.muted}>
          Pickup {pickupWindowLabel(order.pickupWindowStartAt, order.pickupWindowEndAt)}
        </Text>
        <Text variant="label">{formatPaise(order.paidAmountPaise)}</Text>
      </View>
      {order.incidentCount > 0 ? (
        <Badge label={`${order.incidentCount} incident${order.incidentCount > 1 ? "s" : ""}`} tone="warning" />
      ) : null}
    </Card>
  );
}

export default function CounterScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { width } = useWindowDimensions();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCounterOrders(selectedRestaurantPk);
  const [selectedOrderPk, setSelectedOrderPk] = useState<string | null>(null);

  const offline = isError && error instanceof ApiError && error.code === "NETWORK";
  const orders = data?.orders ?? [];
  const masterDetail = width >= MASTER_DETAIL_MIN_WIDTH;

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from Home to see its pickup queue." />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen contentStyle={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={palette.forest} />
        <Text variant="body" color={palette.muted}>
          Loading the pickup queue…
        </Text>
      </Screen>
    );
  }

  if (isError && orders.length === 0) {
    return (
      <Screen>
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load the pickup queue."}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  const header = (
    <>
      <OfflineBanner offline={offline} />
      <Text variant="title">Pickup counter</Text>
      <Text variant="body" color={palette.muted}>
        Verify paid, pickup-ready BAM Bag orders with the QR or OTP. Mark true no-shows after the window and log
        incidents.
      </Text>
    </>
  );

  const emptyState = <EmptyState title="No orders yet" message="Paid pickup-ready orders for this restaurant appear here." />;

  // Tablet: list on the left, live order detail on the right.
  if (masterDetail) {
    const activePk = selectedOrderPk ?? orders[0]?.orderPk ?? null;
    return (
      <Screen scroll={false} contentStyle={{ padding: 0 }}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <ScrollView style={{ flex: 1, borderRightWidth: 1, borderRightColor: palette.border }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {header}
            {orders.length === 0
              ? emptyState
              : orders.map((order) => (
                  <Pressable
                    key={order.orderPk}
                    accessibilityRole="button"
                    accessibilityState={{ selected: order.orderPk === activePk }}
                    onPress={() => setSelectedOrderPk(order.orderPk)}
                    style={{ opacity: order.orderPk === activePk ? 1 : 0.7 }}
                  >
                    <OrderCardBody order={order} />
                  </Pressable>
                ))}
          </ScrollView>
          <ScrollView style={{ flex: 1.3 }} contentContainerStyle={{ padding: 16 }}>
            {activePk ? (
              <OrderActionsPanel orderId={activePk} />
            ) : (
              <EmptyState title="Select an order" message="Pick an order from the queue to verify it." />
            )}
          </ScrollView>
        </View>
      </Screen>
    );
  }

  // Phone: tap navigates to the detail route.
  return (
    <Screen>
      {header}
      {orders.length === 0
        ? emptyState
        : orders.map((order) => (
            <Link key={order.orderPk} href={`/orders/${order.orderPk}`} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={`Open order ${order.orderNumber}`}>
                <OrderCardBody order={order} />
              </Pressable>
            </Link>
          ))}
      {isRefetching ? <ActivityIndicator color={palette.forest} /> : null}
    </Screen>
  );
}
