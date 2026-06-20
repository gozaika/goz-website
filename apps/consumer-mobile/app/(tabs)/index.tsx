import { Button, palette, Screen, spacing, Text } from "@gozaika/mobile-ui";
import { Link, useRouter } from "expo-router";
import { View } from "react-native";
import { useDrops } from "@/api/discovery";

export default function HomeScreen() {
  const router = useRouter();
  const { data } = useDrops();
  const activeCount = data?.filter((d) => d.statusCode === "ACTIVE").length ?? 0;

  return (
    <Screen contentStyle={{ gap: spacing.md, justifyContent: "center" }}>
      <View style={{ height: 4, width: 44, borderRadius: 2, backgroundColor: palette.saffron }} />
      <Text variant="title">goZaika</Text>
      <Text variant="body" color={palette.muted}>
        Hyderabad-first discovery of chef-curated BAM Bags — allergen-disclosed, pickup-only.
      </Text>
      {data ? (
        <Text variant="label" color={palette.forest}>
          {activeCount} active drop{activeCount === 1 ? "" : "s"} right now
        </Text>
      ) : null}
      <Button label="Browse drops" accent={palette.saffron} onPress={() => router.push("/drops")} />
      <Link href="/auth/login" style={{ color: palette.forest, fontWeight: "700", fontSize: 15, marginTop: 4 }}>
        Sign in with phone OTP →
      </Link>
      <Link href="/onboarding/consent" style={{ color: palette.forest, fontWeight: "700", fontSize: 15 }}>
        Privacy & consent →
      </Link>
      <Link href="/swaad-club" style={{ color: palette.forest, fontWeight: "700", fontSize: 15 }}>
        Swaad Club →
      </Link>
    </Screen>
  );
}
