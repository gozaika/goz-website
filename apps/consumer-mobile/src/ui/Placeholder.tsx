import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { brand } from "@/theme/brand";

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
 * Slice 1 shell screen. Renders a titled placeholder with the owning slice and
 * optional navigation links so every route in the IA is reachable before the
 * real feature work lands. Replaced screen-by-screen in later slices.
 */
export function Placeholder({ title, subtitle, slice, accent = brand.saffron, links }: PlaceholderProps) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: brand.cream }}
      contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 12, justifyContent: "center" }}
    >
      <View style={{ height: 4, width: 44, borderRadius: 2, backgroundColor: accent }} />
      <Text style={{ color: brand.charcoal, fontSize: 26, fontWeight: "800" }}>{title}</Text>
      {subtitle ? <Text style={{ color: brand.muted, fontSize: 15, lineHeight: 22 }}>{subtitle}</Text> : null}
      <Text
        style={{
          color: accent,
          fontSize: 12,
          fontWeight: "700",
          marginTop: 8,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        Shell placeholder · {slice}
      </Text>
      {links?.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          style={{ color: brand.forest, fontSize: 15, fontWeight: "700", marginTop: 6 }}
        >
          {link.label} →
        </Link>
      ))}
    </ScrollView>
  );
}
