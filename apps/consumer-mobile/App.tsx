import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";

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

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "drops", label: "Drops", icon: "◈" },
  { id: "orders", label: "Orders", icon: "✓" },
  { id: "account", label: "Account", icon: "◉" },
];


export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: brand.cream }}>
      <StatusBar style="dark" />

      {/* App header */}
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
        <Text style={{ color: brand.muted, fontSize: 12, fontWeight: "600" }}>Hyderabad</Text>
      </View>

      {/* Main content */}
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "home" && (
          <View style={{ gap: 20 }}>
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
                style={{
                  color: brand.charcoal,
                  fontSize: 28,
                  fontWeight: "800",
                  lineHeight: 36,
                }}
              >
                Great food.{"\n"}No menu. No algorithm.
              </Text>
              <Text
                style={{
                  color: brand.muted,
                  fontSize: 15,
                  lineHeight: 22,
                }}
              >
                Claim chef-curated BAM Bags with allergen-disclosed, pickup-only trust.
              </Text>
            </View>

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
              }}
            >
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
                    style={{ color: brand.charcoal, fontSize: 22, fontWeight: "800", marginTop: 4 }}
                  >
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Offline pickup cache info */}
            <View
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: `${brand.forest}30`,
                backgroundColor: brand.white,
                padding: 16,
              }}
            >
              <Text style={{ color: brand.charcoal, fontSize: 15, fontWeight: "700" }}>
                Pickup QR &amp; OTP
              </Text>
              <Text style={{ marginTop: 6, color: brand.muted, fontSize: 14, lineHeight: 20 }}>
                Confirmed pickup credentials are stored securely after payment so you can show them
                offline at the counter.
              </Text>
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
                borderRadius: 10,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: `${brand.forest}40`,
                backgroundColor: brand.white,
                padding: 24,
                alignItems: "center",
              }}
            >
              <Text style={{ color: brand.muted, fontSize: 14, textAlign: "center" }}>
                Sign in on the web app at customer.gozaika.in to discover and claim BAM Bags.
              </Text>
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
                borderRadius: 10,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: `${brand.border}`,
                backgroundColor: brand.white,
                padding: 24,
                alignItems: "center",
              }}
            >
              <Text style={{ color: brand.muted, fontSize: 14, textAlign: "center" }}>
                Paid orders and pickup proof will appear here after payment is confirmed.
              </Text>
            </View>
          </View>
        )}

        {activeTab === "account" && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: brand.charcoal, fontSize: 22, fontWeight: "800" }}>
              Account
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
              }}
            >
              <Text style={{ color: brand.white, fontWeight: "800", fontSize: 15 }}>
                Sign in with phone OTP
              </Text>
            </TouchableOpacity>
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
              <Text
                style={{
                  fontSize: 18,
                  color: active ? brand.forest : brand.muted,
                }}
              >
                {tab.icon}
              </Text>
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
