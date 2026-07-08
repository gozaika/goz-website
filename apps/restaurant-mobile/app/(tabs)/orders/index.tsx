import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  EmptyState,
  ErrorState,
  FilterChipRow,
  MetricHero,
  OfflineBanner,
  QueueCard,
  Screen,
  Skeleton,
  Text,
  palette,
  spacing,
} from "@gozaika/mobile-ui";
import type { CounterOrder } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useCounterOrders } from "@/api/counter";
import { useAuth } from "@/auth/useAuth";
import { OrderActionsPanel } from "@/counter/OrderActionsPanel";
import { orderStatusLabel, orderStatusTone } from "@/counter/status";

/** Tablet landscape threshold for the master-detail split. */
const MASTER_DETAIL_MIN_WIDTH = 900;

type QueueFilter = "all" | "active" | "collected" | "issues";

function pickupWindowLabel(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${fmt(startIso)} - ${fmt(endIso)}`;
}

function isActiveOrder(order: CounterOrder): boolean {
  return ["PAID", "CONFIRMED", "READY_FOR_PICKUP"].includes(order.orderStatusCode);
}

function isIssueOrder(order: CounterOrder): boolean {
  return order.incidentCount > 0 || ["NO_SHOW", "PICKUP_EXPIRED", "CANCELLED"].includes(order.orderStatusCode);
}

function filteredOrders(orders: readonly CounterOrder[], filter: QueueFilter): readonly CounterOrder[] {
  if (filter === "active") return orders.filter(isActiveOrder);
  if (filter === "collected") return orders.filter((order) => order.orderStatusCode === "COLLECTED");
  if (filter === "issues") return orders.filter(isIssueOrder);
  return orders;
}

function queueCounts(orders: readonly CounterOrder[]) {
  return {
    active: orders.filter(isActiveOrder).length,
    collected: orders.filter((order) => order.orderStatusCode === "COLLECTED").length,
    issues: orders.filter(isIssueOrder).length,
  };
}

function detailLines(order: CounterOrder): readonly string[] {
  const lines = [
    `${order.dietaryCategoryCode}${order.spiceLevelCode ? ` · ${order.spiceLevelCode}` : ""} · Qty ${order.quantity}`,
    `Pickup ${pickupWindowLabel(order.pickupWindowStartAt, order.pickupWindowEndAt)}`,
  ];
  if (order.pickupVerificationAttemptCount > 0) {
    lines.push(`${order.pickupVerificationAttemptCount} verification attempt${order.pickupVerificationAttemptCount > 1 ? "s" : ""}`);
  }
  if (order.isReorder) {
    lines.push("↻ Reorder — full-price Order Again");
  }
  return lines;
}

function OrderQueueCard({
  order,
  selected = false,
  onPress,
}: {
  readonly order: CounterOrder;
  readonly selected?: boolean;
  readonly onPress?: () => void;
}) {
  return (
    <QueueCard
      orderNumber={order.orderNumber}
      title={order.bagDisplayName}
      statusLabel={orderStatusLabel(order.orderStatusCode)}
      statusTone={orderStatusTone(order.orderStatusCode)}
      detailLines={detailLines(order)}
      amountLabel={formatPaise(order.paidAmountPaise)}
      incidentLabel={order.incidentCount > 0 ? `${order.incidentCount} incident${order.incidentCount > 1 ? "s" : ""}` : undefined}
      selected={selected}
      onPress={onPress}
      accent={palette.forest}
    />
  );
}

export default function CounterScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { width } = useWindowDimensions();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCounterOrders(selectedRestaurantPk);
  const [selectedOrderPk, setSelectedOrderPk] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("active");

  const offline = isError && error instanceof ApiError && error.code === "NETWORK";
  const orders = data?.orders ?? [];
  const counts = useMemo(() => queueCounts(orders), [orders]);
  const visibleOrders = useMemo(() => filteredOrders(orders, filter), [filter, orders]);
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
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={148} />
        <Skeleton height={96} />
        <Skeleton height={96} />
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

  const activePk = selectedOrderPk ?? visibleOrders[0]?.orderPk ?? orders[0]?.orderPk ?? null;
  const emptyState = (
    <EmptyState
      title={orders.length === 0 ? "No orders yet" : "No matching orders"}
      message={orders.length === 0 ? "Paid pickup-ready orders for this restaurant appear here." : "Try a different queue filter."}
    />
  );

  const header = (
    <>
      <OfflineBanner offline={offline} />
      <MetricHero
        eyebrow="Pickup counter"
        title="Ready now"
        value={String(counts.active)}
        helper={`${counts.collected} collected · ${counts.issues} issue${counts.issues === 1 ? "" : "s"}`}
        badgeLabel={isRefetching ? "Refreshing" : `${orders.length} total`}
        badgeTone={isRefetching ? "info" : "neutral"}
        accent={palette.forest}
      >
        <Text color={palette.muted}>
          Verify paid BAM Bag pickups with QR or OTP. Server verification remains the source of truth.
        </Text>
      </MetricHero>
      <FilterChipRow
        accessibilityLabel="Counter queue filters"
        accent={palette.forest}
        chips={[
          { id: "active", label: `Ready ${counts.active}`, selected: filter === "active" },
          { id: "all", label: `All ${orders.length}`, selected: filter === "all" },
          { id: "collected", label: `Collected ${counts.collected}`, selected: filter === "collected" },
          { id: "issues", label: `Issues ${counts.issues}`, selected: filter === "issues" },
        ]}
        onSelect={(id) => setFilter(id as QueueFilter)}
      />
    </>
  );

  // Tablet: list on the left, live order detail on the right.
  if (masterDetail) {
    return (
      <Screen scroll={false} contentStyle={{ padding: 0 }}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <ScrollView
            style={{ flex: 1, borderRightWidth: 1, borderRightColor: palette.border }}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          >
            {header}
            {visibleOrders.length === 0
              ? emptyState
              : visibleOrders.map((order) => (
                  <OrderQueueCard
                    key={order.orderPk}
                    order={order}
                    selected={order.orderPk === activePk}
                    onPress={() => setSelectedOrderPk(order.orderPk)}
                  />
                ))}
          </ScrollView>
          <ScrollView style={{ flex: 1.3 }} contentContainerStyle={{ padding: spacing.lg }}>
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
      {visibleOrders.length === 0
        ? emptyState
        : visibleOrders.map((order) => (
            <Link key={order.orderPk} href={`/orders/${order.orderPk}`} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={`Open order ${order.orderNumber}`}>
                <OrderQueueCard order={order} />
              </Pressable>
            </Link>
          ))}
      {isRefetching ? (
        <View style={{ alignItems: "center" }}>
          <ActivityIndicator color={palette.forest} />
          <Badge label="Refreshing queue" tone="info" />
        </View>
      ) : null}
    </Screen>
  );
}
