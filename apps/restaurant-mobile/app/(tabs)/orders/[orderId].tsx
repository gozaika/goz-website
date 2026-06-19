import { useLocalSearchParams } from "expo-router";
import { Placeholder } from "@/ui/Placeholder";

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  return (
    <Placeholder
      title="Order detail"
      subtitle={`Verification, no-show and incident actions for order "${orderId ?? ""}". Server-authoritative pickup RPC arrives in Mobile Slice 7.`}
      slice="Slice 7"
    />
  );
}
