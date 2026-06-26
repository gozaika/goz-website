import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  palette,
  ProgressRing,
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

function StatTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View
      style={{
        minWidth: 120,
        flex: 1,
        borderRadius: 10,
        backgroundColor: palette.white,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Text variant="heading" color={palette.charcoal}>
        {value}
      </Text>
      <Text variant="caption" color={palette.muted}>
        {label}
      </Text>
    </View>
  );
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

      <Card elevated="md" style={{ backgroundColor: palette.cream, borderColor: palette.saffron }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          <ProgressRing
            value={flavourDiversityScore}
            label="Flavour diversity"
            size={112}
            accent={palette.saffron}
          />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text variant="caption" color={palette.saffron}>
              Discovery profile
            </Text>
            <Text variant="title">{flavourPersonalityLabel}</Text>
            <Text variant="body" color={palette.muted}>
              You've tried {triedCuisines.length} of {totalAvailableCuisines} cuisines across{" "}
              {triedNeighbourhoods.length} of {totalActiveNeighbourhoods} neighbourhoods.
            </Text>
          </View>
        </View>
      </Card>

      <Card elevated="sm">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <StatTile label="Cuisines tried" value={`${triedCuisines.length}/${totalAvailableCuisines}`} />
          <StatTile
            label="Neighbourhoods"
            value={`${triedNeighbourhoods.length}/${totalActiveNeighbourhoods}`}
          />
          <StatTile label="Live new tastes" value={String(untriedWithDrops.length)} />
        </View>
      </Card>

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

      {untriedWithDrops.length > 0 ? (
        <>
          <Text variant="heading">Try something new</Text>
          <Card elevated="sm" style={{ borderColor: palette.saffron }}>
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
