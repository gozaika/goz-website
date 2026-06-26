import { Ionicons } from "@expo/vector-icons";
import { PeekBar, palette } from "@gozaika/mobile-ui";
import type { ConsumerOrderDto } from "@gozaika/types";
import { Tabs, useRouter } from "expo-router";
import { View } from "react-native";
import { useOrders } from "@/api/orders";
import { useAuth } from "@/auth/useAuth";
import { brand } from "@/theme/brand";

const ACTIVE_ORDER_STATUSES = ["PAID", "CONFIRMED", "READY_FOR_PICKUP"];

function activeOrder(orders: readonly ConsumerOrderDto[]): ConsumerOrderDto | null {
  const now = Date.now();
  return (
    orders.find(
      (order) =>
        ACTIVE_ORDER_STATUSES.includes(order.orderStatusCode) && new Date(order.pickupWindowEndAt).getTime() > now,
    ) ?? null
  );
}

function pickupTime(order: ConsumerOrderDto): string {
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${time(order.pickupWindowStartAt)}-${time(order.pickupWindowEndAt)}`;
}

export default function TabsLayout() {
  const { session } = useAuth();
  const router = useRouter();
  const { data } = useOrders({ enabled: Boolean(session) });
  const order = session ? activeOrder(data?.orders ?? []) : null;

  return (
    <View style={{ flex: 1 }}>
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
      {order ? (
        <PeekBar
          title={`${order.bagDisplayName} pickup`}
          detail={`${order.restaurantName} · ${pickupTime(order)}`}
          actionLabel="Open"
          accent={palette.forest}
          onPress={() => router.push(`/(tabs)/orders/${order.orderPk}`)}
          style={{ position: "absolute", left: 16, right: 16, bottom: 84 }}
        />
      ) : null}
    </View>
  );
}
