import { Badge, Button, ErrorState, palette, ProductMedia, Screen, Skeleton, spacing, Text } from "@gozaika/mobile-ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useRestaurant } from "@/api/discovery";
import { useFollows, useToggleFollow } from "@/api/follows";
import { useAuth } from "@/auth/useAuth";
import { DropCard } from "@/ui/DropCard";
import { mediaFallbacks } from "@/ui/mediaFallbacks";

function FollowControl({
  restaurantPk,
  followerCount,
}: {
  readonly restaurantPk: string;
  readonly followerCount: number;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const follows = useFollows({ enabled: Boolean(session) });
  const toggleFollow = useToggleFollow();

  const isFollowing = follows.data?.restaurantPks.includes(restaurantPk) ?? false;
  const liveCount =
    toggleFollow.data?.restaurantPk === restaurantPk ? toggleFollow.data.followerCount : followerCount;
  const countLabel = `${liveCount} ${liveCount === 1 ? "follower" : "followers"}`;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
      <Text variant="caption" color={palette.muted}>
        {countLabel}
      </Text>
      {session ? (
        <Button
          label={isFollowing ? "Following" : "Follow"}
          variant={isFollowing ? "secondary" : "primary"}
          accent={palette.forest}
          loading={toggleFollow.isPending || follows.isLoading}
          disabled={toggleFollow.isPending}
          onPress={() => toggleFollow.mutate({ restaurantPk, follow: !isFollowing })}
        />
      ) : (
        <Button
          label="Follow"
          variant="secondary"
          accent={palette.forest}
          onPress={() => router.push("/auth/login")}
        />
      )}
    </View>
  );
}

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
        fallbackSource={mediaFallbacks.coverFor(restaurant.restaurantName)}
        aspectRatio={16 / 9}
        accessibilityLabel={restaurant.coverImage?.alt ?? `${restaurant.restaurantName} restaurant`}
        testID={`restaurant-profile-media-${restaurant.restaurantPk}`}
      />
      <Text variant="title">{restaurant.restaurantName}</Text>
      <Text variant="caption" color={palette.muted}>
        {restaurant.neighborhoodName ?? restaurant.cityName ?? ""}
        {restaurant.ratingCount > 0 ? ` · ${restaurant.averageRating?.toFixed(1)}★ (${restaurant.ratingCount})` : ""}
      </Text>
      <FollowControl restaurantPk={restaurant.restaurantPk} followerCount={restaurant.followerCount} />
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
