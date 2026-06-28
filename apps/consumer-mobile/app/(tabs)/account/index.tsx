import { Button, Card, LoyaltyCard, palette, Screen, Skeleton, spacing, Text } from "@gozaika/mobile-ui";
import { tierLabel } from "@gozaika/utils";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { usePassport } from "@/api/account";
import { useAuth } from "@/auth/useAuth";

function AccountAction({
  title,
  detail,
  onPress,
}: {
  readonly title: string;
  readonly detail: string;
  readonly onPress: () => void;
}) {
  return (
    <Card elevated="sm">
      <Text variant="heading">{title}</Text>
      <Text variant="body" color={palette.muted}>
        {detail}
      </Text>
      <Button label="Open" variant="secondary" accent={palette.forest} onPress={onPress} />
    </Card>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const passport = usePassport();

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Account</Text>
      <Text variant="body" color={palette.muted}>
        Your loyalty, flavour profile and privacy controls. Reviews and profile editing arrive next.
      </Text>

      {session ? (
        <>
          <Card elevated="sm">
            <Text variant="caption" color={palette.muted}>
              Signed in
            </Text>
            <Text variant="heading" color={palette.forest}>
              {session.user.phone ? `+${session.user.phone}` : "Phone session active"}
            </Text>
          </Card>

          {passport.isLoading ? (
            <Skeleton height={160} />
          ) : passport.data ? (
            <LoyaltyCard
              tier={tierLabel(passport.data.stat.currentTierCode)}
              progress={passport.data.progressPercent}
              progressLabel={
                passport.data.nextTierCode && passport.data.bagsToNextTier
                  ? `${passport.data.bagsToNextTier} more bag${
                      passport.data.bagsToNextTier === 1 ? "" : "s"
                    } to ${tierLabel(passport.data.nextTierCode)}`
                  : "Top tier reached"
              }
              stats={[
                { label: "Bags", value: String(passport.data.stat.totalBagsCollected) },
                { label: "Kitchens", value: String(passport.data.stat.totalRestaurantsVisited) },
                { label: "Reviews", value: String(passport.data.stat.reviewCount) },
              ]}
            />
          ) : null}

          <View style={{ gap: spacing.md }}>
            <AccountAction
              title="Profile & referrals"
              detail="Edit your name and language, and share your referral code."
              onPress={() => router.push("/account/profile")}
            />
            <AccountAction
              title="Zayka Passport"
              detail="Tier progress, collected bags and earned badges."
              onPress={() => router.push("/account/passport")}
            />
            <AccountAction
              title="Flavour Diversity"
              detail="Cuisines, neighbourhoods and live new tastes from your account history."
              onPress={() => router.push("/account/discovery")}
            />
            <AccountAction
              title="Privacy & consent"
              detail="DPDP consent settings for operational, analytics and communication purposes."
              onPress={() => router.push("/account/consent")}
            />
          </View>
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
