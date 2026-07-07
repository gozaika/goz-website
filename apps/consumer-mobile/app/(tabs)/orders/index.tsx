import { ApiError } from "@gozaika/mobile-core";
import { Badge, Card, EmptyState, ErrorState, palette, Screen, Skeleton, spacing, Text, toneColors, type StatusTone } from "@gozaika/mobile-ui";
import type { ConsumerOrderDto } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { Link, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useOrders } from "@/api/orders";
import { useAuth } from "@/auth/useAuth";
import { usePeekBarInset } from "@/ui/peekBarInset";

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

function statusLabel(code: string): string {
  return code.replaceAll("_", " ");
}

function windowLabel(startIso: string, endIso: string): string {
  const day = new Date(startIso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const t = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${day} · ${t(startIso)}-${t(endIso)}`;
}

function isActiveOrder(order: ConsumerOrderDto): boolean {
  return ["PAID", "CONFIRMED", "READY_FOR_PICKUP"].includes(order.orderStatusCode) && new Date(order.pickupWindowEndAt).getTime() > Date.now();
}

function OrderCard({ order }: { readonly order: ConsumerOrderDto }) {
  const active = isActiveOrder(order);
  const tone = statusTone(order.orderStatusCode);
  const colors = toneColors(tone);

  return (
    <Card elevated={active ? "md" : "sm"} style={active ? { borderColor: colors.fg } : undefined}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{order.bagDisplayName}</Text>
          <Text variant="caption" color={palette.muted}>
            {order.restaurantName}
          </Text>
        </View>
        <Badge label={statusLabel(order.orderStatusCode)} tone={tone} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        <Text variant="caption" color={palette.muted}>
          Pickup {windowLabel(order.pickupWindowStartAt, order.pickupWindowEndAt)}
        </Text>
        <Text variant="label">{formatPaise(order.paidAmountPaise)}</Text>
      </View>
      {active ? (
        <Text variant="caption" color={colors.fg}>
          Pickup code is sent by SMS. Open for pickup instructions and resend.
        </Text>
      ) : null}
    </Card>
  );
}

export default function OrdersScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useOrders({ enabled: Boolean(session) });
  const orders = data?.orders ?? [];
  const activeCount = orders.filter(isActiveOrder).length;
  const peekInset = usePeekBarInset();

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
    <Screen contentStyle={{ gap: spacing.md, paddingBottom: spacing.xl + peekInset }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Your orders</Text>
        <Text color={palette.muted}>
          {activeCount > 0 ? `${activeCount} active pickup${activeCount === 1 ? "" : "s"}` : "Paid orders and pickup history"}
        </Text>
      </View>
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
            <Pressable accessibilityRole="button" accessibilityLabel={`Open order ${o.orderNumber}`}>
              <OrderCard order={o} />
            </Pressable>
          </Link>
        ))
      )}
    </Screen>
  );
}
