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
import { Link, useRouter } from "expo-router";
import { View } from "react-native";
import { useDiscoveryProfile } from "@/api/account";
import { useAuth } from "@/auth/useAuth";

function Pill({ label, tone }: { readonly label: string; readonly tone: "success" | "neutral" | "info" }) {
  return <Badge label={label} tone={tone} />;
}

export default function DiscoveryProfileScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useDiscoveryProfile();

  if (!session) {
    return (
      <Screen scroll={false}>
        <EmptyState
          title="Flavour Diversity"
          message="Sign in to see the cuisines and neighbourhoods you've explored."
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
        <Skeleton height={140} />
        <Skeleton height={140} />
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen scroll={false}>
        <ErrorState
          message={error instanceof ApiError ? error.message : "Could not load your flavour profile."}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  const {
    triedCuisines,
    untriedCuisines,
    totalAvailableCuisines,
    triedNeighbourhoods,
    totalActiveNeighbourhoods,
    flavourDiversityScore,
    flavourPersonalityLabel,
  } = data;

  const untriedWithDrops = untriedCuisines.filter((c) => c.activeDropCount > 0);

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Flavour Diversity</Text>

      {/* Score card */}
      <Card style={{ backgroundColor: palette.cream, borderColor: palette.saffron }}>
        <Text variant="caption" color={palette.muted}>
          Your flavour diversity score
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.xs }}>
          <Text variant="display" color={palette.saffron}>
            {flavourDiversityScore}
          </Text>
          <Text variant="heading" color={palette.muted}>
            /100
          </Text>
        </View>
        <Badge label={flavourPersonalityLabel} tone="warning" />
        <Text variant="body" color={palette.muted}>
          You've tried {triedCuisines.length} of {totalAvailableCuisines} cuisines across{" "}
          {triedNeighbourhoods.length} of {totalActiveNeighbourhoods} neighbourhoods.
        </Text>
      </Card>

      {/* Tried cuisines */}
      <Text variant="heading">Cuisines tried</Text>
      {triedCuisines.length === 0 ? (
        <Card>
          <Text variant="body" color={palette.muted}>
            No cuisines yet — claim your first BAM Bag to start your flavour map.
          </Text>
        </Card>
      ) : (
        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {triedCuisines.map((c) => (
              <Pill key={c.cuisineCode} label={`${c.cuisineName} · ${c.bagCount}`} tone="success" />
            ))}
          </View>
        </Card>
      )}

      {/* Untried with active drops — discovery nudge */}
      {untriedWithDrops.length > 0 ? (
        <>
          <Text variant="heading">Try something new</Text>
          <Card>
            <Text variant="body" color={palette.muted}>
              These cuisines have live drops right now:
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs }}>
              {untriedWithDrops.map((c) => (
                <Pill key={c.cuisineCode} label={`${c.cuisineName} · ${c.activeDropCount} live`} tone="info" />
              ))}
            </View>
            <Link
              href="/(tabs)/drops"
              style={{ marginTop: spacing.sm, color: palette.saffron, fontWeight: "700", fontSize: 13 }}
            >
              Browse drops →
            </Link>
          </Card>
        </>
      ) : null}

      {/* Neighbourhoods explored */}
      <Text variant="heading">Neighbourhoods explored</Text>
      {triedNeighbourhoods.length === 0 ? (
        <Card>
          <Text variant="body" color={palette.muted}>
            None yet — pick up a bag to put a neighbourhood on your map.
          </Text>
        </Card>
      ) : (
        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {triedNeighbourhoods.map((n) => (
              <Pill key={n.neighbourhoodCode} label={`${n.neighbourhoodName} · ${n.bagCount}`} tone="neutral" />
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}
