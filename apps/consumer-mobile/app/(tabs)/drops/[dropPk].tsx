import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Button,
  Card,
  CountdownChip,
  ErrorState,
  palette,
  ProductMedia,
  ProgressRing,
  Screen,
  Skeleton,
  spacing,
  StickyActionBar,
  Text,
  toneColors,
} from "@gozaika/mobile-ui";
import type { MobilePublicDropCard } from "@gozaika/types";
import { evaluateAllergenConflict, formatAllergenLabel, formatDietaryLabel, formatPaise } from "@gozaika/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { useSafetyPrefs } from "@/api/account";
import { useClaim } from "@/api/checkout";
import { useDrop } from "@/api/discovery";
import { useAuth } from "@/auth/useAuth";
import { mediaFallbacks } from "@/ui/mediaFallbacks";
import { usePeekBarInset } from "@/ui/peekBarInset";

function pickupWindowLabel(drop: MobilePublicDropCard): string {
  const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${time(drop.pickupStartAt)}-${time(drop.pickupEndAt)}`;
}

function soldPercent(drop: MobilePublicDropCard): number {
  if (drop.quantityTotal <= 0) return 0;
  return ((drop.quantityTotal - drop.quantityAvailable) / drop.quantityTotal) * 100;
}

function isClosed(drop: MobilePublicDropCard): boolean {
  return new Date(drop.pickupEndAt).getTime() <= Date.now();
}

function isLowStock(drop: MobilePublicDropCard): boolean {
  return drop.quantityAvailable > 0 && (drop.quantityAvailable <= 3 || drop.quantityAvailable / drop.quantityTotal <= 0.2);
}

function AvailabilityCard({ drop }: { readonly drop: MobilePublicDropCard }) {
  const soldOut = drop.quantityAvailable <= 0;
  const closed = isClosed(drop);
  const lowStock = isLowStock(drop);
  const tone = soldOut || closed ? "danger" : lowStock ? "warning" : "success";
  const colors = toneColors(tone);

  return (
    <Card elevated="sm" style={{ backgroundColor: colors.bg, borderColor: colors.fg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
        <ProgressRing value={soldPercent(drop)} label="Sold" size={88} accent={colors.fg} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="heading" color={colors.fg}>
            {soldOut ? "Sold out" : closed ? "Pickup closed" : lowStock ? "Almost gone" : "Available now"}
          </Text>
          <Text color={colors.fg}>
            {drop.quantityAvailable} of {drop.quantityTotal} bags left
          </Text>
          <Text variant="caption" color={colors.fg}>
            Pickup {pickupWindowLabel(drop)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function DropDetailScreen() {
  const { dropPk } = useLocalSearchParams<{ dropPk: string }>();
  const { data: drop, isLoading, isError, refetch } = useDrop(dropPk ?? "");
  const { session } = useAuth();
  const router = useRouter();
  const claim = useClaim();
  const peekInset = usePeekBarInset();
  const safetyPrefs = useSafetyPrefs(Boolean(session));
  const [showConflict, setShowConflict] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // §16 allergen-conflict gate — warn + explicit acknowledgement before a hold.
  const conflict = useMemo(
    () =>
      evaluateAllergenConflict(safetyPrefs.data ?? { avoidAllergenCodes: [], dietaryPreferenceCodes: [] }, {
        allergenCodes: drop?.allergenCodes ?? [],
        dietaryCategoryCode: drop?.dietaryCategoryCode ?? "",
      }),
    [safetyPrefs.data, drop?.allergenCodes, drop?.dietaryCategoryCode],
  );

  if (isError) {
    return (
      <Screen scroll={false}>
        <ErrorState message="We couldn't load this drop." onRetry={() => refetch()} />
      </Screen>
    );
  }

  if (isLoading || !drop) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={240} />
        <Skeleton height={32} width="70%" />
        <Skeleton height={104} />
        <Skeleton height={96} />
      </Screen>
    );
  }

  const soldOut = drop.quantityAvailable <= 0;
  const closed = isClosed(drop);
  const isBlindAdventure = drop.dropTypeCode === "BLIND_ADVENTURE";
  const disabled = soldOut || closed;
  const primaryLabel = !session ? "Sign in to claim" : soldOut ? "Sold out" : closed ? "Pickup closed" : "Claim a bag";

  const runClaim = () => {
    claim.mutate({ dropPk: drop.dropPk }, { onSuccess: (result) => router.push(`/checkout/${result.holdPk}`) });
  };

  const acknowledgeAndClaim = () => {
    setAcknowledged(true);
    setShowConflict(false);
    runClaim();
  };

  return (
    <Screen scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md }}>
        <ProductMedia
          media={drop.image}
          fallbackSource={mediaFallbacks.coverForDrop(drop)}
          accessibilityLabel={drop.image?.alt ?? `${drop.bagDisplayName} from ${drop.restaurantName}`}
          testID={`drop-detail-media-${drop.dropPk}`}
        />

        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            <CountdownChip targetTime={drop.pickupEndAt} labelPrefix="Pickup closes" />
            <Badge label={drop.dietaryCategoryCode} tone={drop.dietaryCategoryCode === "VEG" ? "success" : "neutral"} />
            {drop.spiceLevelCode ? <Badge label={drop.spiceLevelCode} tone="neutral" /> : null}
          </View>
          <Text variant="caption" color={palette.muted}>
            {drop.restaurantName}
            {drop.neighborhoodName ? ` · ${drop.neighborhoodName}` : ""}
          </Text>
          <Text variant="title">{drop.bagDisplayName}</Text>
          {drop.bagShortDescription ? <Text color={palette.muted}>{drop.bagShortDescription}</Text> : null}
        </View>

        <Card elevated="sm" style={{ backgroundColor: palette.cream }}>
          <Text variant="caption" color={palette.forest}>
            Not a deal. A discovery.
          </Text>
          <Text color={palette.charcoal}>
            A chef-curated thali — {isBlindAdventure ? "a cuisine to discover" : "a generous spread from one kitchen"}, portioned so you get
            more to try, not less. {isBlindAdventure ? "Know the kitchen; discover the cuisine." : "Know the kitchen; discover the dishes."} The
            full lineup is a surprise; every allergen is disclosed below.
          </Text>
        </Card>

        <AvailabilityCard drop={drop} />

        <Card elevated="sm">
          <Text variant="label">What you pay</Text>
          <Text variant="title" color={palette.forest}>
            {formatPaise(drop.pricePaise)}
          </Text>
          {drop.minMenuValuePaise ? (
            <Text variant="caption" color={palette.muted}>
              Listed menu value from {formatPaise(drop.minMenuValuePaise)}
            </Text>
          ) : null}
          {drop.servesMin || drop.servesMax ? (
            <Text variant="caption" color={palette.muted}>
              Serves {[drop.servesMin, drop.servesMax].filter(Boolean).join("-")}
            </Text>
          ) : null}
        </Card>

        <Card elevated="sm">
          <Text variant="label">Allergens</Text>
          <Text color={palette.charcoal}>
            {drop.allergenSummaryText ??
              (drop.allergenCodes.length > 0
                ? drop.allergenCodes.join(", ")
                : "No allergen information provided - do not assume safety.")}
          </Text>
        </Card>

        {drop.holdingGuidanceText ? (
          <Card elevated="sm">
            <Text variant="label">Pickup guidance</Text>
            <Text color={palette.muted}>{drop.holdingGuidanceText}</Text>
          </Card>
        ) : null}
      </ScrollView>

      <StickyActionBar
        primaryLabel={primaryLabel}
        disabled={session ? disabled || claim.isPending : false}
        accent={palette.forest}
        style={{ marginBottom: peekInset }}
        helperText={`${formatPaise(drop.pricePaise)} · pickup ${pickupWindowLabel(drop)}`}
        onPrimaryPress={() => {
          if (!session) {
            router.push("/auth/login");
            return;
          }
          if (conflict.hasConflict && !acknowledged) {
            setShowConflict(true);
            return;
          }
          runClaim();
        }}
      >
        {claim.isError ? (
          <Text variant="caption" color={palette.dangerFg}>
            {claim.error instanceof ApiError ? claim.error.message : "Could not hold a bag. Please try again."}
          </Text>
        ) : null}
      </StickyActionBar>

      <Modal
        visible={showConflict}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConflict(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.xl }}>
          <Card elevated="md" style={{ borderColor: toneColors("danger").fg, borderWidth: 1, gap: spacing.sm }}>
            <Text variant="heading" color={toneColors("danger").fg}>
              Check this against your preferences
            </Text>
            {conflict.conflictingAllergens.length > 0 ? (
              <Text color={palette.charcoal}>
                You&apos;ve asked us to flag {conflict.conflictingAllergens.map(formatAllergenLabel).join(", ")}. This bag discloses{" "}
                {conflict.conflictingAllergens.length === 1 ? "it" : "them"} in its allergens.
              </Text>
            ) : null}
            {conflict.dietaryConflict ? (
              <Text color={palette.charcoal}>
                This bag is {formatDietaryLabel(conflict.dietaryConflict)}, which doesn&apos;t match your saved dietary preference.
              </Text>
            ) : null}
            <Text variant="caption" color={palette.muted}>
              You can still claim it — just confirm you&apos;ve checked. Update saved preferences any time in your account.
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="secondary" accent={palette.forest} onPress={() => setShowConflict(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Claim anyway" accent={toneColors("danger").fg} onPress={acknowledgeAndClaim} />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
