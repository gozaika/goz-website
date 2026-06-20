import { Button, palette, Screen, spacing, Text } from "@gozaika/mobile-ui";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/useAuth";

/**
 * Slice 6 consent gate (scaffold). Required operational consent must be resolved
 * before transactional use; purpose-by-purpose DPDP capture (analytics/marketing/
 * WhatsApp) and the consent API land in Slice 10.
 */
export default function ConsentScreen() {
  const router = useRouter();
  const { acknowledgeConsent } = useAuth();

  const agree = () => {
    acknowledgeConsent();
    router.replace("/");
  };

  return (
    <Screen contentStyle={{ gap: spacing.md, justifyContent: "center" }}>
      <Text variant="title">Your privacy</Text>
      <Text variant="body" color={palette.muted}>
        We use your phone number and order details to run pickups, under India’s DPDP Act. Optional
        analytics, marketing and WhatsApp updates are controlled separately in Account.
      </Text>
      <Button label="Agree and continue" onPress={agree} />
    </Screen>
  );
}
