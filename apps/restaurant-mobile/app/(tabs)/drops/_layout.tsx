import { Stack } from "expo-router";
import { brand } from "@/theme/brand";

export default function DropsStack() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: brand.white }, headerTintColor: brand.forest }}>
      <Stack.Screen name="index" options={{ title: "Drops" }} />
      <Stack.Screen name="new" options={{ title: "New drop" }} />
      <Stack.Screen name="[dropPk]" options={{ title: "Drop" }} />
    </Stack>
  );
}
