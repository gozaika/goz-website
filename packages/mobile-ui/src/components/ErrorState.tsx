import { View } from "react-native";
import { palette } from "../tokens/colors";
import { spacing } from "../tokens/layout";
import { Button } from "./Button";
import { Text } from "./Text";

export interface ErrorStateProps {
  readonly title?: string;
  readonly message: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly accent?: string;
}

/** Retryable error surface. Message must be human-safe (no SQL/provider payloads). */
export function ErrorState({ title = "Something went wrong", message, onRetry, retryLabel = "Try again", accent }: ErrorStateProps) {
  return (
    <View
      accessibilityRole="alert"
      style={{ alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl }}
    >
      <Text variant="heading" color={palette.charcoal} style={{ textAlign: "center" }}>
        {title}
      </Text>
      <Text variant="body" color={palette.muted} style={{ textAlign: "center" }}>
        {message}
      </Text>
      {onRetry ? <Button label={retryLabel} variant="secondary" onPress={onRetry} accent={accent} /> : null}
    </View>
  );
}
