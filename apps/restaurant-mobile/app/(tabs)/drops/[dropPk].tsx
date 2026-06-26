import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Button,
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
import type { DropStatusActionRequest, DropSummary } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { useLocalSearchParams } from "expo-router";
import { Alert, View } from "react-native";
import { useDrops, useSetDropStatus } from "@/api/catalog";
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
  return `${date} - ${t(startIso)} to ${t(endIso)}`;
}

type LifecycleAction = {
  readonly label: string;
  readonly nextStatusCode: DropStatusActionRequest["nextStatusCode"];
  readonly tone: "primary" | "secondary" | "danger";
  readonly reasonText: string;
  readonly confirmTitle: string;
  readonly confirmBody: string;
};

function lifecycleActions(drop: DropSummary): readonly LifecycleAction[] {
  switch (drop.statusCode) {
    case "ACTIVE":
      return [
        {
          label: "Pause claims",
          nextStatusCode: "PAUSED",
          tone: "secondary",
          reasonText: "Partner paused this active drop from goZaika Partner mobile.",
          confirmTitle: "Pause this drop?",
          confirmBody: "New claims will stop. Existing paid orders are not changed.",
        },
        {
          label: "Cancel drop",
          nextStatusCode: "CANCELLED",
          tone: "danger",
          reasonText: "Partner cancelled this active drop from goZaika Partner mobile.",
          confirmTitle: "Cancel this drop?",
          confirmBody: "This closes the drop. Paid orders are not changed by this action.",
        },
      ];
    case "SCHEDULED":
      return [
        {
          label: "Activate now",
          nextStatusCode: "ACTIVE",
          tone: "primary",
          reasonText: "Partner activated this scheduled drop from goZaika Partner mobile.",
          confirmTitle: "Activate this drop now?",
          confirmBody: "Customers can claim available bags as soon as the server accepts this change.",
        },
        {
          label: "Pause schedule",
          nextStatusCode: "PAUSED",
          tone: "secondary",
          reasonText: "Partner paused this scheduled drop from goZaika Partner mobile.",
          confirmTitle: "Pause this scheduled drop?",
          confirmBody: "The drop stays visible to your team but is not claimable while paused.",
        },
        {
          label: "Cancel drop",
          nextStatusCode: "CANCELLED",
          tone: "danger",
          reasonText: "Partner cancelled this scheduled drop from goZaika Partner mobile.",
          confirmTitle: "Cancel this drop?",
          confirmBody: "This closes the scheduled drop and leaves existing paid orders untouched.",
        },
      ];
    case "PAUSED":
      return [
        {
          label: "Reactivate",
          nextStatusCode: "ACTIVE",
          tone: "primary",
          reasonText: "Partner reactivated this paused drop from goZaika Partner mobile.",
          confirmTitle: "Reactivate this drop?",
          confirmBody: "Customers can claim available bags again if publishing guardrails allow it.",
        },
        {
          label: "Cancel drop",
          nextStatusCode: "CANCELLED",
          tone: "danger",
          reasonText: "Partner cancelled this paused drop from goZaika Partner mobile.",
          confirmTitle: "Cancel this drop?",
          confirmBody: "This closes the paused drop. Paid orders are not changed by this action.",
        },
      ];
    default:
      return [];
  }
}

export default function DropDetailScreen() {
  const { dropPk } = useLocalSearchParams<{ dropPk: string }>();
  const { selectedRestaurantPk } = useAuth();
  const { data } = useDrops(selectedRestaurantPk);
  const drop = data?.drops.find((d) => d.dropPk === dropPk);
  const statusAction = useSetDropStatus(selectedRestaurantPk, dropPk);

  if (!drop) {
    return (
      <Screen>
        <EmptyState title="Drop not loaded" message="Open this drop from the Drops list." />
      </Screen>
    );
  }

  const actions = lifecycleActions(drop);
  const actionError = statusAction.error instanceof ApiError ? statusAction.error.message : null;

  function confirmAction(action: LifecycleAction) {
    Alert.alert(action.confirmTitle, action.confirmBody, [
      { text: "Keep as is", style: "cancel" },
      {
        text: action.label,
        style: action.tone === "danger" ? "destructive" : "default",
        onPress: () => statusAction.mutate({ nextStatusCode: action.nextStatusCode, reasonText: action.reasonText }),
      },
    ]);
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
        <Text variant="heading">Lifecycle</Text>
        {actions.length > 0 ? (
          <>
            <Text color={palette.muted}>
              Confirm changes before the server updates this drop. Paid orders are not changed by these controls.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {actions.map((action) => (
                <Button
                  key={`${action.nextStatusCode}-${action.label}`}
                  label={action.label}
                  variant={action.tone === "primary" ? "primary" : "secondary"}
                  accent={action.tone === "danger" ? palette.dangerFg : palette.forest}
                  loading={statusAction.isPending}
                  disabled={statusAction.isPending}
                  onPress={() => confirmAction(action)}
                  style={{ flexGrow: 1 }}
                />
              ))}
            </View>
            {actionError ? (
              <Text variant="caption" color={palette.dangerFg}>
                {actionError}
              </Text>
            ) : null}
            {statusAction.data?.message ? (
              <Text variant="caption" color={palette.forest}>
                {statusAction.data.message}
              </Text>
            ) : null}
          </>
        ) : (
          <Text color={palette.muted}>This drop status is final here. Review historical inventory and orders without changing state.</Text>
        )}
      </Card>
      <Text variant="caption" color={palette.muted}>
        Quantity, price and pickup window edits stay on the web portal; publish new drops from the Drops tab.
      </Text>
    </Screen>
  );
}
