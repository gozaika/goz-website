import { Stack } from "expo-router";
import { brand } from "@/theme/brand";

export default function OrdersStack() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: brand.white }, headerTintColor: brand.forest }}>
      <Stack.Screen name="index" options={{ title: "Counter" }} />
      <Stack.Screen name="[orderId]" options={{ title: "Order" }} />
    </Stack>
  );
}
