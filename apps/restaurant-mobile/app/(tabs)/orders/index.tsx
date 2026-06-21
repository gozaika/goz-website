import { ApiError } from "@gozaika/mobile-core";
import { Badge, Card, EmptyState, ErrorState, OfflineBanner, Screen, Text, palette } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useCounterOrders } from "@/api/counter";
import { useAuth } from "@/auth/useAuth";
import { orderStatusLabel, orderStatusTone } from "@/counter/status";

function pickupWindowLabel(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

export default function CounterScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCounterOrders(selectedRestaurantPk);

  const offline = isError && error instanceof ApiError && error.code === "NETWORK";
  const orders = data?.orders ?? [];

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState
          title="Select a restaurant"
          message="Choose a restaurant from Home to see its pickup queue."
        />
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

  return (
    <Screen>
      <OfflineBanner offline={offline} />
      <Text variant="title">Pickup counter</Text>
      <Text variant="body" color={palette.muted}>
        Verify paid, pickup-ready BAM Bag orders with the customer OTP. Mark true no-shows after the window and log
        incidents.
      </Text>

      {orders.length === 0 ? (
        <EmptyState title="No orders yet" message="Paid pickup-ready orders for this restaurant appear here." />
      ) : (
        orders.map((order) => (
          <Link key={order.orderPk} href={`/orders/${order.orderPk}`} asChild>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open order ${order.orderNumber}`}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text variant="heading">{order.orderNumber}</Text>
                  <Badge label={orderStatusLabel(order.orderStatusCode)} tone={orderStatusTone(order.orderStatusCode)} />
                </View>
                <Text variant="body">{order.bagDisplayName}</Text>
                <Text variant="caption" color={palette.muted}>
                  {order.dietaryCategoryCode} · {order.spiceLevelCode} · Qty {order.quantity}
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
            </Pressable>
          </Link>
        ))
      )}

      {isRefetching ? <ActivityIndicator color={palette.forest} /> : null}
    </Screen>
  );
}
