import { ApiError } from "@gozaika/mobile-core";
import type { MobilePublicDropCard } from "@gozaika/types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  FilterChipRow,
  OfflineBanner,
  palette,
  Screen,
  SegmentedToggle,
  Skeleton,
  spacing,
  Text,
} from "@gozaika/mobile-ui";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { useDrops } from "@/api/discovery";
import { DropCard } from "@/ui/DropCard";

type ViewMode = "list" | "map";
type SortMode = "closing" | "available";

function isLiveDrop(drop: MobilePublicDropCard): boolean {
  return drop.statusCode === "ACTIVE" && drop.quantityAvailable > 0 && new Date(drop.pickupEndAt).getTime() > Date.now();
}

function uniqueCodes(drops: readonly MobilePublicDropCard[]): readonly string[] {
  return [...new Set(drops.map((drop) => drop.dietaryCategoryCode).filter(Boolean))].slice(0, 6);
}

function sortDrops(drops: readonly MobilePublicDropCard[], sortMode: SortMode): readonly MobilePublicDropCard[] {
  return [...drops].sort((left, right) => {
    if (sortMode === "available") {
      return right.quantityAvailable - left.quantityAvailable;
    }

    return new Date(left.pickupEndAt).getTime() - new Date(right.pickupEndAt).getTime();
  });
}

function coordinatePercent(value: number, min: number, max: number): number {
  if (min === max) {
    return 50;
  }

  return 12 + ((value - min) / (max - min)) * 76;
}

function DropMapView({
  drops,
  onSelectDrop,
}: {
  readonly drops: readonly MobilePublicDropCard[];
  readonly onSelectDrop: (dropPk: string) => void;
}) {
  const located = drops.filter((drop) => drop.latitude != null && drop.longitude != null);

  if (!located.length) {
    return (
      <Card elevated="sm" style={{ backgroundColor: palette.cream }}>
        <Text variant="heading">Map view unavailable</Text>
        <Text color={palette.muted}>
          These drops do not expose public map coordinates yet. The list remains the source of truth.
        </Text>
      </Card>
    );
  }

  const latitudes = located.map((drop) => drop.latitude ?? 0);
  const longitudes = located.map((drop) => drop.longitude ?? 0);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return (
    <View style={{ gap: spacing.md }}>
      <Card elevated="md" style={{ padding: 0, overflow: "hidden" }}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${located.length} public drop locations`}
          style={{
            height: 360,
            backgroundColor: palette.cream,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <View style={{ position: "absolute", inset: 0, opacity: 0.7 }}>
            {[0, 1, 2, 3].map((row) => (
              <View
                key={`row-${row}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${20 + row * 20}%`,
                  height: 1,
                  backgroundColor: palette.border,
                }}
              />
            ))}
            {[0, 1, 2, 3].map((column) => (
              <View
                key={`column-${column}`}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${20 + column * 20}%`,
                  width: 1,
                  backgroundColor: palette.border,
                }}
              />
            ))}
          </View>
          {located.map((drop, index) => {
            const left = coordinatePercent(drop.longitude ?? 0, minLng, maxLng);
            const top = 100 - coordinatePercent(drop.latitude ?? 0, minLat, maxLat);
            return (
              <Pressable
                key={drop.dropPk}
                accessibilityRole="button"
                accessibilityLabel={`Open ${drop.bagDisplayName} from ${drop.restaurantName}`}
                onPress={() => onSelectDrop(drop.dropPk)}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: [{ translateX: -18 }, { translateY: -18 }],
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: palette.white,
                  backgroundColor: index === 0 ? palette.saffron : palette.forest,
                }}
              >
                <Text variant="caption" color={palette.white}>
                  {drop.quantityAvailable}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <View style={{ gap: spacing.sm }}>
        {located.slice(0, 8).map((drop) => (
          <Pressable key={drop.dropPk} accessibilityRole="button" onPress={() => onSelectDrop(drop.dropPk)}>
            <Card elevated="sm">
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="heading" numberOfLines={1}>
                    {drop.bagDisplayName}
                  </Text>
                  <Text variant="caption" color={palette.muted} numberOfLines={1}>
                    {drop.restaurantName}
                    {drop.neighborhoodName ? ` · ${drop.neighborhoodName}` : ""}
                  </Text>
                </View>
                <Badge label={`${drop.quantityAvailable} left`} tone="info" />
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function DropsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useDrops();
  const offline = isError && error instanceof ApiError && error.code === "NETWORK";
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [dietaryFilter, setDietaryFilter] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("closing");

  const liveDrops = useMemo(() => (data ?? []).filter(isLiveDrop), [data]);
  const dietaryCodes = useMemo(() => uniqueCodes(liveDrops), [liveDrops]);
  const filteredDrops = useMemo(
    () => liveDrops.filter((drop) => dietaryFilter === "All" || drop.dietaryCategoryCode === dietaryFilter),
    [dietaryFilter, liveDrops],
  );
  const visibleDrops = useMemo(() => sortDrops(filteredDrops, sortMode), [filteredDrops, sortMode]);

  if (isError && !data) {
    return (
      <Screen scroll={false}>
        <ErrorState message="We couldn't load today's drops." onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={52} />
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (!data || liveDrops.length === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState title="No active drops" message="Check back soon for today's BAM Bags." />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.cream }}>
      {offline ? <OfflineBanner offline /> : null}
      <View style={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Drops near you</Text>
            <Text color={palette.muted}>
              {visibleDrops.length} live chef-curated thali{visibleDrops.length === 1 ? "" : "s"} — a generous spread from one kitchen, the lineup a surprise.
            </Text>
          </View>
          <Badge label={`${liveDrops.length} live`} tone="success" />
        </View>
        <SegmentedToggle
          options={[
            { id: "list", label: "List" },
            { id: "map", label: "Map" },
          ]}
          selectedId={viewMode}
          onChange={(id) => setViewMode(id as ViewMode)}
          accessibilityLabel="Drops view mode"
        />
        <FilterChipRow
          accessibilityLabel="Dietary filters"
          chips={["All", ...dietaryCodes].map((code) => ({ id: code, label: code, selected: dietaryFilter === code }))}
          onSelect={setDietaryFilter}
        />
        <FilterChipRow
          accessibilityLabel="Sort drops"
          chips={[
            { id: "closing", label: "Closing soon", selected: sortMode === "closing" },
            { id: "available", label: "Most available", selected: sortMode === "available" },
          ]}
          onSelect={(id) => setSortMode(id as SortMode)}
          accent={palette.forest}
        />
      </View>

      {visibleDrops.length === 0 ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <EmptyState title="No matches" message="Try a different dietary filter." />
        </ScrollView>
      ) : viewMode === "map" ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}>
          <DropMapView drops={visibleDrops} onSelectDrop={(dropPk) => router.push(`/drops/${dropPk}`)} />
        </ScrollView>
      ) : (
        <FlatList
          data={visibleDrops}
          keyExtractor={(d) => d.dropPk}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          renderItem={({ item }) => <DropCard drop={item} onPress={() => router.push(`/drops/${item.dropPk}`)} />}
        />
      )}
    </View>
  );
}
