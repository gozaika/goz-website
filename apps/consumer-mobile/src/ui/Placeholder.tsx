import { Link } from "expo-router";
import { View } from "react-native";
import { accents, palette, Screen, Text } from "@gozaika/mobile-ui";

export type PlaceholderLink = {
  readonly label: string;
  readonly href: string;
};

export type PlaceholderProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly slice: string;
  readonly accent?: string;
  readonly links?: readonly PlaceholderLink[];
};

/**
 * Slice 1 shell screen, rebuilt on @gozaika/mobile-ui primitives in Slice 2.
 * Replaced screen-by-screen in later feature slices.
 */
export function Placeholder({ title, subtitle, slice, accent = accents.customer, links }: PlaceholderProps) {
  return (
    <Screen contentStyle={{ justifyContent: "center" }}>
      <View style={{ height: 4, width: 44, borderRadius: 2, backgroundColor: accent }} />
      <Text variant="title">{title}</Text>
      {subtitle ? (
        <Text variant="body" color={palette.muted}>
          {subtitle}
        </Text>
      ) : null}
      <Text variant="caption" color={accent}>
        Shell placeholder · {slice}
      </Text>
      {links?.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          style={{ color: palette.forest, fontSize: 15, fontWeight: "700", marginTop: 6 }}
        >
          {link.label} →
        </Link>
      ))}
    </Screen>
  );
}
