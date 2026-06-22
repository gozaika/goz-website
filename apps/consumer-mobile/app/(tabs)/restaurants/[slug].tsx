import { Badge, ErrorState, palette, ProductMedia, Screen, Skeleton, spacing, Text } from "@gozaika/mobile-ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useRestaurant } from "@/api/discovery";
import { DropCard } from "@/ui/DropCard";
import { mediaFallbacks } from "@/ui/mediaFallbacks";

export default function RestaurantProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: restaurant, isLoading, isError, refetch } = useRestaurant(slug ?? "");

  if (isError) {
    return (
      <Screen scroll={false}>
        <ErrorState message="We couldn't load this restaurant." onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (isLoading || !restaurant) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={80} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <ProductMedia
        media={restaurant.coverImage}
        fallbackSource={mediaFallbacks.restaurantCover}
        aspectRatio={16 / 9}
        accessibilityLabel={restaurant.coverImage?.alt ?? `${restaurant.restaurantName} restaurant`}
        testID={`restaurant-profile-media-${restaurant.restaurantPk}`}
      />
      <Text variant="title">{restaurant.restaurantName}</Text>
      <Text variant="caption" color={palette.muted}>
        {restaurant.neighborhoodName ?? restaurant.cityName ?? ""}
        {restaurant.ratingCount > 0 ? ` · ${restaurant.averageRating?.toFixed(1)}★ (${restaurant.ratingCount})` : ""}
      </Text>
      {restaurant.headline ? (
        <Text variant="body" color={palette.muted}>
          {restaurant.headline}
        </Text>
      ) : null}
      {restaurant.cuisineTags.length > 0 ? (
        <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          {restaurant.cuisineTags.map((cuisine) => (
            <Badge key={cuisine} label={cuisine} tone="neutral" />
          ))}
        </View>
      ) : null}
      {restaurant.storyMarkdown ? <Text variant="body">{restaurant.storyMarkdown}</Text> : null}

      <Text variant="heading">Active drops</Text>
      {restaurant.activeDrops.length === 0 ? (
        <Text variant="body" color={palette.muted}>
          No active drops right now.
        </Text>
      ) : (
        restaurant.activeDrops.map((drop) => (
          <DropCard key={drop.dropPk} drop={drop} onPress={() => router.push(`/drops/${drop.dropPk}`)} />
        ))
      )}
      <Text variant="caption" color={palette.muted}>
        Always check allergen information before pickup.
      </Text>
    </Screen>
  );
}
