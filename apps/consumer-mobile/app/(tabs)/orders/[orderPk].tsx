import { ApiError } from "@gozaika/mobile-core";
import { Badge, Button, Card, EmptyState, ErrorState, palette, Screen, Skeleton, spacing, Text, toneColors } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useOrder, useResendPickup } from "@/api/orders";

const PRE_PICKUP = ["PAID", "CONFIRMED", "READY_FOR_PICKUP"];

function Row({ label, value }: { readonly label: string; readonly value: string | null }) {
  return value ? (
    <View style={{ gap: 2 }}>
      <Text variant="caption" color={palette.muted}>
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  ) : null;
}

export default function OrderDetailScreen() {
  const { orderPk } = useLocalSearchParams<{ orderPk: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(orderPk ?? null);
  const resend = useResendPickup(orderPk ?? null);

  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={100} />
      </Screen>
    );
  }
  if (isError || !order) {
    return (
      <Screen scroll={false}>
        <ErrorState message={error instanceof ApiError ? error.message : "Could not load this order."} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const collected = order.orderStatusCode === "COLLECTED";
  const awaitingPickup = PRE_PICKUP.includes(order.orderStatusCode);

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text variant="title">{order.bagDisplayName}</Text>
        <Badge label={order.orderStatusCode.replaceAll("_", " ")} tone={collected ? "success" : "info"} />
      </View>
      <Text variant="caption" color={palette.muted}>
        {order.restaurantName} · {order.orderNumber}
      </Text>

      {/* Pickup proof — delivered by SMS so it can be forwarded to whoever collects. */}
      {awaitingPickup ? (
        <Card>
          <Text variant="heading">Show your pickup code</Text>
          <Text variant="body" color={palette.muted}>
            We've texted your 6-digit pickup code to your phone. Show it at {order.restaurantName} during the pickup
            window — or forward the text to whoever is collecting your bag.
          </Text>
          <Button
            label="Resend pickup code"
            variant="secondary"
            accent={palette.saffron}
            loading={resend.isPending}
            onPress={() => resend.mutate()}
          />
          {resend.isSuccess ? (
            <View style={{ backgroundColor: toneColors("success").bg, borderRadius: 10, padding: 10 }}>
              <Text variant="caption" color={toneColors("success").fg}>
                {resend.data.message}
              </Text>
            </View>
          ) : null}
          {resend.isError ? (
            <Text variant="caption" color={palette.dangerFg}>
              {resend.error instanceof ApiError ? resend.error.message : "Could not resend. Please try again."}
            </Text>
          ) : null}
        </Card>
      ) : collected ? (
        <Card>
          <Text variant="heading" color={toneColors("success").fg}>
            Collected
          </Text>
          <Text variant="body" color={palette.muted}>
            Enjoy your meal! This order was collected{order.collectedAt ? ` on ${new Date(order.collectedAt).toLocaleString("en-IN")}` : ""}.
          </Text>
        </Card>
      ) : (
        <EmptyState title="Pickup unavailable" message="This order's pickup window is closed." />
      )}

      <Card>
        <Row label="Pickup window" value={`${new Date(order.pickupWindowStartAt).toLocaleString("en-IN")} → ${new Date(order.pickupWindowEndAt).toLocaleTimeString("en-IN")}`} />
        <Row label="Pickup instructions" value={order.pickupInstructions} />
        <Row label="Dietary" value={[order.dietaryCategoryCode, order.spiceLevelCode].filter(Boolean).join(" · ")} />
        <Row label="Allergens" value={order.allergenSummaryText} />
        <Row label="Quantity" value={String(order.quantity)} />
        <Text variant="label">{formatPaise(order.paidAmountPaise)} paid</Text>
      </Card>
    </Screen>
  );
}
