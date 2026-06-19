import { Stack } from "expo-router";
import { brand } from "@/theme/brand";

export default function AccountStack() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: brand.white }, headerTintColor: brand.forest }}>
      <Stack.Screen name="index" options={{ title: "Account" }} />
      <Stack.Screen name="passport" options={{ title: "Zayka Passport" }} />
      <Stack.Screen name="discovery" options={{ title: "Flavour Diversity" }} />
    </Stack>
  );
}
