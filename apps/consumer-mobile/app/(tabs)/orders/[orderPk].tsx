import { useLocalSearchParams } from "expo-router";
import { Placeholder } from "@/ui/Placeholder";

export default function OrderDetailScreen() {
  const { orderPk } = useLocalSearchParams<{ orderPk: string }>();
  return (
    <Placeholder
      title="Order detail"
      subtitle={`Payment-confirmed state, pickup instructions and QR/OTP proof for "${orderPk ?? ""}". Arrives in Mobile Slice 9.`}
      slice="Slice 9"
    />
  );
}
