import type { ReactNode } from "react";
import { Text as RNText, type StyleProp, type TextStyle } from "react-native";
import { palette } from "../tokens/colors";
import { typography } from "../tokens/layout";

export type TextVariant = keyof typeof typography;

export interface TextProps {
  readonly children: ReactNode;
  readonly variant?: TextVariant;
  readonly color?: string;
  readonly numberOfLines?: number;
  readonly accessibilityRole?: "header" | "text" | "none";
  readonly style?: StyleProp<TextStyle>;
}

/** Typed text honoring the type scale. Respects system font scaling (Dynamic Type). */
export function Text({
  children,
  variant = "body",
  color = palette.charcoal,
  numberOfLines,
  accessibilityRole,
  style,
}: TextProps) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      style={[typography[variant], { color }, style]}
    >
      {children}
    </RNText>
  );
}
