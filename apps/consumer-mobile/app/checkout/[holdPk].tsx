import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  palette,
  ProgressRing,
  Screen,
  Skeleton,
  spacing,
  StickyActionBar,
  Text,
  toneColors,
} from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useCheckoutOrder, useCheckoutStatus, useSimulatePayment } from "@/api/checkout";

/**
 * Checkout for a hold (Slice 9). The server's `mode` decides the surface:
 * - "razorpay": the real Razorpay checkout (RN SDK/WebView) — wired here later; until
 *   keys are configured the order call returns a clear "not configured" message.
 * - "simulated": this discreet demo/test screen, shown only when the server has the
 *   payment simulator enabled. "Confirm payment" runs the gated server simulator,
 *   which goes through the canonical capture RPC -> a real, server-authoritative order.
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
        <Skeleton height={32} width="60%" />
        <Skeleton height={148} />
        <Skeleton height={96} />
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
        <Card elevated="md" style={{ borderColor: toneColors("success").fg, backgroundColor: toneColors("success").bg }}>
          <View style={{ alignItems: "center", gap: spacing.md }}>
            <ProgressRing value={100} label="Server confirmed" size={112} accent={toneColors("success").fg} />
            <View style={{ alignItems: "center", gap: spacing.xs }}>
              <Text variant="title" color={toneColors("success").fg}>
                Order confirmed
              </Text>
              <Text color={toneColors("success").fg} style={{ textAlign: "center" }}>
                {data.bagDisplayName} from {data.restaurantName}
              </Text>
            </View>
          </View>
        </Card>
        <Card elevated="sm">
          <Text variant="label">Paid</Text>
          <Text variant="title" color={palette.forest}>
            {formatPaise(data.amountPaise)}
          </Text>
          <Text color={palette.muted}>Open Orders for pickup details and counter verification.</Text>
        </Card>
        <Button label="View order" accent={palette.forest} onPress={() => router.replace("/(tabs)/orders")} />
      </Screen>
    );
  }

  // Real Razorpay checkout is not wired for the pilot (the payment simulator is the
  // canonical path — see CM-1). When the simulator flag is effective the server
  // returns mode="simulated" and this branch never renders; keep it an honest,
  // non-dead-ending fallback so a mis-set flag can never trap the customer without
  // an affordance. The hold stays reserved until its timer expires — no charge here.
  if (data.mode === "razorpay") {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Text variant="caption" color={palette.forest}>
          Secure checkout
        </Text>
        <Text variant="title">{formatPaise(data.amountPaise)}</Text>
        <Card elevated="sm">
          <Text variant="heading">{data.bagDisplayName}</Text>
          <Text color={palette.muted}>{data.restaurantName}</Text>
          <Text variant="caption" color={palette.muted}>
            {data.description}
          </Text>
        </Card>
        <Card elevated="sm" style={{ backgroundColor: palette.cream }}>
          <Text variant="label">Online payment is coming soon</Text>
          <Text color={palette.muted}>
            Card &amp; UPI checkout goes live shortly. Your hold stays reserved until its timer expires — you have not been charged.
          </Text>
        </Card>
        <Button label="Back to drops" accent={palette.forest} onPress={() => router.replace("/(tabs)/drops")} />
      </Screen>
    );
  }

  // Simulated checkout (demo/test only).
  return (
    <Screen scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
        <Badge label="Demo · simulated payment" tone="warning" />
        <View>
          <Text variant="caption" color={palette.forest}>
            Checkout
          </Text>
          <Text variant="title">{formatPaise(data.amountPaise)}</Text>
        </View>

        <Card elevated="sm">
          <Text variant="heading">{data.bagDisplayName}</Text>
          <Text color={palette.muted}>{data.restaurantName}</Text>
          <Text variant="caption" color={palette.muted}>
            {data.description}
          </Text>
        </Card>

        <Card elevated="sm" style={{ backgroundColor: palette.cream }}>
          <Text variant="label">Demo mode</Text>
          <Text color={palette.muted}>
            This environment uses a gated payment simulator. The server creates the order only after the simulated
            payment is confirmed.
          </Text>
        </Card>

        {paid && !confirmed ? (
          <Card elevated="sm">
            <Text variant="heading">Confirming your order</Text>
            <Text color={palette.muted}>Waiting for the server-authoritative order status.</Text>
          </Card>
        ) : null}

        {failed ? (
          <View style={{ backgroundColor: toneColors("danger").bg, borderRadius: 10, padding: spacing.md }}>
            <Text variant="caption" color={toneColors("danger").fg}>
              Simulated payment failed. Your hold is still active - try again.
            </Text>
          </View>
        ) : null}
        {simulate.isError ? (
          <View style={{ backgroundColor: toneColors("danger").bg, borderRadius: 10, padding: spacing.md }}>
            <Text variant="caption" color={toneColors("danger").fg}>
              {simulate.error instanceof ApiError ? simulate.error.message : "Could not process the simulated payment."}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <StickyActionBar
        primaryLabel="Confirm payment"
        accent={palette.forest}
        disabled={simulate.isPending}
        helperText="Confirmation appears only after the server returns an order."
        onPrimaryPress={() => simulate.mutate("SUCCESS", { onSuccess: () => setPaid(true) })}
      >
        <Button
          label="Simulate failure"
          variant="secondary"
          accent={palette.forest}
          loading={simulate.isPending && simulate.variables === "FAILURE"}
          disabled={simulate.isPending}
          onPress={() => simulate.mutate("FAILURE")}
        />
      </StickyActionBar>
    </Screen>
  );
}
