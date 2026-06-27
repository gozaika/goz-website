import { Badge, Card, EmptyState, ErrorState, palette, ProductMedia, Screen, Skeleton, spacing, Text } from "@gozaika/mobile-ui";
import { useRouter } from "expo-router";
import { FlatList, Pressable, View } from "react-native";
import { useRestaurants } from "@/api/discovery";
import { mediaFallbacks } from "@/ui/mediaFallbacks";

export default function RestaurantsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useRestaurants();

  if (isError) {
    return (
      <Screen scroll={false}>
        <ErrorState message="We couldn't load restaurants." onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={100} />
        <Skeleton height={100} />
      </Screen>
    );
  }
  if (!data || data.length === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState title="No restaurants yet" message="Partner kitchens will appear here." />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.cream }}>
      <FlatList
        data={data}
        keyExtractor={(restaurant) => restaurant.restaurantPk}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/restaurants/${item.restaurantSlug}`)}>
            <Card>
              <ProductMedia
                media={item.coverImage}
                fallbackSource={mediaFallbacks.coverFor(item.restaurantName)}
                aspectRatio={16 / 9}
                accessibilityLabel={item.coverImage?.alt ?? `${item.restaurantName} restaurant`}
                testID={`restaurant-media-${item.restaurantPk}`}
              />
              <Text variant="heading">{item.restaurantName}</Text>
              <Text variant="caption" color={palette.muted}>
                {item.neighborhoodName ?? item.cityName ?? ""}
                {item.ratingCount > 0 ? ` · ${item.averageRating?.toFixed(1)}★ (${item.ratingCount})` : ""}
              </Text>
              {item.cuisineTags.length > 0 ? (
                <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
                  {item.cuisineTags.slice(0, 3).map((cuisine) => (
                    <Badge key={cuisine} label={cuisine} tone="neutral" />
                  ))}
                </View>
              ) : null}
              <Text variant="label" color={palette.forest}>
                {item.activeDropCount} active drop{item.activeDropCount === 1 ? "" : "s"}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
