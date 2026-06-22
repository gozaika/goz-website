import { ApiError } from "@gozaika/mobile-core";
import { Badge, Button, Card, EmptyState, ErrorState, Screen, Text, palette, type StatusTone } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { Link, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
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

export default function DropsScreen() {
  const { selectedRestaurantPk } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useDrops(selectedRestaurantPk);
  const drops = data?.drops ?? [];

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
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="title">Limited Drops</Text>
        <Button label="New drop" accent={palette.forest} onPress={() => router.push("/drops/new")} />
      </View>

      {drops.length === 0 ? (
        <EmptyState title="No drops yet" message="Publish a drop from one of your BAM Bag templates." />
      ) : (
        drops.map((drop) => (
          <Link key={drop.dropPk} href={`/drops/${drop.dropPk}`} asChild>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text variant="heading">{drop.dropTitle}</Text>
                <Badge label={drop.statusCode.replaceAll("_", " ")} tone={dropTone(drop.statusCode)} />
              </View>
              <Text variant="caption" color={palette.muted}>
                {windowLabel(drop.pickupStartAt, drop.pickupEndAt)}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="caption" color={palette.muted}>
                  {drop.quantityAvailable}/{drop.quantityTotal} available · {drop.quantityHeld} held
                </Text>
                <Text variant="label">{formatPaise(drop.pricePaise)}</Text>
              </View>
            </Card>
          </Link>
        ))
      )}
    </Screen>
  );
}
