import type { ReactNode } from "react";
import { View } from "react-native";
import { toneColors, type StatusTone } from "../tokens/colors";
import { radii, spacing } from "../tokens/layout";
import { Text } from "./Text";

export interface BadgeProps {
  /** Always renders a text label so status is never color-only (a11y). */
  readonly label: string;
  readonly tone?: StatusTone;
  /** Optional leading icon — supplements, never replaces, the text. */
  readonly icon?: ReactNode;
}

export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const colors = toneColors(tone);
  return (
    <View
      accessibilityRole="text"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        alignSelf: "flex-start",
        backgroundColor: colors.bg,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
      }}
    >
      {icon}
      <Text variant="caption" color={colors.fg}>
        {label}
      </Text>
    </View>
  );
}
