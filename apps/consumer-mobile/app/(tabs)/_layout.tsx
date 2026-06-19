import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { brand } from "@/theme/brand";

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
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="drops"
        options={{ title: "Drops", tabBarIcon: ({ color, size }) => <Ionicons name="bag-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="restaurants"
        options={{ title: "Restaurants", tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Orders", tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Account", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
