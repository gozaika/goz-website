import { useState } from "react";
import { Linking, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const brand = {
  saffron: "#FF6B35",
  forest: "#1A5C38",
  gold: "#D4A017",
  cream: "#FFF8F0",
  charcoal: "#2D2D2D",
  muted: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
};

type Tab = "home" | "drops" | "orders" | "account";

const tabs: { id: Tab; label: string; icon: IoniconName; iconOutline: IoniconName }[] = [
  { id: "home",    label: "Home",    icon: "home",    iconOutline: "home-outline" },
  { id: "drops",   label: "Drops",   icon: "bag",     iconOutline: "bag-outline" },
  { id: "orders",  label: "Orders",  icon: "receipt", iconOutline: "receipt-outline" },
  { id: "account", label: "Account", icon: "person",  iconOutline: "person-outline" },
];

const HOW_IT_WORKS: { icon: IoniconName; title: string; desc: string }[] = [
  {
    icon: "search-outline",
    title: "Discover drops",
    desc: "Browse chef-curated BAM Bags from Hyderabad's best restaurants.",
  },
  {
    icon: "card-outline",
    title: "Claim your bag",
    desc: "Pay online — full allergen disclosure, no surprise menus.",
  },
  {
    icon: "qr-code-outline",
    title: "Pick up with QR",
    desc: "Show your QR code or 6-digit OTP at the counter. That's it.",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: brand.cream }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: brand.white,
          borderBottomWidth: 1,
          borderBottomColor: brand.border,
        }}
      >
        <Text style={{ color: brand.forest, fontWeight: "900", fontSize: 18 }}>goZaika</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="location-outline" size={12} color={brand.muted} />
          <Text style={{ color: brand.muted, fontSize: 12, fontWeight: "600" }}>Hyderabad</Text>
        </View>
      </View>

      {/* Main content */}
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "home" && (
          <View style={{ gap: 20 }}>
            {/* Hero */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: brand.forest,
                  fontWeight: "700",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Hyderabad first
              </Text>
              <Text
                style={{ color: brand.charcoal, fontSize: 28, fontWeight: "800", lineHeight: 36 }}
              >
                Great food.{"\n"}No menu. No algorithm.
              </Text>
              <Text style={{ color: brand.muted, fontSize: 15, lineHeight: 22 }}>
                Claim chef-curated BAM Bags with allergen-disclosed, pickup-only trust.
              </Text>
            </View>

            {/* Browse drops CTA */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Browse drops"
              onPress={() => setActiveTab("drops")}
              style={{
                minHeight: 52,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                backgroundColor: brand.saffron,
                shadowColor: brand.saffron,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Ionicons name="bag-outline" size={18} color={brand.white} />
              <Text style={{ color: brand.white, fontWeight: "800", fontSize: 16 }}>
                Browse drops
              </Text>
            </TouchableOpacity>

            {/* Quick stats */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              {[
                { label: "Active drops", value: "—" },
                { label: "Partners", value: "—" },
                { label: "City", value: "HYD" },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    backgroundColor: brand.white,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: brand.border,
                  }}
                >
                  <Text style={{ color: brand.muted, fontSize: 11, fontWeight: "600" }}>
                    {stat.label}
                  </Text>
                  <Text
                    style={{
                      color: brand.charcoal,
                      fontSize: 22,
                      fontWeight: "800",
                      marginTop: 4,
                    }}
                  >
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Pickup credentials card */}
            <View
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: `${brand.forest}30`,
                backgroundColor: brand.white,
                padding: 16,
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: `${brand.forest}12`,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={brand.forest} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: brand.charcoal, fontSize: 14, fontWeight: "700" }}>
                  Pickup QR &amp; OTP
                </Text>
                <Text style={{ marginTop: 4, color: brand.muted, fontSize: 13, lineHeight: 19 }}>
                  Confirmed pickup credentials are stored securely after payment so you can show
                  them offline at the counter.
                </Text>
              </View>
            </View>

            {/* How it works */}
            <View style={{ gap: 14 }}>
              <Text
                style={{
                  color: brand.charcoal,
                  fontSize: 13,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                How it works
              </Text>
              {HOW_IT_WORKS.map((item, i) => (
                <View key={item.title} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: i === 0 ? brand.forest : `${brand.forest}12`,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={i === 0 ? brand.white : brand.forest}
                    />
                  </View>
                  <View style={{ flex: 1, paddingTop: 2 }}>
                    <Text style={{ color: brand.charcoal, fontSize: 14, fontWeight: "700" }}>
                      {item.title}
                    </Text>
                    <Text
                      style={{ color: brand.muted, fontSize: 13, lineHeight: 18, marginTop: 2 }}
                    >
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === "drops" && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: brand.charcoal, fontSize: 22, fontWeight: "800" }}>
              Live drops
            </Text>
            <View
              style={{
                borderRadius: 12,
                backgroundColor: brand.white,
                padding: 28,
                alignItems: "center",
                borderWidth: 1,
                borderColor: brand.border,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: `${brand.saffron}15`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="bag-outline" size={30} color={brand.saffron} />
              </View>
              <Text
                style={{
                  color: brand.charcoal,
                  fontSize: 16,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                Discover drops on the web
              </Text>
              <Text
                style={{ color: brand.muted, fontSize: 14, textAlign: "center", lineHeight: 20 }}
              >
                Browse and claim today's Limited Drops at{" "}
                <Text style={{ color: brand.forest, fontWeight: "600" }}>
                  customer.gozaika.in
                </Text>{" "}
                on your browser.
              </Text>
              <TouchableOpacity
                accessibilityRole="link"
                accessibilityLabel="Open goZaika web app"
                onPress={() => Linking.openURL("https://customer.gozaika.in")}
                style={{
                  minHeight: 44,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: brand.forest,
                  paddingHorizontal: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <Ionicons name="open-outline" size={14} color={brand.forest} />
                <Text style={{ color: brand.forest, fontWeight: "700", fontSize: 14 }}>
                  Open web app
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === "orders" && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: brand.charcoal, fontSize: 22, fontWeight: "800" }}>
              Your orders
            </Text>
            <View
              style={{
                borderRadius: 12,
                backgroundColor: brand.white,
                padding: 28,
                alignItems: "center",
                borderWidth: 1,
                borderColor: brand.border,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: `${brand.forest}12`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="receipt-outline" size={30} color={brand.forest} />
              </View>
              <Text
                style={{
                  color: brand.charcoal,
                  fontSize: 16,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                No orders yet
              </Text>
              <Text
                style={{ color: brand.muted, fontSize: 14, textAlign: "center", lineHeight: 20 }}
              >
                Confirmed orders and pickup credentials appear here after payment is verified.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Browse today's drops"
                onPress={() => setActiveTab("drops")}
                style={{
                  minHeight: 44,
                  borderRadius: 8,
                  backgroundColor: brand.saffron,
                  paddingHorizontal: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 4,
                }}
              >
                <Text style={{ color: brand.white, fontWeight: "700", fontSize: 14 }}>
                  Browse today's drops
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === "account" && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: brand.charcoal, fontSize: 22, fontWeight: "800" }}>
              Account
            </Text>

            {/* Sign-in card */}
            <View
              style={{
                borderRadius: 12,
                backgroundColor: brand.white,
                padding: 20,
                borderWidth: 1,
                borderColor: brand.border,
                gap: 14,
              }}
            >
              <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 20 }}>
                Sign in with your phone number to access your orders, pickup credentials, and
                Swaad Club membership.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Sign in with phone OTP"
                style={{
                  minHeight: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  backgroundColor: brand.forest,
                  flexDirection: "row",
                  gap: 8,
                }}
              >
                <Ionicons name="phone-portrait-outline" size={18} color={brand.white} />
                <Text style={{ color: brand.white, fontWeight: "800", fontSize: 15 }}>
                  Sign in with phone OTP
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: brand.muted,
                  fontSize: 12,
                  textAlign: "center",
                  lineHeight: 17,
                }}
              >
                We send a one-time code to your number — no email or password required.
              </Text>
            </View>

            {/* Swaad Club teaser */}
            <View
              style={{
                borderRadius: 12,
                backgroundColor: brand.white,
                padding: 16,
                borderWidth: 1,
                borderColor: `${brand.gold}50`,
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: `${brand.gold}18`,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Ionicons name="star-outline" size={16} color={brand.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: brand.charcoal, fontSize: 14, fontWeight: "700" }}>
                  Swaad Club
                </Text>
                <Text
                  style={{ color: brand.muted, fontSize: 13, lineHeight: 19, marginTop: 3 }}
                >
                  Sign in to unlock loyalty drops, member-only access windows, and your
                  Swaad Club status.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom tab bar */}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: brand.border,
          backgroundColor: brand.white,
        }}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minHeight: 56,
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                paddingVertical: 8,
              }}
            >
              <Ionicons
                name={active ? tab.icon : tab.iconOutline}
                size={22}
                color={active ? brand.forest : brand.muted}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: active ? "700" : "500",
                  color: active ? brand.forest : brand.muted,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
