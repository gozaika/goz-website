import { ApiError } from "@gozaika/mobile-core";
import { Badge, Card, EmptyState, ErrorState, palette, Screen, Skeleton, spacing, Text, type StatusTone } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { Link, useRouter } from "expo-router";
import { View } from "react-native";
import { useOrders } from "@/api/orders";
import { useAuth } from "@/auth/useAuth";

function statusTone(code: string): StatusTone {
  switch (code) {
    case "COLLECTED":
      return "success";
    case "READY_FOR_PICKUP":
    case "PAID":
    case "CONFIRMED":
      return "info";
    case "NO_SHOW":
    case "CANCELLED":
    case "PICKUP_EXPIRED":
      return "danger";
    default:
      return "neutral";
  }
}

function windowLabel(startIso: string, endIso: string): string {
  const day = new Date(startIso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const t = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${day} · ${t(startIso)}–${t(endIso)}`;
}

export default function OrdersScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useOrders();
  const orders = data?.orders ?? [];

  if (!session) {
    return (
      <Screen scroll={false}>
        <EmptyState
          title="Your orders"
          message="Sign in to see your paid orders and pickup codes."
          actionLabel="Sign in"
          onAction={() => router.push("/auth/login")}
        />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={80} />
        <Skeleton height={80} />
      </Screen>
    );
  }
  if (isError && orders.length === 0) {
    return (
      <Screen scroll={false}>
        <ErrorState message={error instanceof ApiError ? error.message : "Could not load your orders."} onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Your orders</Text>
      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          message="Claim a BAM Bag from a drop — your paid orders appear here."
          actionLabel="Browse drops"
          onAction={() => router.push("/(tabs)/drops")}
        />
      ) : (
        orders.map((o) => (
          <Link key={o.orderPk} href={`/(tabs)/orders/${o.orderPk}`} asChild>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text variant="heading">{o.bagDisplayName}</Text>
                <Badge label={o.orderStatusCode.replaceAll("_", " ")} tone={statusTone(o.orderStatusCode)} />
              </View>
              <Text variant="caption" color={palette.muted}>
                {o.restaurantName}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="caption" color={palette.muted}>
                  Pickup {windowLabel(o.pickupWindowStartAt, o.pickupWindowEndAt)}
                </Text>
                <Text variant="label">{formatPaise(o.paidAmountPaise)}</Text>
              </View>
            </Card>
          </Link>
        ))
      )}
    </Screen>
  );
}
