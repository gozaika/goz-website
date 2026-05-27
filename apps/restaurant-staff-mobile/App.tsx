import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useState } from "react";

const brand = {
  saffron: "#FF6B35",
  forest: "#1A5C38",
  gold: "#D4A017",
  cream: "#FFF8F0",
  charcoal: "#2D2D2D",
  muted: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
  errorBg: "#FEF2F2",
  errorText: "#B91C1C",
  successBg: "#F0FDF4",
  successText: "#166534",
  warningBg: "#FFFBEB",
  warningText: "#92400E",
};

type VerifyState = "idle" | "verifying" | "success" | "error";

export default function StaffApp() {
  const [otp, setOtp] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  function handleVerify() {
    if (otp.length !== 6) {
      setStatusMessage("Enter all 6 digits before verifying.");
      setVerifyState("error");
      return;
    }
    setVerifyState("verifying");
    setStatusMessage("Verifying OTP against server...");
  }

  function handleReset() {
    setOtp("");
    setVerifyState("idle");
    setStatusMessage("");
  }

  const statusBg =
    verifyState === "success"
      ? brand.successBg
      : verifyState === "error"
        ? brand.errorBg
        : brand.warningBg;
  const statusColor =
    verifyState === "success"
      ? brand.successText
      : verifyState === "error"
        ? brand.errorText
        : brand.warningText;

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
          paddingVertical: 14,
          backgroundColor: brand.white,
          borderBottomWidth: 1,
          borderBottomColor: brand.border,
        }}
      >
        <View>
          <Text style={{ color: brand.forest, fontWeight: "900", fontSize: 16 }}>
            Zayka Pro Staff
          </Text>
          <Text style={{ color: brand.muted, fontSize: 12, marginTop: 1 }}>Pickup verification</Text>
        </View>
        <View
          style={{
            borderRadius: 6,
            backgroundColor: `${brand.gold}20`,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: brand.warningText, fontSize: 11, fontWeight: "700" }}>
            STAFF VIEW
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order count panel */}
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: brand.border,
            backgroundColor: brand.white,
            padding: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ color: brand.muted, fontSize: 13, fontWeight: "600" }}>
            Orders ready for pickup
          </Text>
          <Text
            style={{
              color: brand.charcoal,
              fontSize: 56,
              fontWeight: "900",
              marginTop: 4,
              lineHeight: 64,
            }}
          >
            —
          </Text>
          <Text style={{ color: brand.muted, fontSize: 13 }}>
            Sign in as a restaurant owner to see live queue
          </Text>
        </View>

        {/* QR scan CTA */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Scan customer QR code"
          style={{
            minHeight: 80,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: brand.forest,
            gap: 6,
          }}
        >
          <Text style={{ color: brand.white, fontSize: 20, fontWeight: "900" }}>⬛ Scan QR</Text>
          <Text style={{ color: `${brand.white}90`, fontSize: 13 }}>
            Point camera at customer QR code
          </Text>
        </TouchableOpacity>

        {/* OTP entry */}
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: brand.border,
            backgroundColor: brand.white,
            padding: 20,
            gap: 12,
          }}
        >
          <View>
            <Text style={{ color: brand.charcoal, fontSize: 16, fontWeight: "700" }}>
              Enter 6-digit OTP
            </Text>
            <Text style={{ color: brand.muted, fontSize: 13, marginTop: 2 }}>
              Customer shows OTP from their order confirmation
            </Text>
          </View>

          <TextInput
            accessibilityLabel="6-digit OTP"
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={brand.border}
            value={otp}
            onChangeText={(text) => {
              setOtp(text.replace(/\D/g, ""));
              if (verifyState !== "idle") handleReset();
            }}
            style={{
              minHeight: 64,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: otp.length === 6 ? brand.forest : brand.border,
              backgroundColor: `${brand.forest}05`,
              color: brand.charcoal,
              fontSize: 36,
              fontWeight: "900",
              paddingHorizontal: 20,
              textAlign: "center",
              letterSpacing: 8,
            }}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Verify OTP"
            disabled={otp.length !== 6 || verifyState === "verifying"}
            onPress={handleVerify}
            style={{
              minHeight: 52,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              backgroundColor:
                otp.length !== 6 || verifyState === "verifying"
                  ? `${brand.forest}50`
                  : brand.forest,
            }}
          >
            <Text style={{ color: brand.white, fontWeight: "800", fontSize: 16 }}>
              {verifyState === "verifying" ? "Verifying..." : "Verify pickup"}
            </Text>
          </TouchableOpacity>

          {statusMessage ? (
            <View
              style={{
                borderRadius: 8,
                backgroundColor: statusBg,
                padding: 12,
              }}
            >
              <Text style={{ color: statusColor, fontSize: 13, fontWeight: "600" }}>
                {statusMessage}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Failure reference */}
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: brand.border,
            backgroundColor: brand.white,
            padding: 16,
          }}
        >
          <Text style={{ color: brand.charcoal, fontSize: 14, fontWeight: "700" }}>
            Pickup failure guidance
          </Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {[
              "Wrong restaurant — ask customer to confirm order details",
              "Expired window — mark no-show from the portal after close",
              "Already collected — duplicate scan, no action needed",
              "Invalid OTP — ask customer to refresh their order page",
            ].map((item) => (
              <View key={item} style={{ flexDirection: "row", gap: 8 }}>
                <Text style={{ color: brand.saffron, fontWeight: "700" }}>·</Text>
                <Text style={{ color: brand.muted, fontSize: 13, flex: 1, lineHeight: 18 }}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
