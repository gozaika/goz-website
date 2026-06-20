import { isCompleteOtp, resendSecondsRemaining } from "@gozaika/mobile-core";
import { Button, palette, Screen, spacing, Text } from "@gozaika/mobile-ui";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { TextInput } from "react-native";
import { useAuth } from "@/auth/useAuth";

const inputStyle = {
  borderWidth: 1,
  borderColor: palette.border,
  borderRadius: 10,
  padding: 14,
  fontSize: 16,
  backgroundColor: palette.white,
  color: palette.charcoal,
} as const;

export default function LoginScreen() {
  const router = useRouter();
  const { loginState, session, requestOtp, verifyOtp, resendOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  const send = async () => {
    setBusy(true);
    await requestOtp(phone);
    setBusy(false);
  };
  const verify = async () => {
    setBusy(true);
    await verifyOtp(code);
    setBusy(false);
  };
  const resend = async () => {
    setBusy(true);
    await resendOtp();
    setBusy(false);
  };

  if (loginState.step === "phone") {
    return (
      <Screen contentStyle={{ gap: spacing.md, justifyContent: "center" }}>
        <Text variant="title">Partner sign in</Text>
        <Text variant="body" color={palette.muted}>
          We’ll text a one-time code to your registered phone — no password needed.
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Mobile number"
          placeholderTextColor={palette.muted}
          style={inputStyle}
          accessibilityLabel="Mobile number"
        />
        {loginState.error ? (
          <Text variant="label" color={palette.dangerFg}>
            {loginState.error}
          </Text>
        ) : null}
        <Button label="Send code" onPress={send} loading={busy} accent={palette.forest} />
      </Screen>
    );
  }

  const remaining = loginState.step === "otp" ? resendSecondsRemaining(now, loginState.resendAvailableAtMs) : 0;
  const phoneE164 = loginState.step === "otp" || loginState.step === "verifying" ? loginState.phoneE164 : "";
  const otpError = loginState.step === "otp" ? loginState.error : undefined;

  return (
    <Screen contentStyle={{ gap: spacing.md, justifyContent: "center" }}>
      <Text variant="title">Enter code</Text>
      <Text variant="body" color={palette.muted}>
        Sent to {phoneE164}.
      </Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="6-digit code"
        placeholderTextColor={palette.muted}
        style={inputStyle}
        accessibilityLabel="One-time code"
      />
      {otpError ? (
        <Text variant="label" color={palette.dangerFg}>
          {otpError}
        </Text>
      ) : null}
      <Button
        label="Verify"
        onPress={verify}
        loading={busy || loginState.step === "verifying"}
        disabled={!isCompleteOtp(code)}
        accent={palette.forest}
      />
      <Button
        label={remaining > 0 ? `Resend in ${remaining}s` : "Resend code"}
        variant="ghost"
        onPress={resend}
        disabled={remaining > 0 || busy}
        accent={palette.forest}
      />
    </Screen>
  );
}
