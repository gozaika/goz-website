import { ApiError } from "@gozaika/mobile-core";
import { Badge, Button, Card, EmptyState, ErrorState, Screen, Text, palette } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useDashboard } from "@/api/dashboard";
import { useAuth } from "@/auth/useAuth";

function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

function Metric({ label, value, helper }: { readonly label: string; readonly value: string; readonly helper?: string }) {
  return (
    <Card style={{ flex: 1, minWidth: 150 }}>
      <Text variant="caption" color={palette.muted}>
        {label}
      </Text>
      <Text variant="title">{value}</Text>
      {helper ? (
        <Text variant="caption" color={palette.muted}>
          {helper}
        </Text>
      ) : null}
    </Card>
  );
}

export default function DashboardScreen() {
  const { selectedRestaurantPk } = useAuth();
  const router = useRouter();
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
      <Screen contentStyle={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={palette.forest} />
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

  const isActive = data.statusCode === "ACTIVE";

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={palette.forest}>
            Today at
          </Text>
          <Text variant="title">{data.restaurantName}</Text>
        </View>
        <Badge label={data.statusCode.replaceAll("_", " ")} tone={isActive ? "success" : "warning"} />
      </View>

      {!isActive ? (
        <Card>
          <Text variant="heading">Activation required</Text>
          <Text variant="caption" color={palette.muted}>
            Complete onboarding and admin approval before publishing drops or seeing live metrics.
          </Text>
        </Card>
      ) : null}

      {data.publishingEnabled === false ? (
        <Card>
          <Text variant="heading">Publishing paused by ops</Text>
          <Text variant="caption" color={palette.muted}>
            New Limited Drops are temporarily unavailable while goZaika ops reviews this restaurant.
          </Text>
        </Card>
      ) : null}

      {/* Financials (hidden for PICKUP_STAFF) */}
      {data.financials ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Metric label="Today revenue" value={formatPaise(data.financials.todayRevenuePaise)} helper="From visible sold qty" />
          <Metric label="Bags sold/listed" value={`${data.financials.soldBags}/${data.financials.listedBags}`} />
          <Metric label="Sell-through" value={formatBps(data.financials.sellThroughBps)} />
          <Metric label="AOV" value={formatPaise(data.financials.aovPaise)} />
        </View>
      ) : null}

      {/* Operations / queue (hidden for FINANCE) */}
      {data.operations ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Metric label="Pickup-ready" value={String(data.operations.pickupReadyCount)} helper="Awaiting collection" />
            <Metric label="Collected today" value={String(data.operations.collectedTodayCount)} />
            <Metric
              label="Drops"
              value={`${data.operations.activeDrops} live`}
              helper={`${data.operations.scheduledDrops} scheduled · ${data.operations.availableBags} bags`}
            />
          </View>
          <Card style={{ backgroundColor: palette.cream }}>
            <Text variant="heading">Next drop</Text>
            {data.operations.nextDrop ? (
              <>
                <Text variant="body">{data.operations.nextDrop.dropTitle}</Text>
                <Text variant="caption" color={palette.muted}>
                  {new Date(data.operations.nextDrop.pickupStartAt).toLocaleString("en-IN")}
                </Text>
                <Text variant="label" color={palette.forest}>
                  {data.operations.nextDrop.quantityAvailable}/{data.operations.nextDrop.quantityTotal} bags available
                </Text>
              </>
            ) : (
              <Text variant="caption" color={palette.muted}>
                No upcoming drop.
              </Text>
            )}
          </Card>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Pickup counter" accent={palette.forest} onPress={() => router.push("/orders")} />
            {isActive && data.publishingEnabled !== false ? (
              <Button label="New drop" variant="secondary" accent={palette.forest} onPress={() => router.push("/drops/new")} />
            ) : null}
          </View>
        </>
      ) : null}

      {data.variant === "SUMMARY" ? (
        <Text variant="caption" color={palette.muted}>
          Finance view — operational queue actions are on the owner/operations dashboard.
        </Text>
      ) : null}
    </Screen>
  );
}
