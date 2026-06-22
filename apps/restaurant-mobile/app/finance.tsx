import { ApiError } from "@gozaika/mobile-core";
import { Badge, Card, EmptyState, ErrorState, Screen, Text, palette, type StatusTone } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { ActivityIndicator, View } from "react-native";
import { useFinance } from "@/api/finance";
import { useAuth } from "@/auth/useAuth";

function settlementTone(code: string): StatusTone {
  switch (code) {
    case "PAID":
    case "RECONCILED":
      return "success";
    case "CANCELLED":
    case "FAILED":
      return "danger";
    case "LOCKED":
    case "PENDING":
      return "warning";
    default:
      return "neutral";
  }
}

function period(startIso: string, endIso: string): string {
  const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return `${d(startIso)} – ${d(endIso)}`;
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text variant="caption" color={palette.muted}>
        {label}
      </Text>
      <Text variant="caption">{value}</Text>
    </View>
  );
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
      <Screen contentStyle={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={palette.forest} />
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

  return (
    <Screen>
      <Text variant="title">Finance</Text>
      <Text variant="body" color={palette.muted}>
        Read-only settlement summaries. Payouts and refunds are managed by goZaika — nothing here changes payment state.
      </Text>
      {settlements.length === 0 ? (
        <EmptyState title="No settlements yet" message="Settlement runs appear here once orders are reconciled." />
      ) : (
        settlements.map((s) => (
          <Card key={s.settlementRunPk}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text variant="heading">{period(s.periodStartAt, s.periodEndAt)}</Text>
              <Badge label={s.statusCode.replaceAll("_", " ")} tone={settlementTone(s.statusCode)} />
            </View>
            <Text variant="title" color={palette.forest}>
              {formatPaise(s.netPayoutPaise)}
            </Text>
            <Text variant="caption" color={palette.muted}>
              Net payout · {s.orderCount} orders
            </Text>
            <View style={{ height: 1, backgroundColor: palette.border, marginVertical: 4 }} />
            <Row label="Gross sales" value={formatPaise(s.grossSalesPaise)} />
            <Row label="Refunds" value={`- ${formatPaise(s.refundPaise)}`} />
            <Row label="Commission" value={`- ${formatPaise(s.commissionPaise)}`} />
            <Row label="Payment fee" value={`- ${formatPaise(s.paymentFeePaise)}`} />
            <Row label="Tax" value={formatPaise(s.taxPaise)} />
            {s.invoiceNumber ? <Row label="Invoice" value={`${s.invoiceNumber}${s.invoiceStatusCode ? ` · ${s.invoiceStatusCode}` : ""}`} /> : null}
            {s.maskedPayoutAccount ? <Row label="Payout to" value={s.maskedPayoutAccount} /> : null}
            {s.paidAt ? <Row label="Paid" value={new Date(s.paidAt).toLocaleDateString("en-IN")} /> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
