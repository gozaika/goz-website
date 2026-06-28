import { ApiError } from "@gozaika/mobile-core";
import { Button, Card, ErrorState, palette, Screen, Skeleton, spacing, Text, toneColors } from "@gozaika/mobile-ui";
import { useEffect, useState } from "react";
import { Pressable, Share, TextInput, View } from "react-native";
import { useAccountProfile, useUpdateProfile } from "@/api/account";

const LANGS: { readonly code: "en" | "hi"; readonly label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
];

function Field({ label, value, onChangeText, placeholder }: {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (t: string) => void;
  readonly placeholder: string;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" color={palette.muted}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        maxLength={80}
        style={{ minHeight: 48, borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: spacing.sm, color: palette.charcoal }}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { data, isLoading, isError, error, refetch } = useAccountProfile();
  const update = useUpdateProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [lang, setLang] = useState<"en" | "hi">("en");

  useEffect(() => {
    if (data) {
      setFirstName(data.firstName ?? "");
      setLastName(data.lastName ?? "");
      setLang((data.preferredLanguageCode === "hi" ? "hi" : "en"));
    }
  }, [data]);

  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={48} />
        <Skeleton height={48} />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen scroll={false}>
        <ErrorState message={error instanceof ApiError ? error.message : "Could not load your profile."} onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Card>
        <Text variant="heading">Your details</Text>
        <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
        <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
        <Text variant="caption" color={palette.muted}>Language</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {LANGS.map((l) => {
            const active = lang === l.code;
            return (
              <Pressable
                key={l.code}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setLang(l.code)}
                style={{
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? palette.forest : palette.border,
                  backgroundColor: active ? toneColors("success").bg : palette.white,
                }}
              >
                <Text variant="label" color={active ? palette.forest : palette.muted}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          label="Save changes"
          accent={palette.forest}
          loading={update.isPending}
          onPress={() => update.mutate({ firstName: firstName.trim() || null, lastName: lastName.trim() || null, preferredLanguageCode: lang })}
        />
        {update.isSuccess ? <Text variant="caption" color={toneColors("success").fg}>Profile saved.</Text> : null}
        {update.isError ? (
          <Text variant="caption" color={palette.dangerFg}>
            {update.error instanceof ApiError ? update.error.message : "Could not save. Please try again."}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text variant="heading">Refer a friend</Text>
        {data.referralCode ? (
          <>
            <Text variant="body" color={palette.muted}>Share your code — friends use it when they sign up.</Text>
            <View style={{ alignItems: "center", paddingVertical: spacing.sm }}>
              <Text variant="title" color={palette.forest}>{data.referralCode}</Text>
            </View>
            <Button
              label="Share my code"
              accent={palette.saffron}
              onPress={() => Share.share({ message: `Join me on goZaika — use my referral code ${data.referralCode} when you sign up.` })}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: spacing.sm }}>
              <View style={{ alignItems: "center" }}>
                <Text variant="title">{data.referralCounts.total}</Text>
                <Text variant="caption" color={palette.muted}>Invited</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text variant="title">{data.referralCounts.qualified}</Text>
                <Text variant="caption" color={palette.muted}>Qualified</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text variant="title">{data.referralCounts.rewarded}</Text>
                <Text variant="caption" color={palette.muted}>Rewarded</Text>
              </View>
            </View>
          </>
        ) : (
          <Text variant="body" color={palette.muted}>Your referral code will appear here once your profile is set up.</Text>
        )}
      </Card>
    </Screen>
  );
}
