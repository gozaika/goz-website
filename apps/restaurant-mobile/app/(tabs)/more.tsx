import { Button, palette, Screen, spacing, Text } from "@gozaika/mobile-ui";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/auth/useAuth";

const MANAGEMENT_LINKS = [
  { label: "Templates", href: "/templates" },
  { label: "ROI reports", href: "/reports" },
  { label: "Finance", href: "/finance" },
  { label: "Onboarding", href: "/onboarding" },
  { label: "Compliance", href: "/compliance" },
  { label: "Profile", href: "/profile" },
  { label: "Reviews", href: "/reviews" },
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const { session, memberships, selectedRestaurantPk, signOut } = useAuth();

  return (
    <Screen contentStyle={{ gap: spacing.sm }}>
      <Text variant="title">More</Text>
      <Text variant="body" color={palette.muted}>
        Role-based visibility (OWNER/ADMIN/OPERATIONS/PICKUP_STAFF/FINANCE) is enforced server-side
        in Slice 4 and surfaced here in later slices.
      </Text>

      {session ? (
        <Text variant="label" color={palette.forest}>
          {memberships.length} restaurant{memberships.length === 1 ? "" : "s"}
          {selectedRestaurantPk ? " · selected" : ""}
        </Text>
      ) : null}

      {MANAGEMENT_LINKS.map((link) => (
        <Link key={link.href} href={link.href} style={{ color: palette.forest, fontWeight: "700", fontSize: 15, marginTop: 6 }}>
          {link.label} →
        </Link>
      ))}

      {session ? (
        <Button
          label="Sign out"
          variant="secondary"
          accent={palette.forest}
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
        />
      ) : (
        <Button label="Sign in" accent={palette.forest} onPress={() => router.push("/auth/login")} />
      )}
    </Screen>
  );
}
