import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from "react-native";
import { getPressFeedbackStyle, useReducedMotion } from "../motion";
import { accents } from "../tokens/colors";
import { accentTextColor, onAccentTextColor } from "../tokens/contrast";
import { MIN_TOUCH_TARGET, radii, spacing } from "../tokens/layout";
import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps {
  readonly label: string;
  readonly onPress?: () => void;
  readonly variant?: ButtonVariant;
  /** Accent color; defaults to the customer accent (saffron). */
  readonly accent?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

/** Accessible button with a guaranteed minimum touch target. */
export function Button({
  label,
  onPress,
  variant = "primary",
  accent = accents.customer,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";
  const reduceMotion = useReducedMotion();

  const base: ViewStyle = {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    opacity: isDisabled ? 0.5 : 1,
    backgroundColor: isPrimary ? accent : "transparent",
    borderWidth: variant === "secondary" ? 1.5 : 0,
    borderColor: accent,
  };

  // Primary buttons place text on the accent fill (white or charcoal, per AA);
  // secondary/ghost render the accent itself as text on a light surface.
  const textColor = isPrimary ? onAccentTextColor(accent) : accentTextColor(accent);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [base, pressed ? getPressFeedbackStyle(reduceMotion) : null, style]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : null}
      <Text variant="heading" color={textColor}>
        {label}
      </Text>
    </Pressable>
  );
}
