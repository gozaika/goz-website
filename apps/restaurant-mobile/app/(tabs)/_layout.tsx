import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { brand } from "@/theme/brand";

// Phone bottom tabs: Home, Orders, Drops, More (restaurant spec §3). Role-based
// destination hiding and tablet navigation rail / master-detail arrive in later slices.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand.forest,
        tabBarInactiveTintColor: brand.muted,
        tabBarStyle: { backgroundColor: brand.white, borderTopColor: brand.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: true,
          headerStyle: { backgroundColor: brand.white },
          headerTintColor: brand.forest,
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Orders", tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="drops"
        options={{ title: "Drops", tabBarIcon: ({ color, size }) => <Ionicons name="bag-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          headerShown: true,
          headerStyle: { backgroundColor: brand.white },
          headerTintColor: brand.forest,
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
