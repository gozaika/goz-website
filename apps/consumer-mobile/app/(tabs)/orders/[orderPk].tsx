import { ApiError } from "@gozaika/mobile-core";
import { Badge, Button, Card, EmptyState, ErrorState, palette, Screen, Skeleton, spacing, Text, toneColors } from "@gozaika/mobile-ui";
import type { ConsumerOrderDto } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useOrder, usePickupProof, useResendPickup } from "@/api/orders";
import { useOrderReview, useSubmitReview } from "@/api/reviews";
import { PickupProofCard } from "@/ui/PickupProofCard";

const PRE_PICKUP = ["PAID", "CONFIRMED", "READY_FOR_PICKUP"];

function statusTone(code: string) {
  if (code === "COLLECTED") return "success";
  if (["NO_SHOW", "CANCELLED", "PICKUP_EXPIRED"].includes(code)) return "danger";
  if (PRE_PICKUP.includes(code)) return "info";
  return "neutral";
}

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

function TimelineStep({
  title,
  detail,
  active,
  complete,
}: {
  readonly title: string;
  readonly detail: string;
  readonly active?: boolean;
  readonly complete?: boolean;
}) {
  const tone = complete ? "success" : active ? "info" : "neutral";
  const colors = toneColors(tone);

  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 3,
            borderColor: colors.fg,
            backgroundColor: complete ? colors.fg : palette.white,
          }}
        />
        <View style={{ flex: 1, width: 2, minHeight: 32, backgroundColor: palette.border }} />
      </View>
      <View style={{ flex: 1, paddingBottom: spacing.md }}>
        <Text variant="label" color={active || complete ? colors.fg : palette.charcoal}>
          {title}
        </Text>
        <Text variant="caption" color={palette.muted}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

function OrderTimeline({ order }: { readonly order: ConsumerOrderDto }) {
  const created = new Date(order.createdAt).toLocaleString("en-IN");
  const pickupWindow = `${new Date(order.pickupWindowStartAt).toLocaleString("en-IN")} - ${new Date(order.pickupWindowEndAt).toLocaleTimeString("en-IN")}`;
  const collected = order.orderStatusCode === "COLLECTED";
  const terminal = ["NO_SHOW", "CANCELLED", "PICKUP_EXPIRED"].includes(order.orderStatusCode);

  return (
    <Card elevated="sm">
      <Text variant="heading">Order timeline</Text>
      <TimelineStep title="Order placed" detail={created} complete />
      <TimelineStep title={`Payment ${order.paymentStatusCode.replaceAll("_", " ")}`} detail={formatPaise(order.paidAmountPaise)} complete />
      <TimelineStep title="Pickup window" detail={pickupWindow} active={!collected && !terminal} complete={collected || terminal} />
      {collected ? (
        <TimelineStep title="Collected" detail={order.collectedAt ? new Date(order.collectedAt).toLocaleString("en-IN") : "Marked collected"} complete />
      ) : terminal ? (
        <TimelineStep title={order.orderStatusCode.replaceAll("_", " ")} detail="This order is no longer available for pickup." complete />
      ) : (
        <TimelineStep title="Awaiting pickup" detail="Show the SMS pickup code at the counter." active />
      )}
    </Card>
  );
}

function StarRating({ value, onChange }: { readonly value: number; readonly onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.xs }} accessibilityRole="adjustable" accessibilityLabel={`Rating: ${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`} hitSlop={6}>
          <Text variant="title" color={n <= value ? palette.gold : palette.border}>
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ReviewCard({ orderPk }: { readonly orderPk: string }) {
  const { data: review, isLoading } = useOrderReview(orderPk);
  const submit = useSubmitReview(orderPk);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  if (isLoading || !review) return null;

  if (review.status !== "NONE") {
    const label =
      review.status === "APPROVED" ? "Your review is published. Thank you!" : review.status === "REJECTED" ? "This review wasn't approved." : "Review submitted — pending moderation.";
    return (
      <Card>
        <Text variant="heading">Your review</Text>
        <Text variant="body" color={palette.muted}>
          {label}
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="heading">Rate your pickup</Text>
      <Text variant="caption" color={palette.muted}>
        Verified review from a collected order. Goes live after a quick moderation check.
      </Text>
      <StarRating value={rating} onChange={setRating} />
      <TextInput
        accessibilityLabel="Review comment (optional)"
        value={text}
        onChangeText={setText}
        placeholder="What stood out? (optional)"
        placeholderTextColor={palette.muted}
        multiline
        maxLength={500}
        style={{
          minHeight: 80,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 10,
          padding: spacing.sm,
          color: palette.charcoal,
          textAlignVertical: "top",
        }}
      />
      <Button
        label="Submit review"
        accent={palette.saffron}
        disabled={rating < 1}
        loading={submit.isPending}
        onPress={() => submit.mutate({ ratingValue: rating, reviewText: text.trim() || undefined })}
      />
      {submit.isError ? (
        <Text variant="caption" color={palette.dangerFg}>
          {submit.error instanceof ApiError ? submit.error.message : "Could not submit. Please try again."}
        </Text>
      ) : null}
    </Card>
  );
}

export default function OrderDetailScreen() {
  const { orderPk } = useLocalSearchParams<{ orderPk: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(orderPk ?? null);
  const resend = useResendPickup(orderPk ?? null);
  const awaitingPickup = order ? PRE_PICKUP.includes(order.orderStatusCode) : false;
  const pickupProof = usePickupProof(orderPk ?? null, awaitingPickup);

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

  return (
    <Screen contentStyle={{ gap: spacing.md }} testID="screen:order-pickup-proof">
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text variant="title">{order.bagDisplayName}</Text>
        <Badge label={order.orderStatusCode.replaceAll("_", " ")} tone={statusTone(order.orderStatusCode)} />
      </View>
      <Text variant="caption" color={palette.muted}>
        {order.restaurantName} · {order.orderNumber}
      </Text>

      {/* Pickup proof — shown in-app (QR + OTP), parity with web (CM-2). SMS is the
          secondary channel so the code can still be forwarded to whoever collects. */}
      {awaitingPickup ? (
        <View style={{ gap: spacing.md }}>
          {pickupProof.isLoading ? (
            <Card>
              <Skeleton height={160} />
            </Card>
          ) : pickupProof.data ? (
            <PickupProofCard proof={pickupProof.data} />
          ) : (
            <Card>
              <Text variant="heading">Show your pickup code</Text>
              <Text variant="body" color={palette.muted}>
                We couldn&apos;t load your in-app code just now. Resend it by SMS and show that at {order.restaurantName} during the pickup
                window.
              </Text>
            </Card>
          )}
          <Card>
            <Text variant="caption" color={palette.muted}>
              Prefer a text? We can SMS the code to forward to whoever is collecting your bag.
            </Text>
            <Button
              label="Resend by SMS"
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
        </View>
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

      <OrderTimeline order={order} />

      {collected && orderPk ? <ReviewCard orderPk={orderPk} /> : null}

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
