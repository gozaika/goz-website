import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  MetricHero,
  Button,
  Screen,
  Skeleton,
  Sparkline,
  Text,
  palette,
  spacing,
  type StatusTone,
} from "@gozaika/mobile-ui";
import type { FinanceSettlement } from "@gozaika/types";
import { formatBasisPoints, formatPaise } from "@gozaika/utils";
import { Linking, View } from "react-native";
import { useFinance, useInvoiceDownload } from "@/api/finance";
import { useAuth } from "@/auth/useAuth";

function InvoiceDownloadButton({ restaurantPk, invoicePk }: { readonly restaurantPk: string; readonly invoicePk: string }) {
  const download = useInvoiceDownload(restaurantPk);
  return (
    <View style={{ gap: spacing.xs }}>
      <Button
        label="Download invoice"
        variant="secondary"
        accent={palette.forest}
        loading={download.isPending}
        onPress={() =>
          download.mutate(invoicePk, {
            onSuccess: (res) => {
              void Linking.openURL(res.signedUrl);
            },
          })
        }
      />
      {download.isError ? (
        <Text variant="caption" color={palette.dangerFg}>
          {download.error instanceof ApiError ? download.error.message : "Could not get the invoice link."}
        </Text>
      ) : null}
    </View>
  );
}

function settlementTone(code: string): StatusTone {
  switch (code) {
    case "PAID":
    case "RECONCILED":
      return "success";
    case "CANCELLED":
    case "FAILED":
      return "danger";
    case "LOCKED":
    case "OPEN":
    case "SENT":
      return "warning";
    default:
      return "neutral";
  }
}

function periodLabel(startIso: string, endIso: string): string {
  const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return `${d(startIso)} - ${d(endIso)}`;
}

function ratioBps(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 10000) : 0;
}

function settlementRows(settlement: FinanceSettlement) {
  return [
    { label: "Gross sales", value: formatPaise(settlement.grossSalesPaise), helper: `${settlement.orderCount} orders` },
    { label: "Refunds", value: `- ${formatPaise(settlement.refundPaise)}`, helper: "Refunds and debits", tone: settlement.refundPaise > 0 ? "warning" as const : "neutral" as const },
    { label: "Commission", value: `- ${formatPaise(settlement.commissionPaise)}`, helper: formatBasisPoints(ratioBps(settlement.commissionPaise, settlement.grossSalesPaise)) },
    { label: "Payment fee", value: `- ${formatPaise(settlement.paymentFeePaise)}`, helper: formatBasisPoints(ratioBps(settlement.paymentFeePaise, settlement.grossSalesPaise)) },
    { label: "Tax", value: formatPaise(settlement.taxPaise), helper: "Tax component" },
    { label: "Net payout", value: formatPaise(settlement.netPayoutPaise), helper: settlement.paidAt ? `Paid ${new Date(settlement.paidAt).toLocaleDateString("en-IN")}` : "Awaiting payout" },
  ];
}

export default function FinanceScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { data, isLoading, isError, error, refetch } = useFinance(selectedRestaurantPk);
  const settlements = data?.settlements ?? [];

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from Home to view finance." />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={148} />
        <Skeleton height={120} />
        <Skeleton height={180} />
      </Screen>
    );
  }
  if (isError && settlements.length === 0) {
    const code = error instanceof ApiError ? error.code : null;
    return (
      <Screen>
        <ErrorState
          title={code === "ROLE_DENIED" ? "Not available for your role" : undefined}
          message={error instanceof ApiError ? error.message : "Could not load finance."}
          onRetry={code === "ROLE_DENIED" ? undefined : () => refetch()}
        />
      </Screen>
    );
  }

  const latest = settlements[0];
  const totalGross = settlements.reduce((sum, settlement) => sum + settlement.grossSalesPaise, 0);
  const totalNet = settlements.reduce((sum, settlement) => sum + settlement.netPayoutPaise, 0);
  const totalRefunds = settlements.reduce((sum, settlement) => sum + settlement.refundPaise, 0);
  const totalFees = settlements.reduce((sum, settlement) => sum + settlement.paymentFeePaise + settlement.commissionPaise, 0);

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Finance</Text>
      <Text color={palette.muted}>Read-only settlement summaries. Payouts and refunds are managed by goZaika.</Text>

      {settlements.length === 0 || !latest ? (
        <>
          <MetricHero
            eyebrow="Settlement status"
            title="No settlement runs yet"
            value={formatPaise(0)}
            helper="Reconciled payouts will appear after eligible paid orders close."
            badgeLabel="Read-only"
            badgeTone="neutral"
            accent={palette.forest}
          />
          <DataTable
            title="Finance basis"
            rows={[
              { label: "Gross sales", value: formatPaise(0), helper: "No reconciled settlement orders yet" },
              { label: "Net payout", value: formatPaise(0), helper: "No payout scheduled yet" },
              { label: "Refunds/debits", value: formatPaise(0), helper: "No settlement adjustments yet" },
              { label: "Settlement runs", value: "0", helper: "Created by goZaika after reconciliation" },
            ]}
          />
          <Card elevated="sm">
            <Text variant="heading">No settlements yet</Text>
            <Text color={palette.muted}>Settlement runs appear here once orders are reconciled.</Text>
          </Card>
        </>
      ) : (
        <>
          <MetricHero
            eyebrow="Latest settlement"
            title={periodLabel(latest.periodStartAt, latest.periodEndAt)}
            value={formatPaise(latest.netPayoutPaise)}
            helper={`${latest.orderCount} orders - gross ${formatPaise(latest.grossSalesPaise)}`}
            badgeLabel={latest.statusCode.replaceAll("_", " ")}
            badgeTone={settlementTone(latest.statusCode)}
            accent={palette.forest}
          >
            <View style={{ marginTop: spacing.sm }}>
              <Sparkline values={settlements.map((settlement) => settlement.netPayoutPaise).reverse()} label="Net payout by settlement" />
            </View>
          </MetricHero>

          <DataTable
            title="Settlement totals"
            rows={[
              { label: "Gross sales", value: formatPaise(totalGross), helper: `${settlements.length} settlement runs` },
              { label: "Net payout", value: formatPaise(totalNet), helper: formatBasisPoints(ratioBps(totalNet, totalGross)) },
              { label: "Refunds", value: `- ${formatPaise(totalRefunds)}`, helper: "Across listed settlements", tone: totalRefunds > 0 ? "warning" : "neutral" },
              { label: "Commission + payment fees", value: `- ${formatPaise(totalFees)}`, helper: formatBasisPoints(ratioBps(totalFees, totalGross)) },
            ]}
          />

          <Text variant="heading">Settlement runs</Text>
          {settlements.map((settlement) => (
            <View key={settlement.settlementRunPk} style={{ gap: spacing.sm }}>
              <Card elevated="sm">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="heading">{periodLabel(settlement.periodStartAt, settlement.periodEndAt)}</Text>
                    <Text variant="caption" color={palette.muted}>
                      {settlement.maskedPayoutAccount ? `Payout to ${settlement.maskedPayoutAccount}` : "Payout account not shown"}
                    </Text>
                  </View>
                  <Badge label={settlement.statusCode.replaceAll("_", " ")} tone={settlementTone(settlement.statusCode)} />
                </View>
              </Card>
              <DataTable
                rows={[
                  ...settlementRows(settlement),
                  ...(settlement.invoiceNumber
                    ? [
                        {
                          label: "Invoice",
                          value: settlement.invoiceNumber,
                          helper: settlement.invoiceStatusCode ?? undefined,
                        },
                      ]
                    : []),
                ]}
              />
              {settlement.invoicePk && settlement.invoiceNumber ? (
                <InvoiceDownloadButton restaurantPk={selectedRestaurantPk} invoicePk={settlement.invoicePk} />
              ) : null}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
