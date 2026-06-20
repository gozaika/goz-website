import { Button, palette, Screen, spacing, Text } from "@gozaika/mobile-ui";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/auth/useAuth";

export default function AccountScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();

  return (
    <Screen contentStyle={{ gap: spacing.md, justifyContent: "center" }}>
      <Text variant="title">Account</Text>
      <Text variant="body" color={palette.muted}>
        Profile, referral code, consent settings, holds and reviews arrive in Mobile Slice 10.
      </Text>

      {session ? (
        <>
          <Text variant="label" color={palette.forest}>
            Signed in{session.user.phone ? ` as +${session.user.phone}` : ""}
          </Text>
          <Link href="/account/passport" style={{ color: palette.forest, fontWeight: "700", fontSize: 15 }}>
            Zayka Passport →
          </Link>
          <Link href="/account/discovery" style={{ color: palette.forest, fontWeight: "700", fontSize: 15 }}>
            Flavour Diversity profile →
          </Link>
          <Button
            label="Sign out"
            variant="secondary"
            onPress={async () => {
              await signOut();
              router.replace("/");
            }}
          />
        </>
      ) : (
        <Button label="Sign in with phone OTP" accent={palette.forest} onPress={() => router.push("/auth/login")} />
      )}
    </Screen>
  );
}
