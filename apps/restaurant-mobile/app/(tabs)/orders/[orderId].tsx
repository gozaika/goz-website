import { Screen } from "@gozaika/mobile-ui";
import { useLocalSearchParams } from "expo-router";
import { OrderActionsPanel } from "@/counter/OrderActionsPanel";

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  return (
    <Screen>
      <OrderActionsPanel orderId={orderId ?? ""} />
    </Screen>
  );
}
