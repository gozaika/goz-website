import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { palette } from "../tokens/colors";
import { radii, spacing } from "../tokens/layout";

export interface CardProps {
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.white,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: palette.border,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
