import { Badge, ErrorState, palette, Screen, Skeleton, spacing, Text } from "@gozaika/mobile-ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useRestaurant } from "@/api/discovery";
import { DropCard } from "@/ui/DropCard";

export default function RestaurantProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: r, isLoading, isError, refetch } = useRestaurant(slug ?? "");

  if (isError) {
    return (
      <Screen scroll={false}>
        <ErrorState message="We couldn't load this restaurant." onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (isLoading || !r) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={80} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">{r.restaurantName}</Text>
      <Text variant="caption" color={palette.muted}>
        {r.neighborhoodName ?? r.cityName ?? ""}
        {r.ratingCount > 0 ? ` · ${r.averageRating?.toFixed(1)}★ (${r.ratingCount})` : ""}
      </Text>
      {r.headline ? (
        <Text variant="body" color={palette.muted}>
          {r.headline}
        </Text>
      ) : null}
      {r.cuisineTags.length > 0 ? (
        <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          {r.cuisineTags.map((c) => (
            <Badge key={c} label={c} tone="neutral" />
          ))}
        </View>
      ) : null}
      {r.storyMarkdown ? <Text variant="body">{r.storyMarkdown}</Text> : null}

      <Text variant="heading">Active drops</Text>
      {r.activeDrops.length === 0 ? (
        <Text variant="body" color={palette.muted}>
          No active drops right now.
        </Text>
      ) : (
        r.activeDrops.map((d) => <DropCard key={d.dropPk} drop={d} onPress={() => router.push(`/drops/${d.dropPk}`)} />)
      )}
      <Text variant="caption" color={palette.muted}>
        Always check allergen information before pickup.
      </Text>
    </Screen>
  );
}
