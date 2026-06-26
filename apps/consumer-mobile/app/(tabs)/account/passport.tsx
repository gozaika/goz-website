import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoyaltyCard,
  palette,
  Screen,
  Skeleton,
  spacing,
  Text,
} from "@gozaika/mobile-ui";
import { tierLabel } from "@gozaika/utils";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { usePassport } from "@/api/account";
import { useAuth } from "@/auth/useAuth";

function StatTile({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <View
      style={{
        minWidth: 128,
        flex: 1,
        borderRadius: 10,
        backgroundColor: palette.cream,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Text variant="title" color={palette.charcoal}>
        {value}
      </Text>
      <Text variant="caption" color={palette.muted}>
        {label}
      </Text>
    </View>
  );
}

export default function PassportScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = usePassport();

  if (!session) {
    return (
      <Screen scroll={false}>
        <EmptyState
          title="Zayka Passport"
          message="Sign in to see your tier, collected bags and badges."
          actionLabel="Sign in"
          onAction={() => router.push("/auth/login")}
        />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={120} />
        <Skeleton height={80} />
        <Skeleton height={160} />
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen scroll={false}>
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load your passport."}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  const { stat, badges, bagsToNextTier, progressPercent, nextTierCode } = data;
  const earned = badges.filter((b) => b.earned);
  const tier = tierLabel(stat.currentTierCode);
  const progressLabel =
    nextTierCode && bagsToNextTier
      ? `${bagsToNextTier} more bag${bagsToNextTier === 1 ? "" : "s"} to ${tierLabel(nextTierCode)}`
      : "Top tier reached";
  const stats = [
    { label: "Bags", value: String(stat.totalBagsCollected) },
    { label: "Kitchens", value: String(stat.totalRestaurantsVisited) },
    { label: "Badges", value: `${earned.length}/${badges.length}` },
  ];

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Zayka Passport</Text>

      <LoyaltyCard tier={tier} progress={progressPercent} progressLabel={progressLabel} stats={stats} />

      <Card elevated="sm">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <StatTile label="Bags collected" value={stat.totalBagsCollected} />
          <StatTile label="Restaurants visited" value={stat.totalRestaurantsVisited} />
          <StatTile label="Neighbourhoods" value={stat.totalNeighborhoodsVisited} />
          <StatTile label="Reviews" value={stat.reviewCount} />
        </View>
      </Card>

      <Text variant="heading">
        Badges {earned.length}/{badges.length}
      </Text>
      {badges.map((b) => (
        <Card
          key={b.badgeCode}
          elevated={b.earned ? "sm" : false}
          style={b.earned ? { borderColor: palette.forest } : undefined}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text variant="heading" color={b.earned ? palette.forest : palette.charcoal}>
                {b.badgeName}
              </Text>
            </View>
            <Badge label={b.earned ? "Earned" : "Locked"} tone={b.earned ? "success" : "neutral"} />
          </View>
          <Text variant="body" color={palette.muted}>
            {b.earned ? b.description : b.hintText}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
