import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  palette,
  Screen,
  Skeleton,
  spacing,
  Text,
  type StatusTone,
} from "@gozaika/mobile-ui";
import { formatBasisPoints, formatPaise } from "@gozaika/utils";
import type { RoiPartnerReportCopyPayload, RoiReportDropDetailRow } from "@gozaika/types";
import { Share, View } from "react-native";
import { useRoiReport } from "@/api/reports";
import { useAuth } from "@/auth/useAuth";

function periodLabel(startIso: string, endIso: string): string {
  const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return `${d(startIso)} – ${d(endIso)}`;
}

function cardTone(tone: string): StatusTone {
  if (tone === "success" || tone === "warning" || tone === "danger" || tone === "info") return tone;
  return "neutral";
}

/** Compose the partner-safe share text from the server payload (counts only, no PII). */
function partnerShareText(copy: RoiPartnerReportCopyPayload): string {
  return [
    `${copy.title}`,
    `${copy.restaurantName} · ${copy.periodLabel}`,
    "",
    ...copy.summaryLines,
    "",
    "Next actions:",
    ...copy.nextActionLines.map((l) => `• ${l}`),
  ].join("\n");
}

function DropRow({ row }: { readonly row: RoiReportDropDetailRow }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text variant="heading">{row.dropTitle || row.bagDisplayName}</Text>
        <Badge label={row.dropStatusCode.replaceAll("_", " ")} tone="neutral" />
      </View>
      <Text variant="caption" color={palette.muted}>
        {new Date(row.pickupStartAt).toLocaleDateString("en-IN")} · sold {row.quantitySold}/{row.quantityListed} ·{" "}
        {formatBasisPoints(row.sellThroughBps)} sell-through
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs }}>
        <Text variant="caption" color={palette.muted}>
          GMV {formatPaise(row.gmvPaise)} · Net {formatPaise(row.estimatedNetRecoveryPaise)}
        </Text>
        <Text variant="caption" color={palette.muted}>
          {row.quantityCollected} collected · {row.noShowCount} no-show · {row.incidentCount} incidents
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
        <Skeleton height={28} width="60%" />
        <Skeleton height={90} />
        <Skeleton height={90} />
        <Skeleton height={140} />
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

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Weekly ROI report</Text>
      <Text variant="body" color={palette.muted}>
        {summary.restaurantName} · {periodLabel(summary.periodStartAt, summary.periodEndAt)}
      </Text>
      <Badge
        label={lockedBasis ? "Backed by locked settlement" : "Estimated · pilot reporting"}
        tone={lockedBasis ? "success" : "warning"}
      />

      {/* Metric cards */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {summary.metricCards.map((card) => (
          <Card key={card.code} style={{ flexBasis: "47%", flexGrow: 1 }}>
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

      {/* Partner-safe share */}
      <Button
        label="Share partner report"
        accent={palette.forest}
        onPress={() => Share.share({ message: partnerShareText(partnerCopy) })}
      />
      <Text variant="caption" color={palette.muted}>
        Share text is partner-safe: counts and totals only — no customer names, phone numbers, emails, or pickup codes.
      </Text>

      {/* Assumptions */}
      <Card style={{ backgroundColor: palette.warningBg, borderColor: palette.gold }}>
        <Text variant="heading">Report assumptions</Text>
        {summary.assumptions.map((a) => (
          <Text key={a} variant="caption" color={palette.charcoal}>
            • {a}
          </Text>
        ))}
      </Card>

      {/* Drop performance */}
      <Text variant="heading">Drop performance</Text>
      {dropRows.length === 0 ? (
        <EmptyState
          title="No drops listed in this period"
          message="Publish a Limited Drop — once paid orders and pickups exist, sell-through, GMV, net recovery and pickup outcomes appear here."
        />
      ) : (
        dropRows.map((row) => <DropRow key={row.dropPk} row={row} />)
      )}

      {/* Next actions */}
      <Card>
        <Text variant="heading">Next actions</Text>
        {summary.nextActions.map((a) => (
          <Text key={a} variant="body" color={palette.muted}>
            • {a}
          </Text>
        ))}
      </Card>

      {/* Exceptions */}
      <Text variant="heading">Exceptions</Text>
      {noteRows.length === 0 ? (
        <Card>
          <Text variant="body" color={palette.muted}>
            No incidents or refunds/debits are present for this period.
          </Text>
        </Card>
      ) : (
        noteRows.slice(0, 6).map((note) => (
          <Card key={note.rowPk}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text variant="label">{note.titleText}</Text>
              <Badge label={note.noteTypeCode} tone={note.noteTypeCode === "INCIDENT" ? "danger" : "warning"} />
            </View>
            <Text variant="caption" color={palette.muted}>
              {note.orderNumber ?? "No order"} ·{" "}
              {note.amountPaise == null ? (note.statusCode ?? "—") : formatPaise(note.amountPaise)}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
