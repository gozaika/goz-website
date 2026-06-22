import { ApiError } from "@gozaika/mobile-core";
import { Badge, Button, Card, EmptyState, ErrorState, palette, Screen, Skeleton, spacing, Text, toneColors } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useCheckoutOrder, useCheckoutStatus, useSimulatePayment } from "@/api/checkout";

/**
 * Checkout for a hold (Slice 9). The server's `mode` decides the surface:
 * - "razorpay": the real Razorpay checkout (RN SDK/WebView) — wired here later; until
 *   keys are configured the order call returns a clear "not configured" message.
 * - "simulated": this discreet demo/test screen, shown only when the server has the
 *   payment simulator enabled. "Confirm payment" runs the gated server simulator,
 *   which goes through the canonical capture RPC → a real, server-authoritative order.
 * The client never marks itself paid; it polls `/checkout/status`.
 */
export default function CheckoutScreen() {
  const { holdPk } = useLocalSearchParams<{ holdPk: string }>();
  const router = useRouter();
  const hold = holdPk ?? null;

  const order = useCheckoutOrder(hold);
  const simulate = useSimulatePayment(hold);
  const [paid, setPaid] = useState(false);

  const status = useCheckoutStatus(hold, { enabled: paid, poll: paid });
  const confirmed = Boolean(status.data?.orderPk && status.data.orderStatusCode);
  const failed = simulate.data?.paymentIntentStatusCode === "FAILED";

  if (order.isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={120} />
        <Skeleton height={48} />
      </Screen>
    );
  }

  if (order.isError || !order.data) {
    const notConfigured = order.error instanceof ApiError && order.error.code === "SERVER_ERROR";
    return (
      <Screen scroll={false}>
        <ErrorState
          title={notConfigured ? "Payment not available yet" : "Checkout unavailable"}
          message={
            notConfigured
              ? "Online payment isn't configured for this environment yet. Please try again later."
              : order.error instanceof ApiError
                ? order.error.message
                : "We couldn't start checkout for this hold."
          }
          onRetry={notConfigured ? undefined : () => order.refetch()}
        />
      </Screen>
    );
  }

  const data = order.data;

  // Order confirmed (works for both simulated and real once the order exists).
  if (confirmed) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <View style={{ backgroundColor: toneColors("success").bg, borderRadius: 12, padding: spacing.lg, gap: 4 }}>
          <Text variant="title" color={toneColors("success").fg}>
            Order confirmed
          </Text>
          <Text variant="body" color={toneColors("success").fg}>
            {data.bagDisplayName} from {data.restaurantName} · {formatPaise(data.amountPaise)} paid.
          </Text>
        </View>
        <Card>
          <Text variant="label">Pickup</Text>
          <Text variant="body" color={palette.muted}>
            Your pickup code is on its way to you — show it at the counter to collect your bag.
          </Text>
        </Card>
        <Button label="Done" accent={palette.forest} onPress={() => router.replace("/(tabs)/orders")} />
      </Screen>
    );
  }

  // Real Razorpay checkout (stub until SDK + keys).
  if (data.mode === "razorpay") {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Text variant="title">{formatPaise(data.amountPaise)}</Text>
        <Text variant="body" color={palette.muted}>
          {data.bagDisplayName} from {data.restaurantName}
        </Text>
        <EmptyState
          title="Razorpay checkout"
          message="Secure card / UPI payment opens here. (Native Razorpay checkout is wired once payment credentials are configured.)"
        />
      </Screen>
    );
  }

  // Simulated checkout (demo/test only).
  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Badge label="Demo · simulated payment" tone="warning" />
      <Text variant="title">{formatPaise(data.amountPaise)}</Text>
      <Card>
        <Text variant="heading">{data.bagDisplayName}</Text>
        <Text variant="body" color={palette.muted}>
          {data.restaurantName}
        </Text>
        <Text variant="caption" color={palette.muted}>
          This is a simulated Razorpay checkout for demos and testing. The server creates a real, payment-confirmed order
          — no money moves.
        </Text>
      </Card>

      <Button
        label="Confirm payment"
        accent={palette.forest}
        loading={simulate.isPending && simulate.variables === "SUCCESS"}
        disabled={simulate.isPending}
        onPress={() => simulate.mutate("SUCCESS", { onSuccess: () => setPaid(true) })}
      />
      <Button
        label="Simulate failure"
        variant="secondary"
        accent={palette.forest}
        loading={simulate.isPending && simulate.variables === "FAILURE"}
        disabled={simulate.isPending}
        onPress={() => simulate.mutate("FAILURE")}
      />

      {paid && !confirmed ? (
        <Text variant="caption" color={palette.muted}>
          Confirming your order…
        </Text>
      ) : null}
      {failed ? (
        <View style={{ backgroundColor: toneColors("danger").bg, borderRadius: 10, padding: 12 }}>
          <Text variant="caption" color={toneColors("danger").fg}>
            Simulated payment failed. Your hold is still active — try again.
          </Text>
        </View>
      ) : null}
      {simulate.isError ? (
        <View style={{ backgroundColor: toneColors("danger").bg, borderRadius: 10, padding: 12 }}>
          <Text variant="caption" color={toneColors("danger").fg}>
            {simulate.error instanceof ApiError ? simulate.error.message : "Could not process the simulated payment."}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
