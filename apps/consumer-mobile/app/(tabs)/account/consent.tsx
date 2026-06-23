import { ApiError } from "@gozaika/mobile-core";
import { Badge, Card, EmptyState, ErrorState, palette, Screen, Skeleton, spacing, Text } from "@gozaika/mobile-ui";
import type { ConsentPurposeCode } from "@gozaika/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Switch, View } from "react-native";
import { useConsentSettings, useUpdateConsent } from "@/api/account";
import { useAuth } from "@/auth/useAuth";

const PRIVACY_POLICY_URL = "https://gozaika.in/privacy-policy";
const DATA_RIGHTS_MAILTO =
  "mailto:contact@gozaika.in?subject=Data%20deletion%20%2F%20erasure%20request&body=I%20would%20like%20to%20request%20deletion%20of%20my%20goZaika%20account%20and%20personal%20data.";

function lastEventLabel(stateCode: string | null, recordedAt: string | null): string {
  if (!stateCode || !recordedAt) return "No choice recorded yet";
  return `Last ${stateCode.toLowerCase()} on ${new Date(recordedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
}

export default function ConsentSettingsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useConsentSettings();
  const update = useUpdateConsent();
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  if (!session) {
    return (
      <Screen scroll={false}>
        <EmptyState
          title="Privacy & consent"
          message="Sign in to manage how goZaika uses your data."
          actionLabel="Sign in"
          onAction={() => router.push("/auth/login")}
        />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={90} />
        <Skeleton height={90} />
        <Skeleton height={90} />
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen scroll={false}>
        <ErrorState
          message={error instanceof ApiError ? error.message : "Consent settings are unavailable."}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  function onToggle(purposeCode: ConsentPurposeCode, nextGranted: boolean) {
    setPendingCode(purposeCode);
    update.mutate(
      { purposeCode, state: nextGranted ? "GRANTED" : "REVOKED" },
      { onSettled: () => setPendingCode(null) },
    );
  }

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Privacy & consent</Text>
      <Text variant="body" color={palette.muted}>
        We use your phone number and order details to run pickups (required, under India's DPDP Act). Everything else is
        optional and you can change it any time.
      </Text>

      {data.settings.map((c) => {
        const granted = c.isRequiredForService || c.stateCode === "GRANTED";
        const saving = pendingCode === c.purposeCode && update.isPending;
        return (
          <Card key={c.purposeCode}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Text variant="heading">{c.purposeName}</Text>
                  {c.isRequiredForService ? <Badge label="Required" tone="neutral" /> : null}
                </View>
                {c.description ? (
                  <Text variant="caption" color={palette.muted}>
                    {c.description}
                  </Text>
                ) : null}
                <Text variant="caption" color={palette.muted}>
                  {saving ? "Saving…" : lastEventLabel(c.stateCode, c.recordedAt)}
                </Text>
              </View>
              <Switch
                value={granted}
                disabled={c.isRequiredForService || saving}
                onValueChange={(v) => onToggle(c.purposeCode as ConsentPurposeCode, v)}
                trackColor={{ true: palette.forest, false: palette.border }}
                accessibilityLabel={`${c.purposeName} consent`}
              />
            </View>
          </Card>
        );
      })}

      {update.isError ? (
        <Text variant="caption" color={palette.dangerFg}>
          {update.error instanceof ApiError ? update.error.message : "Could not update consent. Please try again."}
        </Text>
      ) : null}

      <Text variant="caption" color={palette.muted}>
        Consent policy version {data.currentPolicyVersion}. Each change is recorded with a timestamp.
      </Text>

      {/* Privacy rights / erasure — link-out (no in-app deletion automation). */}
      <Card style={{ backgroundColor: palette.cream, borderColor: palette.border }}>
        <Text variant="heading">Your data rights</Text>
        <Text variant="body" color={palette.muted}>
          Read how we handle your data, or request account deletion / data erasure. Erasure is handled by our team in
          line with DPDP retention rules.
        </Text>
        <Pressable
          accessibilityRole="link"
          style={{ marginTop: spacing.xs, minHeight: 44, justifyContent: "center" }}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
        >
          <Text variant="label" color={palette.forest}>
            Read privacy policy →
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          style={{ minHeight: 44, justifyContent: "center" }}
          onPress={() => Linking.openURL(DATA_RIGHTS_MAILTO)}
        >
          <Text variant="label" color={palette.forest}>
            Request account deletion →
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
