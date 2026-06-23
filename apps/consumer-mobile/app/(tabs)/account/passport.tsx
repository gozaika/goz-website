import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
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

function ProgressBar({ percent }: { readonly percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={{ height: 10, borderRadius: 999, backgroundColor: palette.border, overflow: "hidden" }}
    >
      <View style={{ width: `${clamped}%`, height: "100%", backgroundColor: palette.gold }} />
    </View>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="title" color={palette.forest}>
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

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Zayka Passport</Text>

      {/* Tier card */}
      <Card style={{ backgroundColor: palette.cream, borderColor: palette.gold }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ gap: 2 }}>
            <Text variant="caption" color={palette.muted}>
              Current tier
            </Text>
            <Text variant="title" color={palette.charcoal}>
              {tierLabel(stat.currentTierCode)}
            </Text>
          </View>
          <Badge label={stat.currentTierCode} tone="warning" />
        </View>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <ProgressBar percent={progressPercent} />
          <Text variant="caption" color={palette.muted}>
            {nextTierCode && bagsToNextTier
              ? `${bagsToNextTier} more bag${bagsToNextTier === 1 ? "" : "s"} to ${tierLabel(nextTierCode)}`
              : "Top tier reached — you're a Culinary Ambassador!"}
          </Text>
        </View>
      </Card>

      {/* Stats */}
      <Card>
        <View style={{ flexDirection: "row" }}>
          <Stat label="Bags collected" value={stat.totalBagsCollected} />
          <Stat label="Restaurants" value={stat.totalRestaurantsVisited} />
        </View>
        <View style={{ flexDirection: "row", marginTop: spacing.md }}>
          <Stat label="Neighbourhoods" value={stat.totalNeighborhoodsVisited} />
          <Stat label="Reviews" value={stat.reviewCount} />
        </View>
      </Card>

      {/* Badges */}
      <Text variant="heading">
        Badges {earned.length}/{badges.length}
      </Text>
      {badges.map((b) => (
        <Card key={b.badgeCode} style={b.earned ? { borderColor: palette.forest } : undefined}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text variant="heading" color={b.earned ? palette.forest : palette.charcoal}>
              {b.badgeName}
            </Text>
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
