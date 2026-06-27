import type { MobilePublicDropCard } from "@gozaika/types";
import {
  Badge,
  Button,
  Card,
  CountdownChip,
  EmptyState,
  ErrorState,
  FilterChipRow,
  HeroBanner,
  palette,
  ProductMedia,
  Screen,
  Skeleton,
  spacing,
  Text,
} from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { Link, useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useDrops } from "@/api/discovery";
import { mediaFallbacks } from "@/ui/mediaFallbacks";

function isActiveDrop(drop: MobilePublicDropCard): boolean {
  return drop.statusCode === "ACTIVE" && drop.quantityAvailable > 0 && new Date(drop.pickupEndAt).getTime() > Date.now();
}

function pickupStartLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function uniqueLabels(values: readonly (string | null | undefined)[], limit: number): readonly string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const raw of values) {
    const label = raw?.trim();
    if (!label || seen.has(label)) {
      continue;
    }
    seen.add(label);
    labels.push(label);
    if (labels.length >= limit) {
      break;
    }
  }

  return labels;
}

function DropRailCard({ drop, onPress }: { readonly drop: MobilePublicDropCard; readonly onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${drop.bagDisplayName} from ${drop.restaurantName}`} onPress={onPress}>
      <Card elevated="sm" style={{ width: 248, padding: spacing.md }}>
        <ProductMedia
          media={drop.image}
          fallbackSource={mediaFallbacks.coverFor(drop.restaurantName)}
          aspectRatio={16 / 10}
          accessibilityLabel={drop.image?.alt ?? `${drop.bagDisplayName} from ${drop.restaurantName}`}
        />
        <View style={{ gap: spacing.xs }}>
          <Text variant="caption" color={palette.muted} numberOfLines={1}>
            {drop.restaurantName}
            {drop.neighborhoodName ? ` · ${drop.neighborhoodName}` : ""}
          </Text>
          <Text variant="heading" numberOfLines={2}>
            {drop.bagDisplayName}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            <CountdownChip targetTime={drop.pickupEndAt} labelPrefix="Closes" />
            <Badge label={`${drop.quantityAvailable} left`} tone={drop.quantityAvailable <= 2 ? "warning" : "info"} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
            <Text variant="caption" color={palette.muted}>
              Pickup {pickupStartLabel(drop.pickupStartAt)}
            </Text>
            <Text variant="label">{formatPaise(drop.pricePaise)}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useDrops();
  const activeCount = data?.filter((drop) => drop.statusCode === "ACTIVE").length ?? 0;
  const liveDrops = (data ?? []).filter(isActiveDrop);
  const closingSoon = [...liveDrops]
    .sort((a, b) => new Date(a.pickupEndAt).getTime() - new Date(b.pickupEndAt).getTime())
    .slice(0, 6);
  const dietaryLabels = uniqueLabels(liveDrops.map((drop) => drop.dietaryCategoryCode), 4);
  const neighborhoodLabels = uniqueLabels(liveDrops.map((drop) => drop.neighborhoodName), 4);
  const chipLabels = [...dietaryLabels, ...neighborhoodLabels].slice(0, 6);

  return (
    <Screen contentStyle={{ gap: spacing.lg }}>
      <HeroBanner
        eyebrow="Hyderabad pickup discovery"
        title="goZaika"
        subtitle="Chef-curated BAM Bags with allergen disclosure, clear pickup windows, and no delivery detour."
        stats={[
          {
            label: activeCount === 1 ? "active drop" : "active drops",
            value: isLoading ? "..." : String(activeCount),
          },
        ]}
      >
        <Button label="Browse drops" accent={palette.saffron} onPress={() => router.push("/drops")} />
      </HeroBanner>

      {isLoading ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={24} width="48%" />
          <Skeleton height={190} />
          <Skeleton height={52} />
        </View>
      ) : null}

      {isError ? <ErrorState message="We couldn't load today's drops." onRetry={() => refetch()} /> : null}

      {!isLoading && !isError && data && liveDrops.length === 0 ? (
        <EmptyState
          title="No drops live right now"
          message="Check back soon for the next chef-curated pickup window."
          actionLabel="Refresh"
          onAction={() => refetch()}
        />
      ) : null}

      {closingSoon.length ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="heading">Closing soon</Text>
              <Text variant="caption" color={palette.muted}>
                Live drops sorted by pickup-window close.
              </Text>
            </View>
            <Link href="/drops" style={{ color: palette.forest, fontWeight: "700", fontSize: 13 }}>
              View all
            </Link>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
            {closingSoon.map((drop) => (
              <DropRailCard key={drop.dropPk} drop={drop} onPress={() => router.push(`/drops/${drop.dropPk}`)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {chipLabels.length ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="heading">Explore what is live</Text>
          <FilterChipRow
            accessibilityLabel="Live drop tags"
            chips={chipLabels.map((label) => ({ id: label, label }))}
            onSelect={() => router.push("/drops")}
          />
        </View>
      ) : null}

      <Card elevated="sm" style={{ backgroundColor: palette.white }}>
        <Text variant="heading">Passport and consent</Text>
        <Text color={palette.muted}>
          Sign in to view your Zayka Passport, discovery profile, and purpose-by-purpose privacy settings.
        </Text>
        <View style={{ gap: spacing.sm }}>
          <Link href="/auth/login" style={{ color: palette.forest, fontWeight: "700", fontSize: 15 }}>
            Sign in with phone OTP
          </Link>
          <Link href="/onboarding/consent" style={{ color: palette.forest, fontWeight: "700", fontSize: 15 }}>
            Privacy & consent
          </Link>
          <Link href="/swaad-club" style={{ color: palette.forest, fontWeight: "700", fontSize: 15 }}>
            Swaad Club
          </Link>
        </View>
      </Card>
    </Screen>
  );
}
