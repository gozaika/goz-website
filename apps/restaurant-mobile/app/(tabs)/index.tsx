import { ApiError } from "@gozaika/mobile-core";
import {
  ActionCard,
  Badge,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  MetricHero,
  Screen,
  SellThroughBar,
  Skeleton,
  Text,
  palette,
  spacing,
} from "@gozaika/mobile-ui";
import type { DashboardData } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useDashboard } from "@/api/dashboard";
import { useAuth } from "@/auth/useAuth";

function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

function pickupStartLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function statusTone(statusCode: string) {
  return statusCode === "ACTIVE" ? "success" : "warning";
}

function roleLabel(data: DashboardData): string {
  if (data.variant === "QUEUE_ONLY") return "Pickup staff";
  if (data.variant === "SUMMARY") return "Finance";
  return data.roleCode.replaceAll("_", " ");
}

function heroFor(data: DashboardData): { readonly title: string; readonly value: string; readonly helper?: string } {
  if (data.variant === "QUEUE_ONLY" && data.operations) {
    return {
      title: "Pickup queue",
      value: String(data.operations.pickupReadyCount),
      helper: `${data.operations.collectedTodayCount} collected today`,
    };
  }

  if (data.financials) {
    return {
      title: "Today revenue",
      value: formatPaise(data.financials.todayRevenuePaise),
      helper: `${data.financials.soldBags}/${data.financials.listedBags} bags sold`,
    };
  }

  if (data.operations) {
    return {
      title: "Live drops",
      value: String(data.operations.activeDrops),
      helper: `${data.operations.availableBags} bags available`,
    };
  }

  return { title: "Today", value: data.statusCode.replaceAll("_", " ") };
}

function OperationsSection({ data }: { readonly data: DashboardData }) {
  const router = useRouter();
  const operations = data.operations;
  const active = data.statusCode === "ACTIVE";

  if (!operations) {
    return null;
  }

  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <ActionCard
          title={`${operations.pickupReadyCount} pickup-ready`}
          detail={`${operations.collectedTodayCount} collected today`}
          actionLabel="Open counter"
          accent={palette.forest}
          onPress={() => router.push("/orders")}
          style={{ flex: 1, minWidth: 160 }}
        />
        <ActionCard
          title={`${operations.activeDrops} live drops`}
          detail={`${operations.scheduledDrops} scheduled · ${operations.availableBags} bags available`}
          actionLabel="Review drops"
          accent={palette.forest}
          onPress={() => router.push("/drops")}
          style={{ flex: 1, minWidth: 160 }}
        />
      </View>

      <Card elevated="sm" style={{ backgroundColor: palette.cream }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="heading">Next drop</Text>
            {operations.nextDrop ? (
              <>
                <Text>{operations.nextDrop.dropTitle}</Text>
                <Text variant="caption" color={palette.muted}>
                  Starts {pickupStartLabel(operations.nextDrop.pickupStartAt)}
                </Text>
              </>
            ) : (
              <Text variant="caption" color={palette.muted}>
                No upcoming drop is scheduled.
              </Text>
            )}
          </View>
          {operations.nextDrop ? (
            <Badge label={`${operations.nextDrop.quantityAvailable}/${operations.nextDrop.quantityTotal} bags`} tone="info" />
          ) : null}
        </View>
      </Card>

      {active && data.publishingEnabled !== false ? (
        <ActionCard
          title="Publishing available"
          detail="Create a Limited Drop from an approved BAM Bag template."
          actionLabel="New drop"
          accent={palette.forest}
          onPress={() => router.push("/drops/new")}
        />
      ) : null}
    </>
  );
}

function FinancialSection({ data }: { readonly data: DashboardData }) {
  const financials = data.financials;

  if (!financials) {
    return null;
  }

  return (
    <Card elevated="sm">
      <SellThroughBar sold={financials.soldBags} total={financials.listedBags} label="Bags sold/listed" accent={palette.forest} />
      <DataTable
        rows={[
          { label: "Revenue", value: formatPaise(financials.todayRevenuePaise), helper: "Today only" },
          { label: "Sell-through", value: formatBps(financials.sellThroughBps) },
          { label: "Average order value", value: formatPaise(financials.aovPaise) },
        ]}
      />
    </Card>
  );
}

export default function DashboardScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { data, isLoading, isError, error, refetch } = useDashboard(selectedRestaurantPk);

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Sign in and choose a restaurant to see today's dashboard." />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={148} />
        <Skeleton height={96} />
        <Skeleton height={96} />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <ErrorState message={error instanceof ApiError ? error.message : "Could not load the dashboard."} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const active = data.statusCode === "ACTIVE";
  const hero = heroFor(data);

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <MetricHero
        eyebrow="Today at"
        title={hero.title}
        value={hero.value}
        helper={hero.helper}
        badgeLabel={data.statusCode.replaceAll("_", " ")}
        badgeTone={statusTone(data.statusCode)}
        accent={palette.forest}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
          <Badge label={roleLabel(data)} tone="info" />
          <Badge label={data.restaurantName} tone="neutral" />
        </View>
      </MetricHero>

      {!active ? (
        <ActionCard
          title="Activation required"
          detail="Complete onboarding and admin approval before publishing drops or seeing live metrics."
          tone="warning"
          accent={palette.forest}
        />
      ) : null}

      {data.publishingEnabled === false ? (
        <ActionCard
          title="Publishing paused by ops"
          detail="New Limited Drops are temporarily unavailable while goZaika ops reviews this restaurant."
          tone="warning"
          accent={palette.forest}
        />
      ) : null}

      {data.variant === "QUEUE_ONLY" ? (
        <>
          <OperationsSection data={data} />
          <FinancialSection data={data} />
        </>
      ) : (
        <>
          <FinancialSection data={data} />
          <OperationsSection data={data} />
        </>
      )}
    </Screen>
  );
}
