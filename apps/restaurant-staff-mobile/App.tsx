import { StatusBar } from "expo-status-bar";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function StaffApp() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#111827" }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, padding: 20, gap: 20 }}>
        <View style={{ borderRadius: 8, backgroundColor: "#F59E0B", padding: 12 }}>
          <Text style={{ color: "#111827", fontWeight: "900" }}>Offline cache: not synced</Text>
        </View>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={{ color: "white", fontSize: 72, fontWeight: "900" }}>27</Text>
          <Text style={{ color: "#D1D5DB", fontSize: 18, fontWeight: "700" }}>Orders pending pickup</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          style={{
            minHeight: 96,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            backgroundColor: "#16A34A",
          }}
        >
          <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>Scan QR</Text>
        </TouchableOpacity>
        <View style={{ gap: 10 }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>Enter 6-digit OTP</Text>
          <TextInput
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#6B7280"
            style={{
              minHeight: 72,
              borderRadius: 8,
              backgroundColor: "white",
              color: "#111827",
              fontSize: 42,
              fontWeight: "900",
              letterSpacing: 0,
              paddingHorizontal: 16,
              textAlign: "center",
            }}
          />
        </View>
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#374151", padding: 16 }}>
          <Text style={{ color: "white", fontWeight: "800" }}>Failure states ready</Text>
          <Text style={{ marginTop: 8, color: "#D1D5DB" }}>
            Wrong restaurant, expired window, already collected, wrong nonce, and offline unavailable.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
