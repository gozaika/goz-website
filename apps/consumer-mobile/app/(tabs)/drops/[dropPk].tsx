import { ApiError } from "@gozaika/mobile-core";
import { Badge, Button, Card, ErrorState, palette, ProductMedia, Screen, Skeleton, spacing, Text } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useClaim } from "@/api/checkout";
import { useDrop } from "@/api/discovery";
import { useAuth } from "@/auth/useAuth";
import { mediaFallbacks } from "@/ui/mediaFallbacks";

export default function DropDetailScreen() {
  const { dropPk } = useLocalSearchParams<{ dropPk: string }>();
  const { data: drop, isLoading, isError, refetch } = useDrop(dropPk ?? "");
  const { session } = useAuth();
  const router = useRouter();
  const claim = useClaim();

  if (isError) {
    return (
      <Screen scroll={false}>
        <ErrorState message="We couldn't load this drop." onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (isLoading || !drop) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={28} width="70%" />
        <Skeleton height={90} />
        <Skeleton height={60} />
      </Screen>
    );
  }

  const soldOut = drop.quantityAvailable <= 0;

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <ProductMedia
        media={drop.image}
        fallbackSource={mediaFallbacks.drop}
        accessibilityLabel={drop.image?.alt ?? `${drop.bagDisplayName} from ${drop.restaurantName}`}
        testID={`drop-detail-media-${drop.dropPk}`}
      />
      <Text variant="caption" color={palette.muted}>
        {drop.restaurantName}
        {drop.neighborhoodName ? ` · ${drop.neighborhoodName}` : ""}
      </Text>
      <Text variant="title">{drop.bagDisplayName}</Text>
      {drop.bagShortDescription ? (
        <Text variant="body" color={palette.muted}>
          {drop.bagShortDescription}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
        <Badge label={drop.dietaryCategoryCode} tone={drop.dietaryCategoryCode === "VEG" ? "success" : "neutral"} />
        {drop.spiceLevelCode ? <Badge label={drop.spiceLevelCode} tone="neutral" /> : null}
        <Badge
          label={soldOut ? "Sold out" : `${drop.quantityAvailable} of ${drop.quantityTotal} left`}
          tone={soldOut ? "danger" : "info"}
        />
      </View>

      {/* Allergen disclosure appears before the claim CTA. */}
      <Card>
        <Text variant="label">Allergens</Text>
        <Text variant="body" color={palette.charcoal}>
          {drop.allergenSummaryText ??
            (drop.allergenCodes.length > 0
              ? drop.allergenCodes.join(", ")
              : "No allergen information provided — do not assume safety.")}
        </Text>
      </Card>

      <Text variant="label" color={palette.charcoal}>
        {formatPaise(drop.pricePaise)} · pickup {new Date(drop.pickupStartAt).toLocaleTimeString()}–
        {new Date(drop.pickupEndAt).toLocaleTimeString()}
      </Text>

      {/* Claim → hold → checkout (Slice 9). */}
      {!session ? (
        <Button label="Sign in to claim" accent={palette.forest} onPress={() => router.push("/auth/login")} />
      ) : (
        <Button
          label={soldOut ? "Sold out" : "Claim a bag"}
          accent={palette.forest}
          disabled={soldOut}
          loading={claim.isPending}
          onPress={() =>
            claim.mutate(
              { dropPk: drop.dropPk },
              { onSuccess: (result) => router.push(`/checkout/${result.holdPk}`) },
            )
          }
        />
      )}
      {claim.isError ? (
        <Text variant="caption" color={palette.dangerFg}>
          {claim.error instanceof ApiError ? claim.error.message : "Could not hold a bag. Please try again."}
        </Text>
      ) : null}
    </Screen>
  );
}
