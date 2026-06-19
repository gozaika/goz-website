import { Stack } from "expo-router";
import { brand } from "@/theme/brand";

export default function RestaurantsStack() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: brand.white }, headerTintColor: brand.forest }}>
      <Stack.Screen name="index" options={{ title: "Restaurants" }} />
      <Stack.Screen name="[slug]" options={{ title: "Restaurant" }} />
    </Stack>
  );
}
