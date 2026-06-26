import { ApiError } from "@gozaika/mobile-core";
import {
  ActionCard,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SellThroughBar,
  Text,
  palette,
  spacing,
  type StatusTone,
} from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import type { DropSummary } from "@gozaika/types";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useDrops } from "@/api/catalog";
import { useAuth } from "@/auth/useAuth";

function dropTone(code: string): StatusTone {
  switch (code) {
    case "ACTIVE":
      return "success";
    case "SCHEDULED":
      return "info";
    case "SOLD_OUT":
    case "EXPIRED":
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

function windowLabel(startIso: string, endIso: string): string {
  const day = new Date(startIso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const t = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${day} · ${t(startIso)}–${t(endIso)}`;
}

function reservedCount(drop: DropSummary): number {
  return Math.max(0, drop.quantityTotal - drop.quantityAvailable);
}

function statusLabel(code: string): string {
  return code.replaceAll("_", " ");
}

function statusPriority(code: string): number {
  switch (code) {
    case "ACTIVE":
      return 0;
    case "SCHEDULED":
      return 1;
    case "DRAFT":
      return 2;
    default:
      return 3;
  }
}

export default function DropsScreen() {
  const { selectedRestaurantPk } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useDrops(selectedRestaurantPk);
  const drops = data?.drops ?? [];
  const [statusFilter, setStatusFilter] = useState("ALL");
  const statusOptions = useMemo(() => ["ALL", ...Array.from(new Set(drops.map((drop) => drop.statusCode)))], [drops]);
  const filteredDrops = useMemo(
    () =>
      drops
        .filter((drop) => statusFilter === "ALL" || drop.statusCode === statusFilter)
        .slice()
        .sort(
          (a, b) =>
            statusPriority(a.statusCode) - statusPriority(b.statusCode) ||
            new Date(a.pickupStartAt).getTime() - new Date(b.pickupStartAt).getTime(),
        ),
    [drops, statusFilter],
  );
  const activeCount = drops.filter((drop) => drop.statusCode === "ACTIVE").length;
  const scheduledCount = drops.filter((drop) => drop.statusCode === "SCHEDULED").length;
  const availableCount = drops.reduce((sum, drop) => sum + drop.quantityAvailable, 0);
  const reservedTotal = drops.reduce((sum, drop) => sum + reservedCount(drop), 0);
  const nextDrop = filteredDrops.find((drop) => drop.statusCode === "ACTIVE" || drop.statusCode === "SCHEDULED") ?? filteredDrops[0];

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from Home to manage drops." />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={palette.forest} />
      </Screen>
    );
  }
  if (isError && drops.length === 0) {
    const code = error instanceof ApiError ? error.code : null;
    return (
      <Screen>
        <ErrorState
          title={code === "ROLE_DENIED" ? "Not available for your role" : undefined}
          message={error instanceof ApiError ? error.message : "Could not load drops."}
          onRetry={code === "ROLE_DENIED" ? undefined : () => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="title">Limited Drops</Text>
        <Button label="New drop" accent={palette.forest} onPress={() => router.push("/drops/new")} />
      </View>

      <Card elevated="md" style={{ backgroundColor: palette.cream, borderColor: palette.forest }}>
        <Text variant="caption" color={palette.forest} style={{ textTransform: "uppercase" }}>
          Drop command center
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <View style={{ minWidth: 120, flex: 1 }}>
            <Text variant="title" color={palette.forest}>
              {activeCount}
            </Text>
            <Text variant="caption" color={palette.muted}>
              Active
            </Text>
          </View>
          <View style={{ minWidth: 120, flex: 1 }}>
            <Text variant="title" color={palette.forest}>
              {scheduledCount}
            </Text>
            <Text variant="caption" color={palette.muted}>
              Scheduled
            </Text>
          </View>
          <View style={{ minWidth: 120, flex: 1 }}>
            <Text variant="title" color={palette.forest}>
              {availableCount}
            </Text>
            <Text variant="caption" color={palette.muted}>
              Bags available
            </Text>
          </View>
        </View>
        <SellThroughBar sold={reservedTotal} total={drops.reduce((sum, drop) => sum + drop.quantityTotal, 0)} label="Reserved" />
      </Card>

      {nextDrop ? (
        <ActionCard
          title={nextDrop.statusCode === "ACTIVE" ? "Watch live inventory" : "Next scheduled pickup"}
          detail={`${nextDrop.dropTitle} · ${windowLabel(nextDrop.pickupStartAt, nextDrop.pickupEndAt)}`}
          actionLabel="Open details"
          onPress={() => router.push(`/drops/${nextDrop.dropPk}`)}
          tone={dropTone(nextDrop.statusCode)}
        />
      ) : null}

      {drops.length === 0 ? (
        <EmptyState title="No drops yet" message="Publish a drop from one of your BAM Bag templates." />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {statusOptions.map((status) => {
              const selected = statusFilter === status;
              return (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setStatusFilter(status)}
                  style={{
                    minHeight: 48,
                    justifyContent: "center",
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? palette.forest : palette.border,
                    backgroundColor: selected ? palette.forest : palette.white,
                    paddingHorizontal: spacing.md,
                  }}
                >
                  <Text variant="label" color={selected ? palette.white : palette.charcoal}>
                    {status === "ALL" ? "All" : statusLabel(status)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {filteredDrops.map((drop) => (
            <Link key={drop.dropPk} href={`/drops/${drop.dropPk}`} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={`Open ${drop.dropTitle}`}>
                <Card elevated="sm" style={{ borderColor: drop.statusCode === "ACTIVE" ? palette.forest : palette.border }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading">{drop.dropTitle}</Text>
                      <Text variant="caption" color={palette.muted}>
                        {windowLabel(drop.pickupStartAt, drop.pickupEndAt)}
                      </Text>
                    </View>
                    <Badge label={statusLabel(drop.statusCode)} tone={dropTone(drop.statusCode)} />
                  </View>
                  <SellThroughBar sold={reservedCount(drop)} total={drop.quantityTotal} label="Reserved" />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm }}>
                    <Text variant="caption" color={palette.muted}>
                      {drop.quantityAvailable}/{drop.quantityTotal} available · {drop.quantityHeld} held
                    </Text>
                    <Text variant="label">{formatPaise(drop.pricePaise)}</Text>
                  </View>
                </Card>
              </Pressable>
            </Link>
          ))}
          {filteredDrops.length === 0 ? (
            <Card>
              <Text variant="heading">No drops in this status</Text>
              <Text color={palette.muted}>Choose another status filter to review the rest of your drop calendar.</Text>
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
