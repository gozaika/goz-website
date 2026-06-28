import type { MobilePublicDropCard } from "@gozaika/types";
import { Badge, Card, palette, ProductMedia, spacing, Text } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { Pressable, View } from "react-native";
import { mediaFallbacks } from "./mediaFallbacks";

export function DropCard({ drop, onPress }: { readonly drop: MobilePublicDropCard; readonly onPress?: () => void }) {
  const soldOut = drop.quantityAvailable <= 0;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card>
        <ProductMedia
          media={drop.image}
          fallbackSource={mediaFallbacks.coverForDrop(drop)}
          accessibilityLabel={drop.image?.alt ?? `${drop.bagDisplayName} from ${drop.restaurantName}`}
          testID={`drop-media-${drop.dropPk}`}
        />
        <Text variant="caption" color={palette.muted}>
          {drop.restaurantName}
          {drop.neighborhoodName ? ` · ${drop.neighborhoodName}` : ""}
        </Text>
        <Text variant="heading">{drop.bagDisplayName}</Text>
        <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          <Badge label={drop.dietaryCategoryCode} tone={drop.dietaryCategoryCode === "VEG" ? "success" : "neutral"} />
          {drop.allergenCodes.length > 0 ? <Badge label={`Allergens: ${drop.allergenCodes.join(", ")}`} tone="warning" /> : null}
          <Badge label={soldOut ? "Sold out" : `${drop.quantityAvailable} left`} tone={soldOut ? "danger" : "info"} />
        </View>
        <Text variant="label" color={palette.charcoal}>
          {formatPaise(drop.pricePaise)}
        </Text>
      </Card>
    </Pressable>
  );
}
