import type { ReactNode } from "react";
import { View } from "react-native";
import { spacing } from "../tokens/layout";
import { palette } from "../tokens/colors";
import { Button } from "./Button";
import { Text } from "./Text";

export interface EmptyStateProps {
  readonly title: string;
  readonly message?: string;
  readonly icon?: ReactNode;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly accent?: string;
}

export function EmptyState({ title, message, icon, actionLabel, onAction, accent }: EmptyStateProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl }}>
      {icon}
      <Text variant="heading" color={palette.charcoal} style={{ textAlign: "center" }}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color={palette.muted} style={{ textAlign: "center" }}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} accent={accent} /> : null}
    </View>
  );
}
