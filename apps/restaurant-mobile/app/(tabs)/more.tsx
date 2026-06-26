import {
  Badge,
  Button,
  Card,
  palette,
  RestaurantSwitcher,
  Screen,
  spacing,
  Text,
  type RestaurantSwitcherItem,
} from "@gozaika/mobile-ui";
import { roleHasCapability, type MobileMembershipDto, type RestaurantCapability } from "@gozaika/types";
import { Link, useRouter } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/auth/useAuth";

/**
 * Each management destination is gated by the same data-driven capability the
 * server enforces (`packages/types/src/mobile/capabilities.ts`). Destinations the
 * selected restaurant's role does not hold are hidden, so the More hub matches the
 * server role matrix instead of relying on a text disclaimer.
 */
interface ManagementLink {
  readonly label: string;
  readonly href: string;
  readonly capability: RestaurantCapability;
}

const MANAGEMENT_LINKS: readonly ManagementLink[] = [
  { label: "Templates", href: "/templates", capability: "manageTemplates" },
  { label: "ROI reports", href: "/reports", capability: "viewReports" },
  { label: "Finance", href: "/finance", capability: "viewFinance" },
  { label: "Onboarding", href: "/onboarding", capability: "manageProfile" },
  { label: "Compliance", href: "/compliance", capability: "manageCompliance" },
  { label: "Profile", href: "/profile", capability: "manageProfile" },
  { label: "Reviews", href: "/reviews", capability: "viewReviews" },
];

function humanizeCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function toSwitcherItem(membership: MobileMembershipDto): RestaurantSwitcherItem {
  return {
    id: membership.restaurantPk,
    name: membership.restaurantName,
    roleLabel: humanizeCode(membership.roleCode),
    statusLabel: humanizeCode(membership.restaurantStatusCode),
  };
}

export default function MoreScreen() {
  const router = useRouter();
  const { session, memberships, selectedRestaurantPk, selectRestaurant, signOut } = useAuth();

  // Mirror the server's selection fallback: an explicit selection, otherwise the
  // sole membership when the account belongs to exactly one restaurant.
  const activeMembership =
    memberships.find((m) => m.restaurantPk === selectedRestaurantPk) ??
    (memberships.length === 1 ? memberships[0] : undefined);

  const role = activeMembership?.roleCode;
  const visibleLinks = role ? MANAGEMENT_LINKS.filter((link) => roleHasCapability(role, link.capability)) : [];
  const hiddenCount = role ? MANAGEMENT_LINKS.length - visibleLinks.length : 0;

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">More</Text>
      <Text variant="body" color={palette.muted}>
        Manage your restaurant. Destinations follow your server role — anything your role can&apos;t access is hidden here.
      </Text>

      {session ? (
        memberships.length ? (
          <Card style={{ gap: spacing.sm }}>
            <Text variant="heading">{memberships.length === 1 ? "Your restaurant" : "Switch restaurant"}</Text>
            <RestaurantSwitcher
              restaurants={memberships.map(toSwitcherItem)}
              selectedId={activeMembership?.restaurantPk ?? null}
              onSelect={selectRestaurant}
              accent={palette.forest}
            />
          </Card>
        ) : (
          <Card style={{ backgroundColor: palette.cream }}>
            <Text variant="heading">Loading your restaurants…</Text>
            <Text color={palette.muted}>
              Management destinations appear once your restaurant memberships and role load.
            </Text>
          </Card>
        )
      ) : null}

      {session && activeMembership ? (
        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
            <Text variant="heading">Manage</Text>
            <Badge label={humanizeCode(activeMembership.roleCode)} tone="info" />
          </View>

          {visibleLinks.length ? (
            visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                accessibilityRole="link"
                style={{ color: palette.forest, fontWeight: "700", fontSize: 15, paddingVertical: spacing.xs }}
              >
                {link.label} →
              </Link>
            ))
          ) : (
            <Text color={palette.muted}>
              Your role focuses on the pickup counter — there are no management destinations to show here.
            </Text>
          )}

          {hiddenCount > 0 ? (
            <Text variant="caption" color={palette.muted}>
              {hiddenCount} destination{hiddenCount === 1 ? "" : "s"} hidden by your role.
            </Text>
          ) : null}
        </Card>
      ) : null}

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
        <Card style={{ gap: spacing.sm }}>
          <Text variant="heading">Sign in to manage your restaurant</Text>
          <Text color={palette.muted}>
            Reports, finance, drops and compliance are available after you sign in with your partner account.
          </Text>
          <Button label="Sign in" accent={palette.forest} onPress={() => router.push("/auth/login")} />
        </Card>
      )}
    </Screen>
  );
}
