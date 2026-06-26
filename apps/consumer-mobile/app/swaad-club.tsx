import { Badge, Button, Card, palette, Screen, spacing, Text } from "@gozaika/mobile-ui";
import { useRouter } from "expo-router";
import { View } from "react-native";

/**
 * Swaad Club — launch-waitlist positioning, mirrored from the web
 * (`consumer-web/app/swaad-club`). No native billing, no payment mandate, no
 * entitlement is created here: real Razorpay recurring subscriptions are a
 * deferred revenue slice. This screen is subscription-ready product positioning
 * plus a safe "notify me" CTA only.
 */

const BENEFITS: readonly (readonly [string, string])[] = [
  ["Priority signals", "Early notice when a Limited Drop is scheduled in your preferred neighbourhoods."],
  ["Chef's Selection previews", "Member-first context on cuisine style, dietary category, and pickup window."],
  ["Trust-first reminders", "Clear allergen and pickup reminders before you claim, with DPDP consent controls intact."],
  ["Launch perks", "Founding Hyderabad members get priority access offers when subscription billing is activated."],
];

const FAQS: readonly (readonly [string, string])[] = [
  ["Can I subscribe today?", "Not yet. Live recurring billing is deferred until the subscription backend and compliance path are activated."],
  ["Does this grant priority access now?", "No fake entitlement is shown. This is subscription-ready positioning with a safe launch waitlist."],
  ["Will phone OTP still work?", "Yes. Phone OTP remains the primary login path; Google OAuth is an optional access path when configured."],
];

export default function SwaadClubScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="caption" color={palette.goldText}>
        SWAAD CLUB
      </Text>
      <Text variant="title">Priority access for Hyderabad's first BAM Bag explorers.</Text>
      <Text variant="body" color={palette.muted}>
        Built for diners who want smarter access to off-menu discovery: early alerts, member-first drop context, and
        launch benefits — without turning goZaika into a discount club.
      </Text>

      {/* Coming-soon boundary card */}
      <Card style={{ backgroundColor: palette.cream, borderColor: palette.gold }}>
        <Badge label="Coming soon" tone="warning" />
        <Text variant="heading">Subscriptions aren't live yet</Text>
        <Text variant="body" color={palette.muted}>
          Razorpay recurring subscriptions are not enabled in this slice. No payment mandate, renewal, or entitlement is
          created from this screen.
        </Text>
      </Card>

      <Button
        label="Notify me from account"
        accent={palette.saffron}
        onPress={() => router.push("/(tabs)/account")}
      />
      <Button label="Browse current drops" variant="secondary" onPress={() => router.push("/(tabs)/drops")} />

      {/* Benefits */}
      <Text variant="heading">What members get</Text>
      {BENEFITS.map(([title, body]) => (
        <Card key={title}>
          <Text variant="heading" color={palette.forest}>
            {title}
          </Text>
          <Text variant="body" color={palette.muted}>
            {body}
          </Text>
        </Card>
      ))}

      {/* Eligibility / boundary */}
      <Card style={{ backgroundColor: palette.successBg, borderColor: palette.forest }}>
        <Text variant="heading">Eligibility and boundary</Text>
        <Text variant="body" color={palette.muted}>
          Swaad Club starts as a launch waitlist / notification promise. Paid membership, priority queue ordering,
          renewal, cancellation, and invoice handling belong to the next revenue slice after backend activation.
        </Text>
      </Card>

      {/* FAQs */}
      <Text variant="heading">FAQs</Text>
      {FAQS.map(([q, a]) => (
        <Card key={q}>
          <Text variant="label">{q}</Text>
          <Text variant="body" color={palette.muted}>
            {a}
          </Text>
        </Card>
      ))}

      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}
