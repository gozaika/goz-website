import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  MetricHero,
  Screen,
  SellThroughBar,
  Skeleton,
  Sparkline,
  Text,
  palette,
  spacing,
  type StatusTone,
} from "@gozaika/mobile-ui";
import type { RoiPartnerReportCopyPayload, RoiReportDropDetailRow } from "@gozaika/types";
import { formatBasisPoints, formatPaise, IST_TIME_ZONE } from "@gozaika/utils";
import { Share, View } from "react-native";
import { useRoiReport } from "@/api/reports";
import { useAuth } from "@/auth/useAuth";

function periodLabel(startIso: string, endIso: string): string {
  const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: IST_TIME_ZONE });
  return `${d(startIso)} - ${d(endIso)}`;
}

function cardTone(tone: string): StatusTone {
  if (tone === "success" || tone === "warning" || tone === "danger" || tone === "info") return tone;
  return "neutral";
}

function statusTone(code: string | null): StatusTone {
  switch (code) {
    case "LOCKED":
    case "PAID":
    case "RECONCILED":
      return "success";
    case "CANCELLED":
      return "danger";
    case "OPEN":
    case "SENT":
      return "warning";
    default:
      return "neutral";
  }
}

function partnerShareText(copy: RoiPartnerReportCopyPayload): string {
  return [
    copy.title,
    `${copy.restaurantName} - ${copy.periodLabel}`,
    "",
    ...copy.summaryLines,
    "",
    "Next actions:",
    ...copy.nextActionLines.map((line) => `- ${line}`),
  ].join("\n");
}

function DropRow({ row }: { readonly row: RoiReportDropDetailRow }) {
  return (
    <Card elevated="sm">
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{row.dropTitle || row.bagDisplayName}</Text>
          <Text variant="caption" color={palette.muted}>
            {new Date(row.pickupStartAt).toLocaleDateString("en-IN", { timeZone: IST_TIME_ZONE })} - {formatPaise(row.gmvPaise)} GMV
          </Text>
        </View>
        <Badge label={row.dropStatusCode.replaceAll("_", " ")} tone={statusTone(row.settlementStatusCode)} />
      </View>
      <SellThroughBar sold={row.quantitySold} total={row.quantityListed} label="Bags sold/listed" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm }}>
        <Text variant="caption" color={palette.muted}>
          Net {formatPaise(row.estimatedNetRecoveryPaise)} - {formatBasisPoints(row.sellThroughBps ?? 0)} sell-through
        </Text>
        <Text variant="caption" color={palette.muted}>
          {row.quantityCollected} collected - {row.noShowCount} no-show - {row.incidentCount} incidents
        </Text>
      </View>
    </Card>
  );
}

export default function ReportsScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { data, isLoading, isError, error, refetch } = useRoiReport(selectedRestaurantPk);

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from Home to view ROI reports." />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={148} />
        <Skeleton height={96} />
        <Skeleton height={140} />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (isError || !data) {
    const code = error instanceof ApiError ? error.code : null;
    return (
      <Screen>
        <ErrorState
          title={code === "ROLE_DENIED" ? "Not available for your role" : undefined}
          message={error instanceof ApiError ? error.message : "Could not load the ROI report."}
          onRetry={code === "ROLE_DENIED" ? undefined : () => refetch()}
        />
      </Screen>
    );
  }

  const { summary, dropRows, noteRows, partnerCopy } = data;
  const lockedBasis = summary.netRecoveryBasisCode === "SETTLEMENT_LOCKED";
  const soldTrend = dropRows.map((row) => row.quantitySold);

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <MetricHero
        eyebrow="Weekly ROI"
        title={summary.restaurantName}
        value={formatPaise(summary.estimatedNetRecoveryPaise)}
        helper={`${periodLabel(summary.periodStartAt, summary.periodEndAt)} - ${summary.bagsSoldCount}/${summary.bagsListedCount} bags sold`}
        badgeLabel={lockedBasis ? "Locked settlement" : "Estimated"}
        badgeTone={lockedBasis ? "success" : "warning"}
        accent={palette.forest}
      >
        <View style={{ marginTop: spacing.sm }}>
          <SellThroughBar sold={summary.bagsSoldCount} total={summary.bagsListedCount} label="Overall sell-through" />
        </View>
      </MetricHero>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {summary.metricCards.map((card) => (
          <Card key={card.code} elevated="sm" style={{ flexBasis: "47%", flexGrow: 1 }}>
            <Text variant="caption" color={palette.muted}>
              {card.label}
            </Text>
            <Text variant="heading" color={cardTone(card.tone) === "warning" ? palette.warningFg : palette.forest}>
              {card.valueText}
            </Text>
            <Text variant="caption" color={palette.muted}>
              {card.helperText}
            </Text>
          </Card>
        ))}
      </View>

      <DataTable
        title="Report basis"
        rows={[
          { label: "GMV", value: formatPaise(summary.gmvPaise), helper: "Paid order value in this period" },
          { label: "Payment fees", value: formatPaise(summary.paymentFeePaise), helper: "Gateway and related fees" },
          { label: "Refunds/debits", value: formatPaise(summary.refundDebitPaise), helper: "Adjustments included in report", tone: summary.refundDebitPaise > 0 ? "warning" : "neutral" },
          { label: "Pickup completion", value: summary.pickupCompletionBps == null ? "n/a" : formatBasisPoints(summary.pickupCompletionBps), helper: `${summary.pickupCompletedCount} collected, ${summary.openPickupOrderCount} open` },
        ]}
      />

      <Card elevated="sm">
        <Text variant="heading">Drop mix</Text>
        <Sparkline values={soldTrend} label="Bags sold by drop" />
        <Text variant="caption" color={palette.muted}>
          {summary.dropsListedCount} drops listed - {summary.firstTimeBuyerCount} first-time buyers - {summary.repeatBuyerCount} repeat buyers
        </Text>
      </Card>

      <Button label="Share partner report" accent={palette.forest} onPress={() => Share.share({ message: partnerShareText(partnerCopy) })} />
      <Text variant="caption" color={palette.muted}>
        Partner-safe share text contains counts and totals only.
      </Text>

      <Card style={{ backgroundColor: palette.warningBg, borderColor: palette.gold }}>
        <Text variant="heading">Report assumptions</Text>
        {summary.assumptions.map((assumption) => (
          <Text key={assumption} variant="caption" color={palette.charcoal}>
            - {assumption}
          </Text>
        ))}
      </Card>

      <Text variant="heading">Drop performance</Text>
      {dropRows.length === 0 ? (
        <EmptyState
          title="No drops listed in this period"
          message="Once paid orders and pickups exist, sell-through, GMV, net recovery and pickup outcomes appear here."
        />
      ) : (
        dropRows.map((row) => <DropRow key={row.dropPk} row={row} />)
      )}

      <Card elevated="sm">
        <Text variant="heading">Next actions</Text>
        {summary.nextActions.map((action) => (
          <Text key={action} color={palette.muted}>
            - {action}
          </Text>
        ))}
      </Card>

      <Text variant="heading">Exceptions</Text>
      {noteRows.length === 0 ? (
        <Card>
          <Text color={palette.muted}>No incidents or refunds/debits are present for this period.</Text>
        </Card>
      ) : (
        noteRows.slice(0, 6).map((note) => (
          <Card key={note.rowPk} elevated="sm">
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
              <Text variant="label" style={{ flex: 1 }}>
                {note.titleText}
              </Text>
              <Badge label={note.noteTypeCode} tone={note.noteTypeCode === "INCIDENT" ? "danger" : "warning"} />
            </View>
            <Text variant="caption" color={palette.muted}>
              {note.orderNumber ?? "No order"} - {note.amountPaise == null ? (note.statusCode ?? "n/a") : formatPaise(note.amountPaise)}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
