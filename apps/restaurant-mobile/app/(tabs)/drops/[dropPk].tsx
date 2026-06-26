import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  Screen,
  SellThroughBar,
  Text,
  palette,
  spacing,
  type StatusTone,
} from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import type { DropSummary } from "@gozaika/types";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
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

function statusLabel(code: string): string {
  return code.replaceAll("_", " ");
}

function reservedCount(drop: DropSummary): number {
  return Math.max(0, drop.quantityTotal - drop.quantityAvailable);
}

function windowLabel(startIso: string, endIso: string): string {
  const date = new Date(startIso).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
  const t = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${date} · ${t(startIso)} to ${t(endIso)}`;
}

export default function DropDetailScreen() {
  const { dropPk } = useLocalSearchParams<{ dropPk: string }>();
  const { selectedRestaurantPk } = useAuth();
  const { data } = useDrops(selectedRestaurantPk);
  const drop = data?.drops.find((d) => d.dropPk === dropPk);

  if (!drop) {
    return (
      <Screen>
        <EmptyState title="Drop not loaded" message="Open this drop from the Drops list." />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Card elevated="md" style={{ backgroundColor: palette.cream, borderColor: palette.forest }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="caption" color={palette.forest} style={{ textTransform: "uppercase" }}>
              Limited Drop
            </Text>
            <Text variant="title">{drop.dropTitle}</Text>
            <Text variant="body" color={palette.muted}>
              {windowLabel(drop.pickupStartAt, drop.pickupEndAt)}
            </Text>
          </View>
          <Badge label={statusLabel(drop.statusCode)} tone={dropTone(drop.statusCode)} />
        </View>
        <SellThroughBar sold={reservedCount(drop)} total={drop.quantityTotal} label="Reserved" />
      </Card>

      <DataTable
        title="Inventory"
        rows={[
          { label: "Available", value: `${drop.quantityAvailable}`, helper: `${drop.quantityTotal} total bags` },
          { label: "Held", value: `${drop.quantityHeld}`, helper: "Server-held inventory" },
          { label: "Reserved", value: `${reservedCount(drop)}`, helper: "Total minus available" },
          { label: "Price", value: formatPaise(drop.pricePaise), helper: "Per bag" },
        ]}
      />

      <Card elevated="sm">
        <Text variant="heading">Next action</Text>
        <Text color={palette.muted}>
          Review live inventory and pickup timing here. Pause, cancel and activate controls stay in a later lifecycle
          slice so this pass does not change server state.
        </Text>
      </Card>
      <Text variant="caption" color={palette.muted}>
        Editing and status changes (pause/cancel) arrive in a later Slice 13 pass; publish new drops from the Drops tab.
      </Text>
    </Screen>
  );
}
