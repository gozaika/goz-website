import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { palette } from "../tokens/colors";
import { elevation, type ElevationLevel, radii, spacing } from "../tokens/layout";

export interface CardProps {
  readonly children: ReactNode;
  readonly elevated?: boolean | ElevationLevel;
  readonly style?: StyleProp<ViewStyle>;
}

function resolveElevation(elevated: CardProps["elevated"]): ElevationLevel {
  if (elevated === true) {
    return "md";
  }

  if (elevated) {
    return elevated;
  }

  return "none";
}

export function Card({ children, elevated = false, style }: CardProps) {
  const elevationLevel = resolveElevation(elevated);

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
        elevation[elevationLevel],
        style,
      ]}
    >
      {children}
    </View>
  );
}
