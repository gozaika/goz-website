import { Badge, Card, EmptyState, Screen, Text, palette } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useDrops } from "@/api/catalog";
import { useAuth } from "@/auth/useAuth";

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
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text variant="title">{drop.dropTitle}</Text>
        <Badge label={drop.statusCode.replaceAll("_", " ")} tone={drop.statusCode === "ACTIVE" ? "success" : "neutral"} />
      </View>
      <Card>
        <Text variant="caption" color={palette.muted}>
          Pickup window
        </Text>
        <Text variant="body">
          {new Date(drop.pickupStartAt).toLocaleString("en-IN")} → {new Date(drop.pickupEndAt).toLocaleString("en-IN")}
        </Text>
        <Text variant="caption" color={palette.muted}>
          Inventory
        </Text>
        <Text variant="body">
          {drop.quantityAvailable} available · {drop.quantityHeld} held · {drop.quantityTotal} total
        </Text>
        <Text variant="caption" color={palette.muted}>
          Price
        </Text>
        <Text variant="label">{formatPaise(drop.pricePaise)} per bag</Text>
      </Card>
      <Text variant="caption" color={palette.muted}>
        Editing and status changes (pause/cancel) arrive in a later Slice 13 pass; publish new drops from the Drops tab.
      </Text>
    </Screen>
  );
}
