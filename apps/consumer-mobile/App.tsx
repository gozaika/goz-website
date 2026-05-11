import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";

const tabs = ["Home", "Drops", "Orders", "Profile"];

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View>
          <Text style={{ color: "#1A5C38", fontWeight: "700", textTransform: "uppercase" }}>
            Hyderabad first
          </Text>
          <Text style={{ marginTop: 8, color: "#2D2D2D", fontSize: 34, fontWeight: "800" }}>
            Great food. No menu. No algorithm.
          </Text>
          <Text style={{ marginTop: 12, color: "#525252", fontSize: 16, lineHeight: 24 }}>
            Pull to refresh BAM Bag drops, claim safely, and keep pickup QR/OTP available offline.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          style={{
            minHeight: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            backgroundColor: "#FF6B35",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>Browse drops</Text>
        </TouchableOpacity>
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#E8D8CB", backgroundColor: "white", padding: 16 }}>
          <Text style={{ color: "#2D2D2D", fontSize: 18, fontWeight: "800" }}>Offline pickup cache</Text>
          <Text style={{ marginTop: 8, color: "#525252" }}>
            Confirmed QR and OTP payloads will be stored in SecureStore after verified payment.
          </Text>
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E8D8CB", backgroundColor: "white" }}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab} style={{ minHeight: 56, flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: tab === "Home" ? "#1A5C38" : "#525252", fontWeight: "700" }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
